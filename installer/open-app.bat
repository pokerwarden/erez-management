@echo off
cd /d "C:\LawFirmSystem"
docker compose up -d >nul 2>&1
timeout /t 3 /nobreak >nul
start "" "http://localhost:4000"
