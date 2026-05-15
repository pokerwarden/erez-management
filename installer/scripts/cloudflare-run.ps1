$app = "C:\LawFirmSystem"
$cfExe = "$app\cloudflared\cloudflared.exe"
$urlFile = "$app\cloudflare-url.txt"
$logFile = "$app\cloudflare.log"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

# Wait for app to be ready
Start-Sleep -Seconds 30

# Clear old state (write without BOM so .bat files can read cleanly)
[System.IO.File]::WriteAllText($urlFile, "Starting tunnel...", $utf8NoBom)
[System.IO.File]::WriteAllText($logFile, "", $utf8NoBom)

# Start cloudflared
$proc = Start-Process -FilePath $cfExe `
    -ArgumentList "tunnel --url http://localhost:4000 --no-autoupdate" `
    -RedirectStandardError $logFile `
    -NoNewWindow -PassThru

# Poll log for generated URL (up to 60 seconds)
$found = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    $content = Get-Content $logFile -Raw -ErrorAction SilentlyContinue
    if ($content -match "https://[a-zA-Z0-9-]+\.trycloudflare\.com") {
        $url = $Matches[0]
        [System.IO.File]::WriteAllText($urlFile, $url, $utf8NoBom)
        $found = $true
        break
    }
}

if (-not $found) {
    [System.IO.File]::WriteAllText($urlFile, "ERROR: Could not get tunnel URL. Check cloudflare.log", $utf8NoBom)
}

$proc.WaitForExit()
