import hmac
import hashlib
import os
import requests
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from fastapi.responses import RedirectResponse, StreamingResponse
from whop_sdk import Whop
from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Request
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
import secrets
import urllib.parse
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger("simplifile")

def create_log(action, status, user_id=None, provider=None, message=None):
    try:
        supabase.table("app_logs").insert({
            "user_id": user_id,
            "action": action,
            "status": status,
            "provider": provider,
            "message": message,
        }).execute()
    except Exception as e:
        logger.error(f"Failed to write app log: {str(e)}")

from urllib.parse import urlencode
from supabase import create_client, Client
from openai import OpenAI
from google import genai

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://vkdozabxivvtsmmbnfod.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "sk-placeholder-key")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
WHOP_API_KEY = os.environ.get("WHOP_API_KEY", "")
WHOP_WEBHOOK_KEY = os.environ.get("WHOP_WEBHOOK_KEY", "")
WHOP_CLIENT_ID = os.environ.get("WHOP_CLIENT_ID", "")
WHOP_CLIENT_SECRET = os.environ.get("WHOP_CLIENT_SECRET", "")
WHOP_OAUTH_REDIRECT_URI = os.environ.get("WHOP_OAUTH_REDIRECT_URI", "")

openai_client = OpenAI(api_key=OPENAI_API_KEY)
gemini_client = genai.Client(api_key=GEMINI_API_KEY)

OPENAI_MODEL = "gpt-4o-mini"
GEMINI_MODEL = "gemini-2.5-flash"

whop_client = Whop(
    api_key=WHOP_API_KEY,
    webhook_key=WHOP_WEBHOOK_KEY,
)

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

# ==================== AI FUNCTIONS ====================

async def ai_analyze_document(text, filename):
    try:
        response = openai_client.responses.create(
            model=OPENAI_MODEL,
            input=f"""
You are Simplifile AI, a premium financial and business document analyst.

Your job is to analyze ONLY documents related to:
- finance
- bookkeeping
- accounting
- tax
- invoices
- receipts
- payroll
- cash flow
- profit and loss
- balance sheets
- bank statements
- business operations
- contracts that affect money, revenue, expenses, obligations, compliance, or risk

If the document is unrelated to finance, tax, bookkeeping, business operations, compliance, or money matters, do NOT analyze it normally.

Instead return EXACTLY this style of response:
SUMMARY: This document does not appear to be related to finance, bookkeeping, tax, business operations, or financial compliance.
KEY POINTS:
- Topic not related to Simplifile AI's financial analysis scope.
RISKS:
- No financial risk analysis available because the document is outside scope.
OBLIGATIONS:
- No financial or compliance obligations identified within Simplifile AI's supported scope.
SIMPLE EXPLANATION:
This document is outside the platform's finance-focused analysis area.
WHAT THIS MEANS:
Upload a finance, tax, bookkeeping, invoice, receipt, payroll, bank, or business-related document for a full premium analysis.

If the document IS relevant, return EXACTLY in this format:

SUMMARY:
Write a sharp premium 2-4 sentence executive summary.

KEY POINTS:
- Bullet
- Bullet
- Bullet

RISKS:
- Bullet
- Bullet
- Bullet

OBLIGATIONS:
- Bullet
- Bullet
- Bullet

SIMPLE EXPLANATION:
Explain in very simple plain English.

WHAT THIS MEANS:
Give direct next steps in a premium advisory tone.

Rules:
- Sound premium, sharp, and professional
- Be direct, not fluffy
- Focus on business impact
- If something is missing, say so clearly
- Do not talk about being an AI
- Do not use markdown headings with #
- Keep bullets clean

Filename: {filename}

Document:
{text[:12000]}
"""
        )
        output = (response.output_text or "").strip()

        def extract_section(text_value: str, section_name: str, next_sections: list[str]) -> str:
            upper_text = text_value
            start_token = f"{section_name}:"
            start = upper_text.find(start_token)
            if start == -1:
                return ""
            start += len(start_token)
            end = len(upper_text)
            for next_section in next_sections:
                idx = upper_text.find(f"{next_section}:", start)
                if idx != -1 and idx < end:
                    end = idx
            return upper_text[start:end].strip()

        summary = extract_section(
            output,
            "SUMMARY",
            ["KEY POINTS", "RISKS", "OBLIGATIONS", "SIMPLE EXPLANATION", "WHAT THIS MEANS"]
        )
        key_points_raw = extract_section(
            output,
            "KEY POINTS",
            ["RISKS", "OBLIGATIONS", "SIMPLE EXPLANATION", "WHAT THIS MEANS"]
        )
        risks_raw = extract_section(
            output,
            "RISKS",
            ["OBLIGATIONS", "SIMPLE EXPLANATION", "WHAT THIS MEANS"]
        )
        obligations_raw = extract_section(
            output,
            "OBLIGATIONS",
            ["SIMPLE EXPLANATION", "WHAT THIS MEANS"]
        )
        simple_explanation = extract_section(
            output,
            "SIMPLE EXPLANATION",
            ["WHAT THIS MEANS"]
        )
        what_this_means = extract_section(
            output,
            "WHAT THIS MEANS",
            []
        )

        def bullets_to_list(raw: str):
            lines = [line.strip() for line in raw.splitlines() if line.strip()]
            cleaned = []
            for line in lines:
                if line.startswith("-"):
                    cleaned.append(line[1:].strip())
                else:
                    cleaned.append(line.strip())
            return [item for item in cleaned if item]

        return {
            "summary": summary or output,
            "key_points": bullets_to_list(key_points_raw),
            "risks": bullets_to_list(risks_raw),
            "obligations": bullets_to_list(obligations_raw),
            "simple_explanation": simple_explanation or output,
            "what_this_means": what_this_means or output
        }

    except Exception as e:
        logger.error(f"OPENAI DOCUMENT ERROR: {e}")
        raise HTTPException(status_code=500, detail="Document analysis failed")


async def chat_with_context(message, context=None, document_name=None):
    try:
        response = openai_client.responses.create(
            model=OPENAI_MODEL,
            input=f"""
You are Simplifile AI, a premium CFO-style financial assistant.

Your scope is ONLY:
- finance
- bookkeeping
- accounting
- taxes
- revenue
- profit
- expenses
- cash flow
- business metrics
- financial documents
- money-related contracts
- business compliance tied to finance

If the user's message is unrelated to finance, bookkeeping, tax, money, business operations, financial documents, or business compliance, respond professionally like this:

This topic appears to be outside Simplifile AI's finance-focused scope. I can help with bookkeeping, tax insights, financial analysis, reports, cash flow, revenue, expenses, and business-related document guidance.

If relevant, ask them to send a finance-related question.

If the user's message IS relevant:
- respond in a premium, concise, expert tone
- be direct and useful
- prioritize business value
- explain clearly
- if there is context, use it
- always end with a short "What to do next" section
- do not ramble
- do not sound generic
- do not mention being an AI model

User message:
{message}

Document name:
{document_name or "None"}

Document context:
{context or "None"}
"""
        )
        return (response.output_text or "").strip()

    except Exception as e:
        logger.error(f"OPENAI CHAT ERROR: {e}")
        raise HTTPException(status_code=500, detail="Chat failed")


