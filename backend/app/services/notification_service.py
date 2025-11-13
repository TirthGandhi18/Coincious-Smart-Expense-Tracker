from app.extensions import supabase
import traceback
import json

# --- Functions for your Notification API Routes ---
def log_notification(user_id, actor_id, type, message, group_id, actionable=False, related_expense_id=None):
    """
    A standardized helper function to create new notifications.
    This can be called by any other service.
    """
    try:
        payload = {
            'user_id': user_id,
            'actor_id': actor_id,
            'type': type,
            'message': message,
            'read': False, # Standardized field name
            'actionable': actionable,
            'data': { # The supabase client handles dict-to-JSON conversion
                'group_id': group_id,
                'related_expense_id': related_expense_id
            }
        }
        
        # Use the imported supabase client, NOT categorizer.supabase
        supabase.table('notifications').insert(payload).execute()
        print(f"Successfully logged notification for user {user_id}")
        return True
    except Exception as e:
        print(f"ERROR logging notification for user {user_id}: {e}")
        return False
    
def get_notifications(user_id):
    """Fetches all notifications for a user, newest first."""
    try:
        resp = supabase.table('notifications') \
            .select('*') \
            .eq('user_id', user_id) \
            .order('created_at', desc=True) \
            .execute()
        
        return {'notifications': resp.data}, 200
    except Exception as e:
        print(f"Error getting notifications: {e}")
        return {'error': 'Failed to fetch notifications'}, 500

def mark_as_read(user_id, notification_id):
    """Marks a single notification as read, if the user_id matches."""
    try:
        # We add .eq('user_id', user_id) for security!
        # This ensures a user can't mark *other* people's notifications as read.
        resp = supabase.table('notifications') \
            .update({'is_read': True}) \
            .eq('id', notification_id) \
            .eq('user_id', user_id) \
            .execute()
        
        if not resp.data:
            return {'error': 'Notification not found or access denied'}, 404
        
        return {'message': 'Marked as read'}, 200
    except Exception as e:
        print(f"Error marking as read: {e}")
        return {'error': 'Internal server error'}, 500

# --- Functions for OTHER Services to use ---

def create_notification(user_id, message, link=None):
    """
    This is the internal function for *simple* notifications
    (like from 'settle_up').
    """
    try:
        payload = {
            'user_id': user_id,
            'message': message,
            'link': link
            # You can add more default fields here
        }
        supabase.table('notifications').insert(payload).execute()
        print(f"Successfully created simple notification for {user_id}: {message}")
        return True
    except Exception as e:
        print(f"Error creating simple notification: {e}")
        return False

def create_raw_notification(payload):
    """
    This is the internal function that other services will call
    to create a new, *complex* notification (like from 'invitation_service').
    'payload' should be a dictionary matching the 'notifications' table.
    """
    try:
        supabase.table('notifications').insert(payload).execute()
        print(f"Successfully created raw notification for {payload.get('user_id')}")
        return True
    except Exception as e:
        print(f"Error creating raw notification: {e}")
        return False

def delete_invitation_notification(invitation_id, user_id):
    """
    Deletes the original 'group_invitation' notification for the
    invitee after they have responded.
    """
    try:
        supabase.table('notifications') \
            .delete() \
            .eq('data->>invitation_id', str(invitation_id)) \
            .eq('type', 'group_invitation') \
            .eq('user_id', user_id) \
            .execute()
        print(f"Cleaned up invitation notification for user {user_id}")
        return True
    except Exception as e:
        print(f"Error deleting invitation notification: {e}")
        return False