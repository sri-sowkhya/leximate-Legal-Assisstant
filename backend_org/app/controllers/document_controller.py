from datetime import datetime
from flask import request, jsonify, send_file, current_app
from bson import ObjectId
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.services.document_service import (
    get_documents_for_user,
    get_document_by_id,
    delete_document_by_id,
    update_document_fields,
    insert_document,
    generate_document_text,
)
from app.services.pdf_service import generate_pdf


# ---------- GENERATE DOCUMENT ----------
@jwt_required()
def generate_document():
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    doc_type = data.get("documentType")
    if not doc_type:
        return jsonify({"error": "Document type is required"}), 400

    now = datetime.now()
    save_as_draft = bool(data.get("saveAsDraft") or data.get("saveDraft"))
    generate_now = bool(data.get("generateNow") or data.get("startGeneration"))

    current_page = None
    if "currentPage" in data:
        try:
            current_page = int(data.get("currentPage"))
        except Exception:
            pass

    existing_oid = None
    if data.get("documentId"):
        try:
            existing_oid = ObjectId(data.get("documentId"))
        except Exception:
            pass

    base_doc = {
        "user_id": user_id,
        "type": doc_type,
        "companyName": data.get("companyName"),
        "counterpartyName": data.get("counterpartyName"),
        "effectiveDate": data.get("effectiveDate"),
        "duration": data.get("duration"),
        "governingLaw": data.get("governingLaw"),
        "confidentialityLevel": data.get("confidentialityLevel"),
        "purpose": data.get("purpose"),
        "additionalTerms": data.get("additionalTerms"),
        "updatedAt": now,
    }

    # ----- SAVE AS DRAFT -----
    if save_as_draft:
        base_doc["generatedText"] = data.get("generatedText")
        base_doc["status"] = "draft"

        if existing_oid:
            update_document_fields(existing_oid, base_doc)
            return jsonify({"success": True, "documentId": str(existing_oid), "status": "draft"}), 200

        base_doc["createdAt"] = now
        doc_id = insert_document(base_doc)
        return jsonify({"success": True, "documentId": str(doc_id), "status": "draft"}), 200

    # ----- GENERATE NOW -----
    if generate_now:
        base_doc["status"] = "pending"
        base_doc["generatedText"] = None

        record_id = existing_oid or insert_document({**base_doc, "createdAt": now})

        document_text = generate_document_text(doc_type, data)
        if not document_text:
            return jsonify({"error": "Invalid document type"}), 400

        update_document_fields(record_id, {
            "generatedText": document_text,
            "status": "completed",
            "updatedAt": datetime.now(),
        })

        return jsonify({
            "success": True,
            "documentId": str(record_id),
            "documentText": document_text,
            "status": "completed",
        }), 200

    # ----- PAGE-BASED SAVE -----
    if current_page is not None and current_page >= 4:
        base_doc["status"] = "pending"
        base_doc["generatedText"] = None

        if existing_oid:
            update_document_fields(existing_oid, base_doc)
            return jsonify({"success": True, "documentId": str(existing_oid), "status": "pending"}), 200

        base_doc["createdAt"] = now
        doc_id = insert_document(base_doc)
        return jsonify({"success": True, "documentId": str(doc_id), "status": "pending"}), 200

    return jsonify({"error": "Invalid request"}), 400


# ---------- GET ALL DOCUMENTS ----------
@jwt_required()
def get_documents():
    user_id = get_jwt_identity()
    docs = get_documents_for_user(user_id)

    for d in docs:
        d["_id"] = str(d["_id"])
        for k in ("createdAt", "updatedAt"):
            if isinstance(d.get(k), datetime):
                d[k] = d[k].isoformat()

    return jsonify({"success": True, "documents": docs}), 200


