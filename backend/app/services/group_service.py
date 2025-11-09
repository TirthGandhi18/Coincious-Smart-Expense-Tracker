# app/services/group_service.py
from app.extensions import supabase
import traceback

# --- GET /groups ---
def get_user_groups(user_id):
    try:
        print("Fetching user's groups...")
        # Step 1: Get the list of groups the user is in
        result = supabase.table('group_members') \
            .select('group_id, groups(*)') \
            .eq('user_id', user_id) \
            .execute()
        
        if not result or not hasattr(result, 'data'):
            print(f"Query error or no data returned for user {user_id}")
            return {'error': 'Failed to fetch groups', 'details': 'No data returned from database.'}, 500

        groups_list = [group['groups'] for group in result.data if group['groups']]
        
        # Step 2: Enrich each group with member count and total expenses
        enriched_groups = []
        for group in groups_list:
            group_id = group['id']
            
            # Get member count
            member_count_resp = supabase.table('group_members') \
                .select('user_id', count='exact') \
                .eq('group_id', group_id) \
                .execute()
            
            # Get total expenses (excluding settlements)
            expenses_resp = supabase.table('expenses') \
                .select('amount') \
                .eq('group_id', group_id) \
                .neq('category', 'Settlement') \
                .execute()
            
            # Calculate user's balance in this group
            user_balance = 0.0
            
            # Get all expenses where user is the payer
            user_paid_expenses = supabase.table('expenses') \
                .select('amount') \
                .eq('group_id', group_id) \
                .eq('payer_id', user_id) \
                .execute()
            
            # Add amounts user paid
            for exp in (user_paid_expenses.data or []):
                user_balance += float(exp.get('amount', 0))
            
            # Get all expense splits where user is involved
            expense_ids_resp = supabase.table('expenses') \
                .select('id') \
                .eq('group_id', group_id) \
                .execute()
            
            if expense_ids_resp and hasattr(expense_ids_resp, 'data') and expense_ids_resp.data:
                expense_id_list = [exp['id'] for exp in expense_ids_resp.data]
                
                # Get all splits where user owes money
                user_owed_splits = supabase.table('expense_split') \
                    .select('amount_owed') \
                    .in_('expense_id', expense_id_list) \
                    .eq('user_id', user_id) \
                    .execute()
                
                # Subtract amounts user owes
                for split in (user_owed_splits.data or []):
                    user_balance -= float(split.get('amount_owed', 0))
            
            group['member_count'] = member_count_resp.count if member_count_resp else 0
            group['total_expenses'] = sum(float(exp.get('amount', 0)) for exp in (expenses_resp.data or []))
            group['your_balance'] = round(user_balance, 2)
            
            enriched_groups.append(group)

        print(f"Found and enriched {len(enriched_groups)} groups for user {user_id}")
        
        return {'success': True, 'groups': enriched_groups}, 200
        
    except Exception as e:
        print(f"Unexpected error in get_user_groups: {str(e)}")
        return {'error': 'Internal server error', 'details': str(e)}, 500

# --- POST /groups ---
def create_new_group(user_id, group_name):
    if not group_name:
        return {'error': 'Group name is required'}, 400
    
    try:
        group_data = {
            'name': group_name,
            'created_by': user_id
        }
        
        print(f"Creating group with data: {group_data}")
        
        result = supabase.table('groups').insert(group_data).execute()
        
        if not result or not hasattr(result, 'data') or not result.data:
            print(f"Error creating group, no data returned: {getattr(result, 'error', 'Unknown error')}")
            return {'error': f'Database error: {getattr(result, "error", "Failed to create group")}'}, 500
            
        group = result.data[0]
        print(f"Created group: {group}")
        
        member_data = {
            'group_id': group['id'],
            'user_id': user_id
        }
        
        print(f"Adding group member: {member_data}")
        
        member_result = supabase.table('group_members').insert(member_data).execute()
        
        if not member_result or not hasattr(member_result, 'data'):
            print(f"Error adding member to group: {getattr(member_result, 'error', 'Unknown error')}")
            # Rollback: Delete the group we just created
            supabase.table('groups').delete().eq('id', group['id']).execute()
            return {'error': f'Failed to add member to group: {getattr(member_result, "error", "Insert failed")}'}, 500
            
        print("Group and member created successfully")
            
        return {
            'group': {
                'id': group['id'],
                'name': group['name'],
                'created_at': group.get('created_at'),
                'updated_at': group.get('updated_at'),
                'member_count': 1
            }
        }, 201
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error in create_group: {str(e)}\n{error_trace}")
        return {'error': 'Internal server error', 'details': str(e), 'trace': error_trace}, 500

