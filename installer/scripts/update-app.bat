@echo off
title עדכון מערכת
cd /d "C:\LawFirmSystem"

echo ============================================
echo   עדכון מערכת ניהול תיקים
echo ============================================
echo.

:: Backup before update
echo מבצע גיבוי לפני העדכון...
call "C:\LawFirmSystem\scripts\backup-gdrive.bat"
echo.

:: Pull new image
echo מוריד גרסה חדשה...
docker compose pull
if errorlevel 1 (
    echo שגיאה בהורדת הגרסה החדשה.
    pause
    exit /b 1
)

:: Restart with new image
echo מפעיל מחדש...
docker compose up -d

echo.
echo ============================================
echo   העדכון הושלם בהצלחה!
echo   הנתונים שלך נשמרו.
echo ============================================
timeout /t 3 /nobreak >nul
start "" "http://localhost:4000"