# ---------- GET SINGLE DOCUMENT ----------
@jwt_required()
def get_single_document(doc_id):
    user_id = get_jwt_identity()

    try:
        oid = ObjectId(doc_id)
    except Exception:
        return jsonify({"error": "Invalid document id"}), 400

    doc = get_document_by_id(oid)
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    if str(doc.get("user_id")) != str(user_id):
        return jsonify({"error": "Unauthorized"}), 403

    doc["_id"] = str(doc["_id"])
    for k in ("createdAt", "updatedAt"):
        if isinstance(doc.get(k), datetime):
            doc[k] = doc[k].isoformat()

    return jsonify({"success": True, "document": doc}), 200


# ---------- UPDATE DOCUMENT ----------
@jwt_required()
def update_document(doc_id):
    user_id = get_jwt_identity()

    try:
        oid = ObjectId(doc_id)
    except Exception:
        return jsonify({"error": "Invalid document id"}), 400

    data = request.get_json() or {}
    doc = get_document_by_id(oid)

    if not doc:
        return jsonify({"error": "Document not found"}), 404
    if str(doc.get("user_id")) != str(user_id):
        return jsonify({"error": "Not authorized"}), 403

    allowed = {k: data[k] for k in data if k in [
        "type", "companyName", "counterpartyName", "effectiveDate",
        "duration", "governingLaw", "confidentialityLevel",
        "purpose", "additionalTerms", "generatedText", "status"
    ]}

    if "documentType" in data and "type" not in allowed:
        allowed["type"] = data["documentType"]

    if not allowed:
        return jsonify({"error": "No updatable fields provided"}), 400

    allowed["updatedAt"] = datetime.now()
    update_document_fields(oid, allowed)

    return jsonify({"success": True, "documentId": doc_id}), 200


# ---------- DELETE DOCUMENT ----------
@jwt_required()
def delete_document(doc_id):
    user_id = get_jwt_identity()

    try:
        oid = ObjectId(doc_id)
    except Exception:
        return jsonify({"error": "Invalid document id"}), 400

    doc = get_document_by_id(oid)
    if not doc:
        return jsonify({"error": "Document not found"}), 404
    if str(doc.get("user_id")) != str(user_id):
        return jsonify({"error": "Not authorized"}), 403

    delete_document_by_id(oid)
    return jsonify({"success": True, "message": "Document deleted"}), 200


# ---------- DOWNLOAD PDF ----------
'''@jwt_required()
def download_document(doc_id):
    user_id = get_jwt_identity()

    try:
        oid = ObjectId(doc_id)
    except Exception:
        return jsonify({"error": "Invalid document id"}), 400

    document = get_document_by_id(oid)
    if not document:
        return jsonify({"error": "Document not found"}), 404
    if str(document.get("user_id")) != str(user_id):
        return jsonify({"error": "Unauthorized"}), 403
    if not document.get("generatedText"):
        return jsonify({"error": "Document not generated yet"}), 400

    filename = f"document_{doc_id}.pdf"
    pdf_path = generate_pdf(document, current_app.config["PDF_DIR"], filename)

    return send_file(pdf_path, as_attachment=True, download_name=filename)
'''
from flask import send_file
from io import BytesIO
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet

@jwt_required()
def download_document(doc_id):
    user_id = get_jwt_identity()

    document = get_document_by_id(doc_id)
    if not document:
        return jsonify({"error": "Document not found"}), 404

    if str(document.get("user_id")) != str(user_id):
        return jsonify({"error": "Unauthorized"}), 403

    text = document.get("generatedText")
    if not text:
        return jsonify({"error": "Document not generated yet"}), 400

    # ---- CREATE PDF IN MEMORY ----
    buffer = BytesIO()
    pdf = SimpleDocTemplate(buffer)
    styles = getSampleStyleSheet()

    content = []
    for line in text.split("\n"):
        content.append(Paragraph(line, styles["Normal"]))

    pdf.build(content)
    buffer.seek(0)

    filename = f"{document.get('type', 'document')}.pdf"

    return send_file(
        buffer,
        as_attachment=True,
        download_name=filename,
        mimetype="application/pdf"
    )
