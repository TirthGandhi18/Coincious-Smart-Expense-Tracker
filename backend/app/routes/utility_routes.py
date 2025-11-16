# app/routes/utility_routes.py
from flask import Blueprint, request, jsonify
import requests
import os
from app.config import Config
from app.auth.decorators import auth_required

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
    
@util_bp.route('/recurring-expenses', methods=['GET'])
@auth_required
def get_recurring_expenses():
    try:
        # 1. Get the user's token (passed by the React app)
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({"error": "Missing auth header"}), 401

        # 2. This is the URL of your deployed Supabase Edge Function
        FUNCTION_URL = 'https://xmuallpfxwgapaxawrwk.supabase.co/functions/v1/recurring-personal-expenses'

        # 3. These headers will be sent to the Supabase Function
        headers = {
            'Authorization': auth_header,
            'Content-Type': 'application/json'
        }

        # 4. Your server calls the Supabase Function (GET request)
        #    (Server-to-server calls have NO CORS issues)
        response = requests.get(FUNCTION_URL, headers=headers)

        # 5. Check if the function call failed
        response.raise_for_status() # This will raise an error for 4xx or 5xx responses

        # 6. Send the function's successful JSON response back to your React app
        return response.json(), 200

    except requests.exceptions.HTTPError as http_err:
        # The Supabase Function returned an error (like 401 or 500)
        print(f"Supabase Function Error: {http_err.response.text}")
        return http_err.response.text, http_err.response.status_code
    except Exception as e:
        # Any other server error
        print(f"Error in /api/recurring-expenses proxy: {e}") # Log for your server
        return jsonify({"error": "Internal server error"}), 500