async def ai_categorize_transaction(description):
    try:
        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=f"""
You are a bookkeeping assistant.

Categorize this transaction into the single best business category.

Possible categories:
sales
fees
software
marketing
advertising
taxes
payroll
contractors
office
travel
education
subscriptions
bank_fees
refunds
other

Return ONLY the category name.
Transaction: {description}
"""
        )
        return (response.text or "other").strip().lower()
    except Exception as e:
        logger.error(f"GEMINI CATEGORIZE ERROR: {e}")
        return "other"


async def generate_financial_insights(transactions):
    try:
        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=f"""
You are a premium AI CFO.

Review these business transactions and return a premium executive financial analysis.

Write in this exact structure:

BUSINESS SUMMARY:
2-4 sharp sentences.

BIGGEST CONCERNS:
- Bullet
- Bullet
- Bullet

BIGGEST OPPORTUNITIES:
- Bullet
- Bullet
- Bullet

CASH FLOW ANALYSIS:
Short direct explanation.

RECOMMENDED ACTIONS:
1. Step
2. Step
3. Step

Rules:
- Sound premium and commercially smart
- Be practical
- Focus on business performance
- Mention waste, weak margins, or growth opportunities when visible
- No fluff
- No generic motivation talk

Transactions:
{transactions[:200]}
"""
        )
        return (response.text or "AI financial analysis is temporarily unavailable.").strip()
    except Exception as e:
        logger.error(f"GEMINI FINANCIAL INSIGHTS ERROR: {e}")
        return "AI financial analysis is temporarily unavailable."


async def generate_tax_insights(transactions, total_expenses):
    try:
        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=f"""
You are a premium tax strategist for online businesses.

Analyze the data below and return a high-value tax advisory response.

Write in this exact structure:

TOP DEDUCTIONS:
- Bullet
- Bullet
- Bullet

ESTIMATED TAX POSITION:
Give a practical rough estimate, not legal certainty.

TAX SAVING STRATEGIES:
- Bullet
- Bullet
- Bullet

WARNINGS:
- Bullet
- Bullet

WHAT TO DO NEXT:
1. Step
2. Step
3. Step

Rules:
- Be professional and commercially useful
- Focus on realistic tax-saving actions
- Focus on deductions, compliance risks, missing records, and planning
- No fluff
- Do not say "consult a professional" repeatedly
- Sound premium

Transactions:
{transactions[:200]}

Total expenses:
{total_expenses}
"""
        )
        text = (response.text or "AI tax analysis is temporarily unavailable.").strip()

        return {
            "deductions": [],
            "estimated_taxes": {},
            "planning_insights": [text],
            "structure_advice": [],
            "ai_analysis": text,
            "total_deductible": total_expenses
        }

    except Exception as e:
        logger.error(f"GEMINI TAX ERROR: {e}")
        return {
            "deductions": [],
            "estimated_taxes": {},
            "planning_insights": ["AI tax analysis is temporarily unavailable."],
            "structure_advice": [],
            "ai_analysis": "AI tax analysis is temporarily unavailable.",
            "total_deductible": total_expenses
        }

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

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    plan: str
    trial_started: bool = False
    trial_ends_at: Optional[str] = None
    subscription_status: str
    created_at: str
    whop_manage_url: Optional[str] = None
    whop_membership_id: Optional[str] = None
    onboarding_completed: bool = False
    onboarding_step: int = 1

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PlanUpdate(BaseModel):
    plan: str
    billing_cycle: str = "monthly"

class ActivateSubscriptionRequest(BaseModel):
    email: Optional[EmailStr] = None
    plan: Optional[str] = None
    billing: Optional[str] = "monthly"
    payment_id: Optional[str] = None

class OnboardingUpdateRequest(BaseModel):
    onboarding_step: int
    onboarding_completed: bool = False
    
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
        "sub": str(user_id).strip(),
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

