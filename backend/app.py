from flask import Flask, request, jsonify, send_file,session,current_app,url_for, send_from_directory,redirect
from flask_cors import CORS
from pymongo import MongoClient
import google.generativeai as genai
from datetime import datetime
from bson import ObjectId
from urllib.parse import quote 
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph , Spacer
from reportlab.lib.styles import getSampleStyleSheet
import os,uuid
from flask_dance.contrib.google import make_google_blueprint, google
from flask_jwt_extended import create_access_token
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from urllib.parse import urlencode

from dotenv import load_dotenv
from werkzeug.utils import secure_filename 
from werkzeug.security import generate_password_hash, check_password_hash
from bson import ObjectId
load_dotenv()
print("Loaded API key:", os.getenv("my_api_key"))

#from docx import Document
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_DIR = os.path.join(BASE_DIR, "generated_pdfs")
os.makedirs(PDF_DIR, exist_ok=True)

app = Flask(__name__)

app.config["SECRET_KEY"] = os.environ.get("FLASK_SECRET_KEY")
JWT_SECRET = os.environ.get("JWT_SECRET_KEY")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

google_bp = make_google_blueprint(
    client_id=os.environ.get("GOOGLE_OAUTH_CLIENT_ID"),
    client_secret=os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET"),
    scope=["openid", "email", "profile"],
    redirect_url="/login/google/authorized"   # must match GCP redirect URI
)
app.register_blueprint(google_bp, url_prefix="/login")


