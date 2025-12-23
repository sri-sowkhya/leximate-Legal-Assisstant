import os
from urllib.parse import urlencode

from flask import redirect, current_app
from flask_cors import CORS
from pymongo import MongoClient

import google.generativeai as genai
from flask_dance.contrib.google import make_google_blueprint, google
from flask_dance.consumer import oauth_authorized
from flask_jwt_extended import JWTManager, create_access_token

from app.services.auth_service import get_or_create_google_user

# ------------------ Globals ------------------
client = None
db = None

users_collection = None
nda_collection = None
contracts_collection = None
chat_sessions = None
chat_messages = None

jwt_manager = None
google_bp = None

# Needed for local OAuth over http
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"


# ------------------ INIT EXTENSIONS ------------------
def init_extensions(app):
    global client, db
    global users_collection, nda_collection, contracts_collection
    global chat_sessions, chat_messages
    global jwt_manager, google_bp

    # -------- CORS --------
    CORS(
        app,
        supports_credentials=True,
        resources={
            r"/*": {
                "origins": [
                    "http://localhost:8080",
                    "http://127.0.0.1:8080",
                ]
            }
        },
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    # -------- MongoDB --------
    mongo_uri = app.config.get(
        "MONGO_URI", "mongodb://localhost:27017/contracts_db"
    )
    client = MongoClient(mongo_uri)

    db_name = mongo_uri.rsplit("/", 1)[-1]
    db = client[db_name]

    users_collection = db["users"]
    nda_collection = db["nda_agreements"]
    contracts_collection = db["contracts"]
    chat_sessions = db["chat_sessions"]
    chat_messages = db["messages"]

    # -------- Gemini --------
    genai.configure(api_key=app.config.get("GEMINI_API_KEY"))

    # -------- JWT --------
    jwt_manager = JWTManager(app)
    print("GOOGLE CLIENT ID USED =", app.config.get("GOOGLE_OAUTH_CLIENT_ID"))

    # -------- Google OAuth --------
    google_bp = make_google_blueprint(
        client_id=app.config["GOOGLE_OAUTH_CLIENT_ID"],
        client_secret=app.config["GOOGLE_OAUTH_CLIENT_SECRET"],
        scope=["openid", "email", "profile"],
        
    )

    app.register_blueprint(google_bp,url_prefix = "/login")


# ------------------ GOOGLE OAUTH CALLBACK ------------------
@oauth_authorized.connect
def google_logged_in(blueprint, token):
    resp = google.get("/oauth2/v2/userinfo")
    if not resp.ok:
        return redirect(
            f"{current_app.config['FRONTEND_URL']}/login?error=google_auth_failed"
        )

    info = resp.json()

    user = get_or_create_google_user(
        google_id=info.get("id"),
        email=(info.get("email") or "").lower(),
        name=info.get("name") or info.get("given_name"),
    )

    access_token = create_access_token(identity=str(user["_id"]))

    redirect_url = (
        f"{current_app.config['FRONTEND_URL']}/oauth-callback?"
        + urlencode({"token": access_token})
    )

    return redirect(redirect_url)



# ------------------ HELPERS ------------------
def get_users_collection():
    if db is None:
        raise RuntimeError("MongoDB not initialized")
    return users_collection
