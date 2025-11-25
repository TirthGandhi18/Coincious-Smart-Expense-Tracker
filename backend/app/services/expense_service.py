from app.extensions import supabase
import traceback
import calendar
from datetime import datetime, timedelta, timezone
from collections import defaultdict

def get_group_expenses(group_id, user_id):
    try:
        # 1. Auth Check
        member_check = supabase.table("group_members").select("user_id").eq("group_id", group_id).eq("user_id", user_id).maybe_single().execute()
        if not member_check.data: return {"error": "You are not a member of this group"}, 403

        # 2. Fetch ALL Expenses (1 Query)
        response = supabase.table("expenses").select("*, total_amount").eq("group_id", group_id).order("created_at", desc=True).execute()
        expenses_data = response.data or []
        if not expenses_data: return {"expenses": []}, 200

        # 3. Collect User IDs to fetch (Batching)
        user_ids_to_fetch = set()
        expense_ids = [e['id'] for e in expenses_data]
        for expense in expenses_data:
            if expense.get("payer_id"): user_ids_to_fetch.add(str(expense["payer_id"]))

        # 4. Fetch Splits (1 Query)
        splits_by_expense = defaultdict(list)
        if expense_ids:
            splits_resp = supabase.table("expense_split").select("expense_id, user_id").in_("expense_id", expense_ids).execute()
            for split in (splits_resp.data or []):
                splits_by_expense[split['expense_id']].append(split['user_id'])
                user_ids_to_fetch.add(str(split['user_id']))

        # 5. Batch Fetch Users (1 Query)
        user_map = {}
        if user_ids_to_fetch:
            users_resp = supabase.table("users").select("id, name, email, avatar_url").in_("id", list(user_ids_to_fetch)).execute()
            for u in (users_resp.data or []):
                user_map[str(u['id'])] = {
                    "id": str(u['id']),
                    "name": u.get('name') or u.get('email', 'Unknown'),
                    "avatar": u.get('avatar_url')
                }

        # 6. Assemble Response
        final_expenses = []
        for expense in expenses_data:
            payer_id = str(expense.get("payer_id"))
            payer_obj = user_map.get(payer_id, {"id": payer_id, "name": "Unknown"})
            
            split_objs = [user_map.get(str(uid), {"id": str(uid), "name": "Unknown"}) for uid in splits_by_expense.get(expense['id'], [])]

            final_expenses.append({
                "id": expense.get("id"),
                "description": expense.get("description", "No description"),
                "amount": float(expense.get("total_amount") or expense.get("amount") or 0),
                "category": expense.get("category", "Other"),
                "date": expense.get("created_at"),
                "paid_by": payer_obj,
                "split_among": split_objs,
                "receipt_url": expense.get("receipt_url"),
            })

        return {"expenses": final_expenses}, 200

    except Exception as e:
        return {"error": str(e)}, 500

EXP_TABLE = "expenses"

def _month_window(year: int, month: int):
    """Returns the UTC start and end datetime for the given month."""
    start = datetime(year, month, 1, 0, 0, 0, tzinfo=timezone.utc)
    last_day = calendar.monthrange(year, month)[1]
    end = datetime(year, month, last_day, 23, 59, 59, tzinfo=timezone.utc)
    return start, end

def _fetch_expenses(supabase_client, user_id, start, end):
    q = (
        supabase_client.table(EXP_TABLE)
        .select("amount,date,category,payer_id")
        .eq("payer_id", user_id)
        .gte("date", start.isoformat())
        .lte("date", end.isoformat())
    )
    resp = q.execute()
    rows = resp.data or []
    results = []
    for r in rows:
        try:
            dt = datetime.fromisoformat(str(r["date"]).replace("Z", "+00:00"))
        except Exception:
            dt = start
        results.append({
            "amount": float(r.get("amount") or 0),
            "date": dt,
            "category": (r.get("category") or "Uncategorized").strip() or "Uncategorized",
        })
    return results

def _sum_by_category(rows):
    sums = defaultdict(float)
    for r in rows:
        sums[r["category"]] += r["amount"]
    return [{"category": k, "total": round(v, 2)} for k, v in sorted(sums.items(), key=lambda kv: kv[1], reverse=True)]

def get_expenses_by_date_range(user_id, start_date, end_date):
    try:
        # Query expenses for the user within the specific date range
        # We order by date descending to show newest first in the list
        response = (
            supabase.table("expenses")
            .select("id, description, amount, category, date, group_id, created_at")
            .eq("payer_id", user_id)
            .gte("date", start_date)
            .lte("date", end_date)
            .order("date", desc=True)
            .execute()
        )

        if hasattr(response, "error") and response.error:
            return {"error": str(response.error)}, 500

        expenses = []
        for item in response.data:
            # Determine if it is a group or personal expense
            expense_type = "group" if item.get("group_id") else "personal"
            
            expenses.append({
                "id": item["id"],
                "title": item.get("description", "Untitled"),
                "amount": float(item["amount"]),
                "category": item.get("category", "Other"),
                "date": item.get("date"),
                "type": expense_type
            })

        return expenses, 200

    except Exception as e:
        print(f"Error fetching expenses by date range: {str(e)}")
        traceback.print_exc()
        return {"error": str(e)}, 500

def get_monthly_donut_data(user_id, period):
    try:
        period = (period or "current").strip().lower()
        now = datetime.now(timezone.utc)

        if period == "previous":
            first_day_of_current_month = now.replace(day=1)
            last_day_of_previous_month = first_day_of_current_month - timedelta(days=1)
            year = last_day_of_previous_month.year
            month = last_day_of_previous_month.month
        else:
            year, month = now.year, now.month

        month_start, month_end = _month_window(year, month)

        rows = _fetch_expenses(supabase, user_id, month_start, month_end)
        summary = _sum_by_category(rows)
        return summary, 200
    except Exception as e:
        print(f"Error in expense_monthly_donut: {e}")
        return {"error": "Failed to fetch data", "details": str(e)}, 500