CORS(app, supports_credentials=True,resources={r"/*":{"origins":["http://localhost:8080","http://127.0.0.1:8080"]}}, allow_headers=["Content-Type","Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

app.secret_key = "your_key_here"
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False    # VERY IMPORTANT
app.config["SESSION_COOKIE_HTTPONLY"] = True  # True for HTTPS

# MongoDB setup
client = MongoClient("mongodb://localhost:27017/")
db = client["contracts_db"]
contracts_collection = db["contracts"]
nda_collection = db["nda_agreements"]

users_collection = db["users"]
genai.configure(api_key=os.getenv("my_api_key"))

  # if using pymongo ObjectId

@app.route("/api/me")
def me():
    try:
        # verify token in Authorization header
        verify_jwt_in_request(optional=False, secret=JWT_SECRET)
        uid = get_jwt_identity()
        user = users_collection.find_one({"_id": ObjectId(uid)})
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify({"user":{"username": user["username"], "email": user["email"]}})
    except Exception as e:
        return jsonify({"error": str(e)}), 401
@app.route("/login/google")
def login_google():
    # Redirect user to Google's OAuth consent page (Flask-Dance does this)
    return redirect(url_for("google.login"))


@app.route("/login/google/authorized")
def google_authorized():
    # Called by Google after user consents. Flask-Dance stores token in session.
    resp = google.get("/oauth2/v2/userinfo")
    if not resp.ok:
        print("Google userinfo failed:", resp.text)
        return jsonify({"error": "Google login failed"}), 400

    info = resp.json()
    google_id = info.get("id")
    email = (info.get("email") or "").lower()
    name = info.get("name") or info.get("given_name") or None

    # 1) Try find user by google_id
    user = users_collection.find_one({"google_id": google_id})

    # 2) If not found, try find by email to link accounts (user previously signed up locally)
    if not user and email:
        user = users_collection.find_one({"email": email})

    if not user:
        # create new user
        user_doc = {
            "username": name or email.split("@")[0],
            "email": email,
            "google_id": google_id,
            "signup_method": "google",
            "createdAt": datetime.now()
        }
        inserted = users_collection.insert_one(user_doc)
        user = users_collection.find_one({"_id": inserted.inserted_id})
    else:
        # if user exists but google_id not set, link it
        if not user.get("google_id"):
            users_collection.update_one({"_id": user["_id"]}, {"$set": {"google_id": google_id}})

    # Create a JWT so frontend can behave exactly like email/password flow
    # create_access_token will by default take app.config["JWT_SECRET_KEY"], but we can pass secret.
    token = create_access_token(identity=str(user["_id"]), additional_claims={"email": user.get("email")}, expires_delta=False, secret=JWT_SECRET)
    # NOTE: in production set an appropriate expiry and use cookies or HttpOnly cookie.

    # Redirect to frontend OAuth callback that will read token
    params = urlencode({"token": token})
    redirect_url = f"{FRONTEND_URL}/oauth-callback?{params}"
    return redirect(redirect_url)


@app.route("/")
def home():
    return "Flask backend is running! Use /generate-contract endpoint."
# --- your contract generation route ---

@app.route("/signup", methods=["POST"])
def signup():
    try:
        data = request.get_json()
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")
        session.clear()
        print("Received:", data) 
        if not username or not email or not password:
            return jsonify({"error": "All fields are required"}), 400

        if users_collection.find_one({"email": email}):
            return jsonify({"error": "Email already registered"}), 400

        hashed_password = generate_password_hash(password)

        user_doc = {
            "username": username,
            "email": email,
            "password": hashed_password,
            "createdAt": datetime.now()
        }

        inserted = users_collection.insert_one(user_doc)
        session["user_id"] = str(inserted.inserted_id)
        session["email"] = email
        return jsonify({"success":True,"message": "User registered successfully!","user": {
                "username": username,
                "email": email
            }}), 201
    except Exception as e:
        print("⚠️ Signup error:", e)
        return jsonify({"error": str(e)}), 500
@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")
        session.clear()

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        user = users_collection.find_one({"email": email})
        if not user:
            return jsonify({"error": "User not found"}), 404

        if not check_password_hash(user["password"], password):
            return jsonify({"error": "Incorrect password"}), 401
        session['user_id'] = str(user['_id'])
        session["email"] = email
        return jsonify({
            "success":True,
            "message": "Login successful",
            "user": {
                "username": user["username"],
                "email": user["email"]
            }
        }), 200
    except Exception as e:
        print("⚠️ Login error:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/logout", methods=["POST"])
def logout():
    session.clear()  # Remove all session data
    return jsonify({"success": True, "message": "Logged out"}), 200

# --- Get profile of currently logged-in user ---
@app.route("/getProfile", methods=["GET"])
def get_profile():
    email = session.get("email")  # get email from session
    if not email:
        return jsonify({"error": "Not logged in"}), 401

    user = users_collection.find_one({"email": email}, {"_id": 0, "password": 0})
    if not user:
        return jsonify({"error": "User not found"}), 404
    print("Profile user data:", user)

    return jsonify({"success": True, "user": user}), 200

# --- Update profile of currently logged-in user ---
@app.route("/updateProfile", methods=["PUT"])
def update_profile():
    email = session.get("email")  # keep using session-based auth
    if not email:
        return jsonify({"error": "Not logged in"}), 401

    data = request.get_json() or {}

    # Allowed fields: add avatarUrl so frontend can persist the uploaded image URL
    allowed_fields = [
        "firstName", "lastName", "role", "phone", "company",
        "bio", "jurisdiction", "language", "timezone", "avatarUrl"
    ]

    # Build update dict only for present, non-null, non-empty values
    update_fields = {}
    for key in allowed_fields:
        if key in data:
            val = data.get(key)
            # skip null/undefined; optionally skip empty strings too
            if val is not None and (not (isinstance(val, str) and val.strip() == "")):
                update_fields[key] = val

    # If there's something to update, persist it
    if update_fields:
        users_collection.update_one({"email": email}, {"$set": update_fields})

    # Return the updated user (omit sensitive fields)
    updated_user = users_collection.find_one({"email": email}, {"_id": 0, "password": 0})
    return jsonify({"success": True, "user": updated_user}), 200


@app.route("/generate-document", methods=["POST"])
def generate_document():
    data = request.get_json()
    doc_type = data.get("documentType")   # nda | contract | service

    if not doc_type:
        return jsonify({"error": "Document type is required"}), 400

    # Fetch common fields
    company = data.get("companyName")
    counterparty = data.get("counterpartyName")
    effective = data.get("effectiveDate")
    duration = data.get("duration")
    governing = data.get("governingLaw")
    confidentiality = data.get("confidentialityLevel")
    purpose = data.get("purpose")
    additional = data.get("additionalTerms")
    

    save_as_draft = bool(data.get("saveAsDraft") or data.get("saveDraft"))
    generate_now = bool(data.get("generateNow") or data.get("startGeneration"))
    current_page = None

    if "currentPage" in data:
        try:
            current_page = int(data.get("currentPage") or 0)
        except Exception:
            current_page = None
    incoming_doc_id = data.get("documentId") or data.get("document_id") or None
    existing_oid = None
    if incoming_doc_id:
        try:
            existing_oid = ObjectId(incoming_doc_id)
        except Exception:
            existing_oid = None

    user_id = session.get("user_id")

    now = datetime.now()

    # ---------- Branch: save as draft ----------
    if save_as_draft:
        partial_text = data.get("generatedText") or None

        if existing_oid:
            # update existing doc to draft
            nda_collection.update_one(
                {"_id": existing_oid},
                {"$set": {
                    "user_id": user_id,
                    "type": doc_type,
                    "companyName": company,
                    "counterpartyName": counterparty,
                    "effectiveDate": effective,
                    "duration": duration,
                    "governingLaw": governing,
                    "confidentialityLevel": confidentiality,
                    "purpose": purpose,
                    "additionalTerms": additional,
                    "generatedText": partial_text,
                    "status": "draft",
                    "updatedAt": datetime.now()
                }}
            )
            return jsonify({"success": True, "documentId": str(existing_oid), "status": "draft", "message": "Saved as draft (updated)"}), 200
        else:
            # insert new draft
            document_doc = {
                "user_id": user_id,
                "type": doc_type,
                "companyName": company,
                "counterpartyName": counterparty,
                "effectiveDate": effective,
                "duration": duration,
                "governingLaw": governing,
                "confidentialityLevel": confidentiality,
                "purpose": purpose,
                "additionalTerms": additional,
                "generatedText": partial_text,
                "status": "draft",
                "createdAt": now,
                "updatedAt": now
            }
            inserted = nda_collection.insert_one(document_doc)
            return jsonify({"success": True, "documentId": str(inserted.inserted_id), "status": "draft", "message": "Saved as draft"}), 200
    if generate_now:
        # create or update a 'pending' record first (so frontend can poll if needed)
        if existing_oid:
            nda_collection.update_one(
                {"_id": existing_oid},
                {"$set": {
                    "user_id": user_id,
                    "type": doc_type,
                    "companyName": company,
                    "counterpartyName": counterparty,
                    "effectiveDate": effective,
                    "duration": duration,
                    "governingLaw": governing,
                    "confidentialityLevel": confidentiality,
                    "purpose": purpose,
                    "additionalTerms": additional,
                    "generatedText": None,
                    "status": "pending",
                    "updatedAt": datetime.now()
                }}
            )
            record_id = existing_oid
        else:
            document_doc = {
                "user_id": user_id,
                "type": doc_type,
                "companyName": company,
                "counterpartyName": counterparty,
                "effectiveDate": effective,
                "duration": duration,
                "governingLaw": governing,
                "confidentialityLevel": confidentiality,
                "purpose": purpose,
                "additionalTerms": additional,
                "generatedText": None,
                "status": "pending",
                "createdAt": now,
                "updatedAt": now
            }
            inserted = nda_collection.insert_one(document_doc)
            record_id = inserted.inserted_id
    # Generate different documents
        document_text = ""
        if doc_type == "nda":
            document_text = f"""
    NON-DISCLOSURE AGREEMENT (NDA)

    This Agreement is entered into on {data['effectiveDate']}
    between {data['disclosingParty']} ("Disclosing Party") and
    {data['receivingParty']} ("Receiving Party").

    Purpose:
    {data['purpose']}

    Confidentiality Level: {data['confidentialityLevel']}
    Duration: {data['duration']}

    Both parties agree to maintain confidentiality and protect all sensitive information 
    exchanged for the stated purpose.

    Additional Terms:
    {data['additionalTerms']}
    """
        elif doc_type == "contract":
            document_text = f"""
    FREELANCE CONTRACT AGREEMENT

    This Freelance Contract Agreement ("Agreement") is entered into as of
    {datetime.now().strftime('%Y-%m-%d')} by and between
    {data['clientName']} ("Client") and
    {data['freelancerName']} ("Freelancer").

    Both parties agree to the following terms and conditions governing the services provided by the Freelancer.

    1. PROJECT SCOPE
    The Freelancer shall perform services related to the project titled
    "{data['projectTitle']}". The scope includes planning, development, execution,
    and delivery of all tasks agreed upon by both parties.
    Any additional tasks outside the initial agreement must be approved in writing.

    2. PAYMENT TERMS
    The Client agrees to pay the Freelancer a total amount of
    {data['paymentAmount']} via {data['paymentMethod']}.
    Payment will be made according to the agreed milestones.

    3. CONFIDENTIALITY
    Both parties agree to maintain strict confidentiality regarding any sensitive
    information, intellectual property, or proprietary data shared during this project.

    4. TERMINATION
    Either party may terminate this Agreement with written notice.
    The Client will pay for all completed work up to the termination date.

    SIGNATURES
    Client: ____________________________
    Freelancer: ____________________________
    Date: {datetime.now().strftime('%Y-%m-%d')}
    """

        elif doc_type == "service":
            document_text = f"""
    SERVICE AGREEMENT

    This Service Agreement is entered into on {data['effectiveDate']}
    between {data['companyName']} ("Service Provider") and
    {data['counterpartyName']} ("Client").

    1. PURPOSE
    Service Provider will perform the following services:
    {data['purpose']}

    2. DURATION
    This Agreement will remain in effect for: {data['duration']}

    3. GOVERNING LAW
    This Agreement is governed by the laws of: {data['governingLaw']}

    4. CONFIDENTIALITY
    Confidentiality Level required: {data['confidentialityLevel']}

    5. ADDITIONAL TERMS
    {data['additionalTerms']}

    SIGNATURES
    Service Provider: ____________________________
    Client: ____________________________
    Date: {datetime.now().strftime('%Y-%m-%d')}
    """

        else:
            return jsonify({"error": "Invalid document type"}), 400
        if isinstance(document_text, str) and document_text.strip():
            try:
                nda_collection.update_one(
                        {"_id": record_id},
                        {"$set": {"generatedText": document_text, "status": "completed", "updatedAt": datetime.now()}}
                    )
            except Exception as e:
                    # keep it pending if update fails
                    print(f"Warning: failed to update generatedText/status for {record_id}: {e}")
                    return jsonify({"success": False, "documentId": str(record_id), "status": "pending", "message": "Generated but failed to update DB"}), 500
            return jsonify({
                    "success": True,
                    "documentId": str(record_id),
                    "documentText": document_text,
                    "status": "completed"
                }), 200
        else:
            # If generation produced empty content (unexpected), keep status pending and return warning
            print(f"Warning: generation returned empty text for {record_id}. Keeping status = pending.")
            return jsonify({
                "success": False,
                "documentId": str(record_id),
                "status": "pending",
                "message": "Generation returned empty text"
            }), 500
   
    if current_page is not None and current_page >= 4:
        if existing_oid:
            nda_collection.update_one(
                {"_id": existing_oid},
                {"$set": {
                    "user_id": user_id,
                    "type": doc_type,
                    "companyName": company,
                    "counterpartyName": counterparty,
                    "effectiveDate": effective,
                    "duration": duration,
                    "governingLaw": governing,
                    "confidentialityLevel": confidentiality,
                    "purpose": purpose,
                    "additionalTerms": additional,
                    "generatedText": None,
                    "status": "pending",
                    "updatedAt": datetime.now()
                }}
            )
            return jsonify({"success": True, "documentId": str(existing_oid), "status": "pending", "message": "Marked pending (updated)"}), 200
        else:
            document_doc = {
                "user_id": user_id,
                "type": doc_type,
                "companyName": company,
                "counterpartyName": counterparty,
                "effectiveDate": effective,
                "duration": duration,
                "governingLaw": governing,
                "confidentialityLevel": confidentiality,
                "purpose": purpose,
                "additionalTerms": additional,
                "generatedText": None,
                "status": "pending",
                "createdAt": now,
                "updatedAt": now
            }
            inserted = nda_collection.insert_one(document_doc)
            return jsonify({"success": True, "documentId": str(inserted.inserted_id), "status": "pending", "message": "Marked pending"}), 200
    if existing_oid:
        nda_collection.update_one(
            {"_id": existing_oid},
            {"$set": {
                "user_id": user_id,
                "type": doc_type,
                "companyName": company,
                "counterpartyName": counterparty,
                "effectiveDate": effective,
                "duration": duration,
                "governingLaw": governing,
                "confidentialityLevel": confidentiality,
                "purpose": purpose,
                "additionalTerms": additional,
                "generatedText": data.get("generatedText") or None,
                "status": "draft",
                "updatedAt": datetime.now()
            }}
        )
        return jsonify({"success": True, "documentId": str(existing_oid), "status": "draft", "message": "Saved as draft (updated)"}), 200
    else:
        document_doc = {
            "user_id": user_id,
            "type": doc_type,
            "companyName": company,
            "counterpartyName": counterparty,
            "effectiveDate": effective,
            "duration": duration,
            "governingLaw": governing,
            "confidentialityLevel": confidentiality,
            "purpose": purpose,
            "additionalTerms": additional,
            "generatedText": data.get("generatedText") or None,
            "status": "draft",
            "createdAt": now,
            "updatedAt": now
        }
    
        inserted = nda_collection.insert_one(document_doc)

        return jsonify({"success": True, "documentId": str(inserted.inserted_id), "status": "draft", "message": "Saved as draft (created)"}), 200
@app.route("/documents/<doc_id>", methods=["GET"])
def get_single_document(doc_id):
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    try:
        oid = ObjectId(doc_id)
    except Exception:
        return jsonify({"error": "Invalid document id"}), 400

    doc = nda_collection.find_one({"_id": oid})
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    if str(doc.get("user_id")) != str(user_id):
        return jsonify({"error": "Unauthorized"}), 403

    doc["_id"] = str(doc["_id"])
    if isinstance(doc.get("createdAt"), datetime):
        doc["createdAt"] = doc["createdAt"].isoformat()
    if isinstance(doc.get("updatedAt"), datetime):
        doc["updatedAt"] = doc["updatedAt"].isoformat()

    return jsonify({"success": True, "document": doc}), 200


@app.route("/download-document/<doc_id>", methods=["GET"])
def download_document(doc_id):
    document = nda_collection.find_one({"_id": ObjectId(doc_id)})
    if not document:
        return "Document not found", 404

    filename = f"document_{doc_id}.pdf"
    filepath = os.path.join(PDF_DIR, filename)

    doc = SimpleDocTemplate(filepath, pagesize=A4)
    styles = getSampleStyleSheet()
    content = []

    content.append(Paragraph(document["type"].upper(), styles["Title"]))
    content.append(Spacer(1, 12))

    content.append(Paragraph(document["generatedText"], styles["Normal"]))

    doc.build(content)

    return send_file(filepath, as_attachment=True)

# Delete a document (only owner can delete)
@app.route("/documents/<doc_id>", methods=["DELETE"])
def delete_document(doc_id):
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    try:
        oid = ObjectId(doc_id)
    except Exception:
        return jsonify({"error": "Invalid document id"}), 400

    doc = nda_collection.find_one({"_id": oid})
    if not doc:
        return jsonify({"error": "Document not found"}), 404

    # Ensure owner
    if str(doc.get("user_id")) != str(user_id):
        return jsonify({"error": "Not authorized to delete this document"}), 403

    nda_collection.delete_one({"_id": oid})
    return jsonify({"success": True, "message": "Document deleted"}), 200


# Update / edit a document (partial update)
@app.route("/documents/<doc_id>", methods=["PUT"])
def update_document(doc_id):
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    try:
        oid = ObjectId(doc_id)
    except Exception:
        return jsonify({"error": "Invalid document id"}), 400

    data = request.get_json() or {}
    # Only allow owner to update
    existing = nda_collection.find_one({"_id": oid})
    if not existing:
        return jsonify({"error": "Document not found"}), 404
    if str(existing.get("user_id")) != str(user_id):
        return jsonify({"error": "Not authorized to update this document"}), 403

    # Build allowed updates — reuse your field names
    allowed = {}
    for key in ["type", "companyName", "counterpartyName", "effectiveDate", "duration",
                "governingLaw", "confidentialityLevel", "purpose", "additionalTerms", "generatedText", "status"]:
        # accept both camelCase and the frontend names in payload
        if key in data:
            allowed[key] = data.get(key)
    # also accept documentType -> type
    if "documentType" in data and not allowed.get("type"):
        allowed["type"] = data.get("documentType")

    if allowed:
        allowed["updatedAt"] = datetime.now()
        nda_collection.update_one({"_id": oid}, {"$set": allowed})
        return jsonify({"success": True, "documentId": str(oid)}), 200

    return jsonify({"error": "No updatable fields provided"}), 400


chat_sessions = db["chat_sessions"]
chat_messages = db["messages"]

@app.route("/chat", methods=["POST"])
def chat():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    data = request.get_json()
    user_message = data.get("message")
    session_id = data.get("session_id")  # frontend must send this
    
    if not user_message or not session_id:
        return jsonify({"error": "Missing fields"}), 400
    
    ### 1️⃣ Save User Message
    chat_messages.insert_one({
        "session_id": session_id,
        "user_id": user_id,
        "sender": "user",
        "message": user_message,
        "timestamp": datetime.now()
    })
    
    ### 2️⃣ Call Gemini Model
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(user_message)


        bot_reply = response.text.strip()
    except Exception as e:
        print("🔥 CHAT ERROR:", e)
        bot_reply = "Error: Unable to generate response"
    
    ### 3️⃣ Save Bot Message
    chat_messages.insert_one({
        "session_id": session_id,
        "user_id": user_id,
        "sender": "assistant",
        "message": bot_reply,
        "timestamp": datetime.now()
    })
    
    ### 4️⃣ Update last updated time
    chat_sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"updatedAt": datetime.now()}}
    )
    
    ### 5️⃣ Return bot response
    return jsonify({"reply": bot_reply})



