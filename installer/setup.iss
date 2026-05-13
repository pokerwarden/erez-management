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
Name: "desktopicon";  Description: "צור קיצור דרך בשולחן העבודה"; GroupDescription: "קיצורי דרך:"
Name: "autostart";    Description: "הפעל את המערכת אוטומטית בעת הפעלת המחשב"; GroupDescription: "הגדרות:"
Name: "autobackup";   Description: "גבה אוטומטית ל-Google Drive ({#BackupEmail}) כל שעתיים"; GroupDescription: "גיבוי:"

[Files]
Source: "..\docker-compose.yml";          DestDir: "{app}";           Flags: ignoreversion
Source: "..\Dockerfile";                  DestDir: "{app}";           Flags: ignoreversion
Source: "..\version.txt";                 DestDir: "{app}";           Flags: ignoreversion
Source: "..\.env.example";               DestDir: "{app}";           Flags: ignoreversion onlyifdoesntexist
Source: "scripts\start-app.bat";         DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "scripts\stop-app.bat";          DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "scripts\backup-gdrive.bat";     DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "scripts\setup-gdrive-auth.bat"; DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "scripts\setup-tasks.bat";       DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "scripts\remove-tasks.bat";      DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "scripts\update-app.bat";        DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "scripts\generate-env.bat";      DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "scripts\install-docker.bat";    DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "open-app.bat";                  DestDir: "{app}";           Flags: ignoreversion
Source: "backup-now.bat";                DestDir: "{app}";           Flags: ignoreversion

[Icons]
Name: "{group}\פתח מערכת ניהול תיקים";   Filename: "{app}\open-app.bat"
Name: "{group}\גיבוי עכשיו";             Filename: "{app}\backup-now.bat"
Name: "{group}\הגדרת Google Drive";       Filename: "{app}\scripts\setup-gdrive-auth.bat"
Name: "{group}\עדכן מערכת";              Filename: "{app}\scripts\update-app.bat"; Comment: "הורד והתקן את הגרסה האחרונה"
Name: "{group}\הסר התקנה";               Filename: "{uninstallexe}"
Name: "{autodesktop}\ניהול תיקים";       Filename: "{app}\open-app.bat"; Tasks: desktopicon

[Run]
; 1. Install Docker Desktop if missing, wait until ready
Filename: "cmd.exe"; Parameters: "/c ""{app}\scripts\install-docker.bat"""; Flags: runhidden waituntilterminated; StatusMsg: "מכין את סביבת ריצה (Docker)..."

; 2. Generate .env with random secure passwords if not exists
Filename: "cmd.exe"; Parameters: "/c ""{app}\scripts\generate-env.bat"" ""{app}\.env"""; Flags: runhidden waituntilterminated

; 3. Download rclone for Google Drive backup
Filename: "powershell.exe"; Parameters: "-Command ""$d='{app}\rclone'; New-Item -ItemType Directory -Force -Path $d | Out-Null; Invoke-WebRequest 'https://downloads.rclone.org/rclone-current-windows-amd64.zip' -OutFile '$d\rclone.zip'; Expand-Archive '$d\rclone.zip' -DestinationPath '$d\tmp' -Force; Copy-Item '$d\tmp\rclone-*-windows-amd64\rclone.exe' '$d\rclone.exe' -Force; Remove-Item '$d\tmp','$d\rclone.zip' -Recurse -Force"""; Flags: runhidden waituntilterminated; StatusMsg: "מוריד כלי גיבוי..."; Tasks: autobackup

; 4. Open firewall port 4000
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""LawFirmSystem"" dir=in action=allow protocol=TCP localport=4000 profile=private,domain"; Flags: runhidden waituntilterminated

; 5. Download Docker image from GitHub Release and load it
Filename: "powershell.exe"; Parameters: "-Command ""$url='https://github.com/pokerwarden/erez-management/releases/latest/download/lawfirm-system.tar.gz'; $out='{app}\lawfirm-system.tar.gz'; Invoke-WebRequest $url -OutFile $out"""; Flags: runhidden waituntilterminated; StatusMsg: "מוריד קבצי מערכת (עשוי לקחת מספר דקות)..."
Filename: "cmd.exe"; Parameters: "/c docker load -i ""{app}\lawfirm-system.tar.gz"" && del ""{app}\lawfirm-system.tar.gz"""; Flags: runhidden waituntilterminated; StatusMsg: "מתקין קבצי מערכת..."

; 6. Start app
Filename: "cmd.exe"; Parameters: "/c cd /d ""{app}"" && docker compose up -d"; Flags: runhidden waituntilterminated; StatusMsg: "מפעיל את המערכת..."

; 7. Setup scheduled tasks
Filename: "cmd.exe"; Parameters: "/c ""{app}\scripts\setup-tasks.bat"""; Flags: runhidden waituntilterminated; Tasks: autostart autobackup

; 8. Google Drive auth
Filename: "{app}\scripts\setup-gdrive-auth.bat"; Description: "חבר את Google Drive ({#BackupEmail}) לגיבוי אוטומטי"; Flags: postinstall; Tasks: autobackup

; 9. Open app in browser after install
Filename: "powershell.exe"; Parameters: "-Command ""Start-Sleep 15; Start-Process 'http://localhost:4000'"""; Flags: runhidden nowait postinstall skipifsilent; Description: "פתח את המערכת בדפדפן"

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
      'כדי לדעת את כתובת ה-IP: פתח cmd והקלד ipconfig' + #13#10 + #13#10 +
      'גיבויים אוטומטיים נשלחים ל:' + #13#10 +
      '  {#BackupEmail} (Google Drive)' + #13#10 +
      '  תיקייה: LawFirmBackup' + #13#10 + #13#10 +
      'תוכל גם ללחוץ "גיבוי עכשיו" בתפריט התחל בכל עת.',
      mbInformation, MB_OK);
end;
