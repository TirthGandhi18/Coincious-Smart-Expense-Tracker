# ===== Charts for your schema (expenses table) =====
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from typing import Dict, List, Tuple

EXP_TABLE = "expenses"

def _iso_date(s: str, default: datetime | None = None) -> datetime:
    if not s:
        return (default or datetime.now(timezone.utc)).astimezone(timezone.utc)
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(timezone.utc)
    except Exception:
        try:
            return datetime.fromisoformat(s + "T00:00:00+00:00").astimezone(timezone.utc)
        except Exception:
            return (default or datetime.now(timezone.utc)).astimezone(timezone.utc)

def _window_for(anchor: datetime, days: int) -> Tuple[datetime, datetime]:
    start = (anchor - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    end = anchor.replace(hour=23, minute=59, second=59, microsecond=0)
    return start, end

def _period_key(dt: datetime, interval: str) -> str:
    d = dt.date()
    if interval == "week":
        y, w, _ = d.isocalendar()
        return f"{y}-W{w:02d}"
    if interval == "month":
        return f"{d.year}-{d.month:02d}"
    return d.isoformat()

def _fetch_expenses(supabase, user_id: str, start: datetime, end: datetime, group_id: str | None) -> List[Dict]:
    q = (
        supabase.table(EXP_TABLE)
        .select("amount,date,category,group_id,payer_id")
        .eq("payer_id", user_id)
        .gte("date", start.isoformat())
        .lte("date", end.isoformat())
    )
    if group_id:
        q = q.eq("group_id", group_id)            # only this group
    else:
        q = q.is_("group_id", "null")             # personal expenses only
    resp = q.execute()
    rows = resp.data or []
    out = []
    for r in rows:
        try:
            r_dt = datetime.fromisoformat(str(r["date"]).replace("Z", "+00:00")).astimezone(timezone.utc)
        except Exception:
            r_dt = datetime.fromisoformat(str(r["date"]) + "T00:00:00+00:00").astimezone(timezone.utc)
        out.append({
            "amount": float(r.get("amount") or 0.0),
            "date": r_dt,
            "category": (r.get("category") or "Uncategorized").strip() or "Uncategorized",
            "group_id": r.get("group_id"),
        })
    return out

def _sum_by_category(rows: List[Dict]) -> Dict[str, float]:
    by_cat = defaultdict(float)
    for r in rows:
        by_cat[r["category"]] += float(r["amount"] or 0.0)
    return dict(by_cat)

def _donut_payload(sums: Dict[str, float]) -> Dict:
    items = sorted(sums.items(), key=lambda kv: kv[1], reverse=True)
    total = round(sum(v for _, v in items), 2)
    segs = [{"label": k, "amount": round(v, 2), "percent": round((v / total) * 100, 2) if total else 0.0}
            for k, v in items if v > 0]
    return {"total": total, "segments": segs}

def _expense_trend(rows: List[Dict], interval: str = "day") -> Dict:
    buckets = defaultdict(float)
    for r in rows:
        key = _period_key(r["date"], interval)
        buckets[key] += float(r["amount"] or 0.0)
    ordered = sorted(buckets.items(), key=lambda kv: kv[0])
    cumulative = 0.0
    series = []
    for period, amt in ordered:
        cumulative += amt
        series.append({
            "period": period,
            "expense": round(amt, 2),
            "cumulative_expense": round(cumulative, 2),
        })
    totals = {"expense": round(sum(v for _, v in ordered), 2)}
    return {"interval": interval, "totals": totals, "series": series}

@app.route("/api/expense_charts", methods=["POST"])
def api_expense_charts():
    """
    Charts for expenses (matches your schema):
      - Donuts: daily / weekly / monthly (category split)
      - Trend: expense over time (+ cumulative)

    Scope:
      - personal only  -> omit group_id
      - specific group -> provide group_id

    Auth: Bearer <JWT>
    Body (JSON/form):
      - anchor_date: YYYY-MM-DD or ISO (default: today UTC) -> donuts anchor
      - start_date, end_date: (optional) for trend window (default: last 30d to anchor)
      - interval: 'day'|'week'|'month' (default: 'day') for trend bucketing
      - group_id: (optional UUID) if provided, charts consider ONLY that group’s expenses.
                  if omitted, charts consider ONLY personal expenses (group_id NULL).
    """
    # auth
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

    data = request.get_json(silent=True) or request.form

    group_id = (data.get("group_id") or "").strip() or None
    anchor = _iso_date(str(data.get("anchor_date", "")).strip())
    day_start, day_end = _window_for(anchor, 1)
    week_start, week_end = _window_for(anchor, 7)
    month_start, month_end = _window_for(anchor, 30)

    end_dt = _iso_date(str(data.get("end_date", "")).strip(), default=anchor)
    start_default = end_dt - timedelta(days=30)
    start_dt = _iso_date(str(data.get("start_date", "")).strip(), default=start_default)
    if start_dt > end_dt:
        start_dt, end_dt = end_dt, start_dt
    interval = (data.get("interval", "day") or "day").lower()
    if interval not in {"day", "week", "month"}:
        interval = "day"

    try:
        # donuts
        day_rows = _fetch_expenses(categorizer.supabase, user.id, day_start, day_end, group_id)
        week_rows = _fetch_expenses(categorizer.supabase, user.id, week_start, week_end, group_id)
        month_rows = _fetch_expenses(categorizer.supabase, user.id, month_start, month_end, group_id)

        donuts = {
            "daily": _donut_payload(_sum_by_category(day_rows)),
            "weekly": _donut_payload(_sum_by_category(week_rows)),
            "monthly": _donut_payload(_sum_by_category(month_rows)),
        }

        # trend
        trend_rows = _fetch_expenses(categorizer.supabase, user.id, start_dt, end_dt, group_id)
        trend = _expense_trend(trend_rows, interval)

        payload = {
            "params": {
                "user_id": user.id,
                "scope": "group" if group_id else "personal",
                "group_id": group_id,
                "donut": {
                    "anchor_date": anchor.date().isoformat(),
                    "windows": {
                        "daily": {"start": day_start.isoformat(), "end": day_end.isoformat()},
                        "weekly": {"start": week_start.isoformat(), "end": week_end.isoformat()},
                        "monthly": {"start": month_start.isoformat(), "end": month_end.isoformat()},
                    },
                },
                "trend": {
                    "start_date": start_dt.date().isoformat(),
                    "end_date": end_dt.date().isoformat(),
                    "interval": interval,
                },
            },
            "donuts": donuts,
            "expense_trend": trend,
        }
        return jsonify(payload), 200
    except Exception as e:
        print(f"/api/expense_charts failed: {e}")
        return jsonify({"error": "expense_charts_failed", "details": str(e)}), 500
