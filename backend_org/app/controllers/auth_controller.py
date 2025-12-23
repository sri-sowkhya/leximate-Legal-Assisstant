from flask import request, jsonify, session, redirect, url_for, current_app
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    verify_jwt_in_request,
    get_jwt_identity,
)
from urllib.parse import urlencode
from flask_dance.contrib.google import google
from app.extensions import get_users_collection
from bson import ObjectId
from werkzeug.security import check_password_hash

from app.services.auth_service import (
    create_user,
    authenticate_user,
    get_user_by_id,
    get_or_create_google_user,
)


# ---------- SIGNUP ----------
def signup():
    try:
        data = request.get_json() or {}
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")

        if not username or not email or not password:
            return jsonify({"error": "All fields are required"}), 400

        user_id, error = create_user(username, email, password)
        if error:
            return jsonify({"error": error}), 400

        token = create_access_token(identity=str(user_id))

        return jsonify({
            "success": True,
            "token": token,
            "user": {
                "_id": str(user_id),
                "username": username,
                "email": email,
            },
        }), 201

    except Exception as e:
        current_app.logger.exception("Signup error")
        return jsonify({"error": str(e)}), 500


# ---------- LOGIN ----------
'''
def login():
    try:
        data = request.get_json() or {}
        email = data.get("email")
        password = data.get("password")

        session.clear()

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        user, error = authenticate_user(email, password)

        if error == "User not found":
            return jsonify({"error": error}), 404

        if error == "Incorrect password":
            return jsonify({"error": error}), 401

        if error:
            return jsonify({"error": error}), 401

        session["user_id"] = str(user["_id"])
        session["email"] = user["email"]

        return jsonify({
            "success": True,
            "message": "Login successful",
            "user": {
                "username": user["username"],
                "email": user["email"],
            },
        }), 200

    except Exception as e:
        current_app.logger.exception("Login error")
        return jsonify({"error": str(e)}), 500

'''
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")
    users_collection = get_users_collection()

    user = users_collection.find_one({"email": email})
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(identity=str(user["_id"]))

    user["_id"] = str(user["_id"])
    user.pop("password", None)

    return jsonify({
        "success": True,
        "token": token,
        "user": user
    }), 200
# ---------- LOGOUT ----------
def logout():
    
    return jsonify({"success": True, "message": "Logged out"}), 200


# ---------- GOOGLE LOGIN ----------


def google_authorized():
    if not google.authorized:
        return jsonify({"error": "Google auth failed"}), 401

    resp = google.get("/oauth2/v2/userinfo")
    if not resp.ok:
        return jsonify({"error": "Failed to fetch user info"}), 400
    info = resp.json()
    google_id = info.get("id")
    email = (info.get("email") or "").lower()
    name = info.get("name") or info.get("given_name") or None

    # Service must replicate app.py logic exactly
    user = get_or_create_google_user(google_id, email, name)

    token = create_access_token(
    identity=str(user["_id"]),
    additional_claims={"email": user.get("email")},
)


    params = urlencode({"token": token})
    redirect_url = f"{current_app.config.get('FRONTEND_URL')}/oauth-callback?{params}"

    return redirect(redirect_url)


# ---------- API /me ----------
@jwt_required()
def api_me():
    users_collection = get_users_collection()
    user_id = get_jwt_identity()

    user = users_collection.find_one(
        {"_id": ObjectId(user_id)},
        {"password": 0}  # exclude password if exists
    )

    if not user:
        return jsonify({"error": "User not found"}), 404

    user["_id"] = str(user["_id"])

    return jsonify({"user": user}), 200
