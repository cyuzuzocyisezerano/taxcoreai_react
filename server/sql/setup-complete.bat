@echo off
echo ========================================
echo TaxCoreAI Database Setup
echo ========================================
echo.

REM Check if PostgreSQL is running
echo Checking PostgreSQL...
pg_isready >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL is not running!
    echo Please start PostgreSQL and try again.
    pause
    exit /b 1
)
echo ✓ PostgreSQL is running
echo.

REM Run schema setup
echo Creating database tables...
node sql/run-setup.js
if %errorlevel% neq 0 (
    echo ERROR: Failed to create tables
    pause
    exit /b 1
)
echo.

REM Migrate users table
echo Migrating users table...
node sql/migrate-users-table.js
if %errorlevel% neq 0 (
    echo ERROR: Failed to migrate users table
    pause
    exit /b 1
)
echo.

REM Seed users
echo Seeding users...
node sql/seed-users.js
if %errorlevel% neq 0 (
    echo ERROR: Failed to seed users
    pause
    exit /b 1
)
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo You can now:
echo 1. Start the backend: npm run dev
echo 2. Start the frontend: npm run dev (in another terminal)
echo 3. Login with: admin / Admin@123
echo.
pause