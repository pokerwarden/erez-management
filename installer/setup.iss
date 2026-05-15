#define MyAppName "Law Firm Case Management"
#define MyAppVersion "1.0.1"
#define MyAppPublisher "Your Company Name"
#define MyAppURL "https://github.com/pokerwarden/erez-management"
#define MyInstallDir "C:\LawFirmSystem"
#define BackupEmail "officeerez41@gmail.com"
#define BundleURL "https://github.com/pokerwarden/erez-management/releases/latest/download/lawfirm-bundle.zip"

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
Name: "autobackup";     Description: "גבה אוטומטית ל-Google Drive ({#BackupEmail}) כל שעתיים"; GroupDescription: "גיבוי:"
Name: "remotetunnel";   Description: "אפשר גישה מרחוק לעובדים (מכל מקום, כל רשת) דרך Cloudflare Tunnel"; GroupDescription: "גישה מרחוק:"

[Files]
; Scripts only — the app itself is downloaded during install
Source: "scripts\generate-env.bat";          DestDir: "{app}\scripts";  Flags: ignoreversion
Source: "scripts\install-services.bat";      DestDir: "{app}\scripts";  Flags: ignoreversion
Source: "scripts\uninstall-services.bat";    DestDir: "{app}\scripts";  Flags: ignoreversion
Source: "scripts\init-db.bat";               DestDir: "{app}\scripts";  Flags: ignoreversion
Source: "scripts\start-app.bat";             DestDir: "{app}\scripts";  Flags: ignoreversion
Source: "scripts\stop-app.bat";              DestDir: "{app}\scripts";  Flags: ignoreversion
Source: "scripts\update-app.bat";            DestDir: "{app}\scripts";  Flags: ignoreversion
Source: "scripts\backup-gdrive.bat";         DestDir: "{app}\scripts";  Flags: ignoreversion
Source: "scripts\setup-gdrive-auth.bat";     DestDir: "{app}\scripts";  Flags: ignoreversion
Source: "scripts\setup-tasks.bat";           DestDir: "{app}\scripts";  Flags: ignoreversion
Source: "scripts\remove-tasks.bat";          DestDir: "{app}\scripts";  Flags: ignoreversion
Source: "scripts\cloudflare-run.ps1";        DestDir: "{app}\scripts";  Flags: ignoreversion
Source: "scripts\show-cloudflare-url.bat";   DestDir: "{app}\scripts";  Flags: ignoreversion
Source: "scripts\setup-cloudflare-task.bat"; DestDir: "{app}\scripts";  Flags: ignoreversion
Source: "open-app.bat";                      DestDir: "{app}";          Flags: ignoreversion
Source: "backup-now.bat";                    DestDir: "{app}";          Flags: ignoreversion

[Icons]
Name: "{group}\פתח מערכת ניהול תיקים";  Filename: "{app}\open-app.bat"
Name: "{group}\גיבוי עכשיו";            Filename: "{app}\backup-now.bat"
Name: "{group}\הגדרת Google Drive";      Filename: "{app}\scripts\setup-gdrive-auth.bat"
Name: "{group}\עדכן מערכת";             Filename: "{app}\scripts\update-app.bat"; Comment: "הורד והתקן את הגרסה האחרונה"
Name: "{group}\כתובת גישה לעובדים";     Filename: "{app}\scripts\show-cloudflare-url.bat"; Tasks: remotetunnel; Comment: "הצג את הקישור לשיתוף עם עובדים"
Name: "{group}\הסר התקנה";              Filename: "{uninstallexe}"
Name: "{autodesktop}\ניהול תיקים";      Filename: "{app}\open-app.bat"; Tasks: desktopicon

[Run]
; 1. Download app bundle from GitHub Release
Filename: "powershell.exe"; Parameters: "-Command ""[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest '{#BundleURL}' -OutFile '{app}\bundle.zip' -UseBasicParsing"""; Flags: waituntilterminated; StatusMsg: "מוריד קבצי מערכת (עשוי לקחת מספר דקות)..."

; 2. Extract bundle
Filename: "powershell.exe"; Parameters: "-Command ""Expand-Archive '{app}\bundle.zip' -DestinationPath '{app}' -Force; Remove-Item '{app}\bundle.zip' -Force"""; Flags: runhidden waituntilterminated; StatusMsg: "מחלץ קבצי מערכת..."

; 3. Create data/uploads/logs directories
Filename: "cmd.exe"; Parameters: "/c mkdir ""{app}\data"" ""{app}\uploads"" ""{app}\logs"" 2>nul"; Flags: runhidden waituntilterminated

; 4. Generate .env
Filename: "cmd.exe"; Parameters: "/c ""{app}\scripts\generate-env.bat"" ""{app}\.env"""; Flags: runhidden waituntilterminated; StatusMsg: "מכין הגדרות..."

