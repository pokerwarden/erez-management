@echo off
powershell -Command "$url=[System.IO.File]::ReadAllText('C:\LawFirmSystem\cloudflare-url.txt').Trim(); Write-Host $url; Start-Process $url"
