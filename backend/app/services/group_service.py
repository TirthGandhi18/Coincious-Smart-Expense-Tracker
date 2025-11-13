# app/services/group_service.py
from app.extensions import supabase
import traceback
import json
from app.services.notification_service import log_notification

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
            if user_paid_expenses and hasattr(user_paid_expenses, 'data'):
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
                if user_owed_splits and hasattr(user_owed_splits, 'data'):
                 for split in (user_owed_splits.data or []):
                    user_balance -= float(split.get('amount_owed', 0))
            
            group['member_count'] = member_count_resp.count if member_count_resp else 0
            group['total_expenses'] = sum(float(exp.get('amount', 0)) for exp in (expenses_resp.data or [])) if expenses_resp and hasattr(expenses_resp, 'data') else 0
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
        
        if expenses_result and hasattr(expenses_result, 'data') and expenses_result.data:
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
        
        supabase.table('group_invitations') \
            .delete() \
            .eq('group_id', group_id) \
            .execute()
        print("Deleted all group invitations")

        supabase.table('notifications') \
            .delete() \
            .eq('data->>group_id', group_id) \
            .execute()
        print("Deleted all group-related notifications")
        
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
        if not requesting_user:
            return {'error': 'Invalid user token'}, 401

        if not data or 'email' not in data:
            return {'error': 'Email is required'}, 400

        # --- 1. Check if requesting user is in the group and fetch group info ---
        group_response = supabase.table('group_members') \
            .select('groups(id, name)') \
            .eq('group_id', group_id) \
            .eq('user_id', requesting_user.id) \
            .maybe_single() \
            .execute()

        if not group_response or not hasattr(group_response, 'data') or not group_response.data or not group_response.data.get('groups'):
            return {'error': 'Group not found or access denied'}, 404

        group = group_response.data.get('groups')

        # --- 2. Find target user by email ---
        target_user_id = None
        target_user_email = data['email'].lower()
        target_user_name_from_input = data.get('name', '').strip()

        user_response = supabase.table('users') \
            .select('*') \
            .eq('email', target_user_email) \
            .maybe_single() \
            .execute()

        user_data = user_response.data if user_response and hasattr(user_response, 'data') else None

        if user_data:
            target_user_id = user_data['id']
        else:
            # Not in public.users → check auth.users
            try:
                rpc_response = supabase.rpc('get_user_by_email', {
                    'user_email': target_user_email
                }).execute()

                if not rpc_response or not hasattr(rpc_response, 'data') or not rpc_response.data:
                    return {'error': 'User with this email does not exist in the system'}, 404

                auth_user_data = rpc_response.data[0]
                target_user_id = auth_user_data['id']
                target_user_metadata = auth_user_data.get('raw_user_meta_data', {}) or {}

                # Create entry in public.users
                public_user_name = (
                    target_user_metadata.get('full_name') or
                    target_user_name_from_input or
                    target_user_email.split('@')[0]
                )
                new_user_record = {
                    'id': target_user_id,
                    'email': target_user_email,
                    'name': public_user_name
                }
                upsert_resp = supabase.table('users').upsert(new_user_record).execute()
                if not upsert_resp or (hasattr(upsert_resp, 'error') and upsert_resp.error):
                    print(f"Error upserting user to public.users: {getattr(upsert_resp, 'error', 'Unknown')}")
                    return {'error': 'Failed to create user profile'}, 500

            except Exception as e:
                print(f"Error looking up user in auth.users: {str(e)}")
                return {'error': 'Error looking up user information'}, 500

        # --- 3. Pre-invitation checks ---
        if str(target_user_id) == str(requesting_user.id):
            return {'error': 'You cannot invite yourself to the group'}, 400

        existing_member = supabase.table('group_members') \
            .select('*') \
            .eq('group_id', group_id) \
            .eq('user_id', target_user_id) \
            .maybe_single() \
            .execute()

        if existing_member and hasattr(existing_member, 'data') and existing_member.data:
            return {'error': 'User is already a member of this group'}, 409

        existing_invitation = supabase.table('group_invitations') \
            .select('id') \
            .eq('group_id', group_id) \
            .eq('invited_user_id', target_user_id) \
            .eq('status', 'pending') \
            .maybe_single() \
            .execute()

        if existing_invitation and hasattr(existing_invitation, 'data') and existing_invitation.data:
            return {'error': 'User already has a pending invitation for this group'}, 409

        # --- 4. Create Invitation ---
        invitation_payload = {
            'group_id': group_id,
            'invited_by_id': requesting_user.id,
            'invited_user_id': target_user_id,
            'status': 'pending'
        }

        invitation_result = supabase.table('group_invitations').insert(invitation_payload).execute()
        if not invitation_result or not hasattr(invitation_result, 'data') or not invitation_result.data:
            return {'error': 'Failed to create invitation'}, 500

        new_invitation_id = invitation_result.data[0]['id']

        # --- 5. Create Notification ---
        requesting_user_name = requesting_user.user_metadata.get('full_name', requesting_user.email)
        notification_payload = {
            'user_id': target_user_id,
            'actor_id': requesting_user.id,
            'type': 'group_invitation',
            'actionable': True,
            'message': f"{requesting_user_name} invited you to join \"{group['name']}\"",
            'data': {
                'invitation_id': new_invitation_id,
                'group_id': group_id,
                'group_name': group['name'],
                'inviter_name': requesting_user_name
            }
        }

        notification_result = supabase.table('notifications').insert(notification_payload).execute()
        if not notification_result or not hasattr(notification_result, 'data') or not notification_result.data:
            # rollback
            supabase.table('group_invitations').delete().eq('id', new_invitation_id).execute()
            return {'error': 'Failed to send notification'}, 500

        return {'message': 'Invitation sent successfully'}, 201

    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error adding member: {str(e)}\n{error_trace}")
        return {'error': str(e), 'trace': error_trace}, 500

