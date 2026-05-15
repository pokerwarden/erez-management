@echo off
title כתובת גישה מרחוק
set URLFILE=C:\LawFirmSystem\cloudflare-url.txt

if not exist "%URLFILE%" (
    echo Cloudflare tunnel not found. Please wait a minute and try again.
    pause
    exit /b 1
)

:: Read URL via PowerShell to avoid BOM/RTL issues
for /f "usebackq delims=" %%U in (`powershell -Command "[System.IO.File]::ReadAllText('%URLFILE%').Trim()"`) do set URL=%%U

echo.
echo ================================================
echo   כתובת גישה לעובדים מרחוק:
echo.
echo   %URL%
echo.
echo ================================================
echo.
echo שתף קישור זה עם העובדים שלך.
echo הם יוכלו להתחבר מכל מחשב, מכל רשת.
echo.
echo לחץ על מקש כלשהו לפתיחה בדפדפן...
pause >nul

:: Open URL via PowerShell to avoid Windows RTL parsing issues
powershell -Command "Start-Process '%URL%'"
