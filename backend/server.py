from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import json
import base64
import io
import csv

# Import AI service
from ai_service import (
    analyze_document as ai_analyze_document,
    chat_with_context,
    categorize_transaction as ai_categorize_transaction,
    generate_financial_insights,
    generate_tax_insights
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# OpenAI API Key (placeholder - user will provide later)
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', 'sk-placeholder-key')

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'simplifile-ai-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Simplifile AI API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
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

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    plan: str
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

class DocumentUpload(BaseModel):
    name: str
    content: str
    file_type: str

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
    type: str  # income or expense

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

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": user_id,
        "exp": expiration.timestamp(),
        "iat": datetime.now(timezone.utc).timestamp()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def check_plan_access(user: dict, required_plan: str) -> bool:
    plan_hierarchy = {"basic": 1, "premium": 2, "enterprise": 3}
    user_level = plan_hierarchy.get(user.get("plan", "basic"), 1)
    required_level = plan_hierarchy.get(required_plan, 1)
    return user_level >= required_level

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user with 3-day trial
    user_id = str(uuid.uuid4())
    trial_ends = datetime.now(timezone.utc) + timedelta(days=3)
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "plan": "basic",
        "billing_cycle": "monthly",
        "trial_ends_at": trial_ends.isoformat(),
        "subscription_status": "trial",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            plan="basic",
            trial_ends_at=trial_ends.isoformat(),
            subscription_status="trial",
            created_at=user_doc["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            plan=user.get("plan", "basic"),
            trial_ends_at=user.get("trial_ends_at"),
            subscription_status=user.get("subscription_status", "trial"),
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        plan=user.get("plan", "basic"),
        trial_ends_at=user.get("trial_ends_at"),
        subscription_status=user.get("subscription_status", "trial"),
        created_at=user["created_at"]
    )

# ==================== SUBSCRIPTION ROUTES (MOCKED) ====================

@api_router.post("/subscription/update")
async def update_subscription(plan_data: PlanUpdate, user: dict = Depends(get_current_user)):
    valid_plans = ["basic", "premium", "enterprise"]
    if plan_data.plan not in valid_plans:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    # Mock subscription update - would integrate with Whop here
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "plan": plan_data.plan,
            "billing_cycle": plan_data.billing_cycle,
            "subscription_status": "active"
        }}
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
        "trial_days": 3
    }

# ==================== DOCUMENT ROUTES ====================