# --- GET /groups/<id>/balances ---
def get_group_balances(group_id, user_id):
    try:
        # Step 1: Check if user is part of the group
        member_check = supabase.table('group_members') \
            .select('user_id') \
            .eq('group_id', group_id) \
            .eq('user_id', user_id) \
            .maybe_single() \
            .execute()

        if not member_check or not hasattr(member_check, 'data') or not member_check.data:
            return {'error': 'You are not a member of this group'}, 403

        # Step 2: Fetch group members and their emails
        members_resp = supabase.table('group_members') \
            .select('users!inner(id, email)') \
            .eq('group_id', group_id) \
            .execute()

        if not members_resp or not hasattr(members_resp, 'data') or not members_resp.data:
            print(f"No members found for group {group_id}. Response: {getattr(members_resp, 'error', 'Unknown')}")
            return {'error': 'No members found for this group'}, 404

        # Step 3: Build members dictionary with full_name + avatar
        members = {}
        for item in members_resp.data:
            user = item.get('users')
            if user and user.get('id'):
                user_id_str = str(user['id'])
                user_email = user.get('email')
                user_name = user_email.split('@')[0] if user_email else 'Unknown'
                user_avatar = None

                # Fetch user metadata from auth
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

        # Step 4: Initialize balances
        balances = {uid: 0.0 for uid in members.keys()}

        # Step 5: Fetch all group expenses
        expenses_resp = supabase.table('expenses') \
            .select('id, payer_id, amount') \
            .eq('group_id', group_id) \
            .execute()

        if expenses_resp and hasattr(expenses_resp, 'data') and expenses_resp.data:
            expense_ids = [exp['id'] for exp in expenses_resp.data]

            if expense_ids:
                # Step 6: Fetch expense splits for all expenses
                splits_resp = supabase.table('expense_split') \
                    .select('expense_id, user_id, amount_owed') \
                    .in_('expense_id', expense_ids) \
                    .execute()

                splits_by_expense = {}
                if splits_resp and hasattr(splits_resp, 'data') and splits_resp.data:
                    for split in splits_resp.data:
                        exp_id = split['expense_id']
                        if exp_id not in splits_by_expense:
                            splits_by_expense[exp_id] = []
                        splits_by_expense[exp_id].append(split)

                # Step 7: Update balances
                for expense in expenses_resp.data:
                    payer_id = str(expense['payer_id'])
                    amount = float(expense.get('amount', 0))

                    if payer_id in balances:
                        balances[payer_id] += amount  # Paid -> positive

                    splits = splits_by_expense.get(expense['id'], [])
                    for split in splits:
                        owed_user_id = str(split['user_id'])
                        amount_owed = float(split.get('amount_owed', 0))
                        if owed_user_id in balances:
                            balances[owed_user_id] -= amount_owed  # Owes -> negative

        # Step 8: Compute settlements
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

        # Step 9: Final balances output
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
        
        # --- Authorization: Check if user is a member of this group ---
        member_check = supabase.table('group_members') \
            .select('user_id') \
            .eq('group_id', group_id) \
            .eq('user_id', user_id) \
            .maybe_single() \
            .execute()
        
        if not member_check or not hasattr(member_check, 'data') or not member_check.data:
            return {'error': 'You are not a member of this group'}, 403
        
        # --- Fetch User Names for Settlement Description ---
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

        # --- Create the Settlement Expense ---
        expense_desc = f"Settlement: {from_user_name} paid {to_user_name}"

        expense_payload = {
            'description': expense_desc,
            'amount': amount_float,
            'category': 'Settlement',
            'payer_id': from_id,
            'group_id': group_id,
            'date': datetime.now().isoformat()
        }

        expense_result = supabase.table('expenses').insert(expense_payload).execute()
        
        if not expense_result or not hasattr(expense_result, 'data') or not expense_result.data:
            print(f"Error creating expense: {getattr(expense_result, 'error', 'Unknown')}")
            return {'error': 'Failed to create settlement expense'}, 500
        
        new_expense_id = expense_result.data[0]['id']

        # --- Create the Split ---
        split_payload = {
            'expense_id': new_expense_id,
            'user_id': to_id,
            'amount_owed': amount_float
        }

        split_result = supabase.table('expense_split').insert([split_payload]).execute()

        if not split_result or not hasattr(split_result, 'data') or not split_result.data:
            # Rollback: delete the expense
            print(f"Error creating split: {getattr(split_result, 'error', 'Unknown')}")
            supabase.table('expenses').delete().eq('id', new_expense_id).execute()
            return {'error': 'Failed to create settlement split'}, 500

        log_notification(
                user_id=to_id,
                actor_id=from_id,
                type='settlement',
                message=f"{from_user_name} confirmed they paid you ${amount_float:.2f} for the group balance.",
                group_id=group_id,
                related_expense_id=new_expense_id
            )

            # Clear pending debt-related notifications for the sender
        supabase.table('notifications') \
                .delete() \
                .eq('user_id', from_id) \
                .eq('data->>group_id', group_id) \
                .in_('type', ['expense_owed', 'reminder', 'settlement_request']) \
                .execute()

        return {'message': 'Settlement recorded successfully'}, 201

    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error in settle_group_balance: {str(e)}\n{error_trace}")
        return {'error': 'Internal server error', 'details': str(e), 'trace': error_trace}, 500
