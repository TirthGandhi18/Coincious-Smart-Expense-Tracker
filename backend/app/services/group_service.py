from app.extensions import supabase
import traceback
import json
from app.services.notification_service import log_notification

def get_user_groups(user_id):
    try:
        print(f"Fetching user's groups via RPC for user: {user_id}")
        result = supabase.rpc('get_user_groups_summary', {'p_user_id': user_id}).execute()
        if not result or not result.data:
            return {'success': True, 'groups': []}, 200
        groups = []
        for item in result.data:
            groups.append({
                'id': item['id'],
                'name': item['name'],
                'created_at': item['created_at'],
                'updated_at': item['created_at'], 
                'member_count': item['member_count'],
                'total_expenses': float(item['total_expenses'] or 0),
                'your_balance': float(item['your_balance'] or 0)
            })

        return {'success': True, 'groups': groups}, 200
        
    except Exception as e:
        print(f"Error in get_user_groups RPC: {str(e)}")
        traceback.print_exc()
        return {'error': 'Internal server error', 'details': str(e)}, 500

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
            print(f"Delete failed: {getattr(delete_result, 'error', 'Unknown')}")
            return {'error': 'Failed to delete group'}, 500

        print(f"Group {group_id} and all related data deleted successfully.")
        return {'message': 'Group deleted successfully'}, 200
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error in delete_group: {str(e)}\n{error_trace}")
        return {'error': 'Internal server error', 'details': str(e), 'trace': error_trace}, 500

def add_group_member(group_id, requesting_user, data):
    try:
        if not requesting_user:
            return {'error': 'Invalid user token'}, 401

        if not data or 'email' not in data:
            return {'error': 'Email is required'}, 400

        group_response = supabase.table('group_members') \
            .select('groups(id, name)') \
            .eq('group_id', group_id) \
            .eq('user_id', requesting_user.id) \
            .maybe_single() \
            .execute()

        if not group_response or not hasattr(group_response, 'data') or not group_response.data or not group_response.data.get('groups'):
            return {'error': 'Group not found or access denied'}, 404

        group = group_response.data.get('groups')

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
            try:
                rpc_response = supabase.rpc('get_user_by_email', {
                    'user_email': target_user_email
                }).execute()

                if not rpc_response or not hasattr(rpc_response, 'data') or not rpc_response.data:
                    return {'error': 'User with this email does not exist in the system'}, 404

                auth_user_data = rpc_response.data[0]
                target_user_id = auth_user_data['id']
                target_user_metadata = auth_user_data.get('raw_user_meta_data', {}) or {}

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

            supabase.table('group_invitations').delete().eq('id', new_invitation_id).execute()
            return {'error': 'Failed to send notification'}, 500

        return {'message': 'Invitation sent successfully'}, 201

    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error adding member: {str(e)}\n{error_trace}")
        return {'error': str(e), 'trace': error_trace}, 500

# backend/app/services/group_service.py

def get_group_detail(group_id, user_id):
    try:
        # 1. Check Membership
        member_check = supabase.table('group_members').select('user_id').eq('group_id', group_id).eq('user_id', user_id).maybe_single().execute()
        if not member_check.data: return {'error': 'You are not a member of this group'}, 403
        
        # 2. Get Group Info
        group_result = supabase.table('groups').select('*').eq('id', group_id).maybe_single().execute()
        if not group_result.data: return {'error': 'Group not found'}, 404
        
        # 3. Get Member Count (Count only)
        members_result = supabase.table('group_members').select('user_id', count='exact', head=True).eq('group_id', group_id).execute()
        
        # 4. Get Total Expenses via Fast Database Function
        total_resp = supabase.rpc('get_group_total_expenses', {'p_group_id': group_id}).execute()
        total_expenses = float(total_resp.data) if total_resp.data is not None else 0.0
        
        return {
            'group': group_result.data,
            'member_count': members_result.count or 0,
            'total_expenses': total_expenses
        }, 200
    except Exception as e:
        return {'error': 'Internal server error'}, 500

