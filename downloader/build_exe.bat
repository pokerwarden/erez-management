@echo off
echo Building Erez Law Firm Installer EXE...
echo.

pip install pyinstaller >nul 2>&1

:: Bundle docker-compose.yml + scripts alongside the exe
pyinstaller ^
  --onefile ^
  --windowed ^
  --name "Erez-Installer" ^
  --add-data "..\docker-compose.yml;." ^
  --add-data "..\.env.example;." ^
  --add-data "..\backup.sh;." ^
  --add-data "..\restore.sh;." ^
  --add-data "..\update.sh;." ^
  install_downloader.py

echo.
if exist dist\Erez-Installer.exe (
    echo SUCCESS: dist\Erez-Installer.exe
    echo Send this file to clients — it downloads everything automatically.
) else (
    echo FAILED — check output above.
)
pause
