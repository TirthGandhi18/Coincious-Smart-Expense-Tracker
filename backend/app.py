import os
import json
import base64
import calendar
import requests
from flask import Flask, request, jsonify
from dotenv import load_dotenv
import google.generativeai as genai
from supabase import create_client, Client
from flask_cors import CORS
from datetime import datetime, timedelta, timezone
from collections import defaultdict

# --- SETUP ---
load_dotenv()
app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Authorization", "Content-Type"],
        "supports_credentials": True
    }
})

class ExpenseCategorizer:
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Supabase URL and Key must be set in .env file")
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        self.model = None
        KEY = os.getenv('GEMINI_API_KEY')
        if KEY:
            genai.configure(api_key=KEY) 
            self.model = genai.GenerativeModel(
                model_name="gemini-2.5-flash"
            )

    def _get_user_rules(self, user_id):
        """Fetches all learned rules for a specific user from the Supabase database."""
        try:
            response = self.supabase.table('user_categories').select('category_name', 'keywords').eq('user_id', user_id).execute()
            
            user_rules = {}
            for item in response.data:
                user_rules[item['category_name']] = item['keywords']
            return user_rules
        except Exception as e:
            print(f"Error fetching user rules: {e}")
            return {}

    def learn_new_rule(self, user_id, description, category):
        """Saves a new learned keyword for a specific user to the Supabase database."""
        print(f"Learning rule for user {user_id}: '{description}' -> '{category}'")
        keyword = description.lower()
        
        try:
            response = self.supabase.table('user_categories').select('keywords').eq('user_id', user_id).eq('category_name', category).execute()
            
            if response.data:
                existing_keywords = response.data[0]['keywords']
                if keyword not in existing_keywords:
                    new_keywords = existing_keywords + [keyword]
                    self.supabase.table('user_categories').update({'keywords': new_keywords}).eq('user_id', user_id).eq('category_name', category).execute()
                    print(f"Updated keywords for category '{category}'")
            else:
                self.supabase.table('user_categories').insert({
                    'user_id': user_id,
                    'category_name': category,
                    'keywords': [keyword]
                }).execute()
                print(f"Created new category rule for '{category}'")

        except Exception as e:
            print(f"Error saving new rule to Supabase: {e}")

    def parse_bill_image(self, image_bytes, mime_type):
        if not self.model:
            raise RuntimeError("Gemini model not configured")

        base64_image = base64.b64encode(image_bytes).decode('utf-8')

        system_prompt = (
            "You are a precise receipt/bill parser. Extract fields and return STRICT JSON only. "
            "Fields: vendor_name, issue_date, due_date, subtotal, tax, tip, total, currency, "
            "line_items (name, quantity, unit_price, line_total), payment_method, address, "
            "category_guess, notes. Use null for unknowns. Dates ISO-8601. Numbers as floats. "
            "currency as 3-letter code if visible, else null."
        )

        content = [
            system_prompt,
            {
                "mime_type": mime_type,
                "data": base64_image
            },
            (
                "Respond ONLY with JSON in this schema: {\n"
                "  \"vendor_name\": string|null,\n"
                "  \"issue_date\": string|null,\n"
                "  \"due_date\": string|null,\n"
                "  \"subtotal\": number|null,\n"
                "  \"tax\": number|null,\n"
                "  \"tip\": number|null,\n"
                "  \"total\": number|null,\n"
                "  \"currency\": string|null,\n"
                "  \"payment_method\": string|null,\n"
                "  \"address\": string|null,\n"
                "  \"category_guess\": string|null,\n"
                "  \"notes\": string|null,\n"
                "  \"line_items\": [ { \"name\": string, \"quantity\": number|null, \"unit_price\": number|null, \"line_total\": number|null } ]\n"
                "}"
            )
        ]

        response = self.model.generate_content(content)
        raw_text = response.text.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(raw_text)


    def find_category(self, user_id, description):
        """Main categorization logic: User's DB -> GenAI Fallback -> Learn."""
        lower_desc = description.lower()
        
        user_rules = self._get_user_rules(user_id)
        for category, keywords in user_rules.items():
            if any(key in lower_desc for key in keywords):
                return {"category": category, "source": "user_dictionary"}

        if not self.model:
            return {"category": "Other", "source": "no_ai_fallback"}
            
        print(f"'{description}' not in user rules. Asking AI...")
        prompt = self._build_ai_prompt(description, list(user_rules.keys()))
        
        try:
            response = self.model.generate_content(prompt)
            raw_text = response.text.strip().replace("```json", "").replace("```", "").strip()
            ai_result = json.loads(raw_text)
            
            ai_category = ai_result.get("category")

            if ai_category and ai_category != "Other":
                self.learn_new_rule(user_id, description, ai_category)
                return {"category": ai_category, "source": "ai"}

        except Exception as e:
            print(f"AI call failed: {e}. Defaulting to 'Other'.")

        return {"category": "Other", "source": "default"}

    def _build_ai_prompt(self, description, known_categories):
        """Builds the prompt for the Gemini AI."""
        base_categories = ["Food & Dining", "Transportation", "Shopping", "Bills & Utilities", "Entertainment", "Health & Wellness"]
        all_categories = list(set(known_categories + base_categories)) 
        return f"""
        Analyze the expense description: "{description}"

        My current categories are: {", ".join(all_categories)}.

        If one of those is a perfect fit, use it. 
        However, if you think a better, more specific category is needed (like 'Education' for 'college fees'), you are encouraged to create one.

        IMPORTANT: Respond ONLY with a JSON object in the format: {{"category": "CATEGORY_NAME"}}
        """

