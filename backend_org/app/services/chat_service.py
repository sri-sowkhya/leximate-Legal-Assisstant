from datetime import datetime
import google.generativeai as genai

import app.extensions as ext


def get_chat_sessions_collection():
    if ext.db is None:
        raise RuntimeError("MongoDB not initialized")
    return ext.db["chat_sessions"]


def get_chat_messages_collection():
    if ext.db is None:
        raise RuntimeError("MongoDB not initialized")
    return ext.db["messages"]


# ---------- TOUCH CHAT ----------
def touch_chat_session(session_id):
    chat_sessions = get_chat_sessions_collection()
    chat_sessions.update_one(
        {"_id": session_id},
        {"$set": {"updatedAt": datetime.now()}},
    )


# ---------- START CHAT ----------
def create_chat_session(user_id):
    chat_sessions = get_chat_sessions_collection()

    chat = {
        "user_id": user_id,
        "title": "New Chat",
        "createdAt": datetime.now(),
        "updatedAt": datetime.now(),
    }

    result = chat_sessions.insert_one(chat)
    return result.inserted_id


# ---------- SAVE MESSAGE ----------
def save_chat_message(session_id, user_id, sender, message):
    chat_messages = get_chat_messages_collection()
    chat_sessions = get_chat_sessions_collection()

    chat_messages.insert_one({
        "session_id": session_id,   # ✅ already ObjectId
        "user_id": user_id,
        "sender": sender,
        "message": message,
        "timestamp": datetime.now(),
    })

    chat_sessions.update_one(
        {"_id": session_id},
        {"$set": {"updatedAt": datetime.now()}},
    )


# ---------- GENERATE AI RESPONSE ----------
def generate_ai_reply(user_message):
    model = genai.GenerativeModel("gemini-2.5-flash")
    response = model.generate_content(user_message)
    return response.text.strip()


# ---------- GET CHAT HISTORY ----------
def get_user_chats(user_id):
    chat_sessions = get_chat_sessions_collection()

    return list(chat_sessions.find(
        {"user_id": user_id},
        {"title": 1, "createdAt": 1, "updatedAt": 1},
    ))


# ---------- GET CHAT MESSAGES ----------
def get_chat_messages(session_id):
    chat_messages = get_chat_messages_collection()

    raw_messages = list(
        chat_messages.find(
            {"session_id": session_id}   # ✅ already ObjectId
        ).sort("timestamp", 1)
    )

    if not raw_messages:
        return [
            {
                "session_id": str(session_id),
                "user_id": None,
                "sender": "assistant",
                "message": (
                    "Hello! I'm your LexiMate AI assistant. "
                    "I'm here to help you with legal questions. "
                    "How can I assist you today?"
                ),
                "timestamp": None,
            }
        ]

    messages = []
    for msg in raw_messages:
        messages.append({
            "session_id": str(msg["session_id"]),
            "user_id": str(msg["user_id"]),
            "sender": msg["sender"],
            "message": msg["message"],
            "timestamp": msg["timestamp"].isoformat() if msg.get("timestamp") else None,
        })

    return messages


# ---------- DELETE CHAT ----------
def delete_chat_session(session_id, user_id):
    chat_sessions = get_chat_sessions_collection()
    chat_messages = get_chat_messages_collection()

    chat_sessions.delete_one({
        "_id": session_id,
        "user_id": user_id,
    })

    chat_messages.delete_many({
        "session_id": session_id,
        "user_id": user_id,
    })