@api_router.post("/documents/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    # Read file content
    content = await file.read()
    content_base64 = base64.b64encode(content).decode('utf-8')
    
    doc_id = str(uuid.uuid4())
    doc = {
        "id": doc_id,
        "user_id": user["id"],
        "name": file.filename,
        "file_type": file.content_type or "application/octet-stream",
        "content": content_base64,
        "summary": None,
        "key_points": None,
        "risks": None,
        "obligations": None,
        "simple_explanation": None,
        "analyzed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.documents.insert_one(doc)
    
    return DocumentResponse(
        id=doc_id,
        name=file.filename,
        file_type=doc["file_type"],
        created_at=doc["created_at"],
        analyzed=False
    )

@api_router.post("/documents/{doc_id}/analyze", response_model=DocumentResponse)
async def analyze_document(doc_id: str, user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one({"id": doc_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Decode document content for analysis
    try:
        content_bytes = base64.b64decode(doc.get("content", ""))
        # Try to decode as text
        try:
            document_text = content_bytes.decode('utf-8')
        except UnicodeDecodeError:
            # For PDFs/images, we'd need proper parsing - use filename as context for now
            document_text = f"Document: {doc['name']} (binary content - PDF/image parsing would extract text here)"
    except Exception:
        document_text = f"Document: {doc['name']}"
    
    # Use AI service to analyze document with structured prompt
    analysis = await ai_analyze_document(document_text, doc['name'])
    
    await db.documents.update_one(
        {"id": doc_id},
        {"$set": {
            "summary": analysis.get("summary"),
            "key_points": analysis.get("key_points"),
            "risks": analysis.get("risks"),
            "obligations": analysis.get("obligations"),
            "simple_explanation": analysis.get("simple_explanation"),
            "what_this_means": analysis.get("what_this_means"),
            "analyzed": True
        }}
    )
    
    return DocumentResponse(
        id=doc_id,
        name=doc["name"],
        file_type=doc["file_type"],
        summary=analysis.get("summary"),
        key_points=analysis.get("key_points"),
        risks=analysis.get("risks"),
        obligations=analysis.get("obligations"),
        simple_explanation=analysis.get("simple_explanation"),
        what_this_means=analysis.get("what_this_means"),
        created_at=doc["created_at"],
        analyzed=True
    )

@api_router.get("/documents", response_model=List[DocumentResponse])
async def get_documents(user: dict = Depends(get_current_user)):
    docs = await db.documents.find(
        {"user_id": user["id"]},
        {"_id": 0, "content": 0}
    ).to_list(100)
    
    return [DocumentResponse(**doc) for doc in docs]

@api_router.get("/documents/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str, user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one(
        {"id": doc_id, "user_id": user["id"]},
        {"_id": 0, "content": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse(**doc)

@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user: dict = Depends(get_current_user)):
    result = await db.documents.delete_one({"id": doc_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted"}

# ==================== CHAT ROUTES ====================

@api_router.post("/chat", response_model=ChatResponse)
async def send_chat_message(message: ChatMessage, user: dict = Depends(get_current_user)):
    # Get document context if provided
    context = None
    document_name = None
    
    if message.document_id:
        doc = await db.documents.find_one({"id": message.document_id, "user_id": user["id"]}, {"_id": 0})
        if doc:
            document_name = doc.get('name')
            # Build context from document analysis
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
    
    # Use AI service with structured Copilot prompt
    ai_response = await chat_with_context(message.message, context, document_name)
    
    chat_id = str(uuid.uuid4())
    chat_doc = {
        "id": chat_id,
        "user_id": user["id"],
        "user_message": message.message,
        "ai_response": ai_response,
        "document_id": message.document_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.chats.insert_one(chat_doc)
    
    return ChatResponse(**{k: v for k, v in chat_doc.items() if k != "user_id"})

@api_router.get("/chat/history", response_model=List[ChatResponse])
async def get_chat_history(document_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if document_id:
        query["document_id"] = document_id
    
    chats = await db.chats.find(query, {"_id": 0, "user_id": 0}).sort("created_at", -1).to_list(50)
    return [ChatResponse(**chat) for chat in chats]

# ==================== BOOKKEEPING ROUTES (PREMIUM+) ====================

@api_router.post("/bookkeeping/upload")
async def upload_financial_data(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    if not check_plan_access(user, "premium"):
        raise HTTPException(status_code=403, detail="Premium plan required")
    
    content = await file.read()
    transactions = []
    
    # Parse CSV/Excel
    try:
        if file.filename.endswith('.csv'):
            text_content = content.decode('utf-8')
            reader = csv.DictReader(io.StringIO(text_content))
            for row in reader:
                trans_id = str(uuid.uuid4())
                description = row.get('description', row.get('Description', 'Unknown'))
                # Use AI service for categorization with structured prompt
                category = await ai_categorize_transaction(description)
                transactions.append({
                    "id": trans_id,
                    "user_id": user["id"],
                    "description": description,
                    "amount": float(row.get('amount', row.get('Amount', 0))),
                    "category": category,
                    "date": row.get('date', row.get('Date', datetime.now(timezone.utc).isoformat()[:10])),
                    "type": "expense" if float(row.get('amount', row.get('Amount', 0))) < 0 else "income",
                    "source": "csv_import",
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
        
        if transactions:
            await db.transactions.insert_many(transactions)
        
        return {"message": f"Imported {len(transactions)} transactions", "count": len(transactions)}
    except Exception as e:
        logger.error(f"Error parsing file: {e}")
        raise HTTPException(status_code=400, detail="Error parsing file")

@api_router.post("/bookkeeping/transactions", response_model=TransactionResponse)
async def create_transaction(trans: TransactionCreate, user: dict = Depends(get_current_user)):
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
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.transactions.insert_one(trans_doc)
    return TransactionResponse(**{k: v for k, v in trans_doc.items() if k != "user_id"})

@api_router.get("/bookkeeping/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    if not check_plan_access(user, "premium"):
        raise HTTPException(status_code=403, detail="Premium plan required")
    
    query = {"user_id": user["id"]}
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        query.setdefault("date", {})["$lte"] = end_date
    if category:
        query["category"] = category
    
    transactions = await db.transactions.find(query, {"_id": 0, "user_id": 0}).sort("date", -1).to_list(500)
    return [TransactionResponse(**t) for t in transactions]

@api_router.put("/bookkeeping/transactions/{trans_id}", response_model=TransactionResponse)
async def update_transaction(trans_id: str, update: TransactionUpdate, user: dict = Depends(get_current_user)):
    if not check_plan_access(user, "enterprise"):
        raise HTTPException(status_code=403, detail="Enterprise plan required for manual editing")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.transactions.update_one(
        {"id": trans_id, "user_id": user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    trans = await db.transactions.find_one({"id": trans_id}, {"_id": 0, "user_id": 0})
    return TransactionResponse(**trans)

@api_router.delete("/bookkeeping/transactions/{trans_id}")
async def delete_transaction(trans_id: str, user: dict = Depends(get_current_user)):
    if not check_plan_access(user, "enterprise"):
        raise HTTPException(status_code=403, detail="Enterprise plan required")
    
    result = await db.transactions.delete_one({"id": trans_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted"}

@api_router.get("/bookkeeping/insights")
async def get_financial_insights(user: dict = Depends(get_current_user)):
    if not check_plan_access(user, "premium"):
        raise HTTPException(status_code=403, detail="Premium plan required")
    
    # Get all transactions for insights
    transactions = await db.transactions.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    
    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expenses = sum(abs(t["amount"]) for t in transactions if t["type"] == "expense")
    
    # Calculate basic metrics
    metrics = {
        "mrr": round(total_income / 12, 2) if total_income else 0,
        "burn_rate": round(total_expenses / max(1, len(set(t["date"][:7] for t in transactions if "date" in t))), 2),
        "runway_months": round(total_income / max(total_expenses, 1) * 12, 1) if total_expenses else 999,
        "cac": round(sum(abs(t["amount"]) for t in transactions if t.get("category") == "marketing") / max(1, len(transactions) // 10), 2),
        "profit_margin": round((total_income - total_expenses) / max(total_income, 1) * 100, 2),
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_profit": total_income - total_expenses
    }
    
    # Use AI service to generate insights with structured Financial Insights prompt
    ai_insights = await generate_financial_insights(transactions, metrics)
    
    return {
        **metrics,
        "ai_analysis": ai_insights.get("ai_analysis"),
        "generated_by": ai_insights.get("generated_by", "mock")
    }

# ==================== REPORTS ROUTES (ENTERPRISE) ====================

@api_router.get("/reports/profit-loss", response_model=FinancialReportResponse)
async def get_profit_loss(period: str = "monthly", user: dict = Depends(get_current_user)):
    if not check_plan_access(user, "enterprise"):
        raise HTTPException(status_code=403, detail="Enterprise plan required")
    
    transactions = await db.transactions.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    
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
        generated_at=datetime.now(timezone.utc).isoformat()
    )

@api_router.get("/reports/balance-sheet", response_model=FinancialReportResponse)
async def get_balance_sheet(user: dict = Depends(get_current_user)):
    if not check_plan_access(user, "enterprise"):
        raise HTTPException(status_code=403, detail="Enterprise plan required")
    
    transactions = await db.transactions.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    
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
        generated_at=datetime.now(timezone.utc).isoformat()
    )

@api_router.get("/reports/cash-flow", response_model=FinancialReportResponse)
async def get_cash_flow(user: dict = Depends(get_current_user)):
    if not check_plan_access(user, "enterprise"):
        raise HTTPException(status_code=403, detail="Enterprise plan required")
    
    transactions = await db.transactions.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    
    # Group by month
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
        generated_at=datetime.now(timezone.utc).isoformat()
    )

@api_router.get("/reports/export/{report_type}")
async def export_report(report_type: str, format: str = "csv", user: dict = Depends(get_current_user)):
    if not check_plan_access(user, "enterprise"):
        raise HTTPException(status_code=403, detail="Enterprise plan required")
    
    # Return export data - in production would generate actual files
    return {
        "message": f"Export initiated for {report_type} in {format} format",
        "download_url": f"/api/reports/download/{report_type}.{format}"
    }

# ==================== INTEGRATIONS ROUTES (ENTERPRISE) ====================

@api_router.get("/integrations", response_model=List[IntegrationResponse])
async def get_integrations(user: dict = Depends(get_current_user)):
    if not check_plan_access(user, "enterprise"):
        raise HTTPException(status_code=403, detail="Enterprise plan required")
    
    integrations = await db.integrations.find({"user_id": user["id"]}, {"_id": 0, "user_id": 0, "api_key": 0, "api_secret": 0}).to_list(20)
    
    # Return default available integrations if none connected
    available = [
        {"id": "shopify", "platform": "shopify", "status": "disconnected"},
        {"id": "stripe", "platform": "stripe", "status": "disconnected"},
        {"id": "paypal", "platform": "paypal", "status": "disconnected"},
        {"id": "whop", "platform": "whop", "status": "disconnected"}
    ]
    
    # Merge with connected ones
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
    if not check_plan_access(user, "enterprise"):
        raise HTTPException(status_code=403, detail="Enterprise plan required")
    
    valid_platforms = ["shopify", "stripe", "paypal", "whop"]
    if integration.platform not in valid_platforms:
        raise HTTPException(status_code=400, detail="Invalid platform")
    
    # MOCKED integration - would actually connect to platform APIs
    int_id = str(uuid.uuid4())
    int_doc = {
        "id": int_id,
        "user_id": user["id"],
        "platform": integration.platform,
        "api_key": integration.api_key,
        "api_secret": integration.api_secret,
        "status": "connected",
        "connected_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.integrations.update_one(
        {"user_id": user["id"], "platform": integration.platform},
        {"$set": int_doc},
        upsert=True
    )
    
    return IntegrationResponse(
        id=int_id,
        platform=integration.platform,
        status="connected",
        connected_at=int_doc["connected_at"]
    )

@api_router.delete("/integrations/{platform}")
async def disconnect_integration(platform: str, user: dict = Depends(get_current_user)):
    if not check_plan_access(user, "enterprise"):
        raise HTTPException(status_code=403, detail="Enterprise plan required")
    
    result = await db.integrations.delete_one({"user_id": user["id"], "platform": platform})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Integration not found")
    return {"message": f"{platform} disconnected"}

@api_router.post("/integrations/{platform}/sync")
async def sync_integration(platform: str, user: dict = Depends(get_current_user)):
    if not check_plan_access(user, "enterprise"):
        raise HTTPException(status_code=403, detail="Enterprise plan required")
    
    integration = await db.integrations.find_one({"user_id": user["id"], "platform": platform})
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not connected")
    
    # MOCKED sync - would pull real data from platform
    mock_transactions = [
        {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "description": f"{platform.title()} - Order #12345",
            "amount": 99.99,
            "category": "fees" if "fee" in platform else "other",
            "date": datetime.now(timezone.utc).isoformat()[:10],
            "type": "income",
            "source": platform,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.transactions.insert_many(mock_transactions)
    
    return {"message": f"Synced {len(mock_transactions)} transactions from {platform}"}

# ==================== TAX INSIGHTS ROUTES (ENTERPRISE) ====================

@api_router.post("/tax/analyze", response_model=TaxInsightResponse)
async def analyze_tax_documents(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    if not check_plan_access(user, "enterprise"):
        raise HTTPException(status_code=403, detail="Enterprise plan required")
    
    insight_id = str(uuid.uuid4())
    
    # Get all transactions for context
    transactions = await db.transactions.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    total_expenses = sum(abs(t["amount"]) for t in transactions if t.get("type") == "expense")
    
    # Use AI service to generate tax insights with structured prompt
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
        "generated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tax_insights.insert_one(insight)
    
    return TaxInsightResponse(**{k: v for k, v in insight.items() if k != "user_id"})

@api_router.get("/tax/insights", response_model=List[TaxInsightResponse])
async def get_tax_insights(user: dict = Depends(get_current_user)):
    if not check_plan_access(user, "enterprise"):
        raise HTTPException(status_code=403, detail="Enterprise plan required")
    
    insights = await db.tax_insights.find({"user_id": user["id"]}, {"_id": 0, "user_id": 0}).sort("generated_at", -1).to_list(10)
    return [TaxInsightResponse(**i) for i in insights]

# ==================== DASHBOARD STATS ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    doc_count = await db.documents.count_documents({"user_id": user["id"]})
    chat_count = await db.chats.count_documents({"user_id": user["id"]})
    
    stats = {
        "documents_count": doc_count,
        "chats_count": chat_count,
        "plan": user.get("plan", "basic"),
        "trial_ends_at": user.get("trial_ends_at"),
        "subscription_status": user.get("subscription_status", "trial")
    }
    
    if check_plan_access(user, "premium"):
        trans_count = await db.transactions.count_documents({"user_id": user["id"]})
        stats["transactions_count"] = trans_count
        
        transactions = await db.transactions.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
        stats["total_income"] = sum(t["amount"] for t in transactions if t["type"] == "income")
        stats["total_expenses"] = sum(abs(t["amount"]) for t in transactions if t["type"] == "expense")
    
    if check_plan_access(user, "enterprise"):
        int_count = await db.integrations.count_documents({"user_id": user["id"], "status": "connected"})
        stats["integrations_connected"] = int_count
    
    return stats

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "Simplifile AI API", "status": "healthy"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
