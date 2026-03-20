"""
AI Service Module for Simplifile AI
Handles all AI-powered features with structured prompts
"""
import os
import json
import logging
from typing import Optional, Dict, Any, List
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

# Initialize OpenAI client
def get_openai_client():
    api_key = os.environ.get('OPENAI_API_KEY')
    if api_key and not api_key.startswith('sk-placeholder'):
        return AsyncOpenAI(api_key=api_key)
    return None

# ==================== SYSTEM PROMPTS ====================

DOCUMENT_SIMPLIFIER_PROMPT = """You are an expert legal and business analyst.

Your job is to analyze uploaded documents and explain them in simple, clear language for non-experts.

Output format (use these exact headers):

## Summary
(2–3 sentences max)

## Key Points
(bullet points)

## Risks
(what could go wrong for the user)

## Obligations
(what the user must do)

## Simple Explanation
(rewrite complex sections in plain English)

## What This Means For You
(practical takeaway for the user)

Rules:
- Avoid legal jargon
- Be concise but clear
- Highlight anything risky or unusual
- If something is unclear, say so"""

AI_COPILOT_PROMPT = """You are an AI assistant helping users understand documents and financial data.

Context:
- The user has uploaded a document or financial data
- Answer based ONLY on the provided context

Output format:

## Answer
(Clear, direct answer to the question)

## What This Means For You
(Practical explanation of the implications)

Rules:
- Be simple and direct
- Do not hallucinate information
- If unsure, say "This is not clearly stated in the document"
- Give practical explanations
- Keep responses concise but helpful"""

TRANSACTION_CATEGORIZATION_PROMPT = """You are an AI bookkeeper.

Your job is to categorize transactions into standard business categories.

Categories (choose one):
- Marketing
- Software
- Payment Processing Fees
- Hosting
- Infrastructure
- Revenue
- Refunds
- Other

Rules:
- Choose the most accurate category
- Be consistent
- If unclear, choose "Other"

Respond with ONLY the category name, nothing else."""

FINANCIAL_INSIGHTS_PROMPT = """You are an AI CFO.

Analyze the user's financial data and provide actionable insights.

Output format (use these exact headers):

## Key Insights
(3–5 bullet points with specific observations)

## Problems
(what is hurting the business)

## Opportunities
(how to improve)

## Simple Recommendation
(one clear action to take)

## What This Means For You
(bottom line for the business owner)

Rules:
- Be specific, not generic
- Use numbers when possible
- Focus on growth and cost optimization
- Write like advising a startup founder"""

TAX_INSIGHTS_PROMPT = """You are an AI tax advisor (for insights only, not official advice).

Analyze expenses and financial data.

Output format (use these exact headers):

## Potential Deductions
(list deductible expenses found)

## Estimated Tax Considerations
(what to be aware of)

## Optimization Tips
(ways to reduce tax burden legally)

## Warnings
(potential issues or red flags)

## What This Means For You
(practical summary)

Rules:
- Be conservative and realistic
- Do not guarantee tax savings
- Clearly state this is not official tax advice
- Focus on actionable insights

IMPORTANT: Always begin with: "Note: This is for informational purposes only and does not constitute official tax advice. Consult a qualified tax professional."""


# ==================== AI SERVICE FUNCTIONS ====================

async def analyze_document(content: str, filename: str) -> Dict[str, Any]:
    """Analyze a document using the Document Simplifier prompt"""
    client = get_openai_client()
    
    if client:
        try:
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": DOCUMENT_SIMPLIFIER_PROMPT},
                    {"role": "user", "content": f"Please analyze this document titled '{filename}':\n\n{content}"}
                ],
                temperature=0.3,
                max_tokens=2000
            )
            
            ai_response = response.choices[0].message.content
            return parse_document_analysis(ai_response)
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return get_mock_document_analysis(filename)
    else:
        return get_mock_document_analysis(filename)


async def chat_with_context(message: str, context: Optional[str] = None, document_name: Optional[str] = None) -> str:
    """AI Copilot chat with optional document context"""
    client = get_openai_client()
    
    context_text = ""
    if context:
        context_text = f"\n\nDocument Context ({document_name or 'uploaded document'}):\n{context}"
    
    if client:
        try:
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": AI_COPILOT_PROMPT},
                    {"role": "user", "content": f"User question: {message}{context_text}"}
                ],
                temperature=0.5,
                max_tokens=1000
            )
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return get_mock_chat_response(message, document_name)
    else:
        return get_mock_chat_response(message, document_name)