def normalize_email(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    return str(value).strip().lower()

def infer_plan_from_text(*values) -> Optional[str]:
    combined = " ".join(str(v).lower() for v in values if v)
    if "premium" in combined:
        return "premium"
    if "basic" in combined:
        return "basic"
    return None

def infer_billing_from_text(*values) -> str:
    combined = " ".join(str(v).lower() for v in values if v)
    if "annual" in combined or "yearly" in combined or "year" in combined:
        return "annual"
    return "monthly"

def whop_required_scopes() -> str:
    return "openid profile email payment:basic:read"


def build_whop_oauth_state(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "whop_oauth",
        "iat": datetime.now(timezone.utc).timestamp(),
        "exp": (datetime.now(timezone.utc) + timedelta(minutes=15)).timestamp(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_whop_oauth_state(state: str) -> str:
    payload = jwt.decode(state, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    if payload.get("type") != "whop_oauth":
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    user_id = str(payload.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    return user_id
def generate_pkce_verifier() -> str:
    return secrets.token_urlsafe(64)
def generate_oauth_nonce() -> str:
    return secrets.token_urlsafe(32)


def generate_pkce_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest).decode("utf-8").rstrip("=")


def get_whop_access_token_for_user(integration: dict) -> str:
    access_token = integration.get("access_token")
    refresh_token = integration.get("refresh_token")
    expires_at = integration.get("token_expires_at")

    if not access_token:
        raise HTTPException(status_code=400, detail="Missing Whop access token")

    expires_dt = parse_iso_datetime(expires_at)
    now = datetime.now(timezone.utc)

    if expires_dt and expires_dt > now + timedelta(minutes=5):
        return access_token

    if not refresh_token:
        raise HTTPException(status_code=401, detail="Whop session expired. Reconnect your Whop account.")

    token_response = requests.post(
        "https://api.whop.com/oauth/token",
        headers={"Content-Type": "application/json"},
        json={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": WHOP_CLIENT_ID,
            "client_secret": WHOP_CLIENT_SECRET,
        },
        timeout=30,
    )

    if token_response.status_code != 200:
        raise HTTPException(status_code=401, detail="Failed to refresh Whop token. Reconnect your Whop account.")

    token_data = token_response.json()

    new_access_token = token_data.get("access_token")
    new_refresh_token = token_data.get("refresh_token")
    expires_in = int(token_data.get("expires_in") or 3600)

    if not new_access_token or not new_refresh_token:
        raise HTTPException(status_code=401, detail="Invalid Whop refresh response")

    new_expires_at = (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat()

    table_update(
        "integrations",
        {"id": integration["id"]},
        {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_expires_at": new_expires_at,
            "status": "connected",
        }
    )

    return new_access_token

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
    plan_hierarchy = {"basic": 1, "premium": 2}
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
        created_at=user["created_at"],
        whop_manage_url=user.get("whop_manage_url"),
        whop_membership_id=user.get("whop_membership_id"),
        onboarding_completed=user.get("onboarding_completed", False),
        onboarding_step=user.get("onboarding_step", 1)
    )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = str(payload.get("sub") or "").strip()

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = table_select_one("users", {"id": user_id})

        if not user:
            logger.error(f"User lookup failed for token sub={user_id}")
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
    email = normalize_email(user_data.email)
    logger.info(f"Register attempt | email={email}")
    email = normalize_email(user_data.email)
    existing = table_select_one("users", {"email": email})
    if existing:
        logger.warning(f"Register failed | email={email} | reason=already_exists")
        create_log("register", "failed", user_id=existing["id"], message=f"email={email} reason=already_exists")
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": email,
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

    logger.info(f"Register successful | user_id={user_id} | email={email}")
    create_log("register", "success", user_id=user_id, message=f"email={email}")

    return TokenResponse(
        access_token=token,
        user=to_user_response(user_doc)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    email = normalize_email(credentials.email)
    logger.info(f"Login attempt | email={email}")
    email = normalize_email(credentials.email)
    user = table_select_one("users", {"email": email})

    if not user:
        logger.warning(f"Login failed | email={email} | reason=user_not_found")
        create_log("login", "failed", message=f"email={email} reason=user_not_found")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(credentials.password, user["password_hash"]):
        logger.warning(f"Login failed | email={email} | reason=bad_password")
        create_log("login", "failed", user_id=user["id"], message=f"email={email} reason=bad_password")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = await normalize_user_access(user)
    token = create_token(user["id"])

    logger.info(f"Login successful | user_id={user['id']} | email={email}")
    create_log("login", "success", user_id=user["id"], message=f"email={email}")

    return TokenResponse(
        access_token=token,
        user=to_user_response(user)
    )

@api_router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    import resend

    resend.api_key = os.environ.get("RESEND_API_KEY")

    email = normalize_email(payload.email)
    user = table_select_one("users", {"email": email})

    success_message = {
        "message": "If an account exists, a reset link has been sent."
    }

    if not user:
        return success_message

    frontend_url = os.environ.get("FRONTEND_URL", "").strip()
    if not frontend_url:
        raise HTTPException(status_code=500, detail="FRONTEND_URL is not configured")

    reset_token = str(uuid.uuid4())

    table_update(
        "users",
        {"id": user["id"]},
        {
            "reset_token": reset_token,
            "reset_token_expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        }
    )

    reset_link = f"{frontend_url}/reset-password?token={reset_token}"

    try:
        resend.Emails.send({
            "from": "onboarding@resend.dev",
            "to": [email],
            "subject": "Reset your password",
            "html": f"""
                <h2>Reset your password</h2>
                <p>Click below:</p>
                <a href="{reset_link}">Reset Password</a>
                <p>This link expires in 1 hour.</p>
            """
        })
    except Exception as e:
        logger.error(f"EMAIL ERROR: {e}")
        raise HTTPException(status_code=500, detail="Failed to send reset email")

    return success_message

@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    user = table_select_one("users", {"reset_token": payload.token})

    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset token")

    expires_at = user.get("reset_token_expires_at")
    if not expires_at:
        raise HTTPException(status_code=400, detail="Reset token expired")

    expires_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_dt:
        raise HTTPException(status_code=400, detail="Reset token expired")

    hashed_password = hash_password(payload.new_password)

    table_update(
        "users",
        {"id": user["id"]},
        {
            "password_hash": hashed_password,
            "reset_token": None,
            "reset_token_expires_at": None,
        }
    )

    return {"message": "Password reset successful"}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return to_user_response(user)

@api_router.put("/onboarding")
async def update_onboarding(
    payload: OnboardingUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]

    try:
        table_update(
            "users",
            {"id": user_id},
            {
                "onboarding_step": payload.onboarding_step,
                "onboarding_completed": payload.onboarding_completed
            }
        )

        logger.info(
            f"Onboarding updated | user_id={user_id} | step={payload.onboarding_step} | completed={payload.onboarding_completed}"
        )

        create_log(
            action="onboarding_update",
            status="success",
            user_id=user_id,
            message=f"Step {payload.onboarding_step}"
        )

        return {"success": True}

    except Exception as e:
        logger.error(
            f"Onboarding update failed | user_id={user_id} | error={str(e)}",
            exc_info=True
        )

        create_log(
            action="onboarding_update",
            status="failed",
            user_id=user_id,
            message=str(e)
        )

        raise HTTPException(status_code=500, detail="Failed to update onboarding")

@api_router.delete("/auth/delete-account")
async def delete_account(user: dict = Depends(get_current_user)):
    user_id = user["id"]

    try:
        table_delete("documents", {"user_id": user_id})
        table_delete("chats", {"user_id": user_id})
        table_delete("transactions", {"user_id": user_id})
        table_delete("integrations", {"user_id": user_id})
        table_delete("tax_insights", {"user_id": user_id})

        deleted_user = table_delete("users", {"id": user_id})

        if not deleted_user:
            raise HTTPException(status_code=404, detail="User not found")

        return {"message": "Account deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"DELETE ACCOUNT ERROR: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete account")

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
    valid_plans = ["basic", "premium"]
    if plan_data.plan not in valid_plans:
        raise HTTPException(status_code=400, detail="Invalid plan")

    table_update(
        "users",
        {"id": user["id"]},
        {
            "plan": plan_data.plan,
            "billing_cycle": plan_data.billing_cycle,
            "subscription_status": "active",
            "trial_started": False,
            "trial_ends_at": None
        }
    )

    return {"message": "Subscription updated", "plan": plan_data.plan}

@api_router.post("/subscription/activate")
async def activate_subscription(payload: ActivateSubscriptionRequest, user: dict = Depends(get_current_user)):
    requested_email = normalize_email(payload.email)
    current_email = normalize_email(user.get("email"))

    if requested_email and requested_email != current_email:
        raise HTTPException(status_code=403, detail="Email does not match logged-in user")

    plan = infer_plan_from_text(payload.plan) or user.get("plan", "basic")
    billing_cycle = infer_billing_from_text(payload.billing)

    updated = table_update(
        "users",
        {"id": user["id"]},
        {
            "plan": plan,
            "billing_cycle": billing_cycle,
            "subscription_status": "active",
            "trial_started": False,
            "trial_ends_at": None,
            "last_payment_id": payload.payment_id or user.get("last_payment_id")
        }
    )

    final_user = updated[0] if updated else table_select_one("users", {"id": user["id"]})

    return {
        "message": "Subscription activated",
        "user": final_user
    }

@api_router.get("/subscription/plans")
async def get_plans():
    return {
        "plans": [
            {
                "id": "basic",
                "name": "Basic Advisor",
                "monthly_price": 9.99,
                "annual_monthly_price": 5.99,
                "annual_price": 71.88,
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
                "monthly_price": 39.99,
                "annual_monthly_price": 23.99,
                "annual_price": 287.88,
                "features": [
                    "Everything in Basic",
                    "AI Bookkeeper Assistant",
                    "Transaction Categorization",
                    "P&L, Monthly Summary",
                    "MRR, Burn Rate, CAC Insights",
                    "Auto Integrations (Shopify, Whop)",
                    "Financial Statements Auto-Generated",
                    "Manual Editing & Custom Entries",
                    "PDF/CSV Export",
                    "AI Tax Insights"
                ],
                "popular": True
            }
        ],
        "trial_days": TRIAL_DAYS
    }

# ==================== WHOP WEBHOOK ====================

@api_router.post("/webhook/whop")
async def whop_webhook(request: Request):
    try:
        logger.info("Whop webhook received")
        raw_body = await request.body()
        request_body_text = raw_body.decode("utf-8")
        headers = dict(request.headers)

        webhook_data = whop_client.webhooks.unwrap(
            request_body_text,
            headers
        )
        logger.info(f"Verified Whop webhook: {webhook_data}")

        event_type = str(webhook_data.get("type") or "")
        logger.info(f"Whop webhook event | type={event_type}")
        data = webhook_data.get("data", {}) or {}

        customer_email = normalize_email(
            data.get("customer_email")
            or data.get("email")
            or data.get("user_email")
            or data.get("buyer_email")
            or data.get("member_email")
            or (data.get("user") or {}).get("email")
            or (data.get("customer") or {}).get("email")
            or (data.get("member") or {}).get("email")
        )

        if not customer_email:
            return {"status": "ignored", "reason": "no email"}

        user = table_select_one("users", {"email": customer_email})
        if not user:
            logger.warning(f"Whop webhook ignored | reason=user_not_found | email={customer_email}")
            create_log(
                action="whop_webhook",
                status="failed",
                provider="whop",
                message=f"user_not_found email={customer_email}"
            )
            return {"status": "ignored", "reason": "user not found"}

        plan_hint = json.dumps(data)
        inferred_plan = infer_plan_from_text(plan_hint) or user.get("plan", "basic")
        billing_cycle = infer_billing_from_text(plan_hint)

        if event_type in {"payment_succeeded", "payment.succeeded"}:
            payment_id = (
                data.get("payment_id")
                or data.get("invoice_id")
                or data.get("id")
            )

            amount_value = data.get("amount")
            amount = 0.0
            try:
                amount = float(amount_value) / 100 if amount_value is not None else 0.0
            except Exception:
                amount = 0.0

            membership = data.get("membership") or data.get("member") or {}

            table_update(
                "users",
                {"id": user["id"]},
                {
                    "plan": inferred_plan,
                    "billing_cycle": billing_cycle,
                    "subscription_status": "active",
                    "trial_started": False,
                    "trial_ends_at": None,
                    "last_payment_id": payment_id,
                    "whop_membership_id": membership.get("id"),
                    "whop_manage_url": membership.get("manage_url") or membership.get("manageUrl")
                }
            )

            existing_transaction = None
            if payment_id:
                existing_rows = table_select(
                    "transactions",
                    filters={"user_id": user["id"]},
                    columns="id,description,amount,category,date,type,source,created_at",
                    limit=1000
                )
                existing_transaction = next(
                    (
                        row for row in existing_rows
                        if row.get("source") == "whop"
                        and payment_id in str(row.get("description", ""))
                    ),
                    None
                )

            if not existing_transaction:
                transaction = {
                    "id": str(uuid.uuid4()),
                    "user_id": user["id"],
                    "description": f"Whop Payment {payment_id or ''}".strip(),
                    "amount": amount,
                    "category": "sales",
                    "date": now_iso()[:10],
                    "type": "income",
                    "source": "whop",
                    "created_at": now_iso()
                }
                table_insert_one("transactions", transaction)

            logger.info(f"Whop webhook activated subscription | user_id={user['id']} | plan={inferred_plan}")

            create_log(
                action="whop_webhook",
                status="success",
                user_id=user["id"],
                provider="whop",
                message=f"payment succeeded plan={inferred_plan}"
            )

            return {"status": "activated"}

        if event_type in {
            "membership_deactivated",
            "membership.deactivated",
            "payment_failed",
            "payment.failed",
            "payment_refunded",
            "payment.refunded",
        }:
            table_update(
                "users",
                {"id": user["id"]},
                {
                    "subscription_status": "inactive",
                    "trial_started": False,
                    "trial_ends_at": None
                }
            )

            logger.info(f"Whop webhook deactivated subscription | user_id={user['id']}")

            create_log(
                action="whop_webhook",
                status="success",
                user_id=user["id"],
                provider="whop",
                message="subscription deactivated"
            )
            return {"status": "deactivated"}

        return {"status": "ignored", "event_type": event_type}

    except Exception as e:
        logger.error(f"WHOP WEBHOOK ERROR: {e}", exc_info=True)
        create_log(
            action="whop_webhook",
            status="failed",
            provider="whop",
            message=str(e)
        )
        raise HTTPException(status_code=400, detail="Invalid Whop webhook")

# ==================== DOCUMENT ROUTES ====================

@api_router.post("/documents/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):

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
        if file.filename and file.filename.lower().endswith(".csv"):
            text_content = content.decode("utf-8")
            reader = csv.DictReader(io.StringIO(text_content))

            for row in reader:
                trans_id = str(uuid.uuid4())
                description = row.get("description") or row.get("Description") or "Unknown"
                raw_amount = row.get("amount") or row.get("Amount") or 0
                amount = float(raw_amount)
                category = await ai_categorize_transaction(description)

                transactions.append({
                    "id": trans_id,
                    "user_id": user["id"],
                    "description": description,
                    "amount": amount,
                    "category": category or "other",
                    "date": row.get("date") or row.get("Date") or now_iso()[:10],
                    "type": "expense" if amount < 0 else "income",
                    "source": "csv_import",
                    "created_at": now_iso()
                })
        else:
            raise HTTPException(status_code=400, detail="Only CSV files are supported right now")

        table_insert_many("transactions", transactions)
        return {"message": f"Imported {len(transactions)} transactions", "count": len(transactions)}
    except HTTPException:
        raise
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
    return TransactionResponse(**trans_doc)

@api_router.get("/bookkeeping/transactions", response_model=List[TransactionResponse])
async def get_transactions(user: dict = Depends(get_current_user)):
    require_feature_access(user)

    if not check_plan_access(user, "premium"):
        raise HTTPException(status_code=403, detail="Premium plan required")

    rows = table_select(
        "transactions",
        filters={"user_id": user["id"]},
        columns="id,description,amount,category,date,type,source,created_at",
        order_by="date",
        ascending=False,
        limit=1000
    )

    return [TransactionResponse(**row) for row in rows]

@api_router.put("/bookkeeping/transactions/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: str,
    trans: TransactionUpdate,
    user: dict = Depends(get_current_user)
):
    require_feature_access(user)

    if not check_plan_access(user, "premium"):
        raise HTTPException(status_code=403, detail="Premium plan required")

    existing = table_select_one("transactions", {"id": transaction_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Transaction not found")

    update_data = {k: v for k, v in trans.dict().items() if v is not None}
    if not update_data:
        return TransactionResponse(**existing)

    updated = table_update("transactions", {"id": transaction_id, "user_id": user["id"]}, update_data)
    final_row = updated[0] if updated else table_select_one("transactions", {"id": transaction_id, "user_id": user["id"]})

    return TransactionResponse(**final_row)

@api_router.delete("/bookkeeping/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str, user: dict = Depends(get_current_user)):
    require_feature_access(user)

    if not check_plan_access(user, "premium"):
        raise HTTPException(status_code=403, detail="Premium plan required")

    deleted = table_delete("transactions", {"id": transaction_id, "user_id": user["id"]})
    if not deleted:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return {"message": "Transaction deleted"}

@api_router.get("/bookkeeping/insights")
async def get_bookkeeping_insights(user: dict = Depends(get_current_user)):
    require_feature_access(user)

    if not check_plan_access(user, "premium"):
        raise HTTPException(status_code=403, detail="Premium plan required")

    transactions = table_select("transactions", {"user_id": user["id"]}, limit=1000)

    total_income = sum(float(t.get("amount", 0)) for t in transactions if t.get("type") == "income")
    total_expenses = sum(abs(float(t.get("amount", 0))) for t in transactions if t.get("type") == "expense")
    net_profit = total_income - total_expenses
    mrr = round(total_income / 12, 2) if total_income > 0 else 0
    burn_rate = round(total_expenses / 12, 2) if total_expenses > 0 else 0
    runway_months = round((total_income / burn_rate), 1) if burn_rate > 0 else 0
    profit_margin = round((net_profit / total_income) * 100, 1) if total_income > 0 else 0

    insights_payload = {
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "net_profit": round(net_profit, 2),
        "mrr": round(mrr, 2),
        "burn_rate": round(burn_rate, 2),
        "runway_months": runway_months,
        "profit_margin": profit_margin,
    }

    try:
        ai_result = await generate_financial_insights(transactions)
        insights_payload["ai_analysis"] = ai_result if isinstance(ai_result, str) else ai_result.get("analysis")
    except Exception as e:
        logger.error(f"FINANCIAL INSIGHTS ERROR: {e}")
        insights_payload["ai_analysis"] = "AI financial analysis is temporarily unavailable."

    return insights_payload

# ==================== REPORT ROUTES (PREMIUM) ====================

@api_router.get("/reports/profit-loss", response_model=FinancialReportResponse)
async def profit_loss_report(user: dict = Depends(get_current_user)):
    require_feature_access(user)

    if not check_plan_access(user, "premium"):
        raise HTTPException(status_code=403, detail="Premium plan required")

    transactions = table_select("transactions", {"user_id": user["id"]}, limit=1000)
    revenue = sum(float(t["amount"]) for t in transactions if t.get("type") == "income")

    expenses_by_category = {}
    total_expenses = 0.0

    for t in transactions:
        if t.get("type") == "expense":
            amount = abs(float(t["amount"]))
            total_expenses += amount
            category = t.get("category", "other")
            expenses_by_category[category] = expenses_by_category.get(category, 0) + amount

    net_income = revenue - total_expenses

    return FinancialReportResponse(
        report_type="profit-loss",
        period="all-time",
        data={
            "revenue": round(revenue, 2),
            "expenses": {k: round(v, 2) for k, v in expenses_by_category.items()},
            "total_expenses": round(total_expenses, 2),
            "net_income": round(net_income, 2),
        },
        generated_at=now_iso()
    )

@api_router.get("/reports/balance-sheet", response_model=FinancialReportResponse)
async def balance_sheet_report(user: dict = Depends(get_current_user)):
    require_feature_access(user)

    if not check_plan_access(user, "premium"):
        raise HTTPException(status_code=403, detail="Premium plan required")

    transactions = table_select("transactions", {"user_id": user["id"]}, limit=1000)
    income_total = sum(float(t["amount"]) for t in transactions if t.get("type") == "income")
    expense_total = sum(abs(float(t["amount"])) for t in transactions if t.get("type") == "expense")
    cash = income_total - expense_total
    tax_payable = max(cash * 0.15, 0)

    total_assets = cash
    total_liabilities = tax_payable
    equity = total_assets - total_liabilities

    return FinancialReportResponse(
        report_type="balance-sheet",
        period="all-time",
        data={
            "assets": {
                "cash": round(cash, 2),
                "accounts_receivable": 0,
            },
            "liabilities": {
                "accounts_payable": 0,
                "tax_payable": round(tax_payable, 2),
            },
            "total_assets": round(total_assets, 2),
            "total_liabilities": round(total_liabilities, 2),
            "equity": round(equity, 2),
        },
        generated_at=now_iso()
    )

@api_router.get("/reports/cash-flow", response_model=FinancialReportResponse)
async def cash_flow_report(user: dict = Depends(get_current_user)):
    require_feature_access(user)

    if not check_plan_access(user, "premium"):
        raise HTTPException(status_code=403, detail="Premium plan required")

    transactions = table_select("transactions", {"user_id": user["id"]}, limit=1000)
    cash_in = sum(float(t["amount"]) for t in transactions if t.get("type") == "income")
    cash_out = sum(abs(float(t["amount"])) for t in transactions if t.get("type") == "expense")
    net_cash_flow = cash_in - cash_out

    return FinancialReportResponse(
        report_type="cash-flow",
        period="all-time",
        data={
            "cash_in": round(cash_in, 2),
            "cash_out": round(cash_out, 2),
            "net_cash_flow": round(net_cash_flow, 2),
        },
        generated_at=now_iso()
    )

@api_router.get("/reports/export/{report_type}")
async def export_report(report_type: str, format: str = "csv", user: dict = Depends(get_current_user)):
    require_feature_access(user)

    if not check_plan_access(user, "premium"):
        raise HTTPException(status_code=403, detail="Premium plan required")

    if report_type not in ["profit-loss", "balance-sheet", "cash-flow"]:
        raise HTTPException(status_code=400, detail="Invalid report type")

    if format not in ["csv", "pdf"]:
        raise HTTPException(status_code=400, detail="Invalid export format")

    report_map = {
        "profit-loss": await profit_loss_report(user),
        "balance-sheet": await balance_sheet_report(user),
        "cash-flow": await cash_flow_report(user),
    }

    report = report_map[report_type]

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["Report Type", report.report_type])
        writer.writerow(["Period", report.period])
        writer.writerow(["Generated At", report.generated_at])
        writer.writerow([])

        for key, value in report.data.items():
            if isinstance(value, dict):
                writer.writerow([key.upper()])
                for sub_key, sub_value in value.items():
                    writer.writerow([sub_key, sub_value])
                writer.writerow([])
            else:
                writer.writerow([key, value])

        csv_bytes = io.BytesIO(output.getvalue().encode("utf-8"))
        return StreamingResponse(
            csv_bytes,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{report_type}.csv"'}
        )

    pdf_buffer = io.BytesIO()
    pdf = canvas.Canvas(pdf_buffer, pagesize=letter)
    width, height = letter

    y = height - 50
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(50, y, "SIMPLIFILE AI FINANCIAL REPORT")

    y -= 30
    pdf.setFont("Helvetica", 11)
    pdf.drawString(50, y, f"Report Type: {report.report_type}")
    y -= 20
    pdf.drawString(50, y, f"Period: {report.period}")
    y -= 20
    pdf.drawString(50, y, f"Generated At: {report.generated_at}")

    y -= 30
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(50, y, "REPORT DATA")

    y -= 20
    pdf.setFont("Helvetica", 10)

    for line in json.dumps(report.data, indent=2).splitlines():
        if y < 50:
            pdf.showPage()
            y = height - 50
            pdf.setFont("Helvetica", 10)
        pdf.drawString(50, y, line[:100])
        y -= 15

    pdf.save()
    pdf_buffer.seek(0)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{report_type}.pdf"'}
    )

    report_map = {
        "profit-loss": await profit_loss_report(user),
        "balance-sheet": await balance_sheet_report(user),
        "cash-flow": await cash_flow_report(user),
    }

    report = report_map[report_type]

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Report Type", report["report_type"]])
        writer.writerow(["Period", report["period"]])
        writer.writerow(["Generated At", report["generated_at"]])
        writer.writerow([])

        for key, value in report["data"].items():
            if isinstance(value, dict):
                writer.writerow([key.upper()])
                for sub_key, sub_value in value.items():
                    writer.writerow([sub_key, sub_value])
                writer.writerow([])
            else:
                writer.writerow([key, value])

        csv_bytes = io.BytesIO(output.getvalue().encode("utf-8"))
        return StreamingResponse(
            csv_bytes,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{report_type}.csv"'}
        )

    pdf_text = f"""SIMPLIFILE AI FINANCIAL REPORT

Report Type: {report['report_type']}
Period: {report['period']}
Generated At: {report['generated_at']}

REPORT DATA
{json.dumps(report['data'], indent=2)}
"""

    pdf_bytes = io.BytesIO(pdf_text.encode("utf-8"))
    return StreamingResponse(
        pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{report_type}.pdf"'}
    )

# ==================== INTEGRATIONS ROUTES (PREMIUM) ====================

@api_router.get("/integrations", response_model=List[IntegrationResponse])
async def get_integrations(user: dict = Depends(get_current_user)):
    require_feature_access(user)

    if not check_plan_access(user, "premium"):
        raise HTTPException(status_code=403, detail="Premium plan required")

    rows = table_select(
        "integrations",
        {"user_id": user["id"]},
        columns="id,platform,status,connected_at",
        order_by="connected_at",
        ascending=False,
        limit=20
    )

    return [IntegrationResponse(**row) for row in rows]

@api_router.post("/integrations/connect")
async def connect_integration(payload: IntegrationConnect, user: dict = Depends(get_current_user)):
    require_feature_access(user)
    logger.info(f"Integration connect attempt | user_id={user['id']} | platform={payload.platform}")

    if not check_plan_access(user, "premium"):
        raise HTTPException(status_code=403, detail="Premium plan required")

    allowed_platforms = {"shopify", "whop"}

    if payload.platform not in allowed_platforms:
        raise HTTPException(status_code=400, detail="Unsupported integration platform")

    existing = table_select_one("integrations", {"user_id": user["id"], "platform": payload.platform})

    if existing:
        table_update(
            "integrations",
            {"id": existing["id"]},
            {
                "status": "connected",
                "connected_at": now_iso(),
            }
        )
    else:
        table_insert_one(
            "integrations",
            {
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "platform": payload.platform,
                "status": "connected",
                "connected_at": now_iso(),
            }
        )

    logger.info(f"Integration connected | user_id={user['id']} | platform={payload.platform}")

    create_log(
        action="integration_connect",
        status="success",
        user_id=user["id"],
        provider=payload.platform,
        message="Connected successfully"
    )

    return {"message": f"{payload.platform} connected successfully"}


@api_router.delete("/integrations/{platform}")
async def disconnect_integration(platform: str, user: dict = Depends(get_current_user)):
    require_feature_access(user)
    logger.info(f"Integration disconnect attempt | user_id={user['id']} | platform={platform}")

    if not check_plan_access(user, "premium"):
        raise HTTPException(status_code=403, detail="Premium plan required")

    allowed_platforms = {"shopify", "whop"}

    if platform not in allowed_platforms:
        raise HTTPException(status_code=400, detail="Unsupported integration platform")

    deleted = table_delete("integrations", {"user_id": user["id"], "platform": platform})
    if not deleted:
        logger.warning(f"Integration disconnect failed | user_id={user['id']} | platform={platform} | reason=not_found")
        create_log(
            action="integration_disconnect",
            status="failed",
            user_id=user["id"],
            provider=platform,
            message="Integration not found"
        )
        raise HTTPException(status_code=404, detail="Integration not found")

    logger.info(f"Integration disconnected | user_id={user['id']} | platform={platform}")

    create_log(
        action="integration_disconnect",
        status="success",
        user_id=user["id"],
        provider=platform,
        message="Disconnected successfully"
    )
    return {"message": f"{platform} disconnected"}

@api_router.post("/integrations/{platform}/sync")
async def sync_integration(platform: str, user: dict = Depends(get_current_user)):
    require_feature_access(user)
    logger.info(f"Sync started | user_id={user['id']} | platform={platform}")

    if not check_plan_access(user, "premium"):
        raise HTTPException(status_code=403, detail="Premium plan required")

    allowed_platforms = {"shopify", "whop"}

    if platform not in allowed_platforms:
        raise HTTPException(status_code=400, detail="Unsupported integration platform")

    integration = table_select_one("integrations", {"user_id": user["id"], "platform": platform})
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not connected")

    if platform == "shopify":
        access_token = integration.get("access_token")
        shop = integration.get("shop")

        if not access_token or not shop:
            raise HTTPException(status_code=400, detail="Shopify not properly connected")

        query = """
        query GetOrders {
          orders(first: 50, sortKey: CREATED_AT, reverse: true) {
            edges {
              node {
                id
                name
                createdAt
                currentTotalPriceSet {
                  shopMoney {
                    amount
                  }
                }
              }
            }
          }
        }
        """

        response = requests.post(
            f"https://{shop}/admin/api/2024-01/graphql.json",
            headers={
                "X-Shopify-Access-Token": access_token,
                "Content-Type": "application/json",
            },
            json={"query": query},
        )

        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Shopify API error: {response.text}")

        data = response.json()

        if data.get("errors"):
            raise HTTPException(status_code=400, detail=f"Shopify GraphQL error: {data['errors']}")

        orders = data.get("data", {}).get("orders", {}).get("edges", [])
        transactions = []

        for edge in orders:
            order = edge["node"]
            order_id = str(order.get("id"))

            existing = table_select_one(
                "transactions",
                {"user_id": user["id"], "external_id": order_id}
            )

            if existing:
                continue

            total_price = float(order["currentTotalPriceSet"]["shopMoney"]["amount"])

            transactions.append({
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "external_id": order_id,
                "description": f"Shopify Order {order.get('name') or order_id}",
                "amount": total_price,
                "category": "sales",
                "date": (order.get("createdAt") or now_iso())[:10],
                "type": "income",
                "source": "shopify",
                "created_at": now_iso()
            })

        if transactions:
            table_insert_many("transactions", transactions)

        logger.info(f"Sync success | user_id={user['id']} | platform=shopify | imported={len(transactions)}")

        create_log(
            action="sync",
            status="success",
            user_id=user["id"],
            provider="shopify",
            message=f"Imported {len(transactions)} orders"
        )

        return {
            "message": f"Imported {len(transactions)} new Shopify orders",
            "count": len(transactions)
        }

    if platform == "whop":
        access_token = get_whop_access_token_for_user(integration)

        response = requests.get(
            "https://api.whop.com/api/v1/payments",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            params={"first": 100},
            timeout=30,
        )

        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Whop API error: {response.text}")

        payload = response.json()
        payments = payload.get("data", []) or []

        imported = 0

        for payment in payments:
            payment_id = payment.get("id")
            if not payment_id:
                continue

            existing_tx = table_select_one(
                "transactions",
                {"user_id": user["id"], "external_id": payment_id}
            )
            if existing_tx:
                continue

            total = float(payment.get("total") or 0)
            created_at_value = payment.get("created_at") or now_iso()
            product = payment.get("product") or {}
            product_title = product.get("title") or "Whop Payment"

            if total > 0:
                table_insert_one(
                    "transactions",
                    {
                        "id": str(uuid.uuid4()),
                        "user_id": user["id"],
                        "external_id": payment_id,
                        "description": f"Whop Payment: {product_title}",
                        "amount": total,
                        "category": "sales",
                        "date": created_at_value[:10],
                        "type": "income",
                        "source": "whop",
                        "created_at": now_iso(),
                    }
                )
                imported += 1

        logger.info(f"Sync success | user_id={user['id']} | platform=whop | imported={imported}")

        create_log(
            action="sync",
            status="success",
            user_id=user["id"],
            provider="whop",
            message=f"Imported {imported} transactions"
        )

        return {
            "message": f"Imported {imported} Whop transactions",
            "count": imported
        }

    logger.error(f"Sync failed | user_id={user['id']} | platform={platform}")

    create_log(
        action="sync",
        status="failed",
        user_id=user["id"],
        provider=platform,
        message="Unsupported platform or error"
    )
    raise HTTPException(status_code=400, detail=f"Sync not supported yet for {platform}")

# ==================== TAX INSIGHTS ROUTES (PREMIUM) ====================

@api_router.post("/tax/analyze", response_model=TaxInsightResponse)
async def analyze_tax_documents(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    require_feature_access(user)

    if not check_plan_access(user, "premium"):
        raise HTTPException(status_code=403, detail="Premium plan required")

    await file.read()

    insight_id = str(uuid.uuid4())
    transactions = table_select("transactions", {"user_id": user["id"]}, limit=1000)
    total_expenses = sum(abs(float(t["amount"])) for t in transactions if t.get("type") == "expense")

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

    if not check_plan_access(user, "premium"):
        raise HTTPException(status_code=403, detail="Premium plan required")

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
    await auto_sync_shopify(user["id"])
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
        int_count = len(
            table_select(
                "integrations",
                {"user_id": user["id"], "status": "connected"},
                columns="id",
                limit=100
            )
        )
        stats["integrations_connected"] = int_count

    return stats

# ==================== DEBUG ROUTES ====================

@api_router.get("/debug/users")
async def debug_users():
    users = table_select(
        "users",
        columns="id,email,plan,subscription_status",
        limit=20
    )
    return {"users": users}

@api_router.get("/debug/me")
async def debug_me(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    return payload

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "Simplifile AI API", "status": "healthy"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": now_iso()}
@api_router.get("/integrations/whop/connect")
async def connect_whop(token: str):
    if not WHOP_CLIENT_ID or not WHOP_OAUTH_REDIRECT_URI:
        raise HTTPException(status_code=500, detail="Whop OAuth not configured")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = str(payload.get("sub") or "").strip()
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = table_select_one("users", {"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user = await normalize_user_access(user)
    require_feature_access(user)

    if not check_plan_access(user, "premium"):
        raise HTTPException(status_code=403, detail="Premium plan required")

    state = build_whop_oauth_state(user["id"])
    pkce_verifier = generate_pkce_verifier()
    pkce_challenge = generate_pkce_challenge(pkce_verifier)
    nonce = generate_oauth_nonce()

    table_update(
        "users",
        {"id": user["id"]},
        {
            "whop_pkce_verifier": pkce_verifier,
            "whop_oauth_nonce": nonce,
        }
    )

    params = {
        "response_type": "code",
        "client_id": WHOP_CLIENT_ID,
        "redirect_uri": WHOP_OAUTH_REDIRECT_URI,
        "scope": whop_required_scopes(),
        "state": state,
        "nonce": nonce,
        "code_challenge": pkce_challenge,
        "code_challenge_method": "S256",
    }

    auth_url = f"https://api.whop.com/oauth/authorize?{urlencode(params)}"
    return RedirectResponse(auth_url)


@api_router.get("/integrations/whop/callback")
async def whop_callback(code: str, state: str):
    if not WHOP_CLIENT_ID or not WHOP_CLIENT_SECRET or not WHOP_OAUTH_REDIRECT_URI:
        raise HTTPException(status_code=500, detail="Whop OAuth not configured")

    user_id = decode_whop_oauth_state(state)

    user = table_select_one("users", {"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    pkce_verifier = user.get("whop_pkce_verifier")
    if not pkce_verifier:
        raise HTTPException(status_code=400, detail="Missing PKCE verifier. Start Whop connect again.")

    token_response = requests.post(
        "https://api.whop.com/oauth/token",
        headers={"Content-Type": "application/json"},
        json={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": WHOP_OAUTH_REDIRECT_URI,
            "client_id": WHOP_CLIENT_ID,
            "client_secret": WHOP_CLIENT_SECRET,
            "code_verifier": pkce_verifier,
        },
        timeout=30,
    )

    if token_response.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Whop token exchange failed: {token_response.text}")

    token_data = token_response.json()

    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    expires_in = int(token_data.get("expires_in") or 3600)

    if not access_token or not refresh_token:
        raise HTTPException(status_code=400, detail="Invalid Whop token response")

    existing = table_select_one("integrations", {"user_id": user_id, "platform": "whop"})

    integration_data = {
        "platform": "whop",
        "status": "connected",
        "connected_at": now_iso(),
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_expires_at": (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat(),
    }

    if existing:
        table_update("integrations", {"id": existing["id"]}, integration_data)
    else:
        table_insert_one(
            "integrations",
            {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                **integration_data,
            }
        )

    table_update(
        "users",
        {"id": user_id},
        {
            "whop_pkce_verifier": None,
            "whop_oauth_nonce": None,
        }
    )

    return RedirectResponse(
    f"{os.environ.get('FRONTEND_URL', '').rstrip('/')}/dashboard/integrations?whop=connected"
)


# ==================== SHOPIFY INTEGRATION ====================

SHOPIFY_CLIENT_ID = os.getenv("SHOPIFY_CLIENT_ID")
SHOPIFY_CLIENT_SECRET = os.getenv("SHOPIFY_CLIENT_SECRET")
SHOPIFY_REDIRECT_URI = os.getenv("SHOPIFY_REDIRECT_URI")


@api_router.get("/integrations/shopify/connect")
def connect_shopify(shop: str, token: str):
    auth_url = (
        f"https://{shop}/admin/oauth/authorize"
        f"?client_id={SHOPIFY_CLIENT_ID}"
        f"&scope=read_orders"
        f"&redirect_uri={SHOPIFY_REDIRECT_URI}"
        f"&state={token}"
    )
    return RedirectResponse(auth_url)


@api_router.get("/integrations/shopify/callback")
def shopify_callback(code: str, shop: str, state: str):
    try:
        payload = jwt.decode(state, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

    token_url = f"https://{shop}/admin/oauth/access_token"

    response = requests.post(
        token_url,
        json={
            "client_id": SHOPIFY_CLIENT_ID,
            "client_secret": SHOPIFY_CLIENT_SECRET,
            "code": code,
        },
    )

    data = response.json()
    access_token = data.get("access_token")

    if not access_token:
        raise HTTPException(status_code=400, detail="Failed to get Shopify token")

    existing = table_select_one("integrations", {
        "user_id": user_id,
        "platform": "shopify"
    })

    if existing:
        table_update(
            "integrations",
            {"id": existing["id"]},
            {
                "status": "connected",
                "connected_at": now_iso(),
                "shop": shop,
                "access_token": access_token,
            }
        )
    else:
        table_insert_one(
            "integrations",
            {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "platform": "shopify",
                "status": "connected",
                "connected_at": now_iso(),
                "shop": shop,
                "access_token": access_token,
            }
        )

    create_shopify_webhooks(shop, access_token)

    return RedirectResponse(
        f"{os.environ.get('FRONTEND_URL', '').rstrip('/')}/dashboard/integrations"
    )

# ==================== REGISTER ROUTER ====================
async def auto_sync_shopify(user_id: str):
    integration = table_select_one("integrations", {
        "user_id": user_id,
        "platform": "shopify"
    })

    if not integration:
        return

    access_token = integration.get("access_token")
    shop = integration.get("shop")

    if not access_token or not shop:
        return

    try:
        query = """
        query GetOrders {
          orders(first: 20, sortKey: CREATED_AT, reverse: true) {
            edges {
              node {
                id
                name
                createdAt
                currentTotalPriceSet {
                  shopMoney {
                    amount
                  }
                }
              }
            }
          }
        }
        """

        response = requests.post(
            f"https://{shop}/admin/api/2024-01/graphql.json",
            headers={
                "X-Shopify-Access-Token": access_token,
                "Content-Type": "application/json",
            },
            json={"query": query},
        )

        if response.status_code != 200:
            logger.error(f"AUTO SHOPIFY GRAPHQL ERROR {response.status_code}: {response.text}")
            return

        data = response.json()
        if data.get("errors"):
            logger.error(f"AUTO SHOPIFY GRAPHQL ERRORS: {data}")
            return

        orders = data.get("data", {}).get("orders", {}).get("edges", [])

        for edge in orders:
            order = edge["node"]
            order_id = str(order.get("id"))

            existing = table_select_one(
                "transactions",
                {"user_id": user_id, "external_id": order_id}
            )

            if existing:
                continue

            table_insert_one("transactions", {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "external_id": order_id,
                "description": f"Shopify Order {order.get('name') or order_id}",
                "amount": float(order["currentTotalPriceSet"]["shopMoney"]["amount"]),
                "category": "sales",
                "date": (order.get("createdAt") or now_iso())[:10],
                "type": "income",
                "source": "shopify",
                "created_at": now_iso()
            })

    except Exception as e:
        logger.error(f"Auto sync failed: {e}")

SHOPIFY_WEBHOOK_SECRET = os.getenv("SHOPIFY_WEBHOOK_SECRET", "")

@api_router.post("/integrations/shopify/webhook")
async def shopify_webhook(request: Request):
    raw_body = await request.body()
    hmac_header = request.headers.get("X-Shopify-Hmac-Sha256", "")
    shop = request.headers.get("X-Shopify-Shop-Domain", "")
    topic = request.headers.get("X-Shopify-Topic", "")

    digest = base64.b64encode(
        hmac.new(
            SHOPIFY_WEBHOOK_SECRET.encode("utf-8"),
            raw_body,
            hashlib.sha256
        ).digest()
    ).decode("utf-8")

    if not hmac.compare_digest(digest, hmac_header):
        raise HTTPException(status_code=401, detail="Invalid Shopify webhook signature")

    payload = await request.json()

    integration = table_select_one("integrations", {
        "platform": "shopify",
        "shop": shop
    })

    if not integration:
        return {"status": "ignored", "reason": "integration not found"}

    user_id = integration["user_id"]
    order_id = str(payload.get("id"))
    order_name = payload.get("name") or order_id
    created_at = (payload.get("created_at") or now_iso())[:10]

    # ----------------------------
    # ORDER CREATED
    # ----------------------------
    if topic == "orders/create":
        existing = table_select_one(
            "transactions",
            {"user_id": user_id, "external_id": order_id, "source": "shopify"}
        )

        if existing:
            return {"status": "ignored", "reason": "already imported"}

        total_price = float(payload.get("current_total_price") or payload.get("total_price") or 0)

        table_insert_one("transactions", {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "external_id": order_id,
            "description": f"Shopify Order {order_name}",
            "amount": total_price,
            "category": "sales",
            "date": created_at,
            "type": "income",
            "source": "shopify",
            "created_at": now_iso()
        })

        return {"status": "ok", "event": "order_created"}

    # ----------------------------
    # ORDER UPDATED / REFUND / CANCEL
    # ----------------------------
    if topic == "orders/updated":
        # 1) Handle refunds
        refunds = payload.get("refunds") or []
        total_refunded = 0.0

        for refund in refunds:
            refund_id = str(refund.get("id") or "")
            refund_transactions = refund.get("transactions") or []

            refund_amount = 0.0
            for tx in refund_transactions:
                try:
                    refund_amount += abs(float(tx.get("amount") or 0))
                except Exception:
                    pass

            # fallback if Shopify sends refund object without transaction amount
            if refund_amount == 0:
                refund_line_items = refund.get("refund_line_items") or []
                for item in refund_line_items:
                    line_item = item.get("line_item") or {}
                    quantity = float(item.get("quantity") or 0)
                    price = float(line_item.get("price") or 0)
                    refund_amount += quantity * price

            if refund_amount <= 0:
                continue

            total_refunded += refund_amount

            refund_external_id = f"{order_id}_refund_{refund_id}"

            existing_refund = table_select_one(
                "transactions",
                {
                    "user_id": user_id,
                    "external_id": refund_external_id,
                    "source": "shopify_refund"
                }
            )

            if existing_refund:
                continue

            processed_at = (refund.get("created_at") or payload.get("updated_at") or now_iso())[:10]

            table_insert_one("transactions", {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "external_id": refund_external_id,
                "description": f"Shopify Refund for Order {order_name}",
                "amount": -abs(refund_amount),
                "category": "refunds",
                "date": processed_at,
                "type": "expense",
                "source": "shopify_refund",
                "created_at": now_iso()
            })

        # 2) Handle cancelled orders with no refund object
        cancelled_at = payload.get("cancelled_at")
        if cancelled_at:
            cancel_external_id = f"{order_id}_cancel"

            existing_cancel = table_select_one(
                "transactions",
                {
                    "user_id": user_id,
                    "external_id": cancel_external_id,
                    "source": "shopify_refund"
                }
            )

            if not existing_cancel:
                total_price = float(payload.get("current_total_price") or payload.get("total_price") or 0)

                # Only create cancellation adjustment if no refund amount was already inserted
                if total_refunded == 0 and total_price > 0:
                    table_insert_one("transactions", {
                        "id": str(uuid.uuid4()),
                        "user_id": user_id,
                        "external_id": cancel_external_id,
                        "description": f"Shopify Cancelled Order {order_name}",
                        "amount": -abs(total_price),
                        "category": "refunds",
                        "date": cancelled_at[:10],
                        "type": "expense",
                        "source": "shopify_refund",
                        "created_at": now_iso()
                    })

        return {"status": "ok", "event": "order_updated"}

    return {"status": "ignored", "reason": f"Unhandled topic: {topic}"}
    
def create_shopify_webhooks(shop, access_token):
    url = f"https://{shop}/admin/api/2024-01/webhooks.json"

    headers = {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json",
    }

    webhooks = [
        {
            "topic": "orders/create",
            "address": "https://simplifile-ai.onrender.com/api/integrations/shopify/webhook",
            "format": "json",
        },
        {
            "topic": "orders/updated",
            "address": "https://simplifile-ai.onrender.com/api/integrations/shopify/webhook",
            "format": "json",
        },
    ]

    for webhook in webhooks:
        try:
            response = requests.post(
                url,
                headers=headers,
                json={"webhook": webhook}
            )
            if response.status_code not in [200, 201]:
                logger.error(f"Webhook creation failed: {response.status_code} {response.text}")
        except Exception as e:
            logger.error(f"Webhook creation failed: {e}")


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
def create_shopify_webhooks(shop, access_token):
    url = f"https://{shop}/admin/api/2024-01/webhooks.json"

    headers = {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json",
    }

    webhooks = [
        {
            "topic": "orders/create",
            "address": "https://simplifile-ai.onrender.com/api/integrations/shopify/webhook",
            "format": "json",
        },
        {
            "topic": "orders/updated",
            "address": "https://simplifile-ai.onrender.com/api/integrations/shopify/webhook",
            "format": "json",
        },
    ]

    for webhook in webhooks:
        try:
            response = requests.post(
                url,
                headers=headers,
                json={"webhook": webhook}
            )
            if response.status_code not in [200, 201]:
                logger.error(f"Webhook creation failed: {response.status_code} {response.text}")
        except Exception as e:
            logger.error(f"Webhook creation failed: {e}")


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
