# ACM Shark Tank — Event Operations Platform

A complete, production-grade event operations platform built with **Next.js, FastAPI, and PostgreSQL (with native Neon DB serverless compatibility)**.

---

## Architecture Overview

* **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, QR Code generation & AirDrop-style radar animations.
* **Backend**: FastAPI, SQLAlchemy 2.0 (async), Asyncpg, Pydantic v2, PyJWT, WebSockets.
* **Database**: PostgreSQL / Neon DB (Auto-detects SSL and pooling args from `DATABASE_URL`).
* **Authentication**: HTTP-only session cookies for web portals, Bearer JWT for API/mobile clients.
* **State Engines**:
  * 4-Tier Ticket Engine: `TicketType` $\rightarrow$ `TeamTicketAllocation` $\rightarrow$ `TicketEntitlement` $\rightarrow$ `TicketRedemption`.
  * Optimistic Concurrency Stage State Machine with WebSocket real-time push.
  * Checkpoint Scanner with duplicate redemption prevention via row-level locking (`SELECT ... FOR UPDATE`).

---

## Quick Start Guide

### 1. Configure Database & `.env`
In the root directory, `.env` is loaded automatically by the backend:
```env
# Paste either your local PostgreSQL URL or Neon DB URL:
DATABASE_URL=postgresql://neondb_owner:password@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=super_secret_acm_shark_tank_key_change_in_production_2026
ENVIRONMENT=development
```
* **Neon DB Compatibility Note:** Neon DB serverless SSL (`sslmode=require`) is detected and sanitized automatically for asyncpg with connection recycling enabled.

### 2. Run Backend (FastAPI)
From your terminal / WSL environment:
```bash
# Activate virtual environment
source venv/bin/activate

# Seed baseline and demo event data (if desired)
python backend/seed_demo_event.py

# Launch FastAPI server
cd backend
uvicorn app.main:app --reload --port 8000
```
* **Swagger Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

### 3. Run Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
* Access the portal locally at `http://localhost:3000` or via your GitHub Codespaces forwarded URL.

---

## Demo Accounts & Portals

| Role | Email / ID | Password | Portal Route | Primary Features |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin@acmsharktank.org` | `admin123` | `/admin/dashboard` | Event cockpit, CSV participant import, teams, ticket issuance, live stage sequence controller, audit logs. |
| **Volunteer** | `volunteer@acmsharktank.org` | `volunteer123` | `/volunteer/dashboard` | Checkpoint pass validator (AirDrop BLE & QR fallback), assigned task manager, team-wise history inspection. |
| **Participant** | `ACM-001` or `aarav@example.com` | `participant123` | `/participant/dashboard` | Live stage status, pass entitlements, AirDrop pulsing radar & dynamic QR presentation, personal redemption log. |