@app.route("/deleteChat/<session_id>", methods=["DELETE"])
def delete_chat(session_id):
    if request.method == "OPTIONS":
        return ("", 200)
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    # Delete session
    chat_sessions.delete_one({
        "_id": ObjectId(session_id),
        "user_id": user_id
    })

    # Delete associated messages
    chat_messages.delete_many({
        "session_id": ObjectId(session_id),
        "user_id": user_id
    })

    return jsonify({"success": True, "message": "Chat deleted"})

@app.route("/startChat", methods=["POST"])
def start_chat():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    chat = {
        "user_id": user_id,
        "title": "New Chat",
        "createdAt": datetime.now(),
        "updatedAt": datetime.now()
    }

    result = chat_sessions.insert_one(chat)

    return jsonify({
        "success": True,
        "session_id": str(result.inserted_id)
    })
@app.route("/saveMessage", methods=["POST"])
def save_message():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    data = request.json
    session_id = data["session_id"]
    message = data["message"]
    sender = data["sender"]   # "user" or "assistant"

    chat_messages.insert_one({
        "session_id": session_id,
        "user_id": user_id,
        "sender": sender,
        "message": message,
        "timestamp": datetime.now()
    })

    # update chat's last updated time
    chat_sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"updatedAt": datetime.now()}}
    )

    return jsonify({"success": True})