; 5. Initialize database (prisma db push)
Filename: "cmd.exe"; Parameters: "/c ""{app}\scripts\init-db.bat"""; Flags: waituntilterminated; StatusMsg: "מאתחל מסד נתונים..."

; 6. Install Windows service (NSSM)
Filename: "cmd.exe"; Parameters: "/c ""{app}\scripts\install-services.bat"""; Flags: runhidden waituntilterminated; StatusMsg: "מתקין שירות מערכת..."

; 7. Start the service
Filename: "cmd.exe"; Parameters: "/c net start LawFirmApp"; Flags: runhidden waituntilterminated; StatusMsg: "מפעיל את המערכת..."

; 8. Open firewall port 4000
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""LawFirmSystem"" dir=in action=allow protocol=TCP localport=4000 profile=private,domain"; Flags: runhidden waituntilterminated

; 9. Download rclone for Google Drive backup
Filename: "powershell.exe"; Parameters: "-Command ""[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; $d='{app}\rclone'; New-Item -ItemType Directory -Force -Path $d | Out-Null; Invoke-WebRequest 'https://downloads.rclone.org/rclone-current-windows-amd64.zip' -OutFile '$d\rclone.zip' -UseBasicParsing; Expand-Archive '$d\rclone.zip' -DestinationPath '$d\tmp' -Force; Copy-Item (Get-ChildItem '$d\tmp\rclone-*-windows-amd64\rclone.exe' | Select-Object -First 1).FullName '$d\rclone.exe' -Force; Remove-Item '$d\tmp','$d\rclone.zip' -Recurse -Force"""; Flags: runhidden waituntilterminated; StatusMsg: "מוריד כלי גיבוי..."; Tasks: autobackup

; 10. Download cloudflared for remote access tunnel
Filename: "powershell.exe"; Parameters: "-Command ""[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; New-Item -ItemType Directory -Force -Path '{app}\cloudflared' | Out-Null; Invoke-WebRequest 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '{app}\cloudflared\cloudflared.exe' -UseBasicParsing"""; Flags: runhidden waituntilterminated; StatusMsg: "מוריד Cloudflare Tunnel..."; Tasks: remotetunnel

; 11. Setup scheduled tasks (backup)
Filename: "cmd.exe"; Parameters: "/c ""{app}\scripts\setup-tasks.bat"""; Flags: runhidden waituntilterminated; Tasks: autobackup

; 12. Setup Cloudflare Tunnel task + start tunnel
Filename: "cmd.exe"; Parameters: "/c ""{app}\scripts\setup-cloudflare-task.bat"""; Flags: runhidden waituntilterminated; Tasks: remotetunnel
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\cloudflare-run.ps1"""; Flags: runhidden nowait; Tasks: remotetunnel; StatusMsg: "מפעיל גישה מרחוק..."

; 13. Google Drive auth (postinstall checkbox)
Filename: "{app}\scripts\setup-gdrive-auth.bat"; Description: "חבר את Google Drive ({#BackupEmail}) לגיבוי אוטומטי"; Flags: postinstall; Tasks: autobackup

; 14. Show Cloudflare URL
Filename: "{app}\scripts\show-cloudflare-url.bat"; Description: "הצג קישור גישה לעובדים"; Flags: postinstall nowait; Tasks: remotetunnel

; 15. Open app in browser — poll health until ready (up to 2 minutes)
Filename: "powershell.exe"; Parameters: "-Command ""$i=0; do {{ Start-Sleep 5; $i++; try {{ $r=(Invoke-WebRequest 'http://localhost:4000/api/health' -UseBasicParsing -TimeoutSec 3).StatusCode }} catch {{ $r=0 }} }} while ($r -ne 200 -and $i -lt 24); Start-Process 'http://localhost:4000'"""; Flags: runhidden nowait postinstall skipifsilent; Description: "פתח את המערכת בדפדפן"

[UninstallRun]
Filename: "cmd.exe"; Parameters: "/c ""{app}\scripts\remove-tasks.bat"""; RunOnceId: "RemoveTasks"; Flags: runhidden
Filename: "cmd.exe"; Parameters: "/c ""{app}\scripts\uninstall-services.bat"""; RunOnceId: "StopServices"; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""LawFirmSystem"""; RunOnceId: "RemoveFirewall"; Flags: runhidden

[Code]
function InitializeSetup(): Boolean;
begin
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
      '  מחשב זה:       http://localhost:4000' + #13#10 +
      '  מחשבים אחרים:  http://[כתובת-IP]:4000' + #13#10 + #13#10 +
      'גישה מרחוק (מכל מקום):' + #13#10 +
      '  לחץ "כתובת גישה לעובדים" בתפריט התחל' + #13#10 + #13#10 +
      'כדי לדעת את כתובת ה-IP: פתח cmd והקלד ipconfig' + #13#10 + #13#10 +
      'גיבויים אוטומטיים נשלחים ל:' + #13#10 +
      '  {#BackupEmail} (Google Drive)',
      mbInformation, MB_OK);
end;
