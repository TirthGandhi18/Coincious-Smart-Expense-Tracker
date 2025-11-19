from flask import Blueprint, jsonify, g
from app.auth.decorators import auth_required
from app.extensions import supabase 
import traceback


user_bp = Blueprint('user_api', __name__)

@user_bp.route('/user', methods=['DELETE'])
@auth_required
def delete_user_account():
    try:
        user_id = g.user.id
        print(f"--- ATTEMPTING TO DELETE USER: {user_id} ---")

        
        admin_auth = supabase.auth.admin
        admin_auth.delete_user(user_id)
        
        print(f"--- SUCCESSFULLY DELETED USER: {user_id} ---")
        return jsonify({"message": "User account permanently deleted"}), 200

    except Exception as e:
        print(f"--- FAILED TO DELETE USER: {user_id} ---")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500