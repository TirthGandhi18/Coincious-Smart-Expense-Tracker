from flask import Blueprint, jsonify, g
from app.auth.decorators import auth_required
from app.extensions import supabase # Imports your admin client
import traceback

# Create a new blueprint for user-related routes
user_bp = Blueprint('user_api', __name__)

@user_bp.route('/user', methods=['DELETE'])
@auth_required
def delete_user_account():
    """
    Permanently deletes the authenticated user and all their data
    from the Supabase auth.users table.
    
    This relies on 'ON DELETE CASCADE' in your database schema
    to remove all related data (expenses, budgets, groups, etc.).
    """
    try:
        user_id = g.user.id
        print(f"--- ATTEMPTING TO DELETE USER: {user_id} ---")

        # Use the admin client (from extensions.py) to delete the user
        # This is the only way to delete from auth.users
        admin_auth = supabase.auth.admin
        admin_auth.delete_user(user_id)
        
        print(f"--- SUCCESSFULLY DELETED USER: {user_id} ---")
        return jsonify({"message": "User account permanently deleted"}), 200

    except Exception as e:
        print(f"--- FAILED TO DELETE USER: {user_id} ---")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500