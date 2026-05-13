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
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
DisableDirPage=yes
CloseApplications=yes

[Languages]
Name: "hebrew"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon";  Description: "צור קיצור דרך בשולחן העבודה"; GroupDescription: "קיצורי דרך:"; Flags: checked
Name: "autostart";    Description: "הפעל את המערכת אוטומטית בעת הפעלת המחשב"; GroupDescription: "הגדרות:"; Flags: checked
Name: "autobackup";   Description: "גבה אוטומטית ל-Google Drive ({#BackupEmail}) כל שעתיים"; GroupDescription: "גיבוי:"; Flags: checked

[Files]
Source: "..\docker-compose.yml";                  DestDir: "{app}";           Flags: ignoreversion
Source: "..\Dockerfile";                           DestDir: "{app}";           Flags: ignoreversion
Source: "..\.env.example";                        DestDir: "{app}";           Flags: ignoreversion onlyifdoesntexist
Source: "..\scripts\start-app.bat";               DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "..\scripts\stop-app.bat";                DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "..\scripts\backup-gdrive.bat";           DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "..\scripts\setup-gdrive-auth.bat";       DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "..\scripts\setup-tasks.bat";             DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "..\scripts\remove-tasks.bat";            DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "..\scripts\update-app.bat";              DestDir: "{app}\scripts";   Flags: ignoreversion
Source: "open-app.bat";                           DestDir: "{app}";           Flags: ignoreversion
Source: "backup-now.bat";                         DestDir: "{app}";           Flags: ignoreversion

[Icons]
Name: "{group}\פתח מערכת ניהול תיקים";   Filename: "{app}\open-app.bat"
Name: "{group}\גיבוי עכשיו";             Filename: "{app}\backup-now.bat"
Name: "{group}\הגדרת Google Drive";       Filename: "{app}\scripts\setup-gdrive-auth.bat"
Name: "{group}\עדכן מערכת";              Filename: "{app}\scripts\update-app.bat"; Comment: "הורד והתקן את הגרסה האחרונה"
Name: "{group}\הסר התקנה";               Filename: "{uninstallexe}"
Name: "{autodesktop}\ניהול תיקים";       Filename: "{app}\open-app.bat"; Tasks: desktopicon

[Run]
; 1. Check Docker is running
Filename: "cmd.exe"; Parameters: "/c docker info >nul 2>&1"; Flags: runhidden waituntilterminated; Check: not DockerRunning

; 2. Create .env if not exists
Filename: "cmd.exe"; Parameters: "/c if not exist ""{app}\.env"" copy ""{app}\.env.example"" ""{app}\.env"""; Flags: runhidden

; 3. Download rclone (portable, no install needed)
Filename: "powershell.exe"; Parameters: "-Command ""$d='{app}\rclone'; New-Item -ItemType Directory -Force -Path $d | Out-Null; Invoke-WebRequest 'https://downloads.rclone.org/rclone-current-windows-amd64.zip' -OutFile '$d\rclone.zip'; Expand-Archive '$d\rclone.zip' -DestinationPath '$d\tmp' -Force; Copy-Item '$d\tmp\rclone-*-windows-amd64\rclone.exe' '$d\rclone.exe' -Force; Remove-Item '$d\tmp','$d\rclone.zip' -Recurse -Force"""; Flags: runhidden waituntilterminated; StatusMsg: "מוריד כלי גיבוי..."; Tasks: autobackup

; 4. Pull Docker image
Filename: "cmd.exe"; Parameters: "/c cd /d ""{app}"" && docker compose pull 2>nul || docker build -t lawfirm-system:latest ."; Flags: runhidden waituntilterminated; StatusMsg: "מוריד קבצי מערכת (עשוי לקחת מספר דקות)..."

; 5. Start app
Filename: "cmd.exe"; Parameters: "/c cd /d ""{app}"" && docker compose up -d"; Flags: runhidden waituntilterminated; StatusMsg: "מפעיל את המערכת..."

; 6. Setup scheduled tasks
Filename: "cmd.exe"; Parameters: "/c ""{app}\scripts\setup-tasks.bat"""; Flags: runhidden waituntilterminated; Tasks: autostart autobackup

; 7. Google Drive auth (opens browser - user must log in as officeerez41@gmail.com)
Filename: "{app}\scripts\setup-gdrive-auth.bat"; Description: "חבר את Google Drive ({#BackupEmail}) לגיבוי אוטומטי"; Flags: postinstall; Tasks: autobackup

; 8. Open app in browser after install
Filename: "powershell.exe"; Parameters: "-Command ""Start-Sleep 15; Start-Process 'http://localhost:4000'"""; Flags: runhidden nowait postinstall skipifsilent; Description: "פתח את המערכת בדפדפן"

[UninstallRun]
Filename: "cmd.exe"; Parameters: "/c ""{app}\scripts\remove-tasks.bat"""; Flags: runhidden
Filename: "cmd.exe"; Parameters: "/c cd /d ""{app}"" && docker compose down -v"; Flags: runhidden waituntilterminated

[Code]
function DockerRunning: Boolean;
var ResultCode: Integer;
begin
  Result := Exec('cmd.exe', '/c docker info >nul 2>&1', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

function InitializeSetup(): Boolean;
var ResultCode: Integer;
begin
  Result := True;
  if not DockerRunning then
  begin
    if MsgBox(
      'Docker Desktop לא מותקן או לא פועל.' + #13#10 + #13#10 +
      'שלב 1: הורד והתקן Docker Desktop' + #13#10 +
      'שלב 2: הפעל את Docker Desktop' + #13#10 +
      'שלב 3: חזור להתקין את המערכת' + #13#10 + #13#10 +
      'האם לפתוח את דף ההורדה של Docker עכשיו?',
      mbConfirmation, MB_YESNO) = IDYES then
      ShellExec('open', 'https://www.docker.com/products/docker-desktop', '', '', SW_SHOW, ewNoWait, ResultCode);
    Result := False;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var ResultCode: Integer;
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
