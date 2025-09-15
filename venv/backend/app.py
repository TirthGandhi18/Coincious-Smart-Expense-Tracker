
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
import os
from datetime import datetime
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

class GrokExpenseCategorizer:
    def __init__(self):
        self.api_key = os.getenv('GROK_API_KEY')
        # Note: Replace with actual Grok API endpoint when available
        self.base_url = "https://api.x.ai/v1"  # This might change - check xAI docs
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Categories exactly matching your requirements
        self.categories = [
            "Shopping",
            "Bills & Utilities", 
            "Food & Dining",
            "Transportation",
            "Health & Wellness",
            "Other"
        ]
        
        # Enhanced categorization rules for fallback
        self.categorization_rules = {
            'Shopping': {
                'merchants': ['amazon', 'walmart', 'target', 'best buy', 'costco', 'ebay', 'etsy'],
                'keywords': ['purchase', 'buy', 'store', 'mall', 'shopping', 'retail', 'electronics', 'clothes', 'shoes', 'book']
            },
            'Bills & Utilities': {
                'merchants': ['verizon', 'att', 'comcast', 'xfinity', 'spectrum', 'tmobile'],
                'keywords': ['electric', 'electricity', 'water', 'gas', 'internet', 'phone', 'bill', 'utility', 'rent', 'insurance', 'subscription']
            },
            'Food & Dining': {
                'merchants': ['starbucks', 'mcdonalds', 'subway', 'dominos', 'kfc', 'taco bell', 'chipotle'],
                'keywords': ['restaurant', 'food', 'coffee', 'pizza', 'burger', 'dining', 'cafe', 'lunch', 'dinner', 'breakfast', 'grocery']
            },
            'Transportation': {
                'merchants': ['shell', 'exxon', 'chevron', 'bp', 'uber', 'lyft', 'mobil'],
                'keywords': ['gas', 'fuel', 'gasoline', 'uber', 'lyft', 'taxi', 'parking', 'metro', 'bus', 'transport', 'auto']
            },
            'Health & Wellness': {
                'merchants': ['cvs', 'walgreens', 'rite aid', 'kaiser', 'aetna'],
                'keywords': ['pharmacy', 'doctor', 'hospital', 'medical', 'health', 'medicine', 'gym', 'fitness', 'dental', 'vision']
            }
        }
    
    def categorize_expense(self, merchant, amount, description=""):
        """
        Categorize expense using Grok AI with fallback to rule-based system
        """
        start_time = time.time()
        
        # First try Grok AI (if API key is available)
        if self.api_key and self.api_key.strip():
            try:
                return self._categorize_with_grok(merchant, amount, description, start_time)
            except Exception as e:
                print(f"Grok AI failed, using fallback: {e}")
        
        # Fallback to rule-based categorization
        return self._fallback_categorization(merchant, amount, description, start_time)
    
    def _categorize_with_grok(self, merchant, amount, description, start_time):
        """
        Use Grok AI for categorization
        """
        prompt = self._build_categorization_prompt(merchant, amount, description)
        
        payload = {
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert financial AI assistant. Categorize expenses accurately and respond only in valid JSON format."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            "model": "grok-beta",  # Update with actual Grok model name
            "temperature": 0.1,
            "max_tokens": 200,
            "stream": False
        }
        
        response = requests.post(
            f"{self.base_url}/chat/completions",
            headers=self.headers,
            json=payload,
            timeout=30
        )
        
        processing_time = round(time.time() - start_time, 1)
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            try:
                categorization = json.loads(content)
                categorization.update({
                    'processingTime': f"{processing_time}s",
                    'aiModel': "Grok",
                    'timestamp': datetime.now().isoformat()
                })
                return categorization
            except json.JSONDecodeError:
                # Try to extract category from non-JSON response
                return self._parse_non_json_response(content, processing_time)
        else:
            print(f"Grok API Error: {response.status_code}")
            return self._fallback_categorization(merchant, amount, description, start_time)
    
    def _build_categorization_prompt(self, merchant, amount, description):
        """
        Build optimized prompt for Grok AI
        """
        return f"""
Analyze and categorize this expense:

EXPENSE DETAILS:
• Merchant: {merchant}
• Amount: ${amount:.2f}
• Description: {description or 'None provided'}

AVAILABLE CATEGORIES (choose exactly one):
{', '.join(self.categories)}

CATEGORIZATION GUIDELINES:
• Shopping: Amazon, Walmart, Target, retail stores, online purchases, electronics, clothing, books
• Bills & Utilities: Electric, water, gas, internet, phone, rent, insurance, subscriptions (Netflix, Spotify)
• Food & Dining: Restaurants, fast food, groceries, coffee shops, food delivery, cafes, bars
• Transportation: Gas stations, Uber, Lyft, public transport, parking, car maintenance, auto services
• Health & Wellness: Pharmacies, doctors, hospitals, gym, fitness, medical services, vitamins
• Other: Everything else that doesn't clearly fit the above categories

ANALYSIS STEPS:
1. Identify the merchant type and primary business
2. Consider the amount in context (small amounts at coffee shops = food, large amounts at Best Buy = shopping)
3. Use description keywords for additional context
4. Choose the single most appropriate category

RESPOND ONLY IN THIS JSON FORMAT:
{{
    "category": "exact_category_name_from_list",
    "subcategory": "more_specific_type",
    "confidence": confidence_score_0_to_100,
    "reasoning": "brief_explanation_why_this_category"
}}
"""
    
    def _parse_non_json_response(self, content, processing_time):
        """
        Handle cases where AI doesn't return valid JSON
        """
        content_lower = content.lower()
        
        for category in self.categories:
            if category.lower() in content_lower:
                return {
                    "category": category,
                    "subcategory": "AI-detected",
                    "confidence": 75,
                    "reasoning": "Extracted from AI response",
                    "processingTime": f"{processing_time}s",
                    "aiModel": "Grok",
                    "timestamp": datetime.now().isoformat()
                }
        
        return self._fallback_categorization("", "", "", processing_time)
    
    def _fallback_categorization(self, merchant, amount, description, start_time):
        """
        Smart rule-based categorization when AI is unavailable
        """
        text = (merchant + ' ' + description).lower()
        processing_time = round(time.time() - start_time, 1)
        
        # Check each category's rules
        for category, rules in self.categorization_rules.items():
            # Check merchant matches
            merchant_matches = sum(1 for m in rules['merchants'] if m in text)
            keyword_matches = sum(1 for k in rules['keywords'] if k in text)
            
            if merchant_matches > 0 or keyword_matches > 1:
                confidence = min(90, 60 + (merchant_matches * 20) + (keyword_matches * 10))
                return {
                    "category": category,
                    "subcategory": self._get_subcategory(category, text, amount),
                    "confidence": confidence,
                    "reasoning": f"Rule-based: matched {merchant_matches} merchants, {keyword_matches} keywords",
                    "processingTime": f"{processing_time}s",
                    "aiModel": "Rule-based",
                    "timestamp": datetime.now().isoformat()
                }
        
        # Default fallback
        return {
            "category": "Other",
            "subcategory": "Miscellaneous",
            "confidence": 40,
            "reasoning": "Could not determine category from available information",
            "processingTime": f"{processing_time}s",
            "aiModel": "Fallback",
            "timestamp": datetime.now().isoformat()
        }
    
    def _get_subcategory(self, category, text, amount):
        """
        Determine subcategory based on category and context
        """
        subcategories = {
            'Shopping': 'Major Purchase' if amount > 100 else 'Retail',
            'Bills & Utilities': 'Subscription' if any(x in text for x in ['netflix', 'spotify', 'subscription']) else 'Monthly Bill',
            'Food & Dining': 'Restaurant' if amount > 30 else 'Fast Food' if amount > 10 else 'Coffee/Snacks',
            'Transportation': 'Fuel' if any(x in text for x in ['gas', 'fuel']) else 'Rideshare' if any(x in text for x in ['uber', 'lyft']) else 'Travel',
            'Health & Wellness': 'Fitness' if any(x in text for x in ['gym', 'fitness']) else 'Healthcare',
            'Other': 'Miscellaneous'
        }
        return subcategories.get(category, 'General')

