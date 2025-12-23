from flask import Blueprint
from app.controllers.chat_controller import (
    start_chat,
    chat,
    save_message,
    get_messages,
    chat_history,
    delete_chat,
)

chat_bp = Blueprint("chat", __name__)

chat_bp.route("/startChat", methods=["POST"])(start_chat)
chat_bp.route("/chat", methods=["POST"])(chat)
chat_bp.route("/saveMessage", methods=["POST"])(save_message)

chat_bp.route("/getMessages/<session_id>", methods=["GET"])(get_messages)
chat_bp.route("/chatHistory", methods=["GET"])(chat_history)
chat_bp.route("/deleteChat/<session_id>", methods=["DELETE"])(delete_chat)
