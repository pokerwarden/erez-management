#define MyAppName "Law Firm Case Management"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Your Company Name"
#define MyAppURL "https://github.com/pokerwarden/erez-management"
#define MyInstallDir "C:\LawFirmSystem"
#define BackupEmail "officeerez41@gmail.com"

[Setup]
AppId={{8F4A1B2C-3D5E-6F7A-8B9C-0D1E2F3A4B5C}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={#MyInstallDir}
DefaultGroupName={#MyAppName}
OutputDir=.\output
OutputBaseFilename=LawFirmSystem-Setup-v{#MyAppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
DisableDirPage=yes
CloseApplications=yes

[Languages]
Name: "hebrew"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon";    Description: "צור קיצור דרך בשולחן העבודה"; GroupDescription: "קיצורי דרך:"
Name: "autostart";      Description: "הפעל את המערכת אוטומטית בעת הפעלת המחשב"; GroupDescription: "הגדרות:"
Name: "autobackup";     Description: "גבה אוטומטית ל-Google Drive ({#BackupEmail}) כל שעתיים"; GroupDescription: "גיבוי:"
Name: "remotetunnel";   Description: "אפשר גישה מרחוק לעובדים (מכל מקום, כל רשת) דרך Cloudflare Tunnel"; GroupDescription: "גישה מרחוק:"

[Files]
Source: "..\docker-compose.yml";                  DestDir: "{app}";           Flags: ignoreversion
Source: "..\Dockerfile";                          DestDir: "{app}";           Flags: ignoreversion
Source: "..\version.txt";                         DestDir: "{app}";           Flags: ignoreversion
Source: "..\.env.example";                        DestDir: "{app}";           Flags: ignoreversion onlyifdoesntexist
Source: "scripts\start-app.bat";                  DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "scripts\stop-app.bat";                   DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "scripts\backup-gdrive.bat";              DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "scripts\setup-gdrive-auth.bat";          DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "scripts\setup-tasks.bat";                DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "scripts\remove-tasks.bat";               DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "scripts\update-app.bat";                 DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "scripts\generate-env.bat";               DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "scripts\install-docker.bat";             DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "scripts\cloudflare-run.ps1";             DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "scripts\show-cloudflare-url.bat";        DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "scripts\setup-cloudflare-task.bat";      DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "open-app.bat";                           DestDir: "{app}";           Flags: ignoreversion
Source: "backup-now.bat";                         DestDir: "{app}";           Flags: ignoreversion

[Icons]
Name: "{group}\פתח מערכת ניהול תיקים";   Filename: "{app}\open-app.bat"
Name: "{group}\גיבוי עכשיו";             Filename: "{app}\backup-now.bat"
Name: "{group}\הגדרת Google Drive";       Filename: "{app}\scripts\setup-gdrive-auth.bat"
Name: "{group}\עדכן מערכת";              Filename: "{app}\scripts\update-app.bat"; Comment: "הורד והתקן את הגרסה האחרונה"
Name: "{group}\כתובת גישה לעובדים";      Filename: "{app}\scripts\show-cloudflare-url.bat"; Tasks: remotetunnel; Comment: "הצג את הקישור לשיתוף עם עובדים"
Name: "{group}\הסר התקנה";               Filename: "{uninstallexe}"
Name: "{autodesktop}\ניהול תיקים";       Filename: "{app}\open-app.bat"; Tasks: desktopicon

[Run]
; 1. Install Docker Desktop if missing, wait until ready
Filename: "cmd.exe"; Parameters: "/c ""{app}\scripts\install-docker.bat"""; Flags: waituntilterminated; StatusMsg: "מכין את סביבת ריצה (Docker)..."

; 2. Generate .env with random secure passwords if not exists
Filename: "cmd.exe"; Parameters: "/c ""{app}\scripts\generate-env.bat"" ""{app}\.env"""; Flags: runhidden waituntilterminated

; 3. Download rclone for Google Drive backup
Filename: "powershell.exe"; Parameters: "-Command ""$d='{app}\rclone'; New-Item -ItemType Directory -Force -Path $d | Out-Null; Invoke-WebRequest 'https://downloads.rclone.org/rclone-current-windows-amd64.zip' -OutFile '$d\rclone.zip'; Expand-Archive '$d\rclone.zip' -DestinationPath '$d\tmp' -Force; Copy-Item '$d\tmp\rclone-*-windows-amd64\rclone.exe' '$d\rclone.exe' -Force; Remove-Item '$d\tmp','$d\rclone.zip' -Recurse -Force"""; Flags: runhidden waituntilterminated; StatusMsg: "מוריד כלי גיבוי..."; Tasks: autobackup

; 4. Download cloudflared for remote access tunnel
Filename: "powershell.exe"; Parameters: "-Command ""New-Item -ItemType Directory -Force -Path '{app}\cloudflared' | Out-Null; Invoke-WebRequest 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '{app}\cloudflared\cloudflared.exe'"""; Flags: runhidden waituntilterminated; StatusMsg: "מוריד Cloudflare Tunnel..."; Tasks: remotetunnel

; 5. Open firewall port 4000
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""LawFirmSystem"" dir=in action=allow protocol=TCP localport=4000 profile=private,domain"; Flags: runhidden waituntilterminated

; 6. Download Docker image from GitHub Release and load it
Filename: "powershell.exe"; Parameters: "-Command ""$url='https://github.com/pokerwarden/erez-management/releases/latest/download/lawfirm-system.tar.gz'; $out='{app}\lawfirm-system.tar.gz'; Invoke-WebRequest $url -OutFile $out"""; Flags: runhidden waituntilterminated; StatusMsg: "מוריד קבצי מערכת (עשוי לקחת מספר דקות)..."
Filename: "cmd.exe"; Parameters: "/c docker load -i ""{app}\lawfirm-system.tar.gz"" && del ""{app}\lawfirm-system.tar.gz"""; Flags: runhidden waituntilterminated; StatusMsg: "מתקין קבצי מערכת..."

; 7. Start app
Filename: "cmd.exe"; Parameters: "/c cd /d ""{app}"" && docker compose up -d"; Flags: runhidden waituntilterminated; StatusMsg: "מפעיל את המערכת..."

; 8. Setup scheduled tasks
Filename: "cmd.exe"; Parameters: "/c ""{app}\scripts\setup-tasks.bat"""; Flags: runhidden waituntilterminated; Tasks: autostart autobackup

; 9. Setup Cloudflare Tunnel scheduled task + start tunnel now
Filename: "cmd.exe"; Parameters: "/c ""{app}\scripts\setup-cloudflare-task.bat"""; Flags: runhidden waituntilterminated; Tasks: remotetunnel
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\cloudflare-run.ps1"""; Flags: runhidden nowait; Tasks: remotetunnel; StatusMsg: "מפעיל גישה מרחוק..."

; 10. Google Drive auth
Filename: "{app}\scripts\setup-gdrive-auth.bat"; Description: "חבר את Google Drive ({#BackupEmail}) לגיבוי אוטומטי"; Flags: postinstall; Tasks: autobackup

; 11. Show remote access URL
Filename: "{app}\scripts\show-cloudflare-url.bat"; Description: "הצג קישור גישה לעובדים"; Flags: postinstall nowait; Tasks: remotetunnel

; 12. Open app in browser after install — poll health endpoint up to 2 minutes
Filename: "powershell.exe"; Parameters: "-Command ""$i=0; do { Start-Sleep 5; $i++; try { $r=(Invoke-WebRequest 'http://localhost:4000/api/health' -UseBasicParsing -TimeoutSec 3).StatusCode } catch { $r=0 } } while ($r -ne 200 -and $i -lt 24); Start-Process 'http://localhost:4000'"""; Flags: runhidden nowait postinstall skipifsilent; Description: "פתח את המערכת בדפדפן"

[UninstallRun]
Filename: "cmd.exe"; Parameters: "/c ""{app}\scripts\remove-tasks.bat"""; RunOnceId: "RemoveTasks"; Flags: runhidden
Filename: "cmd.exe"; Parameters: "/c cd /d ""{app}"" && docker compose down -v"; RunOnceId: "DockerDown"; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""LawFirmSystem"""; RunOnceId: "RemoveFirewall"; Flags: runhidden

[Code]
function InitializeSetup(): Boolean;
begin
  // Check Windows 10/11 — Docker requires it
  if not (GetWindowsVersion >= $0A000000) then
  begin
    MsgBox(
      'מערכת ניהול תיקים דורשת Windows 10 או 11.' + #13#10 +
      'אנא שדרג את מערכת ההפעלה ונסה שוב.',
      mbError, MB_OK);
    Result := False;
    exit;
  end;
  Result := True;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssDone then
    MsgBox(
      'ההתקנה הושלמה בהצלחה!' + #13#10 + #13#10 +
      'גישה למערכת:' + #13#10 +
      '  מחשב זה:        http://localhost:4000' + #13#10 +
      '  מחשבים אחרים:   http://[כתובת-IP]:4000' + #13#10 + #13#10 +
      'גישה מרחוק (מכל מקום):' + #13#10 +
      '  לחץ "כתובת גישה לעובדים" בתפריט התחל' + #13#10 + #13#10 +
      'כדי לדעת את כתובת ה-IP: פתח cmd והקלד ipconfig' + #13#10 + #13#10 +
      'גיבויים אוטומטיים נשלחים ל:' + #13#10 +
      '  {#BackupEmail} (Google Drive)' + #13#10 +
      '  תיקייה: LawFirmBackup',
      mbInformation, MB_OK);
end;
