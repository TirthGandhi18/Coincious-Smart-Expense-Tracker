<div align="center">
  <h1 align="center">Coinsious - Smart Expense Tracker 💰🤖</h1>
</div>

<p align="center">
  <a href="https://www.python.org/"><img src="https://img.shields.io/badge/Python-3.10+-blue.svg"></a>
  <a href="https://flask.palletsprojects.com/"><img src="https://img.shields.io/badge/Flask-Backend-lightgrey.svg"></a>
  <a href="https://ai.google/discover/generativeai/"><img src="https://img.shields.io/badge/Google%20Generative%20AI-LLM-orange.svg"></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-18+-61DAFB.svg?logo=react&logoColor=white"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?logo=typescript&logoColor=white"></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/TailwindCSS-3.0+-38B2AC.svg?logo=tailwindcss&logoColor=white"></a>
</p>


## 📖 About  

**Coinsious** is a smart expense tracker designed to help you **categorize, analyze, and manage your expenses effortlessly**.  
It uses **Generative AI** to automatically classify your spending, giving you **personalized insights** into your financial habits.  

---

## ✨ Features  
- 🔍 **AI-Powered Categorization** – Expenses are automatically categorized using **GenAI**.
- More exciting features are yet to come as we continue improving Coinsious.

## 📋 Prerequisites  

Before you begin, ensure you have the following installed and set up on your system:  

* **Python** (v3.10 or later recommended)  
* **Flask** (for backend services)  
* **Google Generative AI API Key** (for AI-powered categorization & chatbot)  
* **React** (for frontend development)  
* **TailwindCSS** (for styling the UI)
* **(Recommended) use virtualenv

## 🚀 Getting Started

Follow these steps to get a local copy of the project up and running.

### 1) Clone and navigate
```bash
git clone <your-repo-url>
cd Coincious-Smart-Expense-Tracker/backend
```

### 2) Create and activate a virtual environment
```bash
python -m venv venv
source venv/bin/activate   # On macOS/Linux
# .\venv\Scripts\activate  # On Windows (PowerShell)
```

### 3) Install dependencies
```bash
pip install -r requirements.txt
```

### 4) Configure environment variables
This project optionally uses Google Gemini for AI-based categorization when rules don’t match.

Create a `.env` file (in the `backend/` directory) with:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

- If `GEMINI_API_KEY` is not set, the app will still run and fall back to a default category when rules don’t match.

### 5) Run the server
```bash
python app.py
```

The Flask server starts on: http://localhost:8000

### 6) Test the API
Endpoint: `POST /api/categorize`

Form fields accepted:
- `description` (string, required)
- `amount` (number, required, must be > 0)
- `category` (string, optional — if provided, the app will “learn” and store this mapping)