# --- GET /groups/<id>/members ---
def get_group_members(group_id, user_id):
    try:
        member_check = supabase.table('group_members') \
            .select('*') \
            .eq('group_id', group_id) \
            .eq('user_id', user_id) \
            .execute()
        
        if not member_check or not hasattr(member_check, 'data') or not member_check.data:
            return {'error': 'You are not a member of this group'}, 403
        
        members_result = supabase.table('group_members') \
            .select('users!inner(id, email)') \
            .eq('group_id', group_id) \
            .execute()
        
        if not members_result or not hasattr(members_result, 'data'):
            print(f"Error getting members for group {group_id}: {getattr(members_result, 'error', 'No data returned')}")
            return {'error': 'Failed to fetch group members'}, 500

        members = []
        for member in members_result.data or []:
            user = member.get('users', {})
            if user and user.get('id'):
                user_id_str = str(user['id'])
                user_email = user.get('email')
                user_name = user_email.split('@')[0] if user_email else 'Unknown'
                user_avatar = None

                try:
                    auth_user_resp = supabase.auth.admin.get_user_by_id(user_id_str)
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
            
        return {'members': members}, 200
        
    except Exception as e:
        print(f"Error getting group members: {str(e)}")
        traceback.print_exc()
        return {'error': 'Failed to fetch group members', 'details': str(e)}, 500

# --- GET /groups/<id> ---
def get_group_detail(group_id, user_id):
    try:
        member_check = supabase.table('group_members') \
            .select('*') \
            .eq('group_id', group_id) \
            .eq('user_id', user_id) \
            .execute()
        
        if not member_check or not hasattr(member_check, 'data') or not member_check.data:
            return {'error': 'You are not a member of this group'}, 403
        
        group_result = supabase.table('groups') \
            .select('*') \
            .eq('id', group_id) \
            .execute()
        
        if not group_result or not hasattr(group_result, 'data') or not group_result.data:
            return {'error': 'Group not found'}, 404
        
        group = group_result.data[0]
        
        members_result = supabase.table('group_members') \
            .select('user_id', count='exact') \
            .eq('group_id', group_id) \
            .execute()
        
        expenses_result = supabase.table('expenses') \
            .select('amount') \
            .eq('group_id', group_id) \
            .neq('category', 'Settlement') \
            .execute()
        
        total_expenses = sum(float(exp.get('amount', 0)) for exp in (expenses_result.data or [])) if expenses_result and hasattr(expenses_result, 'data') else 0
        member_count = members_result.count if members_result else 0
        
        return {
            'group': group,
            'member_count': member_count,
            'total_expenses': total_expenses
        }, 200
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error in get_group_detail: {str(e)}\n{error_trace}")
        return {'error': 'Internal server error', 'details': str(e), 'trace': error_trace}, 500

# --- DELETE /groups/<id> ---
def delete_group(group_id, user_id):
    try:
        print(f"User {user_id} attempting to delete group {group_id}")
        
        group_result = supabase.table('groups') \
            .select('created_by') \
            .eq('id', group_id) \
            .maybe_single() \
            .execute()
        
        if not group_result or not hasattr(group_result, 'data') or not group_result.data:
            print("Group not found")
            return {'error': 'Group not found'}, 404
            
        group_data = group_result.data
        print(f"Group created by: {group_data.get('created_by')}")
        
        if str(group_data.get('created_by')) != str(user_id):
            print("Permission denied")
            return {'error': 'You do not have permission to delete this group'}, 403
        
        print(f"Permission granted. Deleting group {group_id} and related data...")
        
        expenses_result = supabase.table('expenses') \
            .select('id') \
            .eq('group_id', group_id) \
            .execute()
        
        if expenses_result.data:
            expense_ids = [exp['id'] for exp in expenses_result.data]
            if expense_ids:
                supabase.table('expense_split') \
                    .delete() \
                    .in_('expense_id', expense_ids) \
                    .execute()
                print(f"Deleted expense splits for {len(expense_ids)} expenses")
        
        supabase.table('expenses') \
            .delete() \
            .eq('group_id', group_id) \
            .execute()
        print("Deleted all expenses")
        
        supabase.table('group_members') \
            .delete() \
            .eq('group_id', group_id) \
            .execute()
        print("Deleted all group members")
        
        delete_result = supabase.table('groups') \
            .delete() \
            .eq('id', group_id) \
            .execute()

        if not delete_result or not hasattr(delete_result, 'data') or not delete_result.data:
            print(f"Delete failed: {getattr(delete_result, 'error', 'Unknown error')}")
            return {'error': 'Failed to delete group'}, 500

        print(f"Group {group_id} and all related data deleted successfully.")
        return {'message': 'Group deleted successfully'}, 200
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error in delete_group: {str(e)}\n{error_trace}")
        return {'error': 'Internal server error', 'details': str(e), 'trace': error_trace}, 500

