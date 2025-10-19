from fastapi.middleware.cors import CORSMiddleware

def add_cors_middleware(app):
    """
    Add CORS middleware to the FastAPI application.
    """
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],  # Your React frontend URL
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"]
    )
    return app
