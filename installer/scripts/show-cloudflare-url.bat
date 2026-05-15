@echo off
chcp 65001 >nul
title כתובת גישה לעובדים

set URL_FILE=C:\LawFirmSystem\cloudflare-url.txt

:wait
if not exist "%URL_FILE%" ( timeout /t 3 /nobreak >nul & goto wait )
for /f "usebackq delims=" %%L in (`powershell -NoProfile -Command "[System.IO.File]::ReadAllText('%URL_FILE%', [System.Text.Encoding]::UTF8).Trim([char]0xFEFF, ' ', [char]13, [char]10)"`) do set CF_URL=%%L
if "%CF_URL%"=="" ( timeout /t 3 /nobreak >nul & goto wait )
if "%CF_URL%"=="Starting tunnel..." ( timeout /t 3 /nobreak >nul & goto wait )
if /i "%CF_URL:~0,5%" neq "https" ( timeout /t 3 /nobreak >nul & goto wait )

echo.
echo ================================================
echo   כתובת גישה לעובדים מרחוק:
echo.
echo   %CF_URL%
echo.
echo ================================================
echo.
echo שתף כתובת זו עם העובדים שלך.
echo הם יוכלו להתחבר מכל מחשב, מכל רשת.
echo.
pause

powershell -NoProfile -Command "Start-Process '%CF_URL%'"