# --- POST /groups/<id>/add-member ---
def add_group_member(group_id, requesting_user, data):
    try:
        if not data or 'email' not in data:
            return {'error': 'Email is required'}, 400
            
        group_response = supabase.table('group_members') \
            .select('user_id') \
            .eq('group_id', group_id) \
            .eq('user_id', requesting_user.id) \
            .maybe_single() \
            .execute()

        if not group_response.data:
            return {'error': 'Group not found or access denied'}, 404
            
        target_user_id = None
        target_user_email = data['email'].lower()
        target_user_metadata = {}
        target_user_name_from_input = data.get('name', '').strip()

        # 1. Check public 'users' table first
        user_response = supabase.table('users') \
            .select('*') \
            .eq('email', target_user_email) \
            .maybe_single() \
            .execute()
        
        user_data = user_response.data if user_response and hasattr(user_response, 'data') else None

        if user_data:
            print(f"Found user in public.users: {user_data['id']}")
            target_user_id = user_data['id']
            try:
                auth_user_resp = supabase.auth.admin.get_user_by_id(target_user_id)
                if auth_user_resp.user:
                    target_user_metadata = auth_user_resp.user.user_metadata or {}
            except Exception as e:
                print(f"Could not fetch metadata for existing user {target_user_id}: {e}")

        else:
            # 2. User not in public.users, check auth.users via RPC
            print(f"User not in public.users, checking auth...")
            try:
                rpc_response = supabase.rpc('get_user_by_email', {
                    'user_email': target_user_email
                }).execute()
                
                if not rpc_response.data:
                    return {'error': 'User with this email does not exist in the system'}, 404
                    
                auth_user_data = rpc_response.data[0]
                target_user_id = auth_user_data['id']
                target_user_metadata = auth_user_data.get('raw_user_meta_data', {}) or {}
                print(f"Found user in auth: {target_user_id}")

                public_user_name = target_user_metadata.get('full_name') or target_user_name_from_input or target_user_email.split('@')[0]
                
                new_user_record = {
                    'id': target_user_id,
                    'email': target_user_email,
                    'full_name': public_user_name
                }
                
                print(f"Creating public user record: {new_user_record}")
                upsert_resp = supabase.table('users').upsert(new_user_record).execute()
                if not upsert_resp.data and (hasattr(upsert_resp, 'error') and upsert_resp.error):
                    print(f"Error upserting user to public.users: {getattr(upsert_resp, 'error', 'Unknown')}")
                    return {'error': 'Failed to create user profile'}, 500

            except Exception as e:
                print(f"Error looking up user in auth.users: {str(e)}")
                return {'error': 'Error looking up user information'}, 500
            
        # 3. Check if user is already in the group
        existing_member = supabase.table('group_members') \
            .select('*') \
            .eq('group_id', group_id) \
            .eq('user_id', target_user_id) \
            .maybe_single() \
            .execute()
            
        if existing_member and hasattr(existing_member, 'data') and existing_member.data:
            return {'error': 'User is already a member of this group'}, 409
            
        # 4. Add user to group_members
        member_data = {
            'group_id': group_id,
            'user_id': target_user_id
        }
        
        result = supabase.table('group_members').insert([member_data]).execute()

        if not result or not hasattr(result, 'data'):
            print(f"Error inserting new member: {getattr(result, 'error', 'Unknown error')}")
            return {'error': 'Failed to add member to group database'}, 500

        full_name = target_user_metadata.get('full_name', target_user_name_from_input or target_user_email.split('@')[0])
        
        return {
            'message': 'Member added successfully',
            'member': {
                'id': target_user_id,
                'email': target_user_email,
                'name': full_name,
                'role': 'member'
            }
        }, 201
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error adding member: {str(e)}\n{error_trace}")
        return {'error': str(e), 'trace': error_trace}, 500

