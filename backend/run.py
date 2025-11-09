# run.py
from app import create_app
import os

app = create_app()

if __name__ == '__main__':
    # Use the PORT environment variable if available, otherwise default to 8000
    port = int(os.environ.get('PORT', 8000))
    # Run in debug mode (remove debug=True for production)
    app.run(debug=True, port=port, host='0.0.0.0')