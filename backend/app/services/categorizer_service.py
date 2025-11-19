import json
import base64
import os
from app.extensions import supabase, gemini_model

class ExpenseCategorizer:
    def __init__(self):
        self.supabase = supabase
        self.model = gemini_model

    def _get_user_rules(self, user_id):
        """Fetches all learned rules for a specific user from the Supabase database."""
        try:
            response = self.supabase.table('user_categories').select('category_name', 'keywords').eq('user_id', user_id).execute()
            
            user_rules = {}
            if response and hasattr(response, 'data'):
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
            
            if response and hasattr(response, 'data') and response.data:
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

    def parse_bill_image(self, image_bytes, mime_type):
        if not self.model:
            raise RuntimeError("Gemini model not configured")

        base64_image = base64.b64encode(image_bytes).decode('utf-8')

        system_prompt = (
            "You are a precise receipt/bill parser. Extract fields and return STRICT JSON only. "
            "Fields: vendor_name, issue_date, due_date, subtotal, tax, tip, total, currency, "
            "line_items (name, quantity, unit_price, line_total), payment_method, address, "
            "category_guess, notes. Use null for unknowns. Dates ISO-8601. Numbers as floats. "
            "currency as 3-letter code if visible, else null."
        )

        content = [
            system_prompt,
            {
                "mime_type": mime_type,
                "data": base64_image
            },
            (
                "Respond ONLY with JSON in this schema: {\n"
                "  \"vendor_name\": string|null,\n"
                "  \"issue_date\": string|null,\n"
                "  \"due_date\": string|null,\n"
                "  \"subtotal\": number|null,\n"
                "  \"tax\": number|null,\n"
                "  \"tip\": number|null,\n"
                "  \"total\": number|null,\n"
                "  \"currency\": string|null,\n"
                "  \"payment_method\": string|null,\n"
                "  \"address\": string|null,\n"
                "  \"category_guess\": string|null,\n"
                "  \"notes\": string|null,\n"
                "  \"line_items\": [ { \"name\": string, \"quantity\": number|null, \"unit_price\": number|null, \"line_total\": number|null } ]\n"
                "}"
            )
        ]

        response = self.model.generate_content(content)
        raw_text = response.text.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(raw_text)


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