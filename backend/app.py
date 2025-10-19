import requests  # Add this with other imports at the top
import os
import json
from flask import Flask, request, jsonify
from dotenv import load_dotenv
import google.generativeai as genai
from supabase import create_client, Client
from flask_cors import CORS

# --- SETUP ---
load_dotenv()
app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Authorization", "Content-Type"],
        "supports_credentials": True
    }
})

# Add this route after the CORS configuration
@app.route('/api/supabase/proxy/<path:subpath>', methods=['GET', 'POST'])
def supabase_proxy(subpath):
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({'error': 'Missing authorization'}), 401

    url = f"https://xmuallpfxwgapaxawrwk.supabase.co/functions/v1/make-server-7f88878c/{subpath}"
    
    headers = {
        'Authorization': auth_header,
        'Content-Type': 'application/json'
    }
    
    try:
        if request.method == 'GET':
            response = requests.get(url, headers=headers)
        else:
            response = requests.post(url, headers=headers, json=request.get_json())
        
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500

class ExpenseCategorizer:
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Supabase URL and Key must be set in .env file")
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        self.model = None
        KEY = os.getenv('GEMINI_API_KEY')
        if KEY:
            genai.configure(api_key=KEY) 
            self.model = genai.GenerativeModel(model_name="gemini-2.5-flash")

    def _get_user_rules(self, user_id):
        """Fetches all learned rules for a specific user from the Supabase database."""
        try:
            response = self.supabase.table('user_categories').select('category_name', 'keywords').eq('user_id', user_id).execute()
            
            user_rules = {}
            for item in response.data:
                user_rules[item['category_name']] = item['keywords']
            return user_rules
        except Exception as e:
            print(f"Error fetching user rules: {e}")
            return {}

    def learn_new_rule(self, user_id, description, category):
        """Saves a new learned keyword for a specific user to the Supabase database."""
        print(f"Learning rule for user {user_id}: '{description}' -> '{category}'")
        keyword = description.lower()
        
        try:
            response = self.supabase.table('user_categories').select('keywords').eq('user_id', user_id).eq('category_name', category).execute()
            
            if response.data:
                existing_keywords = response.data[0]['keywords']
                if keyword not in existing_keywords:
                    new_keywords = existing_keywords + [keyword]
                    self.supabase.table('user_categories').update({'keywords': new_keywords}).eq('user_id', user_id).eq('category_name', category).execute()
                    print(f"Updated keywords for category '{category}'")
            else:
                self.supabase.table('user_categories').insert({
                    'user_id': user_id,
                    'category_name': category,
                    'keywords': [keyword]
                }).execute()
                print(f"Created new category rule for '{category}'")

        except Exception as e:
            print(f"Error saving new rule to Supabase: {e}")

    def find_category(self, user_id, description):
        """Main categorization logic: User's DB -> GenAI Fallback -> Learn."""
        lower_desc = description.lower()
        
        user_rules = self._get_user_rules(user_id)
        for category, keywords in user_rules.items():
            if any(key in lower_desc for key in keywords):
                return {"category": category, "source": "user_dictionary"}

        if not self.model:
            return {"category": "Other", "source": "no_ai_fallback"}
            
        print(f"'{description}' not in user rules. Asking AI...")
        prompt = self._build_ai_prompt(description, list(user_rules.keys()))
        
        try:
            response = self.model.generate_content(prompt)
            raw_text = response.text.strip().replace("```json", "").replace("```", "").strip()
            ai_result = json.loads(raw_text)
            
            ai_category = ai_result.get("category")

            if ai_category and ai_category != "Other":
                self.learn_new_rule(user_id, description, ai_category)
                return {"category": ai_category, "source": "ai"}

        except Exception as e:
            print(f"AI call failed: {e}. Defaulting to 'Other'.")

        return {"category": "Other", "source": "default"}

    def _build_ai_prompt(self, description, known_categories):
        """Builds the prompt for the Gemini AI."""
        base_categories = ["Food & Dining", "Transportation", "Shopping", "Bills & Utilities", "Entertainment", "Health & Wellness"]
        all_categories = list(set(known_categories + base_categories)) 
        return f"""
        Analyze the expense description: "{description}"

        My current categories are: {", ".join(all_categories)}.

        If one of those is a perfect fit, use it. 
        However, if you think a better, more specific category is needed (like 'Education' for 'college fees'), you are encouraged to create one.

        IMPORTANT: Respond ONLY with a JSON object in the format: {{"category": "CATEGORY_NAME"}}
        """

categorizer = ExpenseCategorizer()

@app.route('/api/categorize', methods=['POST'])
def api_categorize():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing or invalid authorization token'}), 401
    
    jwt = auth_header.split(' ')[1]
    
    try:
        user_response = categorizer.supabase.auth.get_user(jwt)
        user = user_response.user
        if not user:
            raise Exception("Invalid user token")
    except Exception as e:
        return jsonify({'error': f'Authentication error: {str(e)}'}), 401
    
    # 2. Get data from the form
    form_data = request.form
    description = form_data.get('description', '').strip()

    if not description:
        return jsonify({'error': 'Description cannot be empty.'}), 400
    
    manual_category = form_data.get('category', '').strip()
    
    # 3. Perform the correct action based on the input
    if manual_category:
        categorizer.learn_new_rule(user.id, description, manual_category)
        return jsonify({'status': 'learning_successful', 'learned': {description: manual_category}})
    else:
        result = categorizer.find_category(user.id, description)
        return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=8000)


