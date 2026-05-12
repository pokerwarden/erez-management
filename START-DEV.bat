@echo off
title Start Dev Environment
echo ============================================
echo   Law Firm System - Starting Dev Mode
echo ============================================
echo.
echo Opening Server window...
start "Server - Dev" cmd /k "cd /d "%~dp0server" && npm install && npx prisma generate && npm run dev"

timeout /t 3 /nobreak >nul

echo Opening Client window...
start "Client - Dev" cmd /k "cd /d "%~dp0client" && npm install && npm run dev"

echo.
echo Both windows are starting...
echo   Server: http://localhost:4000
echo   Client: http://localhost:5173  (proxies to server)
echo.
echo You can close this window.
timeout /t 5 /nobreak >nul
