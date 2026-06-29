# TaxCoreAI Authentication - Quick Setup Guide

## The Problem
The login page shows "Not found" because the backend server is not running.

## Solution - Follow These Steps:

### Step 1: Start PostgreSQL
Make sure PostgreSQL is running on your system.

### Step 2: Setup Database (First Time Only)
Open Command Prompt and run:
```cmd
cd server
npm run migrate:users
npm run seed:users
```

### Step 3: Start Backend Server
In the same terminal:
```cmd
cd server
npm run dev
```
You should see: "✅ PostgreSQL connected successfully" and "Server running on port 3001"

### Step 4: Start Frontend (New Terminal)
Open a NEW terminal window:
```cmd
cd C:\Users\samcy\taxcoreai
npm run dev
```
You should see: "Local: http://localhost:5173"

### Step 5: Test Login
Go to http://localhost:5173 and login with:
- **Admin**: admin / Admin@123
- **Supervisor**: supervisor / Supervisor@123
- **Officer**: officer / Officer@123
- **Auditor**: auditor / Auditor@123

## If You Get "Not Found" Error:
This means the backend is not running. Make sure:
1. PostgreSQL is running
2. Backend server is running on port 3001
3. Frontend is running on port 5173

## Quick Test:
Open browser and go to: http://localhost:3001/api/auth/login
Should show: {"error":"Username and password are required"}

If you see this, the backend is working!