categorizer = ExpenseCategorizer()

@app.route('/api/categorize', methods=['POST'])
def api_categorize():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing or invalid authorization token'}), 401
    
    jwt = auth_header.split(' ')[1]
    
    try:
        user_response = categorizer.supabase.auth.get_user(jwt)
        user = user_response.user
        if not user:
            raise Exception("Invalid user token")
    except Exception as e:
        return jsonify({'error': f'Authentication error: {str(e)}'}), 401
    
    form_data = request.form
    description = form_data.get('description', '').strip()

    if not description:
        return jsonify({'error': 'Description cannot be empty.'}), 400
    
    manual_category = form_data.get('category', '').strip()
    
    if manual_category:
        categorizer.learn_new_rule(user.id, description, manual_category)
        return jsonify({'status': 'learning_successful', 'learned': {description: manual_category}})
    else:
        result = categorizer.find_category(user.id, description)
        return jsonify(result)


@app.route('/api/parse-bill', methods=['POST'])
def api_parse_bill():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing or invalid authorization token'}), 401

    jwt = auth_header.split(' ')[1]

    try:
        user_response = categorizer.supabase.auth.get_user(jwt)
        user = user_response.user
        if not user:
            raise Exception("Invalid user token")
    except Exception as e:
        return jsonify({'error': f'Authentication error: {str(e)}'}), 401

    # <<< --- BUG FIX 2: Changed 'image' to 'receipt' ---
    if 'receipt' not in request.files:
        return jsonify({'error': 'No image file provided. Use form-data with key "receipt".'}), 400

    image_file = request.files['receipt']
    # ---------------------------------------------------

    if image_file.filename == '':
        return jsonify({'error': 'Empty filename for uploaded image.'}), 400

    try:
        image_bytes = image_file.read()
        mime_type = image_file.mimetype or 'image/jpeg'

        parsed = categorizer.parse_bill_image(image_bytes, mime_type)

        return jsonify({'parsed': parsed})
    except json.JSONDecodeError:
        return jsonify({'error': 'Model returned non-JSON or invalid JSON response.'}), 502
    except RuntimeError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': f'Failed to parse bill: {str(e)}'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Backend is running'})

# ===== Monthly Donut Chart Logic =====
EXP_TABLE = "expenses"


def _month_window(year: int, month: int):
    """Returns the UTC start and end datetime for the given month."""
    start = datetime(year, month, 1, 0, 0, 0, tzinfo=timezone.utc)
    last_day = calendar.monthrange(year, month)[1]
    end = datetime(year, month, last_day, 23, 59, 59, tzinfo=timezone.utc)
    return start, end


