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
    3. Monthly Budget
    """
    # 1. Check Cache
    if user_id in context_cache:
        return context_cache[user_id]

    try:
        # 2. Fetch Expenses (Extended to 90 days for trends)
        today = datetime.now()
        ninety_days_ago = (today - timedelta(days=90))
        
        expenses_resp = supabase.table('expenses') \
            .select('amount, category, description, created_at, group_id') \
            .eq('payer_id', user_id) \
            .gte('created_at', ninety_days_ago.isoformat())\
            .order('created_at', desc=True) \
            .execute()
            
        # 3. Fetch Active Groups & Balances
        groups_resp = supabase.table('group_members') \
            .select('group_id, groups(name)') \
            .eq('user_id', user_id) \
            .execute()
            
        groups_summary = []
        if groups_resp.data:
            for g_item in groups_resp.data:
                g_id = g_item['group_id']
                g_name = g_item.get('groups', {}).get('name', 'Unknown Group')
                
                balance_data, _ = get_group_balances(g_id, user_id)
                
                if 'balances' in balance_data:
                    my_balance_obj = next((b for b in balance_data['balances'] if b['user_id'] == user_id), None)
                    
                    if my_balance_obj and abs(my_balance_obj['balance']) > 0.01:
                        groups_summary.append({
                            "group_name": g_name,
                            "my_net_balance": my_balance_obj['balance']
                        })

        # 4. Fetch the User's Budget <--- ADDED THIS ENTIRE BLOCK
        budget_amount = None
        try:
            budget_resp = supabase.table('budgets') \
                .select('amount_limit') \
                .eq('user_id', user_id) \
                .maybe_single() \
                .execute()
            
            if budget_resp.data:
                budget_amount = budget_resp.data['amount_limit']
        except Exception as e:
            print(f"Error fetching budget: {e}")
            # Do not fail; just proceed without budget info
        
        # 5. Build the final context
        context_data = {
            "analysis_date": today.strftime("%Y-%m-%d"),
            "data_start_date": ninety_days_ago.strftime("%Y-%m-%d"),
            "monthly_budget": budget_amount, # <--- ADDED
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
        You are Coincious AI, an expert financial analyst and assistant. Your tone is professional, encouraging, and helpful.

        --- USER DATA CONTEXT ---
        {financial_data}
        -------------------------

        GUIDELINES:
        1. **Primary Goal: Be an Analyst, Not a List.** Your main goal is to provide insights.
           - **Calculate Totals:** When asked for an overview, you MUST calculate the **total sum** for each expense category from the `recent_expenses` list.
           - **Summarize:** State the top 3-4 categories and their **total sum**. For example: "Your top category was **Food & Dining**, with a total of **$450.00**."
           - **State the Period:** Your analysis is based on data from the `data_start_date` to the `analysis_date` found in the JSON. State this clearly, e.g., "Looking at your spending over the last 90 days..."
           - **Avoid Data Dumps:** Do NOT just list the ranges or number of entries unless the user *specifically* asks for "ranges" or "entry count." Focus on the **total sum**.

        2. **Group Balances**: If asked about group debts, check 'group_balances'. This is a list.
           - Each item shows your net balance for a group: {{"group_name": "...", "my_net_balance": ...}}
           - If `my_net_balance` is **negative** (e.g., -1450.0), you OWE that amount.
           - If `my_net_balance` is **positive** (e.g., 25.50), you ARE OWED that amount.
           - Be clear: "In the **'restaurant'** group, you owe **$1450.00**."
           - If the list is empty, you are all settled up.

        3. **Monthly Budget**: The user's budget is in the `monthly_budget` field. <--- MODIFIED
           - If `monthly_budget` is a number (e.g., 4000.00), use it in your analysis.
           - If `monthly_budget` is `null` or `None`, the user has not set one. You should respond: "You haven't set a monthly budget yet. You can set one on your Dashboard."

        4. **Formatting**: Use Markdown for clarity. Use bullet points (`*`) for lists and bolding (`**$45.00**`) for key figures. This helps the user read your response.
        
        5. **Unknowns**: If the answer isn't in the data (e.g., "how much did I spend in January 2020?"), say so politely. "My analysis only covers the last 90 days, so I can't see that far back. However, in the last 90 days..." Do not hallucinate numbers.
        """

        # 3. Build Message Chain (This remains the same)
        messages = [{"role": "system", "content": system_prompt}]
        
        if history:
            messages.extend(history[-5:]) 
            
        messages.append({"role": "user", "content": user_message})

        # 4. Call Groq API (This remains the same)
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
