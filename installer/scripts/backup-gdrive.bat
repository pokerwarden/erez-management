@echo off
cd /d "C:\LawFirmSystem"

:: Find Google Drive folder (tries common locations)
set GDRIVE=
if exist "%USERPROFILE%\Google Drive\My Drive" set GDRIVE=%USERPROFILE%\Google Drive\My Drive
if exist "%USERPROFILE%\Google Drive" set GDRIVE=%USERPROFILE%\Google Drive
if exist "%USERPROFILE%\My Drive" set GDRIVE=%USERPROFILE%\My Drive
if exist "G:\My Drive" set GDRIVE=G:\My Drive
if exist "G:\Google Drive" set GDRIVE=G:\Google Drive

:: Fallback to Desktop if Google Drive not found
if "%GDRIVE%"=="" set GDRIVE=%USERPROFILE%\Desktop\LawFirmBackup

:: Create backup folder
set BACKUP_DIR=%GDRIVE%\LawFirmBackup
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Keep only last 7 days of backups
forfiles /p "%BACKUP_DIR%" /s /m *.sql /d -7 /c "cmd /c del @path" 2>nul

:: Timestamp
for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set DATE=%%c%%b%%a
for /f "tokens=1-2 delims=: " %%a in ("%time%") do set TIME=%%a%%b
set TIME=%TIME: =0%
set STAMP=%DATE%_%TIME%

:: Backup database
echo Backing up database...
docker compose exec -T db pg_dump -U postgres lawfirm > "%BACKUP_DIR%\db_%STAMP%.sql"

if exist "%BACKUP_DIR%\db_%STAMP%.sql" (
    echo Backup saved to: %BACKUP_DIR%\db_%STAMP%.sql
) else (
    echo WARNING: Backup may have failed.
)
