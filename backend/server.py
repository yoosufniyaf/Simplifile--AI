from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Request, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import json
import base64
import io
import csv

from supabase import create_client, Client

from ai_service import (
    analyze_document as ai_analyze_document,
    chat_with_context,
    categorize_transaction as ai_categorize_transaction,
    generate_financial_insights,
    generate_tax_insights
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://vkdozabxivvtsmmbnfod.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "sk-placeholder-key")

JWT_SECRET = os.environ.get("JWT_SECRET", "simplifile-ai-secret-key-2024")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
TRIAL_DAYS = 3

app = FastAPI(title="Simplifile AI API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    plan: str
    trial_started: bool = False
    trial_ends_at: Optional[str] = None
    subscription_status: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PlanUpdate(BaseModel):
    plan: str
    billing_cycle: str = "monthly"

class DocumentResponse(BaseModel):
    id: str
    name: str
    file_type: str
    summary: Optional[str] = None
    key_points: Optional[List[str]] = None
    risks: Optional[List[str]] = None
    obligations: Optional[List[str]] = None
    simple_explanation: Optional[str] = None
    what_this_means: Optional[str] = None
    created_at: str
    analyzed: bool = False

class ChatMessage(BaseModel):
    message: str
    document_id: Optional[str] = None

class ChatResponse(BaseModel):
    id: str
    user_message: str
    ai_response: str
    document_id: Optional[str] = None
    created_at: str

class TransactionCreate(BaseModel):
    description: str
    amount: float
    category: str
    date: str
    type: str

class TransactionUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    date: Optional[str] = None
    type: Optional[str] = None

class TransactionResponse(BaseModel):
    id: str
    description: str
    amount: float
    category: str
    date: str
    type: str
    source: str = "manual"
    created_at: str

class IntegrationConnect(BaseModel):
    platform: str
    api_key: Optional[str] = None
    api_secret: Optional[str] = None

class IntegrationResponse(BaseModel):
    id: str
    platform: str
    status: str
    connected_at: Optional[str] = None

class FinancialReportResponse(BaseModel):
    report_type: str
    period: str
    data: Dict[str, Any]
    generated_at: str

class TaxInsightResponse(BaseModel):
    id: str
    deductions: List[Dict[str, Any]]
    estimated_taxes: Dict[str, float]
    planning_insights: List[str]
    structure_advice: List[str]
    ai_analysis: Optional[str] = None
    total_deductible: Optional[float] = None
    generated_at: str

# ==================== HELPER FUNCTIONS ====================

def table_select(
    table_name: str,
    filters: Optional[Dict[str, Any]] = None,
    columns: str = "*",
    order_by: Optional[str] = None,
    ascending: bool = True,
    limit: Optional[int] = None,
):
    query = supabase.table(table_name).select(columns)

    if filters:
        for key, value in filters.items():
            if isinstance(value, dict):
                if "gte" in value:
                    query = query.gte(key, value["gte"])
                if "lte" in value:
                    query = query.lte(key, value["lte"])
                if "in" in value and isinstance(value["in"], list):
                    query = query.in_(key, value["in"])
            elif value is None:
                query = query.is_(key, "null")
            else:
                query = query.eq(key, value)

    if order_by:
        query = query.order(order_by, desc=not ascending)

    if limit is not None:
        query = query.limit(limit)

    return query.execute().data or []

def table_select_one(table_name: str, filters: Dict[str, Any], columns: str = "*"):
    rows = table_select(table_name, filters=filters, columns=columns, limit=1)
    return rows[0] if rows else None

def table_insert_one(table_name: str, data: Dict[str, Any]):
    result = supabase.table(table_name).insert(data).execute()
    return (result.data or [None])[0]

def table_insert_many(table_name: str, rows: List[Dict[str, Any]]):
    if not rows:
        return []
    result = supabase.table(table_name).insert(rows).execute()
    return result.data or []

def table_update(table_name: str, filters: Dict[str, Any], data: Dict[str, Any]):
    query = supabase.table(table_name).update(data)
    for key, value in filters.items():
        query = query.eq(key, value)
    result = query.execute()
    return result.data or []

def table_delete(table_name: str, filters: Dict[str, Any]):
    query = supabase.table(table_name).delete()
    for key, value in filters.items():
        query = query.eq(key, value)
    result = query.execute()
    return result.data or []

def table_count(table_name: str, filters: Optional[Dict[str, Any]] = None) -> int:
    rows = table_select(table_name, filters=filters, columns="id")
    return len(rows)

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))