def _fetch_expenses(supabase, user_id, start, end):
    q = (
        supabase.table(EXP_TABLE)
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


@app.route("/api/expense_monthly_donut", methods=["POST"])
def api_expense_monthly_donut():
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

    data = request.get_json(silent=True) or {}
    period = (data.get("period") or "current").strip().lower()

    now = datetime.now(timezone.utc)

    if period == "previous":
        # Move to the first day of the previous month
        year = now.year if now.month > 1 else now.year - 1
        month = now.month - 1 if now.month > 1 else 12
    else:
        # Current month
        year, month = now.year, now.month

    month_start, month_end = _month_window(year, month)

    try:
        rows = _fetch_expenses(categorizer.supabase, user.id, month_start, month_end)
        summary = _sum_by_category(rows)
        return jsonify(summary), 200
    except Exception as e:
        print(f"Error in expense_monthly_donut: {e}")
        return jsonify({"error": "Failed to fetch data", "details": str(e)}), 500

# --- THIS IS THE FIXED FUNCTION ---
@app.route('/api/groups', methods=['GET'])
def get_groups():
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({
            'error': 'Missing or invalid authorization token',
            'details': 'No Bearer token provided in Authorization header'
        }), 401
    
    jwt = auth_header.split(' ')[1]
    
    try:
        if not jwt:
            return jsonify({
                'error': 'Invalid token',
                'details': 'Empty JWT token'
            }), 401
            
        try:
            user_response = categorizer.supabase.auth.get_user(jwt)
            
            if not user_response or not hasattr(user_response, 'user') or not user_response.user:
                print("No user found in response")
                return jsonify({
                    'error': 'Invalid user token',
                    'details': 'No user data found in token'
                }), 401
                
            user_id = user_response.user.id
            
            print("Fetching user's groups...")
            # Step 1: Get the list of groups the user is in
            result = categorizer.supabase.table('group_members') \
                .select('group_id, groups(*)') \
                .eq('user_id', user_id) \
                .execute()
            
            if not result or not hasattr(result, 'data'):
                print(f"Query error or no data returned for user {user_id}")
                return jsonify({
                    'error': 'Failed to fetch groups',
                    'details': 'No data returned from database.'
                }), 500

            groups_list = [group['groups'] for group in result.data if group['groups']]
            
            # Step 2: Enrich each group with member count and total expenses
            enriched_groups = []
            for group in groups_list:
                group_id = group['id']
                
                # Get member count
                member_count_resp = categorizer.supabase.table('group_members') \
                    .select('user_id', count='exact') \
                    .eq('group_id', group_id) \
                    .execute()
                
                # Get total expenses
                expenses_resp = categorizer.supabase.table('expenses') \
                    .select('amount') \
                    .eq('group_id', group_id) \
                    .execute()

                group['member_count'] = member_count_resp.count if member_count_resp else 0
                group['total_expenses'] = sum(float(exp.get('amount', 0)) for exp in (expenses_resp.data or []))
                
                enriched_groups.append(group)

            print(f"Found and enriched {len(enriched_groups)} groups for user {user_id}")
            
            return jsonify({
                'success': True,
                'groups': enriched_groups
            })
            
        except Exception as auth_error:
            print(f"Authentication error: {str(auth_error)}")
            return jsonify({
                'error': 'Authentication failed',
                'details': str(auth_error),
                'hint': 'Your session may have expired. Please try refreshing the page or logging in again.'
            }), 401
            
    except Exception as e:
        print(f"Unexpected error in get_groups: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500
# --- END OF FIXED FUNCTION ---


@app.route('/api/groups', methods=['POST'])
def create_group():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing or invalid authorization token'}), 401
    
    jwt = auth_header.split(' ')[1]
    data = request.get_json()
    
    if not data.get('name'):
        return jsonify({'error': 'Group name is required'}), 400
    
    try:
        user_response = categorizer.supabase.auth.get_user(jwt)
        if not user_response.user:
            return jsonify({'error': 'Invalid user token'}), 401
            
        user_id = user_response.user.id
        
        group_data = {
            'name': data.get('name'),
            'created_by': user_id
        }
        
        print(f"Creating group with data: {group_data}")
        
        result = categorizer.supabase.table('groups').insert(group_data).execute()
        
        if not result or not hasattr(result, 'data') or not result.data:
            print(f"Error creating group, no data returned: {getattr(result, 'error', 'Unknown error')}")
            return jsonify({'error': f'Database error: {getattr(result, "error", "Failed to create group")}'}), 500
            
        group = result.data[0]
        print(f"Created group: {group}")
        
        member_data = {
            'group_id': group['id'],
            'user_id': user_id
        }
        
        print(f"Adding group member: {member_data}")
        
        member_result = categorizer.supabase.table('group_members').insert(member_data).execute()
        
        if not member_result or not hasattr(member_result, 'data'):
            print(f"Error adding member to group: {getattr(member_result, 'error', 'Unknown error')}")
            # Rollback: Delete the group we just created
            categorizer.supabase.table('groups').delete().eq('id', group['id']).execute()
            return jsonify({'error': f'Failed to add member to group: {getattr(member_result, "error", "Insert failed")}'}), 500
            
        print("Group and member created successfully")
            
        return jsonify({
            'group': {
                'id': group['id'],
                'name': group['name'],
                'created_at': group.get('created_at'),
                'updated_at': group.get('updated_at'),
                'member_count': 1
            }
        }), 201
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error in create_group: {str(e)}\n{error_trace}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e),
            'trace': error_trace
        }), 500

