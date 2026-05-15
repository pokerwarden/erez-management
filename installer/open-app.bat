@echo off
title פותח מערכת ניהול תיקים
cd /d "C:\LawFirmSystem"

:: Make sure Docker Desktop is running
docker info >nul 2>&1
if errorlevel 1 (
    echo מפעיל Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    :wait_d
    timeout /t 5 /nobreak >nul
    docker info >nul 2>&1
    if errorlevel 1 goto :wait_d
)

:: Start containers
docker compose up -d >nul 2>&1

:: Wait for app to respond (up to 2 minutes)
set /a i=0
:wait_app
timeout /t 3 /nobreak >nul
curl -s http://localhost:4000/api/health >nul 2>&1
if not errorlevel 1 goto :ready
set /a i+=1
if %i% lss 40 goto :wait_app
echo שגיאה: המערכת לא הגיבה. פתח Docker Desktop ונסה שוב.
pause
exit /b 1

:ready
start "" "http://localhost:4000"
