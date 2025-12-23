from flask import request, jsonify
from bson import ObjectId
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.services.chat_service import (
    create_chat_session,
    save_chat_message,
    generate_ai_reply,
    get_user_chats,
    get_chat_messages,
    delete_chat_session,
    touch_chat_session,
)


# ---------- START CHAT ----------
@jwt_required()
def start_chat():
    user_id = get_jwt_identity()

    session_id = create_chat_session(user_id)

    return jsonify({
        "success": True,
        "session_id": str(session_id),
    })


# ---------- CHAT ----------
@jwt_required()
def chat():
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    user_message = data.get("message")
    session_id = data.get("session_id")

    if not user_message or not session_id:
        return jsonify({"error": "Missing fields"}), 400

    try:
        session_oid = ObjectId(session_id)
    except Exception:
        return jsonify({"error": "Invalid session id"}), 400

    # 1️⃣ Save user message
    save_chat_message(session_oid, user_id, "user", user_message)

    # 2️⃣ Generate AI reply
    try:
        bot_reply = generate_ai_reply(user_message)
    except Exception as e:
        print("🔥 CHAT ERROR:", e)
        bot_reply = "Error: Unable to generate response"

    # 3️⃣ Save bot message
    save_chat_message(session_oid, user_id, "assistant", bot_reply)

    # 4️⃣ Update chat updatedAt
    touch_chat_session(session_oid)

    return jsonify({"reply": bot_reply})


# ---------- SAVE MESSAGE ----------
@jwt_required()
def save_message():
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    session_id = data.get("session_id")
    message = data.get("message")
    sender = data.get("sender")

    if not session_id or not message or not sender:
        return jsonify({"error": "Missing fields"}), 400

    try:
        session_oid = ObjectId(session_id)
    except Exception:
        return jsonify({"error": "Invalid session id"}), 400

    save_chat_message(session_oid, user_id, sender, message)
    touch_chat_session(session_oid)

    return jsonify({"success": True})


# ---------- CHAT HISTORY ----------
@jwt_required()
def chat_history():
    user_id = get_jwt_identity()

    chats = get_user_chats(user_id)

    for c in chats:
        c["_id"] = str(c["_id"])

    return jsonify({"success": True, "chats": chats})


# ---------- GET MESSAGES ----------
@jwt_required()
def get_messages(session_id):
    user_id = get_jwt_identity()

    try:
        session_oid = ObjectId(session_id)
    except Exception:
        return jsonify({"error": "Invalid session id"}), 400

    messages = get_chat_messages(session_oid)
    return jsonify({"success": True, "messages": messages})


# ---------- DELETE CHAT ----------
@jwt_required()
def delete_chat(session_id):
    user_id = get_jwt_identity()

    try:
        session_oid = ObjectId(session_id)
    except Exception:
        return jsonify({"error": "Invalid session id"}), 400

    delete_chat_session(session_oid, user_id)

    return jsonify({"success": True, "message": "Chat deleted"})
