# app/services/expense_service.py
from app.extensions import supabase
import traceback
import calendar
from datetime import datetime, timedelta, timezone
from collections import defaultdict

# --- GET /expenses ---
def get_group_expenses(group_id, user_id):
    try:
        # First, check if user is a member (for authorization)
        member_check = supabase.table('group_members') \
            .select('user_id') \
            .eq('group_id', group_id) \
            .eq('user_id', user_id) \
            .maybe_single() \
            .execute()
        
        if not member_check.data:
            return {'error': 'You are not a member of this group'}, 403

        # MODIFICATION 1: Request 'total_amount' from the database
        response = supabase.table('expenses') \
            .select('*, total_amount') \
            .eq('group_id', group_id) \
            .order('created_at', desc=True) \
            .execute()

        if hasattr(response, 'error') and response.error:
            return {'error': str(response.error)}, 500

        expenses = []
        for expense in response.data:
            paid_by_id = None
            paid_by_name = 'Unknown'
            
            for field in ['payer_id', 'paid_by', 'paid_by_user_id', 'user_id', 'created_by']:
                if field in expense and expense[field]:
                    paid_by_id = expense[field]
                    break
                    
            if paid_by_id:
                try:
                    paid_by_user = supabase.auth.admin.get_user_by_id(str(paid_by_id))
                    if hasattr(paid_by_user, 'user') and paid_by_user.user:
                        user_meta = paid_by_user.user.user_metadata or {}
                        paid_by_name = user_meta.get('full_name') or paid_by_user.user.email or f"User {str(paid_by_id)[:8]}"
                except Exception as e:
                    print(f"Error getting user {paid_by_id}: {str(e)}")
                    paid_by_name = f"User {str(paid_by_id)[:8]}" if paid_by_id else 'Unknown'
            
            split_among = []
            try:
                split_members_resp = supabase.table('expense_split') \
                    .select('user_id') \
                    .eq('expense_id', expense.get('id')) \
                    .execute()
                
                split_among_ids = [s['user_id'] for s in (split_members_resp.data or [])]
                
                if split_among_ids:
                    for user_id_str in split_among_ids:
                        try:
                            user_data = supabase.auth.admin.get_user_by_id(user_id_str)
                            if hasattr(user_data, 'user') and user_data.user:
                                user_meta = user_data.user.user_metadata or {}
                                user_name = user_meta.get('full_name') or user_data.user.email or f"User {user_id_str[:8]}"
                                split_among.append({
                                    'id': user_id_str,
                                    'name': user_name
                                })
                        except Exception as e:
                            print(f"Error getting user {user_id_str}: {str(e)}")
                            split_among.append({
                                'id': user_id_str,
                                'name': f"User {user_id_str[:8]}"
                            })
            except Exception as e:
                print(f"Error fetching splits for expense {expense.get('id')}: {str(e)}")
            
            # MODIFICATION 2: Use 'total_amount' for display, falling back to 'amount'
            display_amount = expense.get('total_amount')
            
            expense_data = {
                'id': expense.get('id'),
                'description': expense.get('description', 'No description'),
                # CRITICAL CHANGE: Use total_amount for the displayed amount
                'amount': float(display_amount) if display_amount is not None else float(expense.get('amount', 0)),
                'category': expense.get('category', 'Other'),
                'date': expense.get('created_at'),
                'paid_by': {
                    'id': paid_by_id,
                    'name': paid_by_name
                },
                'split_among': split_among,
                'receipt_url': expense.get('receipt_url')
            }
            
            if expense_data['id']:
                expenses.append(expense_data)
            else:
                print(f"Skipping expense with invalid ID: {expense}")

        return {'expenses': expenses}, 200

    except Exception as e:
        print(f"Error fetching expenses: {str(e)}")
        traceback.print_exc()
        return {'error': str(e)}, 500

# --- POST /expense_monthly_donut ---

EXP_TABLE = "expenses"

def _month_window(year: int, month: int):
    """Returns the UTC start and end datetime for the given month."""
    start = datetime(year, month, 1, 0, 0, 0, tzinfo=timezone.utc)
    last_day = calendar.monthrange(year, month)[1]
    end = datetime(year, month, last_day, 23, 59, 59, tzinfo=timezone.utc)
    return start, end

def _fetch_expenses(supabase_client, user_id, start, end):
    # This function intentionally uses 'amount' as it is for personal analytics
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