@echo off
title חיבור Google Drive
echo ============================================
echo   חיבור לחשבון Google Drive
echo   officeerez41@gmail.com
echo ============================================
echo.
echo הדפדפן יפתח כעת לאימות Google.
echo חשוב: היכנס עם officeerez41@gmail.com
echo.
pause

set RCLONE=C:\LawFirmSystem\rclone\rclone.exe
set CONFIG=C:\LawFirmSystem\rclone\rclone.conf

:: Create rclone config for Google Drive
"%RCLONE%" config create gdrive drive ^
    scope drive ^
    --config "%CONFIG%"

echo.
echo החיבור הושלם. הגיבויים ישמרו ב-Google Drive של officeerez41@gmail.com
pause
