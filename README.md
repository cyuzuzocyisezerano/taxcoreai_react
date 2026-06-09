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

## Environment

Copy `server/.env.example` to `server/.env` and set:

- `PORT` — API port (default 3001)
- `JWT_SECRET` — signing key for tokens
- `CLIENT_URL` — frontend origin for CORS (default `http://localhost:5173`)
