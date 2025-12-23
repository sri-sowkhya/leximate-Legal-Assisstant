from bson import ObjectId
from datetime import datetime
import app.extensions as ext


def get_users_collection():
    if ext.db is None:
        raise RuntimeError("MongoDB not initialized")
    return ext.db["users"]


# ---------- GET PROFILE BY USER ID ----------
def get_user_profile(user_id):
    users_collection = get_users_collection()

    return users_collection.find_one(
        {"_id": ObjectId(user_id)},
        {"password": 0},
    )


# ---------- UPDATE PROFILE BY USER ID ----------
def update_user_profile(user_id, update_fields):
    users_collection = get_users_collection()

    if update_fields:
        update_fields["updatedAt"] = datetime.now()
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_fields},
        )

    return users_collection.find_one(
        {"_id": ObjectId(user_id)},
        {"password": 0},
    )
