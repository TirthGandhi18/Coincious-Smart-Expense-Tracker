import os
import json
import time
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai

# --- SETUP ---
load_dotenv()
app = Flask(__name__)
CORS(app)

class ExpenseCategorizer:
    def __init__(self, rules_filepath='category_rules.json'):
        self.rules_filepath = rules_filepath
        self.categorization_rules = self._load_rules()
        self.categories = list(self.categorization_rules.keys()) + ["Other"]
        
        # *** GEMINI CHANGE: Configure the Gemini client ***
        self.api_key = os.getenv('GEMINI_API_KEY')
        if self.api_key:
            genai.configure(api_key=self.api_key)
            # Set up the model configuration
            generation_config = {"temperature": 0.2, "top_p": 1, "top_k": 1}
            # Create the reusable model instance
            self.model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                generation_config=generation_config
            )
        else:
            self.model = None
        # *************************************************

    def _load_rules(self):
        """Loads the categorization rules from the JSON file."""
        try:
            with open(self.rules_filepath, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {}

    def _save_rules(self):
        """Saves the updated rules back to the JSON file."""
        with open(self.rules_filepath, 'w') as f:
            json.dump(self.categorization_rules, f, indent=2)
            
    def learn_and_update(self, description, manual_category):
        """Learns from a user's manual input and updates the rules."""
        print(f"Learning from manual entry: '{description}' -> '{manual_category}'")
        keyword = description.lower().split()[0]

        if manual_category not in self.categorization_rules:
            self.categorization_rules[manual_category] = {'merchants': [], 'keywords': []}
            print(f"Created new category: '{manual_category}'")
        
        if keyword not in self.categorization_rules[manual_category]['merchants']:
            self.categorization_rules[manual_category]['merchants'].append(keyword)
            print(f"Added new keyword '{keyword}' to category '{manual_category}'")
            self._save_rules()
            self.categories = list(self.categorization_rules.keys()) + ["Other"]

    def categorize_expense(self, merchant, amount, description=""):
        """Categorize with GenAI first, then fallback to local rules."""
        start_time = time.time()
        
        # *** GEMINI CHANGE: Check for self.model instead of self.api_key ***
        if self.model:
            try:
                # *** GEMINI CHANGE: Call the new Gemini function ***
                result = self._categorize_with_gemini(merchant, amount, description, start_time)
                
                if result.get("category") != "Other" and merchant:
                    self.learn_and_update(merchant, result.get("category"))
                
                return result
            except Exception as e:
                print(f"Gemini AI failed, using fallback: {e}")
        
        return self._fallback_categorization(merchant, amount, description, start_time)

    # *** GEMINI CHANGE: Replaced the Grok function with a Gemini function ***
    def _categorize_with_gemini(self, merchant, amount, description, start_time):
        """Use Google Gemini AI for categorization."""
        prompt = self._build_categorization_prompt(merchant, amount, description)
        
        try:
            response = self.model.generate_content(prompt)
            processing_time = round(time.time() - start_time, 1)
            
            # Gemini response often includes markdown formatting, so we clean it.
            content = response.text
            clean_content = content.strip().replace("```json", "").replace("```", "").strip()
            
            categorization = json.loads(clean_content)
            categorization.update({'processingTime': f"{processing_time}s", 'aiModel': "Gemini", 'timestamp': datetime.now().isoformat()})
            return categorization

        except Exception as e:
            print(f"Gemini API Error or JSON parsing failed: {e}")
            # If Gemini fails, we go to the reliable fallback
            return self._fallback_categorization(merchant, amount, description, start_time)

    def _build_categorization_prompt(self, merchant, amount, description):
        """Builds an optimized prompt, now with a dynamic category list."""
        available_categories = ", ".join(self.categories)
        return f"""
Analyze and categorize this expense:

EXPENSE DETAILS:
• Merchant: {merchant}
• Amount: {amount:.2f}
• Description: {description or 'None provided'}

AVAILABLE CATEGORIES (choose exactly one):
{available_categories}

RESPOND ONLY IN THIS JSON FORMAT:
{{
    "category": "exact_category_name_from_list",
    "subcategory": "more_specific_type",
    "confidence": confidence_score_0_to_100,
    "reasoning": "brief_explanation_why_this_category"
}}
"""

    def _fallback_categorization(self, merchant, amount, description, start_time):
        # This function and _get_subcategory remain exactly the same.
        text = (merchant + ' ' + description).lower()
        processing_time = round(time.time() - start_time, 1)
        for category, rules in self.categorization_rules.items():
            merchant_matches = sum(1 for m in rules.get('merchants', []) if m in text)
            keyword_matches = sum(1 for k in rules.get('keywords', []) if k in text)
            if merchant_matches > 0 or keyword_matches > 1:
                confidence = min(90, 60 + (merchant_matches * 20) + (keyword_matches * 10))
                return {"category": category, "subcategory": self._get_subcategory(category, text, amount), "confidence": confidence, "reasoning": f"Rule-based: matched {merchant_matches} merchants, {keyword_matches} keywords", "processingTime": f"{processing_time}s", "aiModel": "Rule-based", "timestamp": datetime.now().isoformat()}
        return {"category": "Other", "subcategory": "Miscellaneous", "confidence": 40, "reasoning": "Could not determine category", "processingTime": f"{processing_time}s", "aiModel": "Fallback", "timestamp": datetime.now().isoformat()}

    def _get_subcategory(self, category, text, amount):
        subcategories = {'Shopping': 'Major Purchase' if amount > 100 else 'Retail', 'Bills & Utilities': 'Subscription' if 'subscription' in text else 'Monthly Bill', 'Food & Dining': 'Restaurant' if amount > 30 else 'Fast Food', 'Transportation': 'Fuel' if 'fuel' in text else 'Rideshare', 'Health & Wellness': 'Fitness' if 'gym' in text else 'Healthcare'}
        return subcategories.get(category, 'General')

# --- API ENDPOINTS (No changes needed here) ---
categorizer = ExpenseCategorizer()

@app.route('/api/categorize', methods=['POST'])
def handle_categorize():
    data = request.form
    description = data.get('description', '').strip()
    amount_str = data.get('amount', '0')
    category = data.get('category', '').strip()
    
    if not description:
        return jsonify({'error': 'Description is required'}), 400
    try:
        amount = float(amount_str)
        if amount <= 0:
            return jsonify({'error': 'Amount must be greater than 0'}), 400
    except ValueError:
        return jsonify({'error': 'Invalid amount format. Amount must be a number.'}), 400

    if category:
        categorizer.learn_and_update(description, category)
        return jsonify({'status': 'learning_successful', 'learned_category': category})
    else:
        # We pass description as the merchant if the merchant field is empty
        result = categorizer.categorize_expense(description, amount, description) 
        return jsonify(result)

@app.route('/')
def home():
    """A simple home route to confirm the API is online."""
    return jsonify({
        "status": "online",
        "message": "Welcome to the Smart Expense Manager API!"
    })
    
if __name__ == '__main__':
    app.run(debug=True, port=5001)