@echo off
:: Must run as Administrator
:: Called by Inno Setup after installation

set INSTALL_DIR=C:\LawFirmSystem
set SCRIPTS=%INSTALL_DIR%\scripts

echo Setting up Windows scheduled tasks...

:: 1. Start app on boot (runs as SYSTEM, so it starts even before login)
schtasks /create /tn "LawFirmSystem-Start" /tr "\"%SCRIPTS%\start-app.bat\"" /sc ONSTART /delay 0001:00 /ru SYSTEM /f
echo   [OK] Auto-start on boot

:: 2. Backup every 2 hours
schtasks /create /tn "LawFirmSystem-Backup" /tr "\"%SCRIPTS%\backup-gdrive.bat\"" /sc HOURLY /mo 2 /ru "%USERNAME%" /f
echo   [OK] Backup every 2 hours

:: 3. Backup on shutdown (via shutdown event task)
schtasks /create /tn "LawFirmSystem-BackupOnShutdown" /tr "\"%SCRIPTS%\backup-gdrive.bat\"" /sc ONEVENT /ec System /mo "*[System[Provider[@Name='Microsoft-Windows-Kernel-Power'] and EventID=109]]" /ru "%USERNAME%" /f 2>nul
:: Fallback: use logoff event if shutdown event fails
if errorlevel 1 (
    schtasks /create /tn "LawFirmSystem-BackupOnShutdown" /tr "\"%SCRIPTS%\backup-gdrive.bat\"" /sc ONLOGOFF /ru "%USERNAME%" /f
)
echo   [OK] Backup on shutdown

echo.
echo All tasks configured successfully.
