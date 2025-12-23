from datetime import datetime
from bson import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash

import app.extensions as ext



def get_users_collection():
    if ext.db is None:
        raise RuntimeError("MongoDB not initialized")
    return ext.db["users"]


def create_user(username, email, password):
    users_collection = get_users_collection()

    if users_collection.find_one({"email": email}):
        return None, "Email already registered"

    hashed_password = generate_password_hash(password)

    user_doc = {
        "username": username,
        "email": email,
        "password": hashed_password,
        "createdAt": datetime.now(),
    }

    result = users_collection.insert_one(user_doc)
    return result.inserted_id, None


def authenticate_user(email, password):
    users_collection = get_users_collection()

    user = users_collection.find_one({"email": email})
    if not user:
        return None, "User not found"

    if "password" not in user:
        return None, "Use Google login"

    if not check_password_hash(user["password"], password):
        return None, "Incorrect password"

    return user, None


def get_user_by_id(user_id):
    users_collection = get_users_collection()
    return users_collection.find_one({"_id": ObjectId(user_id)})


def get_or_create_google_user(google_id, email, name):
    users_collection = get_users_collection()

    user = users_collection.find_one({"google_id": google_id})

    if not user and email:
        user = users_collection.find_one({"email": email})

    if not user:
        user_doc = {
            "username": name or email.split("@")[0],
            "email": email,
            "google_id": google_id,
            "signup_method": "google",
            "createdAt": datetime.now(),
        }
        inserted = users_collection.insert_one(user_doc)
        return users_collection.find_one({"_id": inserted.inserted_id})

    if not user.get("google_id"):
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"google_id": google_id}},
        )

    return user
