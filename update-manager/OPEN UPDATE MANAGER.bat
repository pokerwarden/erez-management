@echo off
python "%~dp0update_manager.py"
if errorlevel 1 (
    echo.
    echo ERROR: Python not found or script failed.
    echo Make sure Python 3.8+ is installed.
    pause
)
