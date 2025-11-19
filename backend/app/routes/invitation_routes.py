from flask import Blueprint, request, jsonify, g
from app.auth.decorators import auth_required
from app.services import invitation_service

inv_bp = Blueprint('invitation_api', __name__)

@inv_bp.route('/<invitation_id>/respond', methods=['POST'])
@auth_required
def respond_to_invitation(invitation_id):
    """
    Responds to a group invitation (accept or decline).
    """
    user = g.user
    data = request.get_json()
    action = data.get('action')

    response, status = invitation_service.respond_to_invitation(user, invitation_id, action)
    
    return jsonify(response), status