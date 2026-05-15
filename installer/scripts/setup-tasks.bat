@echo off
:: Called by Inno Setup — sets up backup scheduled tasks
:: Auto-start is handled by Windows Service (NSSM), not a scheduled task

set APP=C:\LawFirmSystem
set SCRIPTS=%APP%\scripts

echo Setting up scheduled tasks...

:: Backup every 2 hours
schtasks /create /tn "LawFirmSystem-Backup" /tr "\"%SCRIPTS%\backup-gdrive.bat\"" /sc HOURLY /mo 2 /ru "%USERNAME%" /f
echo   [OK] Backup every 2 hours

:: Backup on shutdown
schtasks /create /tn "LawFirmSystem-BackupOnShutdown" /tr "\"%SCRIPTS%\backup-gdrive.bat\"" /sc ONLOGOFF /ru "%USERNAME%" /f
echo   [OK] Backup on shutdown

echo All tasks configured.