@app.route('/api/groups/<group_id>/members', methods=['GET'])
def get_group_members(group_id):
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing or invalid authorization token'}), 401
    
    jwt = auth_header.split(' ')[1]
    
    try:
        user_response = categorizer.supabase.auth.get_user(jwt)
        if not user_response.user:
            return jsonify({'error': 'Invalid user token'}), 401
            
        user_id = user_response.user.id
        
        member_check = categorizer.supabase.table('group_members') \
            .select('*') \
            .eq('group_id', group_id) \
            .eq('user_id', user_id) \
            .execute()
        
        if not member_check or not hasattr(member_check, 'data') or not member_check.data:
            return jsonify({'error': 'You are not a member of this group'}), 403
        
        # --- FIX #1 ---
        # Query only 'id' and 'email' from the public 'users' table
        members_result = categorizer.supabase.table('group_members') \
            .select('users!inner(id, email)') \
            .eq('group_id', group_id) \
            .execute()
        
        if not members_result or not hasattr(members_result, 'data'):
             print(f"Error getting members for group {group_id}: {getattr(members_result, 'error', 'No data returned')}")
             return jsonify({'error': 'Failed to fetch group members'}), 500

        members = []
        for member in members_result.data or []:
            user = member.get('users', {})
            if user and user.get('id'):
                user_id_str = str(user['id'])
                user_email = user.get('email')
                user_name = user_email.split('@')[0] if user_email else 'Unknown'
                user_avatar = None

                # Now, fetch the metadata to get the full_name
                try:
                    auth_user_resp = categorizer.supabase.auth.admin.get_user_by_id(user_id_str)
                    if hasattr(auth_user_resp, 'user') and auth_user_resp.user:
                        user_meta = auth_user_resp.user.user_metadata or {}
                        user_name = user_meta.get('full_name') or user_name
                        user_avatar = user_meta.get('avatar_url')
                except Exception as e:
                    print(f"Could not fetch metadata for user {user_id_str}: {e}")

                members.append({
                    'id': user_id_str,
                    'email': user_email,
                    'name': user_name,
                    'balance': 0, # This endpoint doesn't calculate balance
                    'avatar': user_avatar
                })
            
        return jsonify({'members': members})
        
    except Exception as e:
        print(f"Error getting group members: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to fetch group members', 'details': str(e)}), 500

@app.route('/api/groups/<group_id>', methods=['GET'])
def get_group_detail(group_id):
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing or invalid authorization token'}), 401
    
    jwt = auth_header.split(' ')[1]
    
    try:
        user_response = categorizer.supabase.auth.get_user(jwt)
        if not user_response.user:
            return jsonify({'error': 'Invalid user token'}), 401
            
        user_id = user_response.user.id
        
        member_check = categorizer.supabase.table('group_members') \
            .select('*') \
            .eq('group_id', group_id) \
            .eq('user_id', user_id) \
            .execute()
        
        if not member_check or not hasattr(member_check, 'data') or not member_check.data:
            return jsonify({'error': 'You are not a member of this group'}), 403
        
        group_result = categorizer.supabase.table('groups') \
            .select('*') \
            .eq('id', group_id) \
            .execute()
        
        if not group_result or not hasattr(group_result, 'data') or not group_result.data:
            return jsonify({'error': 'Group not found'}), 404
        
        group = group_result.data[0]
        
        # --- FIX #2 ---
        # Changed select('...*') to be specific and minimal
        members_result = categorizer.supabase.table('group_members') \
            .select('user_id', count='exact') \
            .eq('group_id', group_id) \
            .execute()
        
        expenses_result = categorizer.supabase.table('expenses') \
            .select('amount') \
            .eq('group_id', group_id) \
            .neq('category', 'Settlement') \
            .execute()
        
        total_expenses = sum(float(exp.get('amount', 0)) for exp in (expenses_result.data or [])) if expenses_result and hasattr(expenses_result, 'data') else 0
        member_count = members_result.count if members_result else 0
        
        return jsonify({
            'group': group,
            'member_count': member_count,
            'total_expenses': total_expenses
        }), 200
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error in get_group_detail: {str(e)}\n{error_trace}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e),
            'trace': error_trace
        }), 500


