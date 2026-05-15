@echo off
title פותח מערכת ניהול תיקים

:: Start service if not running
net start LawFirmApp >nul 2>&1

:: Wait for app to respond (up to 2 minutes)
set /a i=0
:wait_app
timeout /t 3 /nobreak >nul
curl -s http://localhost:4000/api/health >nul 2>&1
if not errorlevel 1 goto :ready
set /a i+=1
if %i% lss 40 goto :wait_app
echo שגיאה: המערכת לא הגיבה. אנא פנה לתמיכה.
pause
exit /b 1

:ready
start "" "http://localhost:4000"
