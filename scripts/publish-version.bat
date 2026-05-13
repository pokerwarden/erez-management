@echo off
:: Usage: publish-version.bat 1.2.3
:: This tags the git commit, which triggers GitHub Actions to:
::   1. Build new Docker image → push to Docker Hub as :latest and :v1.2.3
::   2. Create a GitHub Release at v1.2.3
:: Clients running update-app.bat will get notified and can update with one click.

if "%1"=="" (
    echo Usage: publish-version.bat ^<version^>
    echo Example: publish-version.bat 1.1.0
    exit /b 1
)

set VERSION=%1

:: Update version.txt
echo %VERSION%> version.txt
echo Updated version.txt to %VERSION%

:: Commit version bump
git add version.txt
git commit -m "chore: bump version to v%VERSION%"

:: Tag and push
git tag v%VERSION%
git push origin main
git push origin v%VERSION%

echo.
echo ============================================
echo   גרסה v%VERSION% פורסמה!
echo.
echo   GitHub Actions יבנה את ה-Docker image
echo   ויצור GitHub Release אוטומטית.
echo.
echo   לקוחות יראו עדכון זמין בדשבורד
echo   ויוכלו ללחוץ "עדכן מערכת" לעדכון.
echo ============================================
