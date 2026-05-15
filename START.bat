@echo off
title Erez Law Firm System
cd /d "%~dp0"

echo ================================================
echo   Erez - מערכת ניהול משרד עורכי דין
echo ================================================
echo.

:: Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed.
    echo Download from: https://nodejs.org
    pause
    exit /b 1
)

:: ── Install server dependencies ──────────────────
echo [1/5] Installing server packages...
cd server
call npm install --silent
if errorlevel 1 ( echo ERROR: npm install failed in server && pause && exit /b 1 )

:: ── Copy root .env to server ─────────────────────
copy /Y "..\\.env" ".env" >nul

:: ── Generate Prisma client ────────────────────────
echo [2/5] Setting up database...
call npx prisma generate
call npx prisma migrate deploy
if errorlevel 1 (
    :: migrate deploy needs existing migrations - use db push for first run
    call npx prisma db push --accept-data-loss
)

:: ── Build server ──────────────────────────────────
echo [3/5] Building server...
call npm run build
if errorlevel 1 ( echo ERROR: Server build failed && pause && exit /b 1 )
cd ..

:: ── Install & build client ────────────────────────
echo [4/5] Building frontend...
cd client
call npm install --silent
if errorlevel 1 ( echo ERROR: npm install failed in client && pause && exit /b 1 )
call npm run build
if errorlevel 1 ( echo ERROR: Frontend build failed && pause && exit /b 1 )
cd ..

:: ── Copy frontend build to server/public ─────────
echo [5/5] Deploying frontend...
if not exist "server\public" mkdir "server\public"
xcopy /E /Y /Q "client\dist\*" "server\public\" >nul

:: ── Create uploads dir ────────────────────────────
if not exist "server\uploads" mkdir "server\uploads"

:: ── Start server ──────────────────────────────────
echo.
echo ================================================
echo   המערכת פועלת על: http://localhost:4000
echo ================================================
echo.
echo Press Ctrl+C to stop.
echo.
cd server
node dist/index.js
