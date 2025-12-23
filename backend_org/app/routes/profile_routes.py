from flask import Blueprint
from app.controllers.profile_controller import (
    get_profile,
    update_profile,
    upload_avatar,
    serve_upload,
)

profile_bp = Blueprint("profile", __name__)

profile_bp.route("/getProfile", methods=["GET"])(get_profile)
profile_bp.route("/updateProfile", methods=["PUT"])(update_profile)

profile_bp.route("/uploadProfileImage", methods=["POST"])(upload_avatar)
profile_bp.route("/uploads/<path:filename>", methods=["GET"])(serve_upload)
