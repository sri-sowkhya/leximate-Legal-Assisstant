from datetime import datetime
import app.extensions as ext


def get_nda_collection():
    if ext.db is None:
        raise RuntimeError("MongoDB not initialized")
    return ext.db["nda_agreements"]


# ---------- GET DOCUMENTS FOR USER ----------
def get_documents_for_user(user_id):
    nda_collection = get_nda_collection()
    return list(nda_collection.find({"user_id": user_id}))


# ---------- GET DOCUMENT BY ID ----------
from bson import ObjectId

def get_document_by_id(doc_id):
    nda_collection = get_nda_collection()
    try:
        return nda_collection.find_one({"_id": ObjectId(doc_id)})
    except Exception:
        return None

# ---------- DELETE DOCUMENT ----------
def delete_document_by_id(doc_id):
    nda_collection = get_nda_collection()
    nda_collection.delete_one({"_id": doc_id})


# ---------- UPDATE DOCUMENT ----------
def update_document_fields(doc_id, fields):
    nda_collection = get_nda_collection()
    fields["updatedAt"] = datetime.now()
    nda_collection.update_one(
        {"_id": doc_id},
        {"$set": fields},
    )


# ---------- INSERT DOCUMENT ----------
def insert_document(doc):
    nda_collection = get_nda_collection()
    now = datetime.now()
    doc["createdAt"] = now
    doc["updatedAt"] = now
    return nda_collection.insert_one(doc).inserted_id


# ---------- GENERATE DOCUMENT TEXT ----------
def generate_document_text(doc_type, data):
    if doc_type == "nda":
        return f"""
NON-DISCLOSURE AGREEMENT (NDA)

This Agreement is entered into on {data.get('effectiveDate')}
between {data.get('disclosingParty')} ("Disclosing Party") and
{data.get('receivingParty')} ("Receiving Party").

Purpose:
{data.get('purpose')}

Confidentiality Level: {data.get('confidentialityLevel')}
Duration: {data.get('duration')}

Additional Terms:
{data.get('additionalTerms')}
"""

    if doc_type == "contract":
        return f"""
FREELANCE CONTRACT AGREEMENT

Client: {data.get('clientName')}
Freelancer: {data.get('freelancerName')}
Project: {data.get('projectTitle')}
Payment: {data.get('paymentAmount')} via {data.get('paymentMethod')}
"""

    if doc_type == "service":
        return f"""
SERVICE AGREEMENT

Company: {data.get('companyName')}
Client: {data.get('counterpartyName')}
Purpose: {data.get('purpose')}
Duration: {data.get('duration')}
Governing Law: {data.get('governingLaw')}
"""

    return None
