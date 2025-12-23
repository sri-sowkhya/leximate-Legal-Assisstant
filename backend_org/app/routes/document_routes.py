from flask import Blueprint
from app.controllers.document_controller import (
    generate_document,
    get_documents,
    get_single_document,
    update_document,
    delete_document,
    download_document,
)

document_bp = Blueprint("documents", __name__)

document_bp.route("/generate-document", methods=["POST"])(generate_document)

document_bp.route("/documents", methods=["GET"])(get_documents)
document_bp.route("/documents/<doc_id>", methods=["GET"])(get_single_document)
document_bp.route("/documents/<doc_id>", methods=["PUT"])(update_document)
document_bp.route("/documents/<doc_id>", methods=["DELETE"])(delete_document)

document_bp.route("/download-document/<doc_id>", methods=["GET"])(download_document)
