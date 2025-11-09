# app/routes/utility_routes.py
from flask import Blueprint, request, jsonify
import requests
import os
from app.config import Config

util_bp = Blueprint('utility_api', __name__)

@util_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Backend is running'})

@util_bp.route('/supabase/proxy/<path:subpath>', methods=['GET', 'POST'])
def supabase_proxy(subpath):
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({'error': 'Missing authorization'}), 401

    # Ensure SUPABASE_URL is loaded from config
    supabase_url = Config.SUPABASE_URL
    if not supabase_url:
         return jsonify({'error': 'Server configuration error: SUPABASE_URL not set'}), 500

    url = f"{supabase_url.rstrip('/')}/functions/v1/make-server-7f88878c/{subpath}"
    
    headers = {
        'Authorization': auth_header,
        'Content-Type': 'application/json'
    }
    
    try:
        if request.method == 'GET':
            response = requests.get(url, headers=headers, params=request.args)
        else:
            response = requests.post(url, headers=headers, json=request.get_json())
        
        # Check if response is valid JSON before trying to parse
        if 'application/json' in response.headers.get('Content-Type', ''):
            return jsonify(response.json()), response.status_code
        else:
            # Return raw text if not JSON
            return response.text, response.status_code
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500