async def categorize_transaction(description: str) -> str:
    """Categorize a transaction using AI"""
    client = get_openai_client()
    
    if client:
        try:
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": TRANSACTION_CATEGORIZATION_PROMPT},
                    {"role": "user", "content": f"Categorize this transaction: {description}"}
                ],
                temperature=0.1,
                max_tokens=50
            )
            
            category = response.choices[0].message.content.strip().lower()
            
            # Map to our standard categories
            category_map = {
                'payment processing fees': 'fees',
                'payment fees': 'fees',
                'processing fees': 'fees'
            }
            
            normalized = category_map.get(category, category)
            if normalized not in ['marketing', 'software', 'fees', 'hosting', 'infrastructure', 'other']:
                normalized = 'other'
            
            return normalized
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return categorize_transaction_rule_based(description)
    else:
        return categorize_transaction_rule_based(description)


async def generate_financial_insights(transactions: List[Dict], metrics: Dict[str, Any]) -> Dict[str, Any]:
    """Generate financial insights using AI"""
    client = get_openai_client()
    
    # Prepare financial summary for AI
    summary = f"""
Financial Data Summary:
- Total Income: ${metrics.get('total_income', 0):,.2f}
- Total Expenses: ${metrics.get('total_expenses', 0):,.2f}
- Net Profit: ${metrics.get('net_profit', 0):,.2f}
- Profit Margin: {metrics.get('profit_margin', 0):.1f}%
- MRR (Monthly Recurring Revenue): ${metrics.get('mrr', 0):,.2f}
- Burn Rate: ${metrics.get('burn_rate', 0):,.2f}/month
- Runway: {metrics.get('runway_months', 0)} months

Expense Breakdown:
"""
    
    # Add expense categories
    expense_by_cat = {}
    for t in transactions:
        if t.get('type') == 'expense':
            cat = t.get('category', 'other')
            expense_by_cat[cat] = expense_by_cat.get(cat, 0) + abs(t.get('amount', 0))
    
    for cat, amount in expense_by_cat.items():
        summary += f"- {cat.title()}: ${amount:,.2f}\n"
    
    if client:
        try:
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": FINANCIAL_INSIGHTS_PROMPT},
                    {"role": "user", "content": summary}
                ],
                temperature=0.4,
                max_tokens=1500
            )
            
            return parse_financial_insights(response.choices[0].message.content, metrics)
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return get_mock_financial_insights(metrics)
    else:
        return get_mock_financial_insights(metrics)


async def generate_tax_insights(transactions: List[Dict], total_expenses: float) -> Dict[str, Any]:
    """Generate tax insights using AI"""
    client = get_openai_client()
    
    # Prepare expense summary for AI
    expense_by_cat = {}
    for t in transactions:
        if t.get('type') == 'expense':
            cat = t.get('category', 'other')
            expense_by_cat[cat] = expense_by_cat.get(cat, 0) + abs(t.get('amount', 0))
    
    summary = f"""
Business Expense Summary:
Total Expenses: ${total_expenses:,.2f}

By Category:
"""
    for cat, amount in expense_by_cat.items():
        summary += f"- {cat.title()}: ${amount:,.2f}\n"
    
    if client:
        try:
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": TAX_INSIGHTS_PROMPT},
                    {"role": "user", "content": summary}
                ],
                temperature=0.3,
                max_tokens=1500
            )
            
            return parse_tax_insights(response.choices[0].message.content, expense_by_cat, total_expenses)
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return get_mock_tax_insights(expense_by_cat, total_expenses)
    else:
        return get_mock_tax_insights(expense_by_cat, total_expenses)


# ==================== PARSING FUNCTIONS ====================

def parse_document_analysis(ai_response: str) -> Dict[str, Any]:
    """Parse AI response into structured document analysis"""
    result = {
        "summary": "",
        "key_points": [],
        "risks": [],
        "obligations": [],
        "simple_explanation": "",
        "what_this_means": ""
    }
    
    sections = {
        "## Summary": "summary",
        "## Key Points": "key_points",
        "## Risks": "risks",
        "## Obligations": "obligations",
        "## Simple Explanation": "simple_explanation",
        "## What This Means For You": "what_this_means"
    }
    
    current_section = None
    current_content = []
    
    for line in ai_response.split('\n'):
        line_stripped = line.strip()
        
        # Check if this is a section header
        found_section = False
        for header, key in sections.items():
            if line_stripped.lower().startswith(header.lower().replace('## ', '')):
                # Save previous section
                if current_section:
                    save_section_content(result, current_section, current_content)
                current_section = key
                current_content = []
                found_section = True
                break
        
        if not found_section and current_section:
            current_content.append(line)
    
    # Save last section
    if current_section:
        save_section_content(result, current_section, current_content)
    
    return result


def save_section_content(result: Dict, section: str, content: List[str]):
    """Save content to the appropriate section"""
    text = '\n'.join(content).strip()
    
    if section in ['key_points', 'risks', 'obligations']:
        # Parse as bullet points
        points = []
        for line in content:
            line = line.strip()
            if line.startswith('- ') or line.startswith('* ') or line.startswith('• '):
                points.append(line[2:].strip())
            elif line and not line.startswith('#'):
                points.append(line)
        result[section] = [p for p in points if p]
    else:
        result[section] = text