@app.route('/api/groups/<group_id>', methods=['DELETE'])
def delete_group(group_id):
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing or invalid authorization token'}), 401
    
    jwt = auth_header.split(' ')[1]
    
    try:
        user_response = categorizer.supabase.auth.get_user(jwt)
        if not user_response.user:
            return jsonify({'error': 'Invalid user token'}), 401
        user_id = user_response.user.id
        
        print(f"User {user_id} attempting to delete group {group_id}")
        group_result = categorizer.supabase.table('groups') \
            .select('created_by') \
            .eq('id', group_id) \
            .maybe_single() \
            .execute()
        
        if not group_result or not hasattr(group_result, 'data') or not group_result.data:
            print("Group not found")
            return jsonify({'error': 'Group not found'}), 404
            
        group_data = group_result.data
        print(f"Group created by: {group_data.get('created_by')}")
        
        if str(group_data.get('created_by')) != str(user_id):
            print("Permission denied")
            return jsonify({'error': 'You do not have permission to delete this group'}), 403
        
        print(f"Permission granted. Deleting group {group_id}...")
        delete_result = categorizer.supabase.table('groups') \
            .delete() \
            .eq('id', group_id) \
            .execute()

        if not delete_result or not hasattr(delete_result, 'data') or not delete_result.data:
             print(f"Delete failed or group not found during delete: {getattr(delete_result, 'error', 'Unknown error')}")
             return jsonify({'error': 'Failed to delete group, or group not found'}), 500

        print(f"Group {group_id} deleted successfully.")
        return jsonify({'message': 'Group deleted successfully'}), 200
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error in delete_group: {str(e)}\n{error_trace}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e),
            'trace': error_trace
        }), 500




