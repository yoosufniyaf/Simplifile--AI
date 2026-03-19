# Simplifile AI - Product Requirements Document

## Original Problem Statement
Build a SaaS web application called "Simplifile AI" - an AI-powered platform that helps online business owners:
1. Understand legal documents in simple terms
2. Automate bookkeeping
3. Automatically generate financial statements using AI

## User Personas
1. **Online Business Owner** - Solopreneurs running e-commerce, SaaS, or service businesses who need simplified legal/financial management
2. **E-commerce Seller** - Shopify/Stripe users who need automated bookkeeping and transaction categorization
3. **SaaS Founder** - Needs MRR tracking, burn rate analysis, and financial statements

## Core Requirements (Static)
- 3 subscription tiers: Basic ($9.99), Premium ($29.99), Enterprise ($49.99)
- Monthly/Annual billing (25% discount on annual)
- 3-day free trial for all plans
- JWT-based authentication
- MongoDB for data storage
- Dark mode UI design

## What's Been Implemented (January 2026)

### Backend (FastAPI)
- [x] User authentication (register, login, JWT tokens)
- [x] Subscription management endpoints (mocked for Whop)
- [x] Document upload and AI analysis (mocked OpenAI GPT-4o)
- [x] AI Chat with document context (mocked)
- [x] Bookkeeping: transaction CRUD, CSV import, auto-categorization
- [x] Financial reports: P&L, Balance Sheet, Cash Flow
- [x] Integration management: Shopify, Stripe, PayPal, Whop (mocked)
- [x] Tax insights analysis (mocked)
- [x] Dashboard stats endpoint
- [x] Plan-based access control

### Frontend (React + Tailwind + Shadcn)
- [x] Landing page with hero, features, testimonials
- [x] Pricing page with monthly/annual toggle, 3-day trial text
- [x] Authentication pages (login, register)
- [x] Dashboard with stats and quick actions
- [x] Documents page with upload, analyze, view analysis
- [x] AI Chat page with document context selection
- [x] Bookkeeping page with transaction table, CSV import, add/edit
- [x] Reports page with P&L, Balance Sheet, Cash Flow tabs
- [x] Integrations page with connect/sync functionality
- [x] Tax Insights page with deductions and planning
- [x] Settings page with profile and subscription management
- [x] Protected routes with plan-based access control

### Design
- [x] Dark mode (Fintech aesthetic)
- [x] Outfit font for headings, Inter for body
- [x] Primary color: Indigo (#6366f1)
- [x] Glass-morphism nav, card hover effects
- [x] Responsive sidebar layout

## Mocked Integrations (To Be Connected)
- OpenAI GPT-4o (placeholder API key)
- Whop subscription management
- Shopify, Stripe, PayPal, Whop platform integrations

## Prioritized Backlog

### P0 - Critical (Blocking)
- [ ] Connect real OpenAI API key for document analysis
- [ ] Integrate Whop for subscription/billing

### P1 - High Priority
- [ ] PDF text extraction for document analysis
- [ ] Image OCR for receipt scanning
- [ ] Excel/XLSX parsing for bookkeeping import
- [ ] Real-time chat streaming

### P2 - Medium Priority
- [ ] Export reports to PDF/CSV
- [ ] Connect real platform APIs (Shopify, Stripe, PayPal)
- [ ] Two-factor authentication
- [ ] Password change functionality

### P3 - Nice to Have
- [ ] Dark/Light mode toggle
- [ ] Mobile-optimized views
- [ ] Email notifications for trial expiry
- [ ] QuickBooks/Xero export format

## Next Tasks
1. User to provide OpenAI API key for real AI responses
2. User to provide Whop API credentials for subscription
3. Add PDF text extraction using PyPDF2
4. Implement real-time streaming for chat responses
5. Add export functionality for reports
