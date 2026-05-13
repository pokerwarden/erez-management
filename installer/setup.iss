#define MyAppName "Law Firm Case Management"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Your Company Name"
#define MyAppURL "https://github.com/pokerwarden/erez-management"
#define MyInstallDir "C:\LawFirmSystem"

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
SetupIconFile=
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
DisableDirPage=yes
CloseApplications=yes

; Show license
; LicenseFile=license.txt

[Languages]
Name: "hebrew"; MessagesFile: "compiler:Default.isl"

[CustomMessages]
hebrew.WelcomeLabel2=אשף זה יתקין את מערכת ניהול התיקים במחשב שלך.%n%nמומלץ לסגור את כל היישומים האחרים לפני המשך.
hebrew.FinishedHeadingLabel=ההתקנה הושלמה בהצלחה!
hebrew.FinishedLabel=המערכת הותקנה. לחץ סיום כדי לפתוח את הדפדפן.

[Tasks]
Name: "desktopicon"; Description: "צור קיצור דרך בשולחן העבודה"; GroupDescription: "קיצורי דרך:"; Flags: checked
Name: "autostart"; Description: "הפעל את המערכת אוטומטית בעת הפעלת המחשב"; GroupDescription: "הגדרות:"; Flags: checked
Name: "autobackup"; Description: "גבה אוטומטית לכונן Google Drive (כל שעתיים)"; GroupDescription: "גיבוי:"; Flags: checked

[Files]
; App files
Source: "..\docker-compose.yml";         DestDir: "{app}"; Flags: ignoreversion
Source: "..\Dockerfile";                  DestDir: "{app}"; Flags: ignoreversion
Source: "..\.env.example";               DestDir: "{app}"; Flags: ignoreversion onlyifdoesntexist
Source: "..\scripts\start-app.bat";      DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\stop-app.bat";       DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\backup-gdrive.bat";  DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\setup-tasks.bat";    DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\remove-tasks.bat";   DestDir: "{app}\scripts"; Flags: ignoreversion

; Desktop shortcuts scripts
Source: "open-app.bat";                  DestDir: "{app}"; Flags: ignoreversion
Source: "backup-now.bat";               DestDir: "{app}"; Flags: ignoreversion

[Icons]
; Start menu
Name: "{group}\פתח מערכת ניהול תיקים"; Filename: "{app}\open-app.bat"; IconFilename: "{app}\open-app.bat"; Comment: "פתח את מערכת ניהול התיקים בדפדפן"
Name: "{group}\גיבוי עכשיו";           Filename: "{app}\backup-now.bat"; Comment: "צור גיבוי ידני עכשיו"
Name: "{group}\הסר התקנה";             Filename: "{uninstallexe}"

; Desktop shortcut
Name: "{autodesktop}\ניהול תיקים";     Filename: "{app}\open-app.bat"; Tasks: desktopicon; Comment: "פתח את מערכת ניהול התיקים"

[Run]
; 1. Check Docker
Filename: "powershell.exe"; Parameters: "-Command ""docker info | Out-Null; if($LASTEXITCODE -ne 0) {{ [System.Windows.Forms.MessageBox]::Show('נא להתקין Docker Desktop תחילה מ: https://docker.com/products/docker-desktop','Docker נדרש') }}"""; Flags: runhidden

; 2. Copy .env from example if not exists
Filename: "cmd.exe"; Parameters: "/c if not exist ""{app}\.env"" copy ""{app}\.env.example"" ""{app}\.env"""; Flags: runhidden

; 3. Pull/build Docker image
Filename: "cmd.exe"; Parameters: "/c cd /d ""{app}"" && docker compose pull 2>nul || docker build -t lawfirm-system:latest ."; Flags: runhidden waituntilterminated; StatusMsg: "מוריד קבצי מערכת (עשוי לקחת מספר דקות)..."

; 4. Start the app
Filename: "cmd.exe"; Parameters: "/c cd /d ""{app}"" && docker compose up -d"; Flags: runhidden waituntilterminated; StatusMsg: "מפעיל את המערכת..."

; 5. Setup scheduled tasks
Filename: "cmd.exe"; Parameters: "/c ""{app}\scripts\setup-tasks.bat"""; Flags: runhidden waituntilterminated; Tasks: autostart autobackup

; 6. Wait and open first-time setup wizard
Filename: "powershell.exe"; Parameters: "-Command ""Start-Sleep 15; Start-Process 'http://localhost:4000'"""; Flags: runhidden nowait; Description: "פתח את אשף ההגדרה הראשונית"; Flags: postinstall skipifsilent

[UninstallRun]
Filename: "cmd.exe"; Parameters: "/c ""{app}\scripts\remove-tasks.bat"""; Flags: runhidden
Filename: "cmd.exe"; Parameters: "/c cd /d ""{app}"" && docker compose down -v"; Flags: runhidden waituntilterminated

[Code]
// Check Docker is installed before proceeding
function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
begin
  Result := True;
  if not Exec('cmd.exe', '/c docker info >nul 2>&1', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) or (ResultCode <> 0) then
  begin
    if MsgBox(
      'Docker Desktop לא מותקן או לא פועל.' + #13#10 + #13#10 +
      'יש להתקין Docker Desktop מ:' + #13#10 +
      'https://www.docker.com/products/docker-desktop' + #13#10 + #13#10 +
      'לאחר ההתקנה, הפעל את Docker Desktop וחזור להתקין.' + #13#10 + #13#10 +
      'האם לפתוח את דף ההורדה עכשיו?',
      mbConfirmation, MB_YESNO) = IDYES then
    begin
      ShellExec('open', 'https://www.docker.com/products/docker-desktop', '', '', SW_SHOW, ewNoWait, ResultCode);
    end;
    Result := False;
  end;
end;

// Show the server IP at the end so user knows what to share with other PCs
procedure CurStepChanged(CurStep: TSetupStep);
var
  IPAddress: String;
  ResultCode: Integer;
  TempFile: String;
begin
  if CurStep = ssDone then
  begin
    TempFile := ExpandConstant('{tmp}\ip.txt');
    Exec('cmd.exe', '/c for /f "tokens=2 delims=:" %a in (''ipconfig ^| findstr /i "IPv4"'') do @echo %a > "' + TempFile + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

    MsgBox(
      'ההתקנה הושלמה!' + #13#10 + #13#10 +
      'המערכת זמינה בכתובת:' + #13#10 +
      'http://localhost:4000' + #13#10 + #13#10 +
      'ממחשבים אחרים ברשת, השתמש בכתובת:' + #13#10 +
      'http://[כתובת-IP-של-שרת-זה]:4000' + #13#10 + #13#10 +
      'כדי למצוא את כתובת ה-IP: פתח cmd והקלד ipconfig' + #13#10 + #13#10 +
      'הגיבויים נשמרים אוטומטית ל-Google Drive שלך.',
      mbInformation, MB_OK);
  end;
end;