@app.route("/chatHistory", methods=["GET"])
def chat_history():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    chats = list(chat_sessions.find(
        {"user_id": user_id},
        {"title": 1, "createdAt": 1, "updatedAt": 1}
    ))

    for c in chats:
        c["_id"] = str(c["_id"])

    return jsonify({"success": True, "chats": chats})
@app.route("/getMessages/<session_id>", methods=["GET"])
def get_messages(session_id):
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    msgs = list(chat_messages.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("timestamp", 1))

    return jsonify({"success": True, "messages": msgs})

@app.route("/documents", methods=["GET"])
def get_documents():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    # fetch docs for this user
    docs = list(nda_collection.find({"user_id": user_id}))

    # stringify ObjectId for frontend
    for d in docs:
        d["_id"] = str(d["_id"])
        # optional: ensure createdAt is serializable string
        if isinstance(d.get("createdAt"), datetime):
            d["createdAt"] = d["createdAt"].isoformat()

    return jsonify({
        "success": True,
        "documents": docs
    }), 200
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".",1)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/uploadProfileImage", methods=["POST"])
def upload_avatar():
    try:
        if "avatar" not in request.files:
            return jsonify(success=False, message="No file provided"), 400
        file = request.files["avatar"]
        if file.filename == "":
            return jsonify(success=False, message="Empty filename"), 400

        # validate extension
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            return jsonify(success=False, message="File type not allowed"), 400

        filename = secure_filename(file.filename)
        unique_name = f"{uuid.uuid4().hex}_{filename}"
        save_path = os.path.join(app.config["UPLOAD_FOLDER"], unique_name)

        # Save file
        file.save(save_path)

        # Debug (remove in production)
        print("Saved upload to:", save_path, "exists:", os.path.exists(save_path))

        # Build an external URL to the static serving route
        # We URL-quote the filename so spaces/special chars are safe
        quoted = quote(unique_name)
        public_url = url_for("serve_upload", filename=quoted, _external=True)

        return jsonify(success=True, url=public_url)
    except Exception as e:
        current_app.logger.exception("upload failed")
        return jsonify(success=False, message=str(e)), 500
@app.route("/uploads/<path:filename>")
def serve_upload(filename):
    # unquote is not necessary because Flask will provide the raw filename fragment
    # Ensure we're serving from the absolute upload folder
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename, as_attachment=False)

if __name__ == "__main__":
    app.run(host = "0.0.0.0",debug=True,use_reloader=False)