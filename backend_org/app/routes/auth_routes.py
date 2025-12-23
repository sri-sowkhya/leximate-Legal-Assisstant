from flask import Blueprint,redirect, url_for
from app.controllers.auth_controller import (
    signup,
    login,
    logout,
    api_me,
)
auth_bp = Blueprint("auth", __name__)

auth_bp.route("/signup", methods=["POST"])(signup)
auth_bp.route("/login", methods=["POST"])(login)
auth_bp.route("/logout", methods=["POST"])(logout)



auth_bp.route("/api/me", methods=["GET"])(api_me)