# Initialize the categorizer
categorizer = GrokExpenseCategorizer()

@app.route('/api/categorize', methods=['POST'])
def categorize_expense():
    """
    API endpoint to categorize a single expense
    """
    try:
        data = request.get_json()
        
        # Validate input
        if not data or 'merchant' not in data or 'amount' not in data:
            return jsonify({
                'error': 'Missing required fields: merchant and amount'
            }), 400
        
        merchant = data.get('merchant', '').strip()
        amount = float(data.get('amount', 0))
        description = data.get('description', '').strip()
        
        if not merchant or amount <= 0:
            return jsonify({
                'error': 'Invalid merchant name or amount'
            }), 400
        
        # Get AI categorization
        result = categorizer.categorize_expense(merchant, amount, description)
        
        return jsonify(result)
    
    except ValueError as e:
        return jsonify({'error': f'Invalid amount format: {str(e)}'}), 400
    except Exception as e:
        print(f"Error in categorize endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/categories', methods=['GET'])
def get_categories():
    """
    API endpoint to get available categories
    """
    return jsonify({
        'categories': categorizer.categories,
        'total': len(categorizer.categories)
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Health check endpoint
    """
    api_key_status = "configured" if categorizer.api_key else "not configured"
    
    return jsonify({
        'status': 'healthy',
        'service': 'AI Expense Categorizer',
        'api_key_status': api_key_status,
        'categories': len(categorizer.categories),
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/batch-categorize', methods=['POST'])
def batch_categorize():
    """
    API endpoint to categorize multiple expenses at once
    """
    try:
        data = request.get_json()
        expenses = data.get('expenses', [])
        
        if not expenses or not isinstance(expenses, list):
            return jsonify({'error': 'Invalid expenses array'}), 400
        
        if len(expenses) > 20:  # Limit batch size
            return jsonify({'error': 'Maximum 20 expenses per batch'}), 400
        
        results = []
        for i, expense in enumerate(expenses):
            try:
                if 'merchant' in expense and 'amount' in expense:
                    result = categorizer.categorize_expense(
                        expense['merchant'],
                        float(expense['amount']),
                        expense.get('description', '')
                    )
                    results.append({
                        'index': i,
                        'expense': expense,
                        'categorization': result,
                        'success': True
                    })
                else:
                    results.append({
                        'index': i,
                        'expense': expense,
                        'error': 'Missing merchant or amount',
                        'success': False
                    })
            except Exception as e:
                results.append({
                    'index': i,
                    'expense': expense,
                    'error': str(e),
                    'success': False
                })
        
        return jsonify({
            'results': results,
            'total_processed': len(results),
            'successful': len([r for r in results if r.get('success')])
        })
    
    except Exception as e:
        print(f"Error in batch categorize: {e}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Check environment setup
    print("=" * 50)
    print("🚀 AI Expense Categorizer API Starting...")
    print("=" * 50)
    
    if not os.getenv('GROK_API_KEY'):
        print("⚠️  WARNING: GROK_API_KEY not found in environment!")
        print("   Using rule-based fallback categorization.")
        print("   To use Grok AI, set: GROK_API_KEY='your-api-key'")
    else:
        print("✅ Grok API Key found - AI categorization enabled!")
    
    print(f"📊 Available categories: {len(categorizer.categories)}")
    print("🌐 Starting server on http://localhost:5000")
    print("📚 API Documentation:")
    print("   POST /api/categorize - Categorize single expense")
    print("   POST /api/batch-categorize - Categorize multiple expenses")
    print("   GET  /api/categories - Get available categories") 
    print("   GET  /api/health - Health check")
    print("=" * 50)
    
    # Run the Flask app
    app.run(debug=True, host='0.0.0.0', port=5001)