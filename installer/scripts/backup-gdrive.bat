@echo off
cd /d "C:\LawFirmSystem"

set RCLONE=C:\LawFirmSystem\rclone\rclone.exe
set CONFIG=C:\LawFirmSystem\rclone\rclone.conf
set LOCAL_BACKUP=C:\LawFirmSystem\backups
set REMOTE_FOLDER=gdrive:LawFirmBackup

:: Create local backup folder
if not exist "%LOCAL_BACKUP%" mkdir "%LOCAL_BACKUP%"

:: Timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set DT=%%I
set STAMP=%DT:~0,8%_%DT:~8,4%

:: Backup database to local file
echo [%date% %time%] Starting backup...
docker compose exec -T db pg_dump -U postgres lawfirm > "%LOCAL_BACKUP%\db_%STAMP%.sql" 2>nul

if not exist "%LOCAL_BACKUP%\db_%STAMP%.sql" (
    echo [%date% %time%] ERROR: Database backup failed - is the app running?
    exit /b 1
)

echo [%date% %time%] Database dumped successfully.

:: Upload to Google Drive using rclone
if exist "%RCLONE%" (
    if exist "%CONFIG%" (
        echo [%date% %time%] Uploading to Google Drive ^(officeerez41@gmail.com^)...
        "%RCLONE%" copy "%LOCAL_BACKUP%\db_%STAMP%.sql" "%REMOTE_FOLDER%" --config "%CONFIG%" --log-level ERROR
        if errorlevel 1 (
            echo [%date% %time%] WARNING: Upload to Google Drive failed. Backup kept locally.
        ) else (
            echo [%date% %time%] Uploaded to Google Drive successfully.
        )
    ) else (
        echo [%date% %time%] WARNING: Google Drive not configured. Run setup-gdrive-auth.bat
    )
) else (
    echo [%date% %time%] WARNING: rclone not found. Backup saved locally only.
)

:: Delete local backups older than 7 days
forfiles /p "%LOCAL_BACKUP%" /s /m *.sql /d -7 /c "cmd /c del @path" 2>nul

echo [%date% %time%] Backup complete: db_%STAMP%.sql
