import os
import json
import google.generativeai as genai

from flask import Flask, request, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

class ExpenseCategorizer:
    def __init__(self):
        self.default_rules_path = 'default_rules.json'
        self.learned_rules_path = 'learned_rules.json'
        
        self.default_rules = self._load_rules_from_file(self.default_rules_path)
        self.learned_rules = self._load_rules_from_file(self.learned_rules_path)

        self.combined_rules = self._merge_rules()
        
        self.model = None
        KEY = os.getenv('GEMINI_API_KEY')
        
        if KEY:
            genai.configure(api_key=KEY) 
            self.model = genai.GenerativeModel(model_name="gemini-1.5-flash")

    def _load_rules_from_file(self, path):
        try:
            with open(path, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}
        
    def _save_learned_rules(self):
        with open(self.learned_rules_path, 'w') as f:
            json.dump(self.learned_rules, f, indent=2)

    def _merge_rules(self):
        all_rules = self.default_rules.copy()
        for category, new_keywords in self.learned_rules.items():
            if category in all_rules:
                existing_keywords = set(all_rules[category])
                all_rules[category] = list(existing_keywords.union(new_keywords))
            else:
                all_rules[category] = new_keywords
                
        return all_rules

    def learn_new_rule(self, description, category):
        print(f"Learning rule: '{description}' -> '{category}'")
        
        keyword = description.lower()
        if category not in self.learned_rules:
            self.learned_rules[category] = []
        
        if keyword not in self.learned_rules[category]:
            self.learned_rules[category].append(keyword)
            self._save_learned_rules()
            self.combined_rules = self._merge_rules()

    def find_category(self, description):
        lower_desc = description.lower()

        for category, keywords in self.combined_rules.items():
            if any(key in lower_desc for key in keywords):
                return {"category": category, "source": "dictionary"}

        if not self.model:
            return {"category": "Other", "source": "no_ai_fallback"}
            
        print(f"'{description}' not in local rules. Asking AI...")
        prompt = self._build_ai_prompt(description)
        
        try:
            response = self.model.generate_content(prompt)
            raw_text = response.text
            trimmed_text = raw_text.strip()
            clean_text = trimmed_text.replace("```json", "").replace("```", "")
            json_text = clean_text.strip()
            ai_result = json.loads(json_text)
            
            ai_category = ai_result.get("category")

            if ai_category and ai_category != "Other":
                self.learn_new_rule(description, ai_category)
                return {"category": ai_category, "source": "ai"}

        except Exception as e:
            print(f"AI call failed: {e}. Defaulting to 'Other'.")

        return {"category": "Other", "source": "default"}

    def _build_ai_prompt(self, description):

        known_categories = ", ".join(self.combined_rules.keys())
        
        return f"""
        Analyze the expense description: "{description}"

        My current categories are: {known_categories}.

        If one of those is a perfect fit, use it. 
        Otherwise, feel free to create a new, more specific category.

        IMPORTANT: Respond ONLY with a JSON object in the format: {{"category": "CATEGORY_NAME"}}
        """

# --- API Endpoints ---
categorizer = ExpenseCategorizer()

@app.route('/api/categorize', methods=['POST'])
def api_categorize():
    form_data = request.form
    description = form_data.get('description', '').strip()

    if not description:
        return jsonify({'error': 'Description cannot be empty.'}), 400
    
    manual_category = form_data.get('category', '').strip()
    
    if manual_category:
        categorizer.learn_new_rule(description, manual_category)
        return jsonify({'status': 'learning_successful', 'learned': {description: manual_category}})
    
    result = categorizer.find_category(description)
    return jsonify(result)
    
if __name__ == '__main__':
    app.run(debug=True, port=8000)