def create_token(user_id: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": user_id,
        "exp": expiration.timestamp(),
        "iat": datetime.now(timezone.utc).timestamp()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def normalize_list(value):
    return value if isinstance(value, list) else []

def infer_plan_from_text(*values) -> Optional[str]:
    combined = " ".join(str(v).lower() for v in values if v)
    if "enterprise" in combined:
        return "enterprise"
    if "premium" in combined:
        return "premium"
    if "basic" in combined:
        return "basic"
    return None

async def normalize_user_access(user: dict) -> dict:
    updated_fields = {}

    if user.get("subscription_status") == "trial":
        trial_ends_at = parse_iso_datetime(user.get("trial_ends_at"))
        now = datetime.now(timezone.utc)

        if not trial_ends_at or trial_ends_at <= now:
            updated_fields = {
                "subscription_status": "inactive",
                "trial_started": False,
                "trial_ends_at": None
            }

    if updated_fields:
        table_update("users", {"id": user["id"]}, updated_fields)
        user.update(updated_fields)

    return user

def has_feature_access(user: dict) -> bool:
    status = user.get("subscription_status", "inactive")

    if status == "active":
        return True

    if status == "trial":
        trial_ends_at = parse_iso_datetime(user.get("trial_ends_at"))
        return bool(trial_ends_at and trial_ends_at > datetime.now(timezone.utc))

    return False

def require_feature_access(user: dict):
    if not has_feature_access(user):
        raise HTTPException(
            status_code=403,
            detail="Start your free trial or subscribe to access this feature"
        )

def check_plan_access(user: dict, required_plan: str) -> bool:
    plan_hierarchy = {"basic": 1, "premium": 2, "enterprise": 3}
    user_level = plan_hierarchy.get(user.get("plan", "basic"), 1)
    required_level = plan_hierarchy.get(required_plan, 1)
    return user_level >= required_level

def to_user_response(user: dict) -> UserResponse:
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        plan=user.get("plan", "basic"),
        trial_started=bool(user.get("trial_started", False)),
        trial_ends_at=user.get("trial_ends_at"),
        subscription_status=user.get("subscription_status", "inactive"),
        created_at=user["created_at"]
    )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = table_select_one("users", {"id": user_id})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        user = await normalize_user_access(user)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = table_select_one("users", {"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "plan": "basic",
        "billing_cycle": "monthly",
        "trial_started": False,
        "trial_ends_at": None,
        "subscription_status": "inactive",
        "created_at": now_iso()
    }

    table_insert_one("users", user_doc)
    token = create_token(user_id)

    return TokenResponse(
        access_token=token,
        user=to_user_response(user_doc)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = table_select_one("users", {"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = await normalize_user_access(user)
    token = create_token(user["id"])

    return TokenResponse(
        access_token=token,
        user=to_user_response(user)
    )

@api_router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    user = table_select_one("users", {"email": payload.email})

    if user:
        logger.info(f"Password reset requested for: {payload.email}")

    return {
        "message": "If an account exists, a reset link has been sent."
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return to_user_response(user)

# ==================== SUBSCRIPTION / TRIAL ROUTES ====================

@api_router.post("/subscription/start-trial")
async def start_trial(user: dict = Depends(get_current_user)):
    if user.get("subscription_status") == "active":
        return {
            "message": "Subscription already active",
            "trial_started": user.get("trial_started", False),
            "trial_ends_at": user.get("trial_ends_at"),
            "subscription_status": user.get("subscription_status")
        }

    if has_feature_access(user) and user.get("subscription_status") == "trial":
        return {
            "message": "Trial already active",
            "trial_started": user.get("trial_started", False),
            "trial_ends_at": user.get("trial_ends_at"),
            "subscription_status": user.get("subscription_status")
        }

    trial_ends = datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS)

    table_update(
        "users",
        {"id": user["id"]},
        {
            "trial_started": True,
            "trial_ends_at": trial_ends.isoformat(),
            "subscription_status": "trial"
        }
    )

    return {
        "message": "Free trial started",
        "trial_started": True,
        "trial_ends_at": trial_ends.isoformat(),
        "subscription_status": "trial"
    }

@api_router.post("/subscription/update")
async def update_subscription(plan_data: PlanUpdate, user: dict = Depends(get_current_user)):
    valid_plans = ["basic", "premium", "enterprise"]
    if plan_data.plan not in valid_plans:
        raise HTTPException(status_code=400, detail="Invalid plan")

    table_update(
        "users",
        {"id": user["id"]},
        {
            "plan": plan_data.plan,
            "billing_cycle": plan_data.billing_cycle,
            "subscription_status": "active",
            "trial_started": True,
            "trial_ends_at": None
        }
    )

    return {"message": "Subscription updated", "plan": plan_data.plan}

@api_router.get("/subscription/plans")
async def get_plans():
    return {
        "plans": [
            {
                "id": "basic",
                "name": "Basic Advisor",
                "monthly_price": 9.99,
                "annual_price": round(9.99 * 12 * 0.75, 2),
                "features": [
                    "Document Simplifier",
                    "AI Copilot Chat",
                    "Upload PDFs & Images",
                    "Key Points & Risks Analysis"
                ]
            },
            {
                "id": "premium",
                "name": "Premium",
                "monthly_price": 29.99,
                "annual_price": round(29.99 * 12 * 0.75, 2),
                "features": [
                    "Everything in Basic",
                    "AI Bookkeeper Assistant",
                    "Transaction Categorization",
                    "P&L, Monthly Summary",
                    "MRR, Burn Rate, CAC Insights"
                ],
                "popular": True
            },
            {
                "id": "enterprise",
                "name": "Enterprise",
                "monthly_price": 49.99,
                "annual_price": round(49.99 * 12 * 0.75, 2),
                "features": [
                    "Everything in Premium",
                    "Auto Integrations (Shopify, Stripe, PayPal, Whop)",
                    "Financial Statements Auto-Generated",
                    "Manual Editing & Custom Entries",
                    "PDF/CSV Export",
                    "AI Tax Insights"
                ]
            }
        ],
        "trial_days": TRIAL_DAYS
    }

# ==================== WHOP WEBHOOK ====================

@api_router.post("/webhook/whop")
async def whop_webhook(request: Request):
    payload = await request.json()
    logger.info(f"Whop webhook received: {payload}")

    event_type = payload.get("type") or payload.get("event") or payload.get("event_type")
    data = payload.get("data") or payload.get("payload") or payload

    customer_email = (
        data.get("customer_email")
        or data.get("email")
        or data.get("user_email")
        or data.get("buyer_email")
        or data.get("member_email")
    )

    plan_hint = (
        data.get("plan")
        or data.get("plan_id")
        or data.get("product")
        or data.get("product_id")
        or data.get("offer_title")
        or data.get("product_name")
    )

    billing_cycle = (
        data.get("billing_cycle")
        or data.get("interval")
        or data.get("renewal_period")
        or "monthly"
    )

    if not customer_email:
        return {"status": "ignored", "reason": "no email found", "event_type": event_type}

    user = table_select_one("users", {"email": customer_email})
    if not user:
        return {"status": "ignored", "reason": "user not found", "email": customer_email, "event_type": event_type}

    event_text = f"{event_type} {json.dumps(data)}".lower()

    cancelled_keywords = ["cancel", "cancelled", "canceled", "refund", "refunded", "chargeback", "dispute", "revoked", "expired"]
    paid_keywords = ["payment", "purchase", "checkout", "subscription", "membership", "order", "paid", "succeeded", "active", "created"]

    inferred_plan = infer_plan_from_text(plan_hint, event_text) or user.get("plan", "basic")

    if any(word in event_text for word in cancelled_keywords):
        table_update(
            "users",
            {"id": user["id"]},
            {
                "subscription_status": "inactive",
                "trial_started": False,
                "trial_ends_at": None
            }
        )
        return {
            "status": "ok",
            "action": "deactivated",
            "email": customer_email,
            "event_type": event_type
        }

    if any(word in event_text for word in paid_keywords):
        table_update(
            "users",
            {"id": user["id"]},
            {
                "plan": inferred_plan,
                "billing_cycle": billing_cycle,
                "subscription_status": "active",
                "trial_started": True,
                "trial_ends_at": None
            }
        )
        return {
            "status": "ok",
            "action": "activated",
            "email": customer_email,
            "plan": inferred_plan,
            "event_type": event_type
        }

    return {
        "status": "ignored",
        "reason": "event not handled",
        "email": customer_email,
        "event_type": event_type
    }

# ==================== DOCUMENT ROUTES ====================

@api_router.post("/documents/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    require_feature_access(user)

    content = await file.read()
    content_base64 = base64.b64encode(content).decode("utf-8")

    doc_id = str(uuid.uuid4())
    doc = {
        "id": doc_id,
        "user_id": user["id"],
        "name": file.filename,
        "file_type": file.content_type or "application/octet-stream",
        "content": content_base64,
        "summary": None,
        "key_points": [],
        "risks": [],
        "obligations": [],
        "simple_explanation": None,
        "what_this_means": None,
        "analyzed": False,
        "created_at": now_iso()
    }

    table_insert_one("documents", doc)

    return DocumentResponse(
        id=doc_id,
        name=file.filename,
        file_type=doc["file_type"],
        created_at=doc["created_at"],
        analyzed=False
    )

@api_router.post("/documents/{doc_id}/analyze", response_model=DocumentResponse)
async def analyze_document(doc_id: str, user: dict = Depends(get_current_user)):
    require_feature_access(user)

    doc = table_select_one("documents", {"id": doc_id, "user_id": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        content_bytes = base64.b64decode(doc.get("content", ""))
        try:
            document_text = content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            document_text = f"Document: {doc['name']} (binary content - PDF/image parsing would extract text here)"
    except Exception:
        document_text = f"Document: {doc['name']}"

    analysis = await ai_analyze_document(document_text, doc["name"])

    update_data = {
        "summary": analysis.get("summary"),
        "key_points": normalize_list(analysis.get("key_points")),
        "risks": normalize_list(analysis.get("risks")),
        "obligations": normalize_list(analysis.get("obligations")),
        "simple_explanation": analysis.get("simple_explanation"),
        "what_this_means": analysis.get("what_this_means"),
        "analyzed": True
    }

    table_update("documents", {"id": doc_id}, update_data)

    return DocumentResponse(
        id=doc_id,
        name=doc["name"],
        file_type=doc["file_type"],
        summary=update_data["summary"],
        key_points=update_data["key_points"],
        risks=update_data["risks"],
        obligations=update_data["obligations"],
        simple_explanation=update_data["simple_explanation"],
        what_this_means=update_data["what_this_means"],
        created_at=doc["created_at"],
        analyzed=True
    )

@api_router.get("/documents", response_model=List[DocumentResponse])
async def get_documents(user: dict = Depends(get_current_user)):
    require_feature_access(user)

    docs = table_select(
        "documents",
        filters={"user_id": user["id"]},
        columns="id,name,file_type,summary,key_points,risks,obligations,simple_explanation,what_this_means,created_at,analyzed",
        order_by="created_at",
        ascending=False,
        limit=100
    )

    return [DocumentResponse(**doc) for doc in docs]

@api_router.get("/documents/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str, user: dict = Depends(get_current_user)):
    require_feature_access(user)

    doc = table_select_one(
        "documents",
        {"id": doc_id, "user_id": user["id"]},
        columns="id,name,file_type,summary,key_points,risks,obligations,simple_explanation,what_this_means,created_at,analyzed"
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse(**doc)

@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user: dict = Depends(get_current_user)):
    require_feature_access(user)

    deleted = table_delete("documents", {"id": doc_id, "user_id": user["id"]})
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted"}

# ==================== CHAT ROUTES ====================

@api_router.post("/chat", response_model=ChatResponse)
async def send_chat_message(message: ChatMessage, user: dict = Depends(get_current_user)):
    require_feature_access(user)

    context = None
    document_name = None

    if message.document_id:
        doc = table_select_one("documents", {"id": message.document_id, "user_id": user["id"]})
        if doc:
            document_name = doc.get("name")
            if doc.get("summary"):
                context = f"""
Document Summary: {doc.get('summary', '')}

Key Points:
{chr(10).join('- ' + p for p in (doc.get('key_points') or []))}

Risks:
{chr(10).join('- ' + r for r in (doc.get('risks') or []))}

Obligations:
{chr(10).join('- ' + o for o in (doc.get('obligations') or []))}
"""

    ai_response = await chat_with_context(message.message, context, document_name)

    chat_id = str(uuid.uuid4())
    chat_doc = {
        "id": chat_id,
        "user_id": user["id"],
        "user_message": message.message,
        "ai_response": ai_response,
        "document_id": message.document_id,
        "created_at": now_iso()
    }

    table_insert_one("chats", chat_doc)

    return ChatResponse(
        id=chat_id,
        user_message=chat_doc["user_message"],
        ai_response=chat_doc["ai_response"],
        document_id=chat_doc["document_id"],
        created_at=chat_doc["created_at"]
    )

@api_router.get("/chat/history", response_model=List[ChatResponse])
async def get_chat_history(document_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    require_feature_access(user)

    filters = {"user_id": user["id"]}
    if document_id:
        filters["document_id"] = document_id

    chats = table_select(
        "chats",
        filters=filters,
        columns="id,user_message,ai_response,document_id,created_at",
        order_by="created_at",
        ascending=False,
        limit=50
    )

    return [ChatResponse(**chat) for chat in chats]

# ==================== BOOKKEEPING ROUTES (PREMIUM+) ====================

@api_router.post("/bookkeeping/upload")
async def upload_financial_data(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    require_feature_access(user)

    if not check_plan_access(user, "premium"):
        raise HTTPException(status_code=403, detail="Premium plan required")

    content = await file.read()
    transactions = []

    try:
        if file.filename.endswith(".csv"):
            text_content = content.decode("utf-8")
            reader = csv.DictReader(io.StringIO(text_content))
            for row in reader:
                trans_id = str(uuid.uuid4())
                description = row.get("description", row.get("Description", "Unknown"))
                category = await ai_categorize_transaction(description)
                amount = float(row.get("amount", row.get("Amount", 0)))

                transactions.append({
                    "id": trans_id,
                    "user_id": user["id"],
                    "description": description,
                    "amount": amount,
                    "category": category,
                    "date": row.get("date", row.get("Date", now_iso()[:10])),
                    "type": "expense" if amount < 0 else "income",
                    "source": "csv_import",
                    "created_at": now_iso()
                })

        table_insert_many("transactions", transactions)
        return {"message": f"Imported {len(transactions)} transactions", "count": len(transactions)}
    except Exception as e:
        logger.error(f"Error parsing file: {e}")
        raise HTTPException(status_code=400, detail="Error parsing file")

@api_router.post("/bookkeeping/transactions", response_model=TransactionResponse)
async def create_transaction(trans: TransactionCreate, user: dict = Depends(get_current_user)):
    require_feature_access(user)

    if not check_plan_access(user, "premium"):
        raise HTTPException(status_code=403, detail="Premium plan required")

    trans_id = str(uuid.uuid4())
    trans_doc = {
        "id": trans_id,
        "user_id": user["id"],
        "description": trans.description,
        "amount": trans.amount,
        "category": trans.category,
        "date": trans.date,
        "type": trans.type,
        "source": "manual",
        "created_at": now_iso()
    }

    table_insert_one("transactions", trans_doc)

    return TransactionResponse(
        id=trans_id,
        description=trans.description,
        amount=trans.amount,
        category=trans.category,
        date=trans.date,
        type=trans.type,
        source="manual",
        created_at=trans_doc["created_at"]
    )

@api_router.get("/bookkeeping/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    require_feature_access(user)

    if not check_plan_access(user, "premium"):
        raise HTTPException(status_code=403, detail="Premium plan required")

    filters: Dict[str, Any] = {"user_id": user["id"]}
    if start_date:
        filters["date"] = {"gte": start_date}
    if end_date:
        filters.setdefault("date", {})
        if isinstance(filters["date"], dict):
            filters["date"]["lte"] = end_date
    if category:
        filters["category"] = category

    transactions = table_select(
        "transactions",
        filters=filters,
        columns="id,description,amount,category,date,type,source,created_at",
        order_by="date",
        ascending=False,
        limit=500
    )

    return [TransactionResponse(**t) for t in transactions]

@api_router.put("/bookkeeping/transactions/{trans_id}", response_model=TransactionResponse)
async def update_transaction(trans_id: str, update: TransactionUpdate, user: dict = Depends(get_current_user)):
    require_feature_access(user)

    if not check_plan_access(user, "enterprise"):
        raise HTTPException(status_code=403, detail="Enterprise plan required for manual editing")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    updated = table_update(
        "transactions",
        {"id": trans_id, "user_id": user["id"]},
        update_data
    )

    if not updated:
        raise HTTPException(status_code=404, detail="Transaction not found")

    trans = table_select_one(
        "transactions",
        {"id": trans_id, "user_id": user["id"]},
        columns="id,description,amount,category,date,type,source,created_at"
    )

    return TransactionResponse(**trans)

@api_router.delete("/bookkeeping/transactions/{trans_id}")
async def delete_transaction(trans_id: str, user: dict = Depends(get_current_user)):
    require_feature_access(user)

    if not check_plan_access(user, "enterprise"):
        raise HTTPException(status_code=403, detail="Enterprise plan required")

    deleted = table_delete("transactions", {"id": trans_id, "user_id": user["id"]})
    if not deleted:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted"}

@api_router.get("/bookkeeping/insights")
async def get_financial_insights(user: dict = Depends(get_current_user)):
    require_feature_access(user)

    if not check_plan_access(user, "premium"):
        raise HTTPException(status_code=403, detail="Premium plan required")

    transactions = table_select("transactions", {"user_id": user["id"]}, limit=1000)

    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expenses = sum(abs(t["amount"]) for t in transactions if t["type"] == "expense")

    metrics = {
        "mrr": round(total_income / 12, 2) if total_income else 0,
        "burn_rate": round(total_expenses / max(1, len(set(t["date"][:7] for t in transactions if t.get("date")))), 2) if transactions else 0,
        "runway_months": round(total_income / max(total_expenses, 1) * 12, 1) if total_expenses else 999,
        "cac": round(sum(abs(t["amount"]) for t in transactions if t.get("category") == "marketing") / max(1, len(transactions) // 10), 2),
        "profit_margin": round((total_income - total_expenses) / max(total_income, 1) * 100, 2),
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_profit": total_income - total_expenses
    }

    ai_insights = await generate_financial_insights(transactions, metrics)

    return {
        **metrics,
        "ai_analysis": ai_insights.get("ai_analysis"),
        "generated_by": ai_insights.get("generated_by", "mock")
    }

# ==================== REPORTS ROUTES (ENTERPRISE) ====================

@api_router.get("/reports/profit-loss", response_model=FinancialReportResponse)
async def get_profit_loss(period: str = "monthly", user: dict = Depends(get_current_user)):
    require_feature_access(user)

    if not check_plan_access(user, "enterprise"):
        raise HTTPException(status_code=403, detail="Enterprise plan required")

    transactions = table_select("transactions", {"user_id": user["id"]}, limit=1000)

    income = sum(t["amount"] for t in transactions if t["type"] == "income")
    expenses_by_category = {}
    for t in transactions:
        if t["type"] == "expense":
            cat = t["category"]
            expenses_by_category[cat] = expenses_by_category.get(cat, 0) + abs(t["amount"])

    return FinancialReportResponse(
        report_type="profit_loss",
        period=period,
        data={
            "revenue": income,
            "expenses": expenses_by_category,
            "total_expenses": sum(expenses_by_category.values()),
            "gross_profit": income - sum(expenses_by_category.values()),
            "net_income": income - sum(expenses_by_category.values())
        },
        generated_at=now_iso()
    )

@api_router.get("/reports/balance-sheet", response_model=FinancialReportResponse)
async def get_balance_sheet(user: dict = Depends(get_current_user)):
    require_feature_access(user)

    if not check_plan_access(user, "enterprise"):
        raise HTTPException(status_code=403, detail="Enterprise plan required")

    transactions = table_select("transactions", {"user_id": user["id"]}, limit=1000)

    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expenses = sum(abs(t["amount"]) for t in transactions if t["type"] == "expense")

    return FinancialReportResponse(
        report_type="balance_sheet",
        period="current",
        data={
            "assets": {
                "cash": total_income - total_expenses,
                "accounts_receivable": 0,
                "total_assets": total_income - total_expenses
            },
            "liabilities": {
                "accounts_payable": 0,
                "total_liabilities": 0
            },
            "equity": {
                "retained_earnings": total_income - total_expenses,
                "total_equity": total_income - total_expenses
            }
        },
        generated_at=now_iso()
    )

@api_router.get("/reports/cash-flow", response_model=FinancialReportResponse)
async def get_cash_flow(user: dict = Depends(get_current_user)):
    require_feature_access(user)

    if not check_plan_access(user, "enterprise"):
        raise HTTPException(status_code=403, detail="Enterprise plan required")

    transactions = table_select("transactions", {"user_id": user["id"]}, limit=1000)

    monthly_data = {}
    for t in transactions:
        month = t["date"][:7]
        if month not in monthly_data:
            monthly_data[month] = {"inflow": 0, "outflow": 0}
        if t["type"] == "income":
            monthly_data[month]["inflow"] += t["amount"]
        else:
            monthly_data[month]["outflow"] += abs(t["amount"])

    return FinancialReportResponse(
        report_type="cash_flow",
        period="monthly",
        data={
            "monthly_breakdown": monthly_data,
            "total_inflow": sum(m["inflow"] for m in monthly_data.values()),
            "total_outflow": sum(m["outflow"] for m in monthly_data.values()),
            "net_cash_flow": sum(m["inflow"] - m["outflow"] for m in monthly_data.values())
        },
        generated_at=now_iso()
    )

@api_router.get("/reports/export/{report_type}")
async def export_report(report_type: str, format: str = "csv", user: dict = Depends(get_current_user)):
    require_feature_access(user)

    if not check_plan_access(user, "enterprise"):
        raise HTTPException(status_code=403, detail="Enterprise plan required")

    return {
        "message": f"Export initiated for {report_type} in {format} format",
        "download_url": f"/api/reports/download/{report_type}.{format}"
    }

# ==================== INTEGRATIONS ROUTES (ENTERPRISE) ====================

@api_router.get("/integrations", response_model=List[IntegrationResponse])
async def get_integrations(user: dict = Depends(get_current_user)):
    require_feature_access(user)

    if not check_plan_access(user, "enterprise"):
        raise HTTPException(status_code=403, detail="Enterprise plan required")

    integrations = table_select(
        "integrations",
        {"user_id": user["id"]},
        columns="id,platform,status,connected_at",
        limit=20
    )

    available = [
        {"id": "shopify", "platform": "shopify", "status": "disconnected", "connected_at": None},
        {"id": "stripe", "platform": "stripe", "status": "disconnected", "connected_at": None},
        {"id": "paypal", "platform": "paypal", "status": "disconnected", "connected_at": None},
        {"id": "whop", "platform": "whop", "status": "disconnected", "connected_at": None}
    ]

    connected_platforms = {i["platform"] for i in integrations}
    result = []
    for a in available:
        if a["platform"] in connected_platforms:
            connected = next(i for i in integrations if i["platform"] == a["platform"])
            result.append(IntegrationResponse(**connected))
        else:
            result.append(IntegrationResponse(**a))

    return result

@api_router.post("/integrations/connect", response_model=IntegrationResponse)
async def connect_integration(integration: IntegrationConnect, user: dict = Depends(get_current_user)):
    require_feature_access(user)

    if not check_plan_access(user, "enterprise"):
        raise HTTPException(status_code=403, detail="Enterprise plan required")

    valid_platforms = ["shopify", "stripe", "paypal", "whop"]
    if integration.platform not in valid_platforms:
        raise HTTPException(status_code=400, detail="Invalid platform")

    existing = table_select_one("integrations", {"user_id": user["id"], "platform": integration.platform})

    int_doc = {
        "id": existing["id"] if existing else str(uuid.uuid4()),
        "user_id": user["id"],
        "platform": integration.platform,
        "api_key": integration.api_key,
        "api_secret": integration.api_secret,
        "status": "connected",
        "connected_at": now_iso()
    }

    if existing:
        table_update("integrations", {"id": existing["id"]}, int_doc)
    else:
        table_insert_one("integrations", int_doc)

    return IntegrationResponse(
        id=int_doc["id"],
        platform=integration.platform,
        status="connected",
        connected_at=int_doc["connected_at"]
    )

@api_router.delete("/integrations/{platform}")
async def disconnect_integration(platform: str, user: dict = Depends(get_current_user)):
    require_feature_access(user)

    if not check_plan_access(user, "enterprise"):
        raise HTTPException(status_code=403, detail="Enterprise plan required")

    deleted = table_delete("integrations", {"user_id": user["id"], "platform": platform})
    if not deleted:
        raise HTTPException(status_code=404, detail="Integration not found")
    return {"message": f"{platform} disconnected"}

@api_router.post("/integrations/{platform}/sync")
async def sync_integration(platform: str, user: dict = Depends(get_current_user)):
    require_feature_access(user)

    if not check_plan_access(user, "enterprise"):
        raise HTTPException(status_code=403, detail="Enterprise plan required")

    integration = table_select_one("integrations", {"user_id": user["id"], "platform": platform})
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not connected")

    mock_transactions = [
        {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "description": f"{platform.title()} - Order #12345",
            "amount": 99.99,
            "category": "fees" if "fee" in platform else "other",
            "date": now_iso()[:10],
            "type": "income",
            "source": platform,
            "created_at": now_iso()
        }
    ]

    table_insert_many("transactions", mock_transactions)

    return {"message": f"Synced {len(mock_transactions)} transactions from {platform}"}

# ==================== TAX INSIGHTS ROUTES (ENTERPRISE) ====================

@api_router.post("/tax/analyze", response_model=TaxInsightResponse)
async def analyze_tax_documents(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    require_feature_access(user)

    if not check_plan_access(user, "enterprise"):
        raise HTTPException(status_code=403, detail="Enterprise plan required")

    insight_id = str(uuid.uuid4())

    transactions = table_select("transactions", {"user_id": user["id"]}, limit=1000)
    total_expenses = sum(abs(t["amount"]) for t in transactions if t.get("type") == "expense")

    ai_tax_insights = await generate_tax_insights(transactions, total_expenses)

    insight = {
        "id": insight_id,
        "user_id": user["id"],
        "deductions": ai_tax_insights.get("deductions", []),
        "estimated_taxes": ai_tax_insights.get("estimated_taxes", {}),
        "planning_insights": ai_tax_insights.get("planning_insights", []),
        "structure_advice": ai_tax_insights.get("structure_advice", []),
        "ai_analysis": ai_tax_insights.get("ai_analysis"),
        "total_deductible": ai_tax_insights.get("total_deductible", 0),
        "generated_at": now_iso()
    }

    table_insert_one("tax_insights", insight)

    return TaxInsightResponse(**{k: v for k, v in insight.items() if k != "user_id"})

@api_router.get("/tax/insights", response_model=List[TaxInsightResponse])
async def get_tax_insights(user: dict = Depends(get_current_user)):
    require_feature_access(user)

    if not check_plan_access(user, "enterprise"):
        raise HTTPException(status_code=403, detail="Enterprise plan required")

    insights = table_select(
        "tax_insights",
        {"user_id": user["id"]},
        columns="id,deductions,estimated_taxes,planning_insights,structure_advice,ai_analysis,total_deductible,generated_at",
        order_by="generated_at",
        ascending=False,
        limit=10
    )

    return [TaxInsightResponse(**i) for i in insights]

# ==================== DASHBOARD STATS ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    require_feature_access(user)

    doc_count = table_count("documents", {"user_id": user["id"]})
    chat_count = table_count("chats", {"user_id": user["id"]})

    stats = {
        "documents_count": doc_count,
        "chats_count": chat_count,
        "plan": user.get("plan", "basic"),
        "trial_started": user.get("trial_started", False),
        "trial_ends_at": user.get("trial_ends_at"),
        "subscription_status": user.get("subscription_status", "inactive")
    }

    if check_plan_access(user, "premium"):
        trans_count = table_count("transactions", {"user_id": user["id"]})
        stats["transactions_count"] = trans_count

        transactions = table_select("transactions", {"user_id": user["id"]}, limit=1000)
        stats["total_income"] = sum(t["amount"] for t in transactions if t["type"] == "income")
        stats["total_expenses"] = sum(abs(t["amount"]) for t in transactions if t["type"] == "expense")

    if check_plan_access(user, "enterprise"):
        int_count = len(table_select("integrations", {"user_id": user["id"], "status": "connected"}, columns="id", limit=100))
        stats["integrations_connected"] = int_count

    return stats

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "Simplifile AI API", "status": "healthy"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": now_iso()}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
