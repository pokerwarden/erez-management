@echo off
title Presentation Mode
cd /d "%~dp0"

echo ============================================
echo   Law Firm System - Presentation Mode
echo ============================================
echo.

:: Check Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker Desktop is not running.
    echo Please open Docker Desktop and wait for it to fully start, then try again.
    echo.
    pause
    exit /b 1
)

:: Check if image exists
docker image inspect lawfirm-system:latest >nul 2>&1
if errorlevel 1 (
    echo The app image is not built yet.
    echo Please run DOCKER-BUILD-AND-DEPLOY.bat first ^(only needed once^).
    echo.
    pause
    exit /b 1
)

:: Check if .env exists, create from example if not
if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env >nul
)

:: Start containers
echo Starting containers...
docker compose up -d
if errorlevel 1 (
    echo.
    echo ERROR: Failed to start containers. Check the error above.
    pause
    exit /b 1
)

:: Wait with countdown
echo.
set /a tries=0
:wait
set /a tries+=1
if %tries% gtr 30 (
    echo.
    echo ERROR: App did not respond after 60 seconds.
    echo Check logs with: docker compose logs app
    pause
    exit /b 1
)
curl -s http://localhost:4000/api/health >nul 2>&1
if errorlevel 1 (
    set /p dummy="Waiting... [%tries%/30]" <nul
    echo.
    timeout /t 2 /nobreak >nul
    goto wait
)

echo.
echo Ready! Opening browser...
timeout /t 1 /nobreak >nul
start "" "http://localhost:4000"
exit