# --- GET /groups/<id>/balances ---
def get_group_balances(group_id, user_id):
    try:
        member_check = supabase.table('group_members') \
            .select('user_id') \
            .eq('group_id', group_id) \
            .eq('user_id', user_id) \
            .maybe_single() \
            .execute()
        
        if not member_check.data:
            return {'error': 'You are not a member of this group'}, 403

        members_resp = supabase.table('group_members') \
            .select('users!inner(id, email)') \
            .eq('group_id', group_id) \
            .execute()

        if not members_resp.data:
            print(f"No members found for group {group_id}. Response: {getattr(members_resp, 'error', 'No data')}")
            return {'error': 'No members found for this group'}, 404

        members = {}
        for item in members_resp.data:
            user = item.get('users') 
            if user and user.get('id'): 
                user_id_str = str(user['id'])
                user_email = user.get('email')
                user_name = user_email.split('@')[0] if user_email else 'Unknown'
                user_avatar = None
                
                try:
                    auth_user_resp = supabase.auth.admin.get_user_by_id(user_id_str)
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

        expenses_resp = supabase.table('expenses') \
            .select('id, payer_id, amount') \
            .eq('group_id', group_id) \
            .execute()
        
        if expenses_resp.data:
            expense_ids = [exp['id'] for exp in expenses_resp.data]
            
            if not expense_ids:
                print("No expenses found for group, skipping splits.")
            else:
                splits_resp = supabase.table('expense_split') \
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

        return {
            'balances': final_balances,
            'settlements': settlements
        }, 200

    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error in get_group_balances: {str(e)}\n{error_trace}")
        return {'error': 'Internal server error', 'details': str(e), 'trace': error_trace}, 500

# --- POST /groups/<id>/settle ---
def settle_group_balance(group_id, user_id, data):
    from datetime import datetime
    try:
        from_id = data.get('from_id')
        to_id = data.get('to_id')
        amount = data.get('amount')

        if not all([from_id, to_id, amount]):
            return {'error': 'Missing from_id, to_id, or amount'}, 400
        
        try:
            amount_float = float(amount)
            if amount_float <= 0:
                raise ValueError()
        except ValueError:
            return {'error': 'Invalid amount'}, 400
        
        member_check = supabase.table('group_members') \
            .select('user_id') \
            .eq('group_id', group_id) \
            .eq('user_id', user_id) \
            .maybe_single() \
            .execute()
        
        if not member_check.data:
            return {'error': 'You are not a member of this group'}, 403
        
        from_user_name = "Unknown"
        to_user_name = "Unknown"
        try:
            from_user_resp = supabase.auth.admin.get_user_by_id(from_id)
            if from_user_resp.user:
                user_meta = from_user_resp.user.user_metadata or {}
                from_user_name = user_meta.get('full_name') or from_user_name
                
            to_user_resp = supabase.auth.admin.get_user_by_id(to_id)
            if to_user_resp.user:
                user_meta = to_user_resp.user.user_metadata or {}
                to_user_name = user_meta.get('full_name') or to_user_name

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

        expense_result = supabase.table('expenses') \
            .insert(expense_payload) \
            .execute()
        
        if not expense_result.data or not hasattr(expense_result, 'data'):
            print(f"Error creating expense: {getattr(expense_result, 'error', 'Unknown')}")
            return {'error': 'Failed to create settlement expense'}, 500
        
        new_expense_id = expense_result.data[0]['id']

        split_payload = {
            'expense_id': new_expense_id,
            'user_id': to_id, # The person who was *owed* money "owes" for this tx
            'amount_owed': amount_float
        }

        split_result = supabase.table('expense_split') \
            .insert([split_payload]) \
            .execute()

        if not split_result.data or not hasattr(split_result, 'data'):
            # Rollback: delete the expense
            print(f"Error creating split: {getattr(split_result, 'error', 'Unknown')}")
            supabase.table('expenses').delete().eq('id', new_expense_id).execute()
            return {'error': 'Failed to create settlement split'}, 500

        return {'message': 'Settlement recorded successfully'}, 201

    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error in settle_up: {str(e)}\n{error_trace}")
        return {'error': 'Internal server error', 'details': str(e), 'trace': error_trace}, 500