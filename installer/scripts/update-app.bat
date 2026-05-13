@echo off
title עדכון מערכת ניהול תיקים
cd /d "C:\LawFirmSystem"

echo ============================================
echo   עדכון מערכת ניהול תיקים
echo ============================================
echo.

:: Check current version from running app
echo בודק גרסה נוכחית...
set CURRENT_VERSION=לא ידועה
for /f "usebackq delims=" %%V in (`curl -s http://localhost:4000/api/version 2^>nul`) do (
    for /f "tokens=2 delims=:}" %%A in ("%%V") do (
        set RAW=%%A
        setlocal enabledelayedexpansion
        set CURRENT_VERSION=!RAW:"=!
        endlocal & set CURRENT_VERSION=%CURRENT_VERSION: =%
    )
)
echo גרסה נוכחית: %CURRENT_VERSION%

:: Check latest version from GitHub
echo בודק עדכונים ב-GitHub...
set LATEST_VERSION=
for /f "usebackq delims=" %%L in (`curl -s https://api.github.com/repos/pokerwarden/erez-management/releases/latest 2^>nul ^| findstr "tag_name"`) do (
    for /f "tokens=2 delims=:}" %%A in ("%%L") do (
        set RAW=%%A
        setlocal enabledelayedexpansion
        set LATEST_VERSION=!RAW:"=!
        set LATEST_VERSION=!LATEST_VERSION: =!
        set LATEST_VERSION=!LATEST_VERSION:v=!
        endlocal & set LATEST_VERSION=%LATEST_VERSION%
    )
)

if "%LATEST_VERSION%"=="" (
    echo לא ניתן לבדוק עדכונים. ממשיך בעדכון ידני...
    goto :do_update
)

echo גרסה זמינה:  %LATEST_VERSION%
echo גרסה נוכחית: %CURRENT_VERSION%
echo.

if "%LATEST_VERSION%"=="%CURRENT_VERSION%" (
    echo המערכת מעודכנת! אין צורך בעדכון.
    echo.
    pause
    exit /b 0
)

echo נמצאה גרסה חדשה: %LATEST_VERSION%
echo.

:do_update
:: Backup before update
echo שלב 1/3 - מבצע גיבוי לפני העדכון...
call "C:\LawFirmSystem\scripts\backup-gdrive.bat" >nul 2>&1
if errorlevel 1 (
    echo אזהרה: הגיבוי נכשל. האם להמשיך בעדכון?
    choice /c YN /m "המשך ללא גיבוי"
    if errorlevel 2 exit /b 1
)
echo הגיבוי הושלם.
echo.

:: Pull new image from Docker Hub
echo שלב 2/3 - מוריד גרסה חדשה מ-Docker Hub...
docker compose pull
if errorlevel 1 (
    echo.
    echo שגיאה: לא ניתן להוריד את הגרסה החדשה.
    echo בדוק שיש חיבור לאינטרנט ונסה שוב.
    pause
    exit /b 1
)
echo ההורדה הושלמה.
echo.

:: Restart with new image
echo שלב 3/3 - מפעיל מחדש עם הגרסה החדשה...
docker compose up -d
if errorlevel 1 (
    echo שגיאה בהפעלת המערכת. בדוק את Docker Desktop.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   העדכון הושלם בהצלחה!
echo   גרסה: %LATEST_VERSION%
echo   הנתונים שלך נשמרו.
echo ============================================
echo.
timeout /t 5 /nobreak >nul
start "" "http://localhost:4000"
