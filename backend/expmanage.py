# =========================
# Add Expense (personal or group) + optional split
# =========================

from decimal import Decimal, ROUND_HALF_UP

def _dec2(x) -> Decimal:
    return Decimal(str(x)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def _parse_amount_pos(val) -> Decimal:
    try:
        amt = _dec2(abs(float(val)))
        if amt <= 0:
            raise ValueError
        return amt
    except Exception:
        raise ValueError("Invalid amount (must be > 0 number)")

def _date_iso_utc(s: str | None) -> str:
    return _iso_date((s or "").strip()).replace(microsecond=0).isoformat()

def _ensure_group_membership(supabase: Client, user_id: str, group_id: str) -> list[str]:
    """Confirms user is in the group and returns all member IDs."""
    resp = (
        supabase.table("group_members")
        .select("user_id")
        .eq("group_id", group_id)
        .execute()
    )
    members = [row["user_id"] for row in (resp.data or [])]
    if user_id not in members:
        # Will fail RLS anyway, but we fail early for clear error
        raise PermissionError("User is not a member of the group")
    return members

def _build_equal_split(total: Decimal, participants: list[str]) -> list[dict]:
    """Equal split among participants; adjust last for rounding."""
    n = max(1, len(participants))
    base = (total / n).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    rows = [{"user_id": uid, "amount_owed": base} for uid in participants]
    # Fix rounding residual
    residual = total - sum(r["amount_owed"] for r in rows)
    if rows:
        rows[-1]["amount_owed"] = (rows[-1]["amount_owed"] + residual).quantize(Decimal("0.01"))
    return rows

def _validate_custom_splits(total: Decimal, splits: list[dict]) -> list[dict]:
    """Validate custom splits sum and shape; returns Decimal-normalized rows."""
    norm = []
    for r in splits or []:
        uid = str(r.get("user_id", "")).strip()
        amt = _parse_amount_pos(r.get("amount_owed", 0))
        if not uid:
            raise ValueError("Each split row must include user_id")
        norm.append({"user_id": uid, "amount_owed": amt})
    if not norm:
        raise ValueError("Custom splits provided but empty")
    s = sum(r["amount_owed"] for r in norm)
    if s != total:
        raise ValueError(f"Custom splits must sum to total amount ({total})")
    return norm

@app.route("/api/expenses", methods=["POST"])
def api_create_expense():
    """
    Create an expense (personal or group) + optional splits.

    Auth: Bearer <JWT>

    Body (JSON or form):
      - amount        (required, number > 0)
      - description   (required, string)
      - date          (optional, ISO; default now UTC)
      - category      (optional; if missing and description present -> auto-categorize)
      - group_id      (optional UUID; if present, must be group member)
      - split_equal   (optional bool; if true -> equal split)
      - participants  (optional list[uuid]; used with split_equal; default all group members if group_id given)
      - splits        (optional list of {user_id, amount_owed}; alternative to split_equal)

    Behavior:
      * personal expense: group_id omitted -> allowed; no implicit splits created
      * group expense: group_id set -> payer must be a member; you may split among members

    Response: 201
      {
        "expense": {...},
        "splits": [{...}, ...]
      }
    """
    # --- Auth ---
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing or invalid authorization token"}), 401
    jwt = auth_header.split(" ")[1]
    try:
        user_resp = categorizer.supabase.auth.get_user(jwt)
        user = user_resp.user
        if not user:
            raise Exception("Invalid user token")
    except Exception as e:
        return jsonify({"error": f"Authentication error: {str(e)}"}), 401

    # --- Input ---
    data = request.get_json(silent=True) or request.form
    description = (data.get("description") or "").strip()
    if not description:
        return jsonify({"error": "description is required"}), 400

    try:
        amount = _parse_amount_pos(data.get("amount"))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    date_iso = _date_iso_utc(data.get("date"))
    group_id = (data.get("group_id") or "").strip() or None
    category = (data.get("category") or "").strip()

    # Optional split inputs
    split_equal = str(data.get("split_equal", "")).lower() in {"1", "true", "yes", "on"}
    participants = data.get("participants") or []  # expected list of UUID strings when provided
    custom_splits = data.get("splits")             # expected list of {user_id, amount_owed}

    # --- Group membership (if group_id supplied) ---
    all_group_members = None
    if group_id:
        try:
            all_group_members = _ensure_group_membership(categorizer.supabase, user.id, group_id)
        except PermissionError as e:
            return jsonify({"error": "not_in_group", "details": str(e)}), 403

    # --- Auto-categorize if missing ---
    if not category and description:
        try:
            cat_res = categorizer.find_category(user.id, description)
            category = cat_res.get("category") or "Uncategorized"
        except Exception:
            category = "Uncategorized"
    if not category:
        category = "Uncategorized"

    # --- Insert into expenses ---
    expense_payload = {
        "description": description,
        "amount": float(amount),   # numeric(10,2) is fine with float/str
        "date": date_iso,
        "category": category,
        "payer_id": user.id,
        "group_id": group_id,      # NULL for personal expense
    }

    try:
        exp_ins = (
            categorizer.supabase
            .table("expenses")
            .insert(expense_payload)
            .select("*")
            .execute()
        )
        expense = (exp_ins.data or [None])[0]
        if not expense:
            raise RuntimeError("Insert into expenses returned no row")
    except Exception as e:
        print(f"/api/expenses insert failed: {e}")
        return jsonify({"error": "insert_failed", "details": str(e)}), 500

    # --- Build and insert splits (optional) ---
    # Policy allows payer to create splits for their expenses.
    splits_to_insert = []

    try:
        if custom_splits:
            splits_norm = _validate_custom_splits(amount, custom_splits)
            splits_to_insert = [
                {
                    "expense_id": expense["id"],
                    "user_id": r["user_id"],
                    "amount_owed": float(r["amount_owed"]),
                    "status": "pending"
                }
                for r in splits_norm
            ]
        elif split_equal:
            if group_id:
                # use provided participants or all group members
                part = list({*(participants or all_group_members)})
                # ensure at least one participant for equal split
                if not part:
                    part = [user.id]
            else:
                # personal equal split makes little sense; default to payer only
                part = [user.id]

            eq_splits = _build_equal_split(amount, part)
            splits_to_insert = [
                {
                    "expense_id": expense["id"],
                    "user_id": r["user_id"],
                    "amount_owed": float(r["amount_owed"]),
                    "status": "pending"
                }
                for r in eq_splits
            ]

        # Insert splits if we have any
        inserted_splits = []
        if splits_to_insert:
            sp_ins = (
                categorizer.supabase
                .table("expense_split")
                .insert(splits_to_insert)
                .select("*")
                .execute()
            )
            inserted_splits = sp_ins.data or []

        return jsonify({"expense": expense, "splits": inserted_splits}), 201

    except Exception as e:
        print(f"/api/expenses split insertion failed: {e}")
        return jsonify({"error": "split_insert_failed", "details": str(e)}), 500