def get_group_members(group_id, user_id):
    try:
        # 1. Check Membership
        member_check = supabase.table('group_members').select('user_id').eq('group_id', group_id).eq('user_id', user_id).maybe_single().execute()
        if not member_check.data: return {'error': 'You are not a member of this group'}, 403
        
        # 2. Get All Member IDs
        members_result = supabase.table('group_members').select('user_id').eq('group_id', group_id).execute()
        if not members_result.data: return {'members': []}, 200

        member_ids = [m['user_id'] for m in members_result.data]

        # 3. Batch Fetch User Details (1 Query instead of Loop)
        users_resp = supabase.table('users').select('id, email, name, avatar_url').in_('id', member_ids).execute()
        
        members = []
        for u in (users_resp.data or []):
            members.append({
                'id': str(u['id']),
                'email': u.get('email'),
                'name': u.get('name') or u.get('email', 'Unknown').split('@')[0],
                'balance': 0, # Calculated in get_group_balances
                'avatar': u.get('avatar_url')
            })
            
        return {'members': members}, 200
    except Exception as e:
        return {'error': 'Failed to fetch group members'}, 500

def get_group_balances(group_id, user_id):
    try:
        # 1. Check Membership
        member_check = supabase.table('group_members').select('user_id').eq('group_id', group_id).eq('user_id', user_id).maybe_single().execute()
        if not member_check.data: return {'error': 'You are not a member of this group'}, 403

        # 2. Fetch All Members for this Group
        members_resp = supabase.table('group_members').select('user_id').eq('group_id', group_id).execute()
        if not members_resp.data: return {'error': 'No members found'}, 404
        member_ids = [m['user_id'] for m in members_resp.data]

        # 3. Batch Fetch User Info
        users_resp = supabase.table('users').select('id, name, email, avatar_url').in_('id', member_ids).execute()
        members_map = {str(u['id']): u for u in (users_resp.data or [])}
        
        balances = {uid: 0.0 for uid in members_map.keys()}

        # 4. Fetch All Expenses and Splits (2 Queries total)
        expenses = supabase.table('expenses').select('id, payer_id, total_amount').eq('group_id', group_id).execute().data or []
        expense_ids = [e['id'] for e in expenses]
        
        splits = []
        if expense_ids:
            splits = supabase.table('expense_split').select('expense_id, user_id, amount_owed').in_('expense_id', expense_ids).execute().data or []

        # 5. Calculate in Memory
        for exp in expenses:
            pid = str(exp['payer_id'])
            if pid in balances: balances[pid] += float(exp.get('total_amount') or 0)
        
        for s in splits:
            uid = str(s['user_id'])
            if uid in balances: balances[uid] -= float(s.get('amount_owed') or 0)

        # 6. Format Response
        final_balances = []
        for uid, amount in balances.items():
            u = members_map.get(uid, {})
            final_balances.append({
                'user_id': uid,
                'name': u.get('name') or u.get('email', 'Unknown').split('@')[0],
                'email': u.get('email'),
                'avatar': u.get('avatar_url'),
                'balance': round(amount, 2)
            })

        # 7. Calculate Settlements (Simplified logic)
        settlements = []
        # (Settlement calculation logic remains similar to original but using in-memory data)
        creditors = sorted([(uid, b) for uid, b in balances.items() if b > 0.01], key=lambda x: x[1], reverse=True)
        debtors = sorted([(uid, b) for uid, b in balances.items() if b < -0.01], key=lambda x: x[1])
        
        i, j = 0, 0
        while i < len(creditors) and j < len(debtors):
            cred_id, cred_amt = creditors[i]
            debt_id, debt_amt = debtors[j]
            payment = min(cred_amt, abs(debt_amt))
            
            settlements.append({
                'from_id': debt_id,
                'from_name': members_map.get(debt_id, {}).get('name', 'Unknown'),
                'to_id': cred_id,
                'to_name': members_map.get(cred_id, {}).get('name', 'Unknown'),
                'amount': round(payment, 2)
            })
            
            new_cred = cred_amt - payment
            new_debt = debt_amt + payment
            
            if new_cred <= 0.01: i += 1
            else: creditors[i] = (cred_id, new_cred)
            
            if new_debt >= -0.01: j += 1
            else: debtors[j] = (debt_id, new_debt)

        return {'balances': final_balances, 'settlements': settlements}, 200

    except Exception as e:
        return {'error': str(e)}, 500
    
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
        
        if not member_check or not hasattr(member_check, 'data') or not member_check.data:
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
            'total_amount': amount_float, 
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
        split_payload = {
            'expense_id': new_expense_id,
            'user_id': to_id,
            'amount_owed': amount_float,
            'status':'settled'
        }

        split_result = supabase.table('expense_split').insert([split_payload]).execute()

        if not split_result or not hasattr(split_result, 'data') or not split_result.data:
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

