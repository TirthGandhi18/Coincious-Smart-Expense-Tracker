# app/auth/decorators.py
from functools import wraps
from flask import request, jsonify, g
from app.extensions import supabase

def auth_required(f):
    """
    A decorator to check for a valid JWT token in the Authorization header.
    If valid, it attaches the user object to flask.g.user
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization token', 'details': 'No Bearer token found.'}), 401
        
        jwt = auth_header.split(' ')[1]
        if not jwt:
            return jsonify({'error': 'Missing or invalid authorization token', 'details': 'Empty token.'}), 401

        try:
            user_response = supabase.auth.get_user(jwt)
            
            if not user_response or not hasattr(user_response, 'user') or not user_response.user:
                return jsonify({'error': 'Invalid user token', 'details': 'Token is invalid or expired.'}), 401
            
            # Attach user to the request context (g)
            g.user = user_response.user
            
        except Exception as e:
            return jsonify({'error': 'Authentication error', 'details': str(e)}), 401
        
        return f(*args, **kwargs)
    
    return decorated_function