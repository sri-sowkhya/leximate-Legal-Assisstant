from app.routes.auth_routes import auth_bp
from app.routes.profile_routes import profile_bp
from app.routes.document_routes import document_bp
from app.routes.chat_routes import chat_bp

def register_routes(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(document_bp)
    app.register_blueprint(chat_bp)