# --- FIX: This function is now corrected ---
@app.route('/api/groups/<group_id>/add-member', methods=['POST'])
def add_group_member(group_id):
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing or invalid authorization token'}), 401
    
    jwt = auth_header.split(' ')[1]
    
    try:
        user_response = categorizer.supabase.auth.get_user(jwt)
        requesting_user = user_response.user
        
        data = request.get_json()
        if not data or 'email' not in data:
            return jsonify({'error': 'Email is required'}), 400
            
        # Check if the requesting user is in the group
        group_response = categorizer.supabase.table('group_members') \
            .select('user_id') \
            .eq('group_id', group_id) \
            .eq('user_id', requesting_user.id) \
            .maybe_single() \
            .execute()

        if not group_response.data:
            return jsonify({'error': 'Group not found or access denied'}), 404
            
        # Find the user by email
        target_user_id = None
        target_user_email = data['email'].lower()
        target_user_metadata = {}
        target_user_name_from_input = data.get('name', '').strip()

        # 1. Check public 'users' table first
        user_response = categorizer.supabase.table('users') \
            .select('*') \
            .eq('email', target_user_email) \
            .maybe_single() \
            .execute()
        
        user_data = user_response.data if user_response and hasattr(user_response, 'data') else None

        if user_data:
            # User already exists in public.users
            print(f"Found user in public.users: {user_data['id']}")
            target_user_id = user_data['id']
            try:
                auth_user_resp = categorizer.supabase.auth.admin.get_user_by_id(target_user_id)
                if auth_user_resp.user:
                    target_user_metadata = auth_user_resp.user.user_metadata or {}
            except Exception as e:
                 print(f"Could not fetch metadata for existing user {target_user_id}: {e}")

        else:
            # 2. User not in public.users, check auth.users via RPC
            print(f"User not in public.users, checking auth...")
            try:
                rpc_response = categorizer.supabase.rpc('get_user_by_email', {
                    'user_email': target_user_email
                }).execute()
                
                if not rpc_response.data:
                    return jsonify({'error': 'User with this email does not exist in the system'}), 404
                    
                auth_user_data = rpc_response.data[0]
                target_user_id = auth_user_data['id']
                target_user_metadata = auth_user_data.get('raw_user_meta_data', {}) or {}
                print(f"Found user in auth: {target_user_id}")

                # --- THIS IS THE FIX ---
                # User exists in auth, but not public.users. We must create them.
                public_user_name = target_user_metadata.get('full_name') or target_user_name_from_input or target_user_email.split('@')[0]
                
                new_user_record = {
                    'id': target_user_id,
                    'email': target_user_email,
                    'full_name': public_user_name
                }
                
                print(f"Creating public user record: {new_user_record}")
                # Use upsert to be safe, in case of a race condition
                upsert_resp = categorizer.supabase.table('users').upsert(new_user_record).execute()
                if not upsert_resp.data and upsert_resp.error:
                     print(f"Error upserting user to public.users: {getattr(upsert_resp, 'error', 'Unknown')}")
                     return jsonify({'error': 'Failed to create user profile'}), 500
                # --- END OF FIX ---

            except Exception as e:
                print(f"Error looking up user in auth.users: {str(e)}")
                return jsonify({'error': 'Error looking up user information'}), 500
            
        # 3. Check if user is already in the group
        existing_member = categorizer.supabase.table('group_members') \
            .select('*') \
            .eq('group_id', group_id) \
            .eq('user_id', target_user_id) \
            .maybe_single() \
            .execute()
            
        if existing_member and hasattr(existing_member, 'data') and existing_member.data:
            return jsonify({'error': 'User is already a member of this group'}), 409
            
        # 4. Add user to group_members
        member_data = {
            'group_id': group_id,
            'user_id': target_user_id
        }
        
        result = categorizer.supabase.table('group_members').insert([member_data]).execute()

        if not result or not hasattr(result, 'data'):
             print(f"Error inserting new member: {getattr(result, 'error', 'Unknown error')}")
             return jsonify({'error': 'Failed to add member to group database'}), 500

        full_name = target_user_metadata.get('full_name', target_user_name_from_input or target_user_email.split('@')[0])
        
        return jsonify({
            'message': 'Member added successfully',
            'member': {
                'id': target_user_id,
                'email': target_user_email,
                'name': full_name,
                'role': 'member'
            }
        }), 201
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error adding member: {str(e)}\n{error_trace}")
        return jsonify({'error': str(e), 'trace': error_trace}), 500

