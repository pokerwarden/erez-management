@echo off
title עדכון מערכת ניהול תיקים
cd /d "C:\LawFirmSystem"

echo ============================================
echo   עדכון מערכת ניהול תיקים
echo ============================================
echo.

:: Check current version
set CURRENT_VERSION=לא ידועה
for /f "delims=" %%V in ('curl -s http://localhost:4000/api/version 2^>nul') do set RAW=%%V
for /f "tokens=2 delims=:}" %%A in ("%RAW%") do set CURRENT_VERSION=%%A
set CURRENT_VERSION=%CURRENT_VERSION:"=%
set CURRENT_VERSION=%CURRENT_VERSION: =%
echo גרסה נוכחית: %CURRENT_VERSION%

:: Check latest version from GitHub
echo בודק עדכונים ב-GitHub...
for /f "delims=" %%L in ('curl -s https://api.github.com/repos/pokerwarden/erez-management/releases/latest 2^>nul ^| findstr "tag_name"') do set TAGLINE=%%L
for /f "tokens=2 delims=:}" %%A in ("%TAGLINE%") do set LATEST_TAG=%%A
set LATEST_TAG=%LATEST_TAG:"=%
set LATEST_TAG=%LATEST_TAG: =%
set LATEST_TAG=%LATEST_TAG:,=%
set LATEST_VERSION=%LATEST_TAG:v=%

if "%LATEST_VERSION%"=="" (
    echo לא ניתן להגיע ל-GitHub. בדוק חיבור אינטרנט.
    pause
    exit /b 1
)

echo גרסה זמינה:  %LATEST_VERSION%
echo.

if "%LATEST_VERSION%"=="%CURRENT_VERSION%" (
    echo המערכת מעודכנת! אין צורך בעדכון.
    pause
    exit /b 0
)

echo נמצאה גרסה חדשה: %LATEST_VERSION%
echo.

:: Backup before update
echo שלב 1/4 - מגבה לפני העדכון...
call "C:\LawFirmSystem\scripts\backup-gdrive.bat" >nul 2>&1
echo הגיבוי הושלם.
echo.

:: Download new image from GitHub Release
echo שלב 2/4 - מוריד גרסה חדשה מ-GitHub...
curl -L -o "C:\LawFirmSystem\lawfirm-system.tar.gz" "https://github.com/pokerwarden/erez-management/releases/download/%LATEST_TAG%/lawfirm-system.tar.gz" --progress-bar
if errorlevel 1 (
    echo שגיאה בהורדה. בדוק חיבור אינטרנט ונסה שוב.
    pause
    exit /b 1
)
echo ההורדה הושלמה.
echo.

:: Load new image into Docker
echo שלב 3/4 - טוען גרסה חדשה ל-Docker...
docker load -i "C:\LawFirmSystem\lawfirm-system.tar.gz"
if errorlevel 1 (
    echo שגיאה בטעינת הגרסה.
    pause
    exit /b 1
)
del "C:\LawFirmSystem\lawfirm-system.tar.gz" >nul 2>&1
echo.

:: Restart with new image
echo שלב 4/4 - מפעיל מחדש...
docker compose up -d
echo.

echo ============================================
echo   העדכון הושלם בהצלחה!
echo   גרסה: %LATEST_VERSION%
echo   הנתונים שלך נשמרו.
echo ============================================
echo.
timeout /t 5 /nobreak >nul
start "" "http://localhost:4000"
