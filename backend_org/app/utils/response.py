from flask import jsonify

def success(data=None, message=None, status=200):
    payload = {"success": True}
    if message:
        payload["message"] = message
    if data is not None:
        payload.update(data)
    return jsonify(payload), status


def error(message, status=400):
    return jsonify({
        "success": False,
        "error": message
    }), status