@app.route('/api/expenses', methods=['GET', 'OPTIONS'])
def get_expenses():
    if request.method == 'OPTIONS':
        response = app.make_default_options_response()
        return response
        
    group_id = request.args.get('group_id')
    if not group_id:
        return jsonify({'error': 'Missing group_id parameter'}), 400

    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Missing authorization'}), 401

        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
        if not supabase_url or not supabase_key:
            return jsonify({'error': 'Server configuration error'}), 500
            
        supabase = create_client(supabase_url, supabase_key)
        
        user_resp = supabase.auth.get_user(auth_header.split(' ')[1])
        
        if not user_resp or not hasattr(user_resp, 'user') or not user_resp.user:
            return jsonify({'error': 'Invalid user token'}), 401

        user = user_resp.user

        response = supabase.table('expenses') \
            .select('*') \
            .eq('group_id', group_id) \
            .order('created_at', desc=True) \
            .execute()

        if hasattr(response, 'error') and response.error:
            return jsonify({'error': str(response.error)}), 500

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
            
            expense_data = {
                'id': expense.get('id'),
                'description': expense.get('description', 'No description'),
                'amount': float(expense.get('amount', 0)),
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

        return jsonify({'expenses': expenses})

    except Exception as e:
        print(f"Error fetching expenses: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/groups/<group_id>/balances', methods=['GET'])
def get_group_balances(group_id):
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing or invalid authorization token'}), 401
    
    jwt = auth_header.split(' ')[1]
    
    try:
        user_response = categorizer.supabase.auth.get_user(jwt)
        if not user_response.user:
            return jsonify({'error': 'Invalid user token'}), 401
        user_id = user_response.user.id
        
        member_check = categorizer.supabase.table('group_members') \
            .select('user_id') \
            .eq('group_id', group_id) \
            .eq('user_id', user_id) \
            .maybe_single() \
            .execute()
        
        if not member_check.data:
            return jsonify({'error': 'You are not a member of this group'}), 403

        # --- FIX #3 ---
        # Query only 'id' and 'email' from the public 'users' table
        members_resp = categorizer.supabase.table('group_members') \
            .select('users!inner(id, email)') \
            .eq('group_id', group_id) \
            .execute()

        if not members_resp.data:
            print(f"No members found for group {group_id}. Response: {members_resp.error}")
            return jsonify({'error': 'No members found for this group'}), 404

        members = {}
        for item in members_resp.data:
            user = item.get('users') 
            if user and user.get('id'): 
                user_id_str = str(user['id'])
                user_email = user.get('email')
                user_name = user_email.split('@')[0] if user_email else 'Unknown'
                user_avatar = None
                
                # Now, fetch the metadata to get the full_name
                try:
                    auth_user_resp = categorizer.supabase.auth.admin.get_user_by_id(user_id_str)
                    if hasattr(auth_user_resp, 'user') and auth_user_resp.user:
                        user_meta = auth_user_resp.user.user_metadata or {}
                        user_name = user_meta.get('full_name') or user_name
                        user_avatar = user_meta.get('avatar_url')
                except Exception as e:
                    print(f"Could not fetch metadata for user {user_id_str}: {e}")

                members[user_id_str] = {
                    'id': user_id_str,
                    'name': user_name,
                    'email': user_email,
                    'avatar': user_avatar
                }
            else:
                print(f"Skipping member item with no user data: {item}")

        balances = {user_id: 0.0 for user_id in members.keys()}

        expenses_resp = categorizer.supabase.table('expenses') \
            .select('id, payer_id, amount') \
            .eq('group_id', group_id) \
            .execute()
        
        if expenses_resp.data:
            expense_ids = [exp['id'] for exp in expenses_resp.data]
            
            if not expense_ids: # No expenses, so no splits to fetch
                print("No expenses found for group, skipping splits.")
            else:
                splits_resp = categorizer.supabase.table('expense_split') \
                    .select('expense_id, user_id, amount_owed') \
                    .in_('expense_id', expense_ids) \
                    .execute()
                
                splits_by_expense = {}
                if splits_resp.data:
                    for split in splits_resp.data:
                        exp_id = split['expense_id']
                        if exp_id not in splits_by_expense:
                            splits_by_expense[exp_id] = []
                        splits_by_expense[exp_id].append(split)

                for expense in expenses_resp.data:
                    payer_id = str(expense['payer_id'])
                    amount = float(expense.get('amount', 0))

                    if payer_id in balances:
                        balances[payer_id] += amount # You paid

                    splits = splits_by_expense.get(expense['id'], [])
                    for split in splits:
                        owed_user_id = str(split['user_id'])
                        amount_owed = float(split.get('amount_owed', 0))
                        if owed_user_id in balances:
                            balances[owed_user_id] -= amount_owed # You owe

        settlements = []
        creditors = {uid: b for uid, b in balances.items() if b > 0.01}
        debtors = {uid: b for uid, b in balances.items() if b < -0.01}

        cred_list = sorted(creditors.items(), key=lambda x: x[1], reverse=True)
        debt_list = sorted(debtors.items(), key=lambda x: x[1])

        cred_idx = 0
        debt_idx = 0

        while cred_idx < len(cred_list) and debt_idx < len(debt_list):
            cred_id, cred_amt = cred_list[cred_idx]
            debt_id, debt_amt = debt_list[debt_idx]
            
            payment = min(cred_amt, abs(debt_amt))
            payment = round(payment, 2)

            if payment == 0:
                break 

            settlements.append({
                'from_id': debt_id,
                'from_name': members.get(debt_id, {}).get('name', 'Unknown'),
                'to_id': cred_id,
                'to_name': members.get(cred_id, {}).get('name', 'Unknown'),
                'amount': payment
            })

            new_cred_amt = round(cred_amt - payment, 2)
            new_debt_amt = round(debt_amt + payment, 2)

            if new_cred_amt <= 0.01:
                cred_idx += 1
            else:
                cred_list[cred_idx] = (cred_id, new_cred_amt)
                
            if new_debt_amt >= -0.01:
                debt_idx += 1
            else:
                debt_list[debt_idx] = (debt_id, new_debt_amt)

        final_balances = [
            {
                'user_id': uid,
                'name': members[uid]['name'],
                'avatar': members[uid].get('avatar'),
                'email': members[uid]['email'],
                'balance': round(balances.get(uid, 0.0), 2)
            } for uid in members
        ]

        return jsonify({
            'balances': final_balances,
            'settlements': settlements
        })

    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error in get_group_balances: {str(e)}\n{error_trace}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e),
            'trace': error_trace
        }), 500


