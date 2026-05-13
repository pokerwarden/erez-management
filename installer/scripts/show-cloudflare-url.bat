@echo off
title Remote Access URL
set URLFILE=C:\LawFirmSystem\cloudflare-url.txt

if not exist "%URLFILE%" (
    echo Cloudflare tunnel not found. Please wait a minute and try again.
    pause
    exit /b 1
)

set /p URL=<"%URLFILE%"

echo.
echo ================================================
echo   Employee Remote Access URL:
echo.
echo   %URL%
echo.
echo ================================================
echo.
echo Share this URL with your employees.
echo They can connect from any computer on any network.
echo.
echo Press any key to open URL in browser...
pause >nul
start "" "%URL%"
