from flask import Flask
from dotenv import load_dotenv
import os

from app.config.config import Config
from app.extensions import init_extensions
from app.routes import register_routes

from pathlib import Path
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

def create_app():
    

    app = Flask(__name__)

# 1️⃣ Load config class first
    app.config.from_object(Config)
    '''app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY") or app.config["SECRET_KEY"]

# 2️⃣ Override from env (env MUST win)
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
    app.config["FRONTEND_URL"] = os.getenv("FRONTEND_URL") or app.config["FRONTEND_URL"]
    app.config["SESSION_TYPE"] = app.config.get("SESSION_TYPE", "filesystem")
    '''
    app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY")
    app.config["FRONTEND_URL"] = os.getenv("FRONTEND_URL")
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
    app.config["GOOGLE_OAUTH_CLIENT_ID"] = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
    app.config["GOOGLE_OAUTH_CLIENT_SECRET"] = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")

    # Upload folder (app.py parity)
    upload_dir = os.path.join(app.root_path, "..", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    app.config["UPLOAD_FOLDER"] = upload_dir

    # PDF folder (app.py parity)
    pdf_dir = os.path.join(app.root_path, "..", "generated_pdfs")
    os.makedirs(pdf_dir, exist_ok=True)
    app.config["PDF_DIR"] = pdf_dir
    print("CLIENT ID AT RUNTIME =", app.config["GOOGLE_OAUTH_CLIENT_ID"])

    # Initialize extensions
    init_extensions(app)

    # Register routes (NO prefixes)
    register_routes(app)

    return app
