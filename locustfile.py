import time
from locust import HttpUser, task, between
import requests
import json

# --- CONFIGURATION ---
SUPABASE_URL = "https://xmuallpfxwgapaxawrwk.supabase.co" 

SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdWFsbHBmeHdnYXBheGF3cndrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxODY2MzgsImV4cCI6MjA3NTc2MjYzOH0.QKFqE7m21FOSo02wyNfrTpGY8vuiUCVvFu_lvPCIjZc"

TEST_EMAIL = "xyz@example.com"
TEST_PASSWORD = "123456789"

class CoinciousUser(HttpUser):
    wait_time = between(1, 5)
    token = None

    def on_start(self):
        auth_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
        headers = {
            "apikey": SUPABASE_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }

        try:
            response = requests.post(auth_url, headers=headers, json=payload)
            if response.status_code == 200:
                data = response.json()
                self.token = data['access_token']
                # print(f"Login successful for {TEST_EMAIL}")
            else:
                print(f"Login failed: {response.text}")
                self.token = None
        except Exception as e:
            print(f"Login error: {e}")

    @task(3)
    def get_dashboard_groups(self):
        if not self.token:
            return

        headers = {"Authorization": f"Bearer {self.token}"}
        
        # This hits your LOCAL Flask backend
        with self.client.get("/api/groups/", headers=headers, catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Groups load failed: {response.status_code}")

    @task(1)
    def get_expenses(self):
        if not self.token:
            return
            
        headers = {"Authorization": f"Bearer {self.token}"}
        pass