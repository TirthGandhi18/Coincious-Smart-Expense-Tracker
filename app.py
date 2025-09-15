from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({"message": "Welcome to the Python API!"})

if __name__ == '__main__':
    app.run(debug=True, port=5002)