@app.route('/api/groups/<group_id>/settle', methods=['POST'])
def settle_up(group_id):
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing or invalid authorization token'}), 401
    
    jwt = auth_header.split(' ')[1]
    data = request.get_json()

    try:
        # --- 1. Authenticate user ---
        user_response = categorizer.supabase.auth.get_user(jwt)
        if not user_response.user:
            return jsonify({'error': 'Invalid user token'}), 401
        user_id = user_response.user.id

        # --- 2. Validate Input Data ---
        from_id = data.get('from_id')
        to_id = data.get('to_id')
        amount = data.get('amount')

        if not all([from_id, to_id, amount]):
            return jsonify({'error': 'Missing from_id, to_id, or amount'}), 400
        
        try:
            amount_float = float(amount)
            if amount_float <= 0:
                raise ValueError()
        except ValueError:
            return jsonify({'error': 'Invalid amount'}), 400
        
        # --- 3. Check if user is part of this group (Authorization) ---
        member_check = categorizer.supabase.table('group_members') \
            .select('user_id') \
            .eq('group_id', group_id) \
            .eq('user_id', user_id) \
            .maybe_single() \
            .execute()
        
        if not member_check.data:
            return jsonify({'error': 'You are not a member of this group'}), 403
        
        # --- 4. Create the Settlement Expense ---
        from_user_name = "Unknown"
        to_user_name = "Unknown"
        try:
            # --- THIS IS THE FIX ---
            # We must default .user_metadata to an empty dict in case it is None
            
            from_user_resp = categorizer.supabase.auth.admin.get_user_by_id(from_id)
            if from_user_resp.user:
                user_meta = from_user_resp.user.user_metadata or {} # <-- This is the fix
                from_user_name = user_meta.get('full_name') or from_user_name
                
            to_user_resp = categorizer.supabase.auth.admin.get_user_by_id(to_id)
            if to_user_resp.user:
                user_meta = to_user_resp.user.user_metadata or {} # <-- This is the fix
                to_user_name = user_meta.get('full_name') or to_user_name
            # --- END OF FIX ---

        except Exception as e:
            print(f"Error fetching user names for settlement: {e}")

        expense_desc = f"Settlement: {from_user_name} paid {to_user_name}"

        expense_payload = {
            'description': expense_desc,
            'amount': amount_float,
            'category': 'Settlement',
            'payer_id': from_id, # The person who was in debt is the "payer"
            'group_id': group_id,
            'date': datetime.now().isoformat()
        }

        expense_result = categorizer.supabase.table('expenses') \
    .insert(expense_payload) \
    .execute()
        
        if not expense_result.data or not hasattr(expense_result, 'data'):
            print(f"Error creating expense: {getattr(expense_result, 'error', 'Unknown')}")
            return jsonify({'error': 'Failed to create settlement expense'}), 500
        
        new_expense_id = expense_result.data[0]['id']

        # --- 5. Create the Split ---
        split_payload = {
            'expense_id': new_expense_id,
            'user_id': to_id, # The person who was *owed* money "owes" for this tx
            'amount_owed': amount_float
        }

        split_result = categorizer.supabase.table('expense_split') \
            .insert([split_payload]) \
            .execute()

        if not split_result.data or not hasattr(split_result, 'data'):
            # Rollback: delete the expense
            print(f"Error creating split: {getattr(split_result, 'error', 'Unknown')}")
            categorizer.supabase.table('expenses').delete().eq('id', new_expense_id).execute()
            return jsonify({'error': 'Failed to create settlement split'}), 500

        return jsonify({'message': 'Settlement recorded successfully'}), 201

    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error in settle_up: {str(e)}\n{error_trace}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e),
            'trace': error_trace
        }), 500


if __name__ == '__main__':
    app.run(debug=True, port=8000)
