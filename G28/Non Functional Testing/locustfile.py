import time
import random
import string
from locust import HttpUser, task, between, events
import requests

# --- CONFIGURATION ---
# Replace these with your actual values from your .env file
SUPABASE_URL = "YOUR_SUPABASE_URL_HERE" 
SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY_HERE"

# Use a test account that is part of at least one group for best results
TEST_EMAIL = "admin@gmail.com"
TEST_PASSWORD = "password"

class CoinciousUser(HttpUser):
    # Target your local Flask backend
    # host = "http://127.0.0.1:8000"
    
    # Simulate a realistic user: they pause for 2-5 seconds between actions
    wait_time = between(2, 5)
    
    token = None
    user_id = None
    known_group_ids = []

    def on_start(self):
        """
        Runs ONCE when a user starts.
        Logs into Supabase to get a valid JWT for the Flask Backend.
        """
        auth_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
        headers = {
            "apikey": SUPABASE_KEY,
            "Content-Type": "application/json"
        }
        try:
            response = requests.post(auth_url, headers=headers, json={
                "email": TEST_EMAIL, "password": TEST_PASSWORD
            })
            if response.status_code == 200:
                data = response.json()
                self.token = data['access_token']
                self.user_id = data['user']['id']
                # print(f"User {self.user_id} logged in successfully")
            else:
                print(f"Login failed: {response.text}")
                self.stop() # Stop this user if login fails
        except Exception as e:
            print(f"Login error: {e}")
            self.stop()

    @property
    def auth_header(self):
        return {"Authorization": f"Bearer {self.token}"}

    # --- TASK SET 1: DASHBOARD (High Frequency - 50%) ---
    @task(5) 
    def load_dashboard(self):
        """
        Simulates refreshing the main dashboard.
        This tests your new RPC optimization heavily.
        """
        if not self.token: return

        # 1. Get Groups (The heavy lifter)
        with self.client.get("/api/groups/", headers=self.auth_header, catch_response=True, name="Dashboard: Get Groups") as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    # Save group IDs to use in other tasks!
                    self.known_group_ids = [g['id'] for g in data.get('groups', [])]
                except:
                    pass
            else:
                response.failure(f"Dashboard load failed: {response.text}")

        # 2. Get Monthly Total (Quick aggregation check)
        self.client.get("/api/current-month-total", headers=self.auth_header, name="Dashboard: Monthly Total")

    # --- TASK SET 2: GROUP DETAILS (Medium Frequency - 30%) ---
    @task(3)
    def view_group_details(self):
        """
        Simulates a user clicking into a specific group.
        Tests the indices on expenses, splits, and members.
        """
        if not self.token or not self.known_group_ids:
            return

        # Pick a random group this user knows about
        group_id = random.choice(self.known_group_ids)
        
        # These requests usually happen in parallel on the frontend, 
        # so we fire them sequentially but rapidly here.
        
        # 1. Group Metadata
        self.client.get(f"/api/groups/{group_id}", headers=self.auth_header, name="Group: Details")
        
        # 2. Members List (Tests group_members index)
        self.client.get(f"/api/groups/{group_id}/members", headers=self.auth_header, name="Group: Members")
        
        # 3. Balances (Complex calculation logic)
        self.client.get(f"/api/groups/{group_id}/balances", headers=self.auth_header, name="Group: Balances")
        
        # 4. Expenses List (Tests expenses index)
        self.client.get(f"/api/expenses?group_id={group_id}", headers=self.auth_header, name="Group: Expenses")

    # --- TASK SET 3: ANALYTICS (Low Frequency - 10%) ---
    @task(1)
    def view_analytics(self):
        """
        Simulates viewing the charts page.
        Tests data aggregation capabilities.
        """
        if not self.token: return
        
        # Test the donut chart calculation
        self.client.post("/api/expense_monthly_donut", 
                         json={"period": "current"}, 
                         headers=self.auth_header, 
                         name="Analytics: Donut Chart")

    # --- TASK SET 4: WRITE OPERATIONS (Very Low Frequency - 10%) ---
    @task(1)
    def create_group(self):
        """
        Simulates creating a new group.
        This ensures that WRITES don't block READS.
        """
        if not self.token: return

        random_name = "LoadTest-" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
        
        self.client.post("/api/groups/", 
                         json={"name": random_name}, 
                         headers=self.auth_header, 
                         name="Write: Create Group")