def parse_financial_insights(ai_response: str, metrics: Dict) -> Dict[str, Any]:
    """Parse AI response into structured financial insights"""
    return {
        "ai_analysis": ai_response,
        "metrics": metrics,
        "generated_by": "ai"
    }


def parse_tax_insights(ai_response: str, expenses_by_cat: Dict, total: float) -> Dict[str, Any]:
    """Parse AI response into structured tax insights"""
    deductions = []
    for cat, amount in expenses_by_cat.items():
        if cat in ['software', 'hosting', 'marketing', 'infrastructure']:
            deductions.append({
                "category": cat,
                "amount": amount,
                "description": f"Business {cat} expenses"
            })
    
    return {
        "ai_analysis": ai_response,
        "deductions": deductions,
        "estimated_taxes": {
            "federal": round(total * 0.22, 2),
            "state": round(total * 0.05, 2),
            "self_employment": round(total * 0.153, 2)
        },
        "total_deductible": sum(d["amount"] for d in deductions),
        "generated_by": "ai"
    }


# ==================== RULE-BASED FALLBACKS ====================

def categorize_transaction_rule_based(description: str) -> str:
    """Rule-based transaction categorization fallback"""
    desc_lower = description.lower()
    
    if any(word in desc_lower for word in ['aws', 'azure', 'google cloud', 'heroku', 'digitalocean', 'vercel', 'netlify']):
        return 'hosting'
    elif any(word in desc_lower for word in ['stripe', 'paypal', 'fee', 'commission', 'processing']):
        return 'fees'
    elif any(word in desc_lower for word in ['ad', 'ads', 'marketing', 'facebook', 'google ads', 'meta', 'tiktok', 'instagram']):
        return 'marketing'
    elif any(word in desc_lower for word in ['software', 'saas', 'subscription', 'notion', 'slack', 'figma', 'adobe']):
        return 'software'
    elif any(word in desc_lower for word in ['server', 'database', 'infrastructure', 'cdn', 'api']):
        return 'infrastructure'
    elif any(word in desc_lower for word in ['refund', 'return', 'chargeback']):
        return 'refunds'
    
    return 'other'


# ==================== MOCK RESPONSES ====================

def get_mock_document_analysis(filename: str) -> Dict[str, Any]:
    """Generate structured mock document analysis"""
    return {
        "summary": f"This document '{filename}' appears to be a business agreement that outlines terms between parties. It contains standard contractual provisions including payment terms, liability clauses, and termination conditions.",
        "key_points": [
            "The agreement establishes a formal relationship between the parties",
            "Payment terms and schedules are clearly defined",
            "Both parties have specific obligations to fulfill",
            "There are conditions under which the agreement can be terminated",
            "Confidentiality requirements are included"
        ],
        "risks": [
            "Auto-renewal clause may result in continued charges if not cancelled in time",
            "Liability cap may limit your ability to recover damages",
            "Jurisdiction clause specifies which state's laws govern disputes",
            "Early termination may incur penalties or fees"
        ],
        "obligations": [
            "Make payments according to the specified schedule",
            "Maintain confidentiality of proprietary information",
            "Provide required notice before termination",
            "Comply with all applicable laws and regulations"
        ],
        "simple_explanation": "This is a standard business contract that creates a formal relationship. You're agreeing to pay for services/products, keep certain information private, and follow specific rules for ending the agreement. The other party has their own responsibilities too.",
        "what_this_means": "Before signing, make sure you understand the payment schedule, what happens if you want to cancel early, and any automatic renewal terms. Mark important dates on your calendar to avoid unexpected charges."
    }


def get_mock_chat_response(message: str, document_name: Optional[str] = None) -> str:
    """Generate structured mock chat response"""
    context_note = f" regarding '{document_name}'" if document_name else ""
    
    return f"""## Answer

Based on your question{context_note}, here's what I found:

Your question about "{message[:50]}..." relates to understanding the key terms and implications. While I don't have the specific document content loaded, I can provide general guidance:

1. **Key Considerations**: Look for sections that define obligations, timelines, and consequences
2. **Important Terms**: Pay attention to definitions, as they set the foundation for understanding
3. **Action Items**: Identify what you need to do and by when

## What This Means For You

To get the most accurate answer, make sure to:
- Upload the specific document you're asking about
- Reference specific sections or clauses in your questions
- Ask follow-up questions if anything is unclear

*Note: Connect your OpenAI API key for detailed, context-aware responses based on your actual documents.*"""


