@echo off
title מתקין Docker Desktop
setlocal

:: ── Check if Docker is already working ──────────────────────────────────────
docker info >nul 2>&1
if not errorlevel 1 (
    echo Docker is already running.
    exit /b 0
)

:: ── Docker Desktop already installed but not running ────────────────────────
if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
    echo Starting Docker Desktop...
    powershell -Command "$d='%APPDATA%\Docker'; New-Item -ItemType Directory -Force -Path $d | Out-Null; '{\"displayedOnboarding\":true,\"licenseTermsVersion\":2,\"analyticsEnabled\":false,\"skipUpdateCheck\":true,\"autoStart\":true}' | Set-Content -Path \"$d\settings.json\" -Encoding UTF8" >nul 2>&1
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    goto :wait_docker
)

:: ── Fresh install ────────────────────────────────────────────────────────────
echo ============================================================
echo   מתקין Docker Desktop - אנא המתן מספר דקות
echo ============================================================
echo.

:: Try winget first (available on Windows 10 2004+ and Windows 11) — much more reliable
where winget >nul 2>&1
if not errorlevel 1 (
    echo שיטה 1: מתקין דרך Windows Package Manager...
    winget install --id Docker.DockerDesktop --silent --accept-package-agreements --accept-source-agreements
    if not errorlevel 1 goto :after_install
    echo winget נכשל, מנסה שיטה חלופית...
)

:: Fallback: download installer via PowerShell (more reliable than curl on old Windows)
echo שיטה 2: מוריד Docker Desktop ישירות...
powershell -Command "Write-Host 'מוריד... (כ-500MB, אנא המתן)'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest 'https://desktop.docker.com/win/main/amd64/Docker Desktop Installer.exe' -OutFile '%TEMP%\DockerInstaller.exe' -UseBasicParsing"
if not exist "%TEMP%\DockerInstaller.exe" (
    echo.
    echo שגיאה: ההורדה נכשלה. בדוק חיבור אינטרנט.
    pause
    exit /b 1
)

echo מתקין Docker Desktop...
"%TEMP%\DockerInstaller.exe" install --quiet --accept-license --backend=wsl-2
set DOCKER_EXIT=%ERRORLEVEL%
del "%TEMP%\DockerInstaller.exe" >nul 2>&1

if %DOCKER_EXIT% neq 0 (
    echo.
    echo ============================================================
    echo   שגיאה בהתקנת Docker Desktop
    echo   קוד שגיאה: %DOCKER_EXIT%
    echo.
    echo   פתרון: הורד והתקן Docker Desktop ידנית מ:
    echo   https://www.docker.com/products/docker-desktop/
    echo   לאחר ההתקנה - הפעל מחדש את המחשב
    echo   ואז הרץ את המתקין שוב.
    echo ============================================================
    pause
    exit /b 1
)

:after_install
:: Write settings to skip onboarding/login
powershell -Command "$d='%APPDATA%\Docker'; New-Item -ItemType Directory -Force -Path $d | Out-Null; '{\"displayedOnboarding\":true,\"licenseTermsVersion\":2,\"analyticsEnabled\":false,\"skipUpdateCheck\":true,\"autoStart\":true}' | Set-Content -Path \"$d\settings.json\" -Encoding UTF8" >nul 2>&1

:: Check if reboot is needed (Docker sets a pending reboot flag)
reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager" /v PendingFileRenameOperations >nul 2>&1
if not errorlevel 1 (
    echo.
    echo ============================================================
    echo   נדרשת הפעלה מחדש של המחשב!
    echo.
    echo   Docker Desktop הותקן בהצלחה.
    echo   יש להפעיל מחדש את המחשב ואז
    echo   לפתוח את "ניהול תיקים" משולחן העבודה.
    echo ============================================================
    pause
    :: Signal to Inno Setup that a reboot is needed
    exit /b 2
)

:: Start Docker Desktop
echo מפעיל Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

:wait_docker
echo ממתין ל-Docker (עד 3 דקות)...
set /a tries=0
:loop
timeout /t 5 /nobreak >nul
docker info >nul 2>&1
if not errorlevel 1 (
    echo Docker מוכן!
    exit /b 0
)
set /a tries+=1
:: Show progress every 30 seconds
set /a mod=%tries% %% 6
if %mod%==0 echo   עוד מעט... ^(%tries%/36^)
if %tries% lss 36 goto :loop

echo.
echo ============================================================
echo   Docker לא הגיב תוך 3 דקות.
echo   נסה להפעיל מחדש את המחשב.
echo   אם הבעיה נמשכת - פנה לתמיכה.
echo ============================================================
pause
exit /b 1
