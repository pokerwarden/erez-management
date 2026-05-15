@echo off
title אתחול מסד נתונים
set APP=C:\LawFirmSystem
set NODE=%APP%\node\node.exe
set PRISMA=%APP%\app\node_modules\prisma\build\index.js

echo ============================================
echo   מאתחל מסד נתונים...
echo ============================================

:: Load DATABASE_URL from .env
for /f "usebackq tokens=1,* delims==" %%A in ("%APP%\.env") do (
    if "%%A"=="DATABASE_URL" set DATABASE_URL=%%B
)

if "%DATABASE_URL%"=="" (
    echo ERROR: DATABASE_URL not found in .env
    pause
    exit /b 1
)

set DATABASE_URL=%DATABASE_URL%

:: Run prisma db push (creates/updates SQLite schema)
cd /d "%APP%"
"%NODE%" "%PRISMA%" db push --schema="%APP%\app\prisma\schema.prisma" --accept-data-loss
if errorlevel 1 (
    echo ERROR: Database initialization failed.
    pause
    exit /b 1
)

echo [OK] Database ready.