def remove_group_member(group_id, requesting_user_id, member_to_remove_id):
    try:
        print(f"User {requesting_user_id} attempting to remove member {member_to_remove_id} from group {group_id}")
        
        # 1. Check if requesting user is a member of the group
        requester_member_check = supabase.table('group_members') \
            .select('user_id') \
            .eq('group_id', group_id) \
            .eq('user_id', requesting_user_id) \
            .maybe_single() \
            .execute()
        
        if not requester_member_check or not hasattr(requester_member_check, 'data') or not requester_member_check.data:
            return {'error': 'You are not a member of this group'}, 403
        
        # 2. Check if member to remove exists in the group
        member_to_remove_check = supabase.table('group_members') \
            .select('user_id') \
            .eq('group_id', group_id) \
            .eq('user_id', member_to_remove_id) \
            .maybe_single() \
            .execute()
        
        if not member_to_remove_check or not hasattr(member_to_remove_check, 'data') or not member_to_remove_check.data:
            return {'error': 'User is not a member of this group'}, 404
        
        # 3. Check if group has more than 1 member (prevent empty groups)
        all_members_count = supabase.table('group_members') \
            .select('user_id', count='exact', head=True) \
            .eq('group_id', group_id) \
            .execute()
        
        if all_members_count.count <= 1:
            return {'error': 'Cannot remove the last member of a group'}, 400
        
        # 4. Check if member has outstanding balances
        balances_response = supabase.table('balances') \
            .select('amount') \
            .eq('group_id', group_id) \
            .eq('user_id', member_to_remove_id) \
            .execute()
        
        if balances_response and balances_response.data:
            total_balance = sum(float(balance.get('amount', 0)) for balance in balances_response.data)
            if abs(total_balance) > 0.01:  # Allow for small floating point differences
                return {'error': f'Cannot remove member with outstanding balance of {total_balance:.2f}'}, 400
        
        # 4. Get group and user details for notifications
        group_result = supabase.table('groups') \
            .select('name, created_by') \
            .eq('id', group_id) \
            .maybe_single() \
            .execute()
        
        if not group_result or not hasattr(group_result, 'data') or not group_result.data:
            return {'error': 'Group not found'}, 404
        
        group_data = group_result.data
        
        # Get requesting user name
        requesting_user_result = supabase.table('users') \
            .select('name') \
            .eq('id', requesting_user_id) \
            .maybe_single() \
            .execute()
        
        requesting_user_name = requesting_user_result.data.get('name', 'Someone') if requesting_user_result.data else 'Someone'
        
        # 5. Remove the member
        print(f"Attempting to remove member {member_to_remove_id} from group {group_id}")
        
        delete_result = supabase.table('group_members') \
            .delete() \
            .eq('group_id', group_id) \
            .eq('user_id', member_to_remove_id) \
            .execute()
        
        print(f"Delete result: {delete_result}")
        
        if not delete_result or not hasattr(delete_result, 'data') or not delete_result.data:
            print(f"Delete failed: {getattr(delete_result, 'error', 'Unknown')}")
            return {'error': 'Failed to remove member from group'}, 500
        
        print(f"Successfully deleted {len(delete_result.data)} records")
        
        # 6. Create notification for the removed member
        notification_payload = {
            'user_id': member_to_remove_id,
            'actor_id': requesting_user_id,
            'type': 'group_member_removed',
            'actionable': False,
            'message': f"You were removed from \"{group_data['name']}\" by {requesting_user_name}",
            'data': {
                'group_id': group_id,
                'group_name': group_data['name'],
                'removed_by_name': requesting_user_name
            }
        }
        
        notification_result = supabase.table('notifications').insert(notification_payload).execute()
        if not notification_result or not hasattr(notification_result, 'data') or not notification_result.data:
            print("Warning: Failed to create notification for removed member")
        
        print(f"Successfully removed member {member_to_remove_id} from group {group_id}")
        return {'message': 'Member removed successfully'}, 200
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error in remove_group_member: {str(e)}\n{error_trace}")
        return {'error': 'Internal server error', 'details': str(e), 'trace': error_trace}, 500