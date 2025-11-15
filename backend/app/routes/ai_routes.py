from flask import Blueprint, request, jsonify, g
from app.auth.decorators import auth_required
from app.services import ai_service

ai_bp = Blueprint('ai_api', __name__)

@ai_bp.route('/chat', methods=['POST'])
@auth_required
def chat():
    data = request.get_json()
    user_message = data.get('message')
    # Get history if provided, default to empty list
    history = data.get('history', []) 
    
    if not user_message:
        return jsonify({'error': 'Message is required'}), 400

    user_id = g.user.id
    
    # Pass history to service
    response_text = ai_service.chat_with_groq(user_id, user_message, history)
    
    return jsonify({'response': response_text})
