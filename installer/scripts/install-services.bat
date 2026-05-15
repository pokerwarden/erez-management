@echo off
:: Register LawFirmApp as a Windows service via NSSM
:: Runs automatically on boot, no Docker needed

set APP=C:\LawFirmSystem
set NSSM=%APP%\nssm.exe
set NODE=%APP%\node\node.exe
set SVC=LawFirmApp

echo Installing LawFirmApp Windows service...

:: Remove existing service if present (clean reinstall)
"%NSSM%" stop %SVC% 2>nul
"%NSSM%" remove %SVC% confirm 2>nul

:: Install service
"%NSSM%" install %SVC% "%NODE%" "app\dist\index.js"
if errorlevel 1 (
    echo ERROR: Failed to install service.
    exit /b 1
)

:: Configure service
"%NSSM%" set %SVC% AppDirectory   "%APP%"
"%NSSM%" set %SVC% DisplayName    "Law Firm Case Management"
"%NSSM%" set %SVC% Description    "מערכת ניהול תיקים - Law Firm System"
"%NSSM%" set %SVC% Start          SERVICE_AUTO_START
"%NSSM%" set %SVC% ObjectName     LocalSystem
"%NSSM%" set %SVC% AppStdout      "%APP%\logs\app.log"
"%NSSM%" set %SVC% AppStderr      "%APP%\logs\app-error.log"
"%NSSM%" set %SVC% AppRotateFiles 1
"%NSSM%" set %SVC% AppRotateBytes 5242880

echo [OK] Service installed: %SVC%
echo      Starts automatically on Windows boot.
