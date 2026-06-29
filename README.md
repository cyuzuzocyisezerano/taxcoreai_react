# TaxCoreAI

Intelligent Taxpayer Records Management System for Rwanda Revenue Authority — React frontend + Node.js API.

## Quick start

**Terminal 1 — API (port 3001):**

```powershell
cd C:\Users\samcy\taxcoreai\server
copy .env.example .env
npm install
npm run dev
```

**Terminal 2 — Frontend (port 5173):**

```powershell
cd C:\Users\samcy\taxcoreai
npm install
npm run dev
```

**Or run both together from the project root:**

```powershell
cd C:\Users\samcy\taxcoreai
npm install
cd server; npm install; cd ..
npm run dev:all
```

Open `http://localhost:5173/` and sign in with:

| Username | Password    | Role    |
|----------|-------------|---------|
| `admin`  | `Admin@123` | Admin   |
| `officer`| `Officer@123` | Officer |

## API overview

Base URL: `http://localhost:3001` (proxied as `/api` in dev)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/auth/login` | Sign in → JWT |
| GET | `/api/auth/me` | Current user (Bearer token) |
| POST | `/api/auth/logout` | Sign out + audit log |
| GET | `/api/dashboard/stats` | Dashboard counts |
| GET | `/api/dashboard/recent-taxpayers` | Recent taxpayers |
| GET | `/api/taxpayers` | List/search taxpayers |
| POST | `/api/taxpayers` | Register taxpayer |
| GET | `/api/documents` | List documents |
| GET | `/api/audit-logs` | Audit trail |

Protected routes require header: `Authorization: Bearer <token>`

## Project structure

```
taxcoreai/
├── src/                 # React app
├── server/
│   ├── src/
│   │   ├── routes/      # Express routes
│   │   ├── middleware/  # JWT auth
│   │   ├── data/        # JSON store (db.json)
│   │   └── services/    # Audit logging
│   └── .env.example
└── package.json
```

Data is stored in `server/src/data/db.json` (created on first run from seed data).

## Core modules implemented

This project implements the TaxCoreAI modules described in the system design:

- **User & Role Management Module**
  - Authentication and session management via JWT
  - Role-based access control using `src/lib/permissions.ts` and backend `server/src/middleware/authorize.js`
  - Role-specific dashboards for Admin, Officer, Auditor, and Supervisor
- **Taxpayer Registration & Profile Module**
  - Taxpayer list, search, and detail routes under `/api/taxpayers`
  - Taxpayer registration flow and profile metadata in the React frontend
- **Document Management Module**
  - Document listing, upload, retrieval, and secure file handling under `/api/documents`
  - Metadata support for document type, taxpayer TIN, upload timestamp, and title
- **Records Indexing & Search Module**
  - Search endpoint at `/api/search`
  - Search UI in `src/pages/SearchRetrieval.tsx`
  - Fast record retrieval across taxpayers and documents using indexed query filters
- **Workflow & Records Processing Module**
  - Workflow listing under `/api/workflows`
  - Workflow dashboard UI for review and approval tracking
- **Notification & Alert Module**
  - Notification endpoint `/api/notifications`
  - Notification page and sidebar access
- **Monitoring & Control Dashboard**
  - Admin, Auditor, and Supervisor dashboards with system performance and counts
  - Dashboard stats API under `/api/dashboard/stats`
- **Reporting & Analytics Module**
  - Reports endpoint `/api/reports`
  - Analytics dashboard in the frontend
- **Audit & Compliance Module**
  - Audit log endpoint `/api/audit-logs`
  - Audit trail logging for data changes and permission denials
- **Security & Data Protection Module**
  - Secure API routes with JWT auth and RBAC
  - File upload validation and role-aware access enforcement

## Environment

Copy `server/.env.example` to `server/.env` and set:

- `PORT` — API port (default 3001)
- `JWT_SECRET` — signing key for tokens
- `CLIENT_URL` — frontend origin for CORS (default `http://localhost:5173`)
