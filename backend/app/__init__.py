# app/__init__.py
from flask import Flask, request
from flask_cors import CORS
from .config import Config

def create_app():
    app = Flask(__name__)
    
    # --- CORS Configuration ---
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": Config.CORS_ORIGINS,
                "methods": Config.CORS_METHODS,
                "allow_headers": Config.CORS_ALLOW_HEADERS,
                "supports_credentials": True,
                "expose_headers": Config.CORS_EXPOSE_HEADERS,
                "max_age": 600
            }
        },
        supports_credentials=True
    )

    # Handle OPTIONS method for all routes (for CORS preflight)
    @app.before_request
    def handle_options():
        if request.method == 'OPTIONS':
            response = app.make_default_options_response()
            # The CORS middleware will add the necessary headers
            return response

    # --- Register Blueprints (Routes) ---
    from .routes import utility_routes
    from .routes import categorizer_routes
    from .routes import group_routes
    from .routes import expense_routes
    from .routes import invitation_routes
    from .routes import ai_routes
    
    app.register_blueprint(invitation_routes.inv_bp, url_prefix='/api/invitations')
    app.register_blueprint(utility_routes.util_bp, url_prefix='/api')
    app.register_blueprint(categorizer_routes.cat_bp, url_prefix='/api')
    app.register_blueprint(group_routes.group_bp, url_prefix='/api/groups')
    app.register_blueprint(expense_routes.exp_bp, url_prefix='/api')
    app.register_blueprint(ai_routes.ai_bp, url_prefix='/api/ai')

    return app
