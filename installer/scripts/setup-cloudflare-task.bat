@echo off
set SCRIPTS=C:\LawFirmSystem\scripts

schtasks /create /tn "LawFirmSystem-CloudflareTunnel" /tr "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%SCRIPTS%\cloudflare-run.ps1\"" /sc ONSTART /delay 0002:00 /ru SYSTEM /f
echo [OK] Cloudflare Tunnel auto-start configured
