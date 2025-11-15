import json
from datetime import datetime, timedelta
from groq import Groq
from app.extensions import supabase
from app.config import Config
from app.services.group_service import get_group_balances
from cachetools import TTLCache

# Initialize Groq Client
client = Groq(api_key=Config.GROQ_API_KEY)

# Cache: Stores financial context for 5 minutes (300 seconds) per user
# maxsize=100 means it stores data for up to 100 distinct users at a time
context_cache = TTLCache(maxsize=100, ttl=300)

def get_financial_context(user_id):
    """
    Fetches comprehensive financial data:
    1. Last 90 days of expenses (Personal + Group)
    2. Current Group Balances (Who owes you/You owe)
    """
    # 1. Check Cache
    if user_id in context_cache:
        return context_cache[user_id]

    try:
        # 2. Fetch Expenses (Extended to 90 days for trends)
        ninety_days_ago = (datetime.now() - timedelta(days=90)).isoformat()
        
        expenses_resp = supabase.table('expenses') \
            .select('amount, category, description, created_at, group_id') \
            .eq('payer_id', user_id) \
            .gte('created_at', ninety_days_ago) \
            .order('created_at', desc=True) \
            .execute()
            
        # 3. Fetch Active Groups & Balances
        # We use your existing group service logic to get accurate balances
        groups_resp = supabase.table('group_members') \
            .select('group_id, groups(name)') \
            .eq('user_id', user_id) \
            .execute()
            
        groups_summary = []
        if groups_resp.data:
            for g_item in groups_resp.data:
                g_id = g_item['group_id']
                g_name = g_item['groups']['name']
                
                # Calculate balance for this specific group
                balance_data, _ = get_group_balances(g_id, user_id)
                
                # Extract settlements/net position
                if 'settlements' in balance_data:
                    # Summarize the user's standing
                    my_settlements = [
                        s for s in balance_data['settlements'] 
                        if s['from_id'] == user_id or s['to_id'] == user_id
                    ]
                    groups_summary.append({
                        "group_name": g_name,
                        "details": my_settlements
                    })

        context_data = {
            "analysis_date": datetime.now().strftime("%Y-%m-%d"),
            "recent_expenses": expenses_resp.data if expenses_resp.data else [],
            "group_balances": groups_summary
        }
        
        json_context = json.dumps(context_data, default=str)
        
        # Store in cache
        context_cache[user_id] = json_context
        return json_context

    except Exception as e:
        print(f"Error fetching context: {e}")
        return "{}"

def chat_with_groq(user_id, user_message, history=[]):
    try:
        # 1. Get Data Context (Cached if available)
        financial_data = get_financial_context(user_id)

        # 2. Enhanced System Prompt
        system_prompt = f"""
        You are Coincious AI, an expert financial analyst and assistant.
        
        --- USER DATA CONTEXT ---
        {financial_data}
        -------------------------

        GUIDELINES:
        1. **Context Awareness**: Use the JSON data above to answer. If the data covers 90 days, mention that trends are based on the last 3 months.
        2. **Group Balances**: If asked about what they owe, check 'group_balances'. 
           - If 'from_id' matches the user ({user_id}), they OWE money.
           - If 'to_id' matches the user, they are OWED money.
        3. **Tone**: Be professional but encouraging. If spending is high, gently suggest saving tips.
        4. **Formatting**: Use bullet points for lists. Bold amounts (e.g., **$45.00**).
        5. **Unknowns**: If the answer isn't in the data, ask clarifying questions. Do not hallucinate numbers.
        """

        # 3. Build Message Chain
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add last 5 messages from history for context
        # History format expected: [{'role': 'user', 'content': '...'}, {'role': 'assistant', 'content': '...'}]
        if history:
            messages.extend(history[-5:]) 
            
        # Add current message
        messages.append({"role": "user", "content": user_message})

        # 4. Call Groq API
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.5,
            max_tokens=800,
        )

        return completion.choices[0].message.content

    except Exception as e:
        print(f"Groq API Error: {e}")
        return "I'm having trouble connecting to my financial brain right now. Please try again in a moment."