def get_mock_financial_insights(metrics: Dict) -> Dict[str, Any]:
    """Generate structured mock financial insights"""
    profit_margin = metrics.get('profit_margin', 0)
    burn_rate = metrics.get('burn_rate', 0)
    runway = metrics.get('runway_months', 0)
    
    analysis = f"""## Key Insights

- Your profit margin is {profit_margin:.1f}%, {"which is healthy for a growing business" if profit_margin > 20 else "which indicates room for improvement"}
- Monthly burn rate of ${burn_rate:,.2f} gives you approximately {runway} months of runway
- {"Revenue is growing, focus on maintaining efficiency" if profit_margin > 0 else "Focus on increasing revenue or reducing costs"}
- Track your MRR closely to identify growth trends
- Review expense categories monthly for optimization opportunities

## Problems

- {"High burn rate relative to revenue" if runway < 12 else "Monitor cash flow to maintain healthy runway"}
- Ensure you have clear visibility into all expense categories
- {"Profit margins could be improved" if profit_margin < 30 else "Maintain current efficiency levels"}

## Opportunities

- Analyze your highest expense categories for potential savings
- Consider annual subscriptions for frequently used software (often 20% savings)
- Review payment processing fees - some providers offer volume discounts
- Automate expense tracking to catch unnecessary costs early

## Simple Recommendation

{"Focus on increasing revenue while keeping expenses stable to improve your runway." if runway < 18 else "Your finances look stable. Focus on growth opportunities while maintaining your current efficiency."}

## What This Means For You

Your business is {"in a healthy position" if profit_margin > 20 and runway > 12 else "showing areas that need attention"}. The key metrics to watch are your MRR growth rate and burn rate. {"Consider building a 6-month expense reserve for stability." if runway < 12 else "Keep monitoring these metrics monthly to stay on track."}"""
    
    return {
        "ai_analysis": analysis,
        "metrics": metrics,
        "generated_by": "mock"
    }


def get_mock_tax_insights(expenses_by_cat: Dict, total_expenses: float) -> Dict[str, Any]:
    """Generate structured mock tax insights"""
    deductions = []
    for cat, amount in expenses_by_cat.items():
        if cat in ['software', 'hosting', 'marketing', 'infrastructure', 'fees']:
            deductions.append({
                "category": cat,
                "amount": amount,
                "description": f"Business {cat} expenses - potentially deductible"
            })
    
    total_deductible = sum(d["amount"] for d in deductions)
    
    analysis = f"""**Note: This is for informational purposes only and does not constitute official tax advice. Consult a qualified tax professional.**

## Potential Deductions

Based on your expense data, the following categories may be deductible:
{chr(10).join(f"- **{d['category'].title()}**: ${d['amount']:,.2f}" for d in deductions)}

**Total Potentially Deductible**: ${total_deductible:,.2f}

## Estimated Tax Considerations

- **Federal Tax Estimate**: ${total_expenses * 0.22:,.2f} (assuming 22% bracket)
- **State Tax Estimate**: ${total_expenses * 0.05:,.2f} (varies by state)
- **Self-Employment Tax**: ${total_expenses * 0.153:,.2f} (if applicable)

These are rough estimates. Your actual tax liability depends on many factors.

## Optimization Tips

1. **Track Everything**: Keep receipts and records for all business expenses
2. **Home Office**: If you work from home, you may qualify for the home office deduction
3. **Equipment**: Business equipment purchases may be deductible or depreciable
4. **Retirement Contributions**: SEP-IRA or Solo 401(k) contributions reduce taxable income
5. **Quarterly Payments**: Make estimated tax payments to avoid penalties

## Warnings

- Ensure all claimed deductions have proper documentation
- Personal expenses mixed with business expenses can trigger audits
- Large deductions relative to income may attract IRS attention
- State tax rules vary - consult a local professional

## What This Means For You

You have approximately ${total_deductible:,.2f} in potentially deductible business expenses. Proper documentation and categorization of these expenses could reduce your tax liability. Consider working with a tax professional to maximize legitimate deductions while staying compliant."""
    
    return {
        "ai_analysis": analysis,
        "deductions": deductions,
        "estimated_taxes": {
            "federal": round(total_expenses * 0.22, 2),
            "state": round(total_expenses * 0.05, 2),
            "self_employment": round(total_expenses * 0.153, 2)
        },
        "total_deductible": total_deductible,
        "planning_insights": [
            "Consider maximizing retirement contributions to reduce taxable income",
            "Track home office expenses if working from home",
            "Keep records of all business-related travel expenses",
            "Review quarterly to ensure proper expense categorization"
        ],
        "structure_advice": [
            "Consider forming an LLC for liability protection",
            "S-Corp election may reduce self-employment taxes if income is high",
            "Quarterly estimated tax payments can help avoid penalties"
        ],
        "generated_by": "mock"
    }
