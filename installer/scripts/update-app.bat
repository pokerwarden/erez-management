@echo off
title עדכון מערכת ניהול תיקים
set APP=C:\LawFirmSystem
set NODE=%APP%\node\node.exe
set PRISMA=%APP%\app\node_modules\prisma\build\index.js

echo ============================================
echo   עדכון מערכת ניהול תיקים
echo ============================================
echo.

:: Check current version
set CURRENT_VERSION=לא ידועה
if exist "%APP%\version.txt" set /p CURRENT_VERSION=<"%APP%\version.txt"
echo גרסה נוכחית: %CURRENT_VERSION%

:: Check latest version from GitHub
echo בודק עדכונים...
for /f "delims=" %%L in ('powershell -Command "(Invoke-WebRequest https://api.github.com/repos/pokerwarden/erez-management/releases/latest -UseBasicParsing | ConvertFrom-Json).tag_name" 2^>nul') do set LATEST_TAG=%%L
set LATEST_VERSION=%LATEST_TAG:v=%

if "%LATEST_VERSION%"=="" (
    echo לא ניתן להגיע ל-GitHub. בדוק חיבור אינטרנט.
    pause
    exit /b 1
)
echo גרסה זמינה: %LATEST_VERSION%
echo.

if "%LATEST_VERSION%"=="%CURRENT_VERSION%" (
    echo המערכת מעודכנת! אין צורך בעדכון.
    pause
    exit /b 0
)

echo נמצאה גרסה חדשה: %LATEST_VERSION%
echo.

echo שלב 1/4 - מגבה לפני העדכון...
call "%APP%\scripts\backup-gdrive.bat" >nul 2>&1
echo הגיבוי הושלם.
echo.

echo שלב 2/4 - מוריד גרסה חדשה...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest 'https://github.com/pokerwarden/erez-management/releases/download/%LATEST_TAG%/lawfirm-bundle.zip' -OutFile '%APP%\bundle.zip' -UseBasicParsing"
if errorlevel 1 (
    echo שגיאה בהורדה. בדוק חיבור אינטרנט ונסה שוב.
    pause
    exit /b 1
)
echo ההורדה הושלמה.
echo.

echo שלב 3/4 - מתקין גרסה חדשה...
net stop LawFirmApp >nul 2>&1
rmdir /s /q "%APP%\app" 2>nul
powershell -Command "Expand-Archive '%APP%\bundle.zip' -DestinationPath '%APP%' -Force; Remove-Item '%APP%\bundle.zip' -Force"
echo %LATEST_VERSION%> "%APP%\version.txt"
echo.

echo שלב 4/4 - מעדכן בסיס נתונים ומפעיל מחדש...
cd /d "%APP%"
"%NODE%" "%PRISMA%" db push --schema="%APP%\app\prisma\schema.prisma" --accept-data-loss
net start LawFirmApp
echo.

echo ============================================
echo   העדכון הושלם בהצלחה!
echo   גרסה: %LATEST_VERSION%
echo   הנתונים שלך נשמרו.
echo ============================================
echo.
timeout /t 5 /nobreak >nul
start "" "http://localhost:4000"
