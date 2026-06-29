# TaxCoreAI - Complete Setup Guide

## Prerequisites
Before you begin, ensure you have installed:
- **Node.js** (v18 or higher) - Download from https://nodejs.org/
- **PostgreSQL** (v12 or higher) - Download from https://www.postgresql.org/download/
- **Git** (optional) - For cloning the repository

## The Problem
If you see "Not found" or no data displaying, it's usually because:
1. PostgreSQL is not running
2. Database tables are empty (missing seed data)
3. Backend or frontend servers are not running

## Solution - Complete Setup Steps

### Step 1: Install Dependencies
Open Command Prompt or PowerShell and run:

```cmd
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

### Step 2: Start PostgreSQL
Make sure PostgreSQL service is running:
- **Windows**: Open Services and start "PostgreSQL" service
- **Mac**: `brew services start postgresql`
- **Linux**: `sudo systemctl start postgresql`

### Step 3: Create Database
Open PostgreSQL command line (psql) and run:
```sql
CREATE DATABASE taxcoreai;
```

Or use pgAdmin/Adminer to create the database named `taxcoreai`.

### Step 4: Configure Database Connection
Edit `server/.env` file and update the DATABASE_URL if needed:
```
DATABASE_URL=postgres://postgres:YourPassword@localhost:5432/taxcoreai
```
Replace `YourPassword` with your actual PostgreSQL password.

### Step 5: Setup Database Schema
Run the SQL setup script to create all tables:
```cmd
cd server
node sql/run-setup.js
```

You should see: "✅ Database setup completed successfully!"

### Step 6: Seed Database with Sample Data
**IMPORTANT**: This step populates the database with sample data (users, taxpayers, documents):
```cmd
cd server
node sql/seed-base-data.js
```

You should see:
- ✓ Created 4 users
- ✓ Created 6 taxpayers
- ✓ Created 6 documents
- ✅ Base data seeded successfully!

### Step 7: Start Backend Server
In the same terminal:
```cmd
cd server
npm run dev
```

You should see:
- "✅ PostgreSQL connected successfully"
- "Server running on port 3001"

**Keep this terminal running!**

### Step 8: Start Frontend (New Terminal)
Open a **NEW** terminal window:
```cmd
cd C:\Users\samcy\taxcoreai
npm run dev
```

You should see: "Local: http://localhost:5173"

**Keep this terminal running too!**

### Step 9: Access the Application
Open your browser and go to: **http://localhost:5173**

## Login Credentials
Use these credentials to login:
- **Admin**: username `admin` / password `Admin@123`
- **Supervisor**: username `supervisor` / password `Supervisor@123`
- **Officer**: username `officer` / password `Officer@123`
- **Auditor**: username `auditor` / password `Auditor@123`

## Troubleshooting

### "Not found" error on login page
- Ensure backend server is running on port 3001
- Check terminal for "✅ PostgreSQL connected successfully"
- Verify frontend is running on port 5173

### No data displaying on dashboard
- **This is the most common issue!** You skipped Step 6
- Run: `cd server && node sql/seed-base-data.js`
- This populates the database with sample data

### PostgreSQL connection failed
- Ensure PostgreSQL is running
- Check your password in `server/.env` DATABASE_URL
- Verify database `taxcoreai` exists

### Port already in use
- Backend uses port 3001
- Frontend uses port 5173
- Change ports in `server/.env` (PORT) or stop conflicting services

### Tables don't exist
- Run Step 5 again: `cd server && node sql/run-setup.js`

## Quick Verification
After completing all steps, verify everything works:

1. **Backend health check**: http://localhost:3001/api/health
   - Should return: `{"status":"ok"}`

2. **Login test**: http://localhost:5173
   - Should show login page
   - Login with admin / Admin@123

3. **Dashboard data**: After login, you should see:
   - Total Taxpayers: 6
   - Total Documents: 6
   - Recent Taxpayers table with data
   - Activity feed with entries

## Project Structure
```
taxcoreai/
├── server/                 # Backend (Node.js/Express)
│   ├── .env               # Database credentials
│   ├── sql/               # Database scripts
│   │   ├── setup.sql      # Table definitions
│   │   ├── run-setup.js   # Creates tables
│   │   └── seed-base-data.js  # Populates sample data
│   └── src/               # Server source code
├── src/                   # Frontend (React/TypeScript)
│   ├── pages/            # Page components
│   ├── components/       # Reusable components
│   └── lib/              # API client
└── package.json          # Root dependencies
```

## Need Help?
If you encounter issues:
1. Check that all terminals are running (backend + frontend)
2. Verify PostgreSQL is running
3. Ensure you completed ALL steps including Step 6 (seeding data)
4. Check browser console (F12) for errors
5. Check terminal outputs for error messages
