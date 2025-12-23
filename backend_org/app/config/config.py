import os
'''
class Config:
    # Flask
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY","dev-secret-key")

    # Frontend
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:8080")

    # JWT (used ONLY for Google OAuth flow)
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    #OAuth
    GOOGLE_OAUTH_CLIENT_ID = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
    GOOGLE_OAUTH_CLIENT_SECRET = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")

    # Session cookies (same behavior as app.py)
    SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
    SESSION_COOKIE_SECURE = False
    SESSION_TYPE = "filesystem"
    SESSION_COOKIE_HTTPONLY = True

    # Mongo
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/contracts_db")
'''
class Config:
    SECRET_KEY = None
    FRONTEND_URL = None
    JWT_SECRET_KEY = None
    GOOGLE_OAUTH_CLIENT_ID = None
    GOOGLE_OAUTH_CLIENT_SECRET = None
    # Gemini
    GEMINI_API_KEY = os.getenv("my_api_key")
    SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
    SESSION_COOKIE_SECURE = False
    SESSION_TYPE = "filesystem"
    SESSION_COOKIE_HTTPONLY = True

    # Mongo
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/contracts_db")
    # Uploads
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5 MB
    UPLOAD_FOLDER = "uploads"

