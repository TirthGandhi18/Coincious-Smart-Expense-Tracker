from app.extensions import supabase
from app.services import notification_service
from datetime import datetime
import traceback

def respond_to_invitation(user, invitation_id, action):
    """
    Handles a user accepting or declining a group invitation.
    """
    if action not in ['accept', 'decline']:
        return {'error': 'Invalid action. Must be "accept" or "decline"'}, 400

    try:
        invitation_resp = supabase.table('group_invitations') \
            .select('*, groups(name)') \
            .eq('id', invitation_id) \
            .eq('status', 'pending') \
            .maybe_single() \
            .execute()
        
        if not invitation_resp or not hasattr(invitation_resp, 'data') or not invitation_resp.data:
            return {'error': 'Invitation not found or has already been actioned'}, 404
        
        invitation = invitation_resp.data
    
        if str(invitation['invited_user_id']) != str(user.id):
            return {'error': 'You are not authorized to respond to this invitation'}, 403

        user_name = user.user_metadata.get('full_name', user.email)
        group_name = invitation.get('groups', {}).get('name', 'the group')

        notification_payload = None
        status_payload = {}

        if action == 'accept':
            # Check if user is already a member
            existing_member = supabase.table('group_members') \
                .select('user_id') \
                .eq('group_id', invitation['group_id']) \
                .eq('user_id', user.id) \
                .maybe_single() \
                .execute()
            
            # Only add as member if not already present
            if not existing_member or not hasattr(existing_member, 'data') or not existing_member.data:
                member_payload = {
                    'group_id': invitation['group_id'],
                    'user_id': user.id
                }
                member_result = supabase.table('group_members').insert(member_payload).execute()
                
                if hasattr(member_result, 'error') and member_result.error:
                    raise Exception(f"Failed to add to group_members: {getattr(member_result, 'error', 'Unknown')}")
            
            # Check for existing accepted invitations and clean them up
            existing_accepted = supabase.table('group_invitations') \
                .select('id') \
                .eq('group_id', invitation['group_id']) \
                .eq('invited_user_id', user.id) \
                .eq('status', 'accepted') \
                .execute()
            
            if existing_accepted and existing_accepted.data:
                print(f"Found {len(existing_accepted.data)} existing accepted invitations, cleaning up...")
                # Delete existing accepted invitations to prevent constraint violation
                supabase.table('group_invitations') \
                    .delete() \
                    .eq('group_id', invitation['group_id']) \
                    .eq('invited_user_id', user.id) \
                    .eq('status', 'accepted') \
                    .execute()
            
            status_payload = {'status': 'accepted', 'updated_at': datetime.now().isoformat()}
            notification_payload = {
                'user_id': invitation['invited_by_id'],
                'actor_id': user.id,
                'type': 'invitation_accepted',
                'message': f"{user_name} accepted your invitation to join \"{group_name}\"",
                'data': {'group_id': invitation['group_id'], 'group_name': group_name, 'accepted_user_id': user.id}
            }
            
        else: 
            status_payload = {'status': 'declined', 'updated_at': datetime.now().isoformat()}
            
            notification_payload = {
                'user_id': invitation['invited_by_id'],
                'actor_id': user.id, 
                'type': 'invitation_declined',
                'message': f"{user_name} declined your invitation to join \"{group_name}\"",
                'data': {'group_id': invitation['group_id'], 'group_name': group_name, 'declined_user_id': user.id}
            }
        
        supabase.table('group_invitations') \
            .update(status_payload) \
            .eq('id', invitation_id) \
            .execute()
            
        if notification_payload:
            notification_service.create_raw_notification(notification_payload)
            
        notification_service.delete_invitation_notification(invitation_id, user.id)

        return {'message': f'Invitation {action}ed successfully'}, 200

    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error in respond_to_invitation: {str(e)}\n{error_trace}")
        return {'error': str(e), 'trace': error_trace}, 500