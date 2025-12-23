from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

def jwt_login_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        # Allow CORS preflight
        if request.method == "OPTIONS":
            return ("", 200)

        try:
            # Verifies Authorization: Bearer <token>
            verify_jwt_in_request()
            # Optionally fetch user id (forces validation)
            _ = get_jwt_identity()
        except Exception:
            return jsonify({"error": "Unauthorized"}), 401

        return func(*args, **kwargs)

    return wrapper
