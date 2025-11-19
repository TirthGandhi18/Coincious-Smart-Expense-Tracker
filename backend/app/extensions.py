import google.generativeai as genai
from supabase import create_client, Client
from .config import Config

if not Config.SUPABASE_URL or not Config.SUPABASE_SERVICE_KEY:
    raise ValueError("Supabase URL and Key must be set in .env file")

supabase: Client = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_KEY)

gemini_model = None
if Config.GEMINI_API_KEY:
    try:
        genai.configure(api_key=Config.GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel(model_name="gemini-2.5-flash")
    except Exception as e:
        print(f"Warning: Failed to initialize Gemini model. {e}")
else:
    print("Warning: GEMINI_API_KEY not found. AI features will be disabled.")