@echo off
title Docker Build and Deploy

cd /d "%~dp0"
echo ============================================
echo   Law Firm System - Docker Build & Deploy
echo ============================================
echo.

echo Checking Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo Docker is running.
echo.
echo Building Docker image (this may take several minutes)...
docker build -t lawfirm-system:latest .
if errorlevel 1 (
    echo ERROR: Docker build failed!
    pause
    exit /b 1
)

:: Tag with full name so docker-compose finds it locally (no internet needed)
docker tag lawfirm-system:latest pokerwarden/lawfirm-system:latest

echo.
echo Build successful!
echo.

if not exist .env (
    echo Creating .env from .env.example...
    copy .env.example .env
    echo.
    echo IMPORTANT: Edit .env and set your passwords before continuing!
    notepad .env
    echo.
    pause
)

echo Starting services with Docker Compose...
docker compose up -d
if errorlevel 1 (
    echo ERROR: docker compose up failed!
    pause
    exit /b 1
)

echo.
echo Waiting for app to start...
:wait_loop
timeout /t 3 /nobreak >nul
curl -s http://localhost:4000/api/health >nul 2>&1
if errorlevel 1 goto wait_loop

echo.
echo ============================================
echo   Done! Open http://localhost:4000
echo   n8n:  http://localhost:5678
echo ============================================
echo.
start http://localhost:4000
pause
