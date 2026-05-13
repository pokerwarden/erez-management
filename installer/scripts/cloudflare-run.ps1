$app = "C:\LawFirmSystem"
$cfExe = "$app\cloudflared\cloudflared.exe"
$urlFile = "$app\cloudflare-url.txt"
$logFile = "$app\cloudflare.log"

# Wait for Docker app to be ready
Start-Sleep -Seconds 30

# Clear old state
"Starting tunnel..." | Set-Content $urlFile -Encoding UTF8
"" | Set-Content $logFile -Encoding UTF8

# Start cloudflared, redirect stderr to log file
$proc = Start-Process -FilePath $cfExe `
    -ArgumentList "tunnel --url http://localhost:4000 --no-autoupdate" `
    -RedirectStandardError $logFile `
    -NoNewWindow -PassThru

# Poll log file for the generated URL (up to 60 seconds)
$found = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    $content = Get-Content $logFile -Raw -ErrorAction SilentlyContinue
    if ($content -match "https://[a-zA-Z0-9-]+\.trycloudflare\.com") {
        $url = $Matches[0]
        $url | Set-Content $urlFile -Encoding UTF8
        $found = $true
        break
    }
}

if (-not $found) {
    "ERROR: Could not get tunnel URL. Check cloudflare.log" | Set-Content $urlFile -Encoding UTF8
}

# Keep running (cloudflared must stay alive)
$proc.WaitForExit()
