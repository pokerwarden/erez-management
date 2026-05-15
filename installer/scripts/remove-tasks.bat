@echo off
schtasks /delete /tn "LawFirmSystem-Backup" /f 2>nul
schtasks /delete /tn "LawFirmSystem-BackupOnShutdown" /f 2>nul
schtasks /delete /tn "LawFirmSystem-CloudflareTunnel" /f 2>nul
echo Scheduled tasks removed.
