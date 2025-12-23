import os
import uuid
from urllib.parse import quote
from bson import ObjectId
from datetime import datetime

from flask import (
    request,
    jsonify,
    current_app,
    url_for,
    send_from_directory,
)
from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import get_users_collection

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# ---------- GET PROFILE ----------
@jwt_required()
def get_profile():
    users_collection = get_users_collection()
    user_id = get_jwt_identity()

    user = users_collection.find_one(
        {"_id": ObjectId(user_id)},
        {"password": 0}
    )

    if not user:
        return jsonify({"error": "User not found"}), 404

    user["_id"] = str(user["_id"])
    return jsonify({"success": True, "user": user}), 200


# ---------- UPDATE PROFILE ----------
@jwt_required()
def update_profile():
    if request.method == "OPTIONS":
        return ("", 200)

    users_collection = get_users_collection()
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    allowed_fields = [
        "firstName", "lastName", "role", "phone", "company",
        "bio", "jurisdiction", "language", "timezone", "avatarUrl",
    ]

    update_fields = {}
    for key in allowed_fields:
        if key in data:
            val = data.get(key)
            if val is not None and not (isinstance(val, str) and val.strip() == ""):
                update_fields[key] = val

    if update_fields:
        update_fields["updatedAt"] = datetime.now()
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_fields}
        )

    user = users_collection.find_one(
        {"_id": ObjectId(user_id)},
        {"password": 0}
    )

    user["_id"] = str(user["_id"])
    return jsonify({"success": True, "user": user}), 200


# ---------- UPLOAD AVATAR ----------
@jwt_required()
def upload_avatar():
    user_id = get_jwt_identity()

    try:
        if "avatar" not in request.files:
            return jsonify(success=False, message="No file provided"), 400

        file = request.files["avatar"]
        if file.filename == "":
            return jsonify(success=False, message="Empty filename"), 400

        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            return jsonify(success=False, message="File type not allowed"), 400

        filename = secure_filename(file.filename)
        unique_name = f"{uuid.uuid4().hex}_{filename}"

        upload_dir = current_app.config["UPLOAD_FOLDER"]
        os.makedirs(upload_dir, exist_ok=True)

        save_path = os.path.join(upload_dir, unique_name)
        file.save(save_path)

        quoted = quote(unique_name)
        public_url = url_for(
            "profile.serve_upload",
            filename=quoted,
            _external=True,
        )

        return jsonify(success=True, url=public_url)

    except Exception as e:
        current_app.logger.exception("upload failed")
        return jsonify(success=False, message=str(e)), 500


# ---------- SERVE UPLOAD ----------
def serve_upload(filename):
    return send_from_directory(
        current_app.config["UPLOAD_FOLDER"],
        filename,
        as_attachment=False,
    )
