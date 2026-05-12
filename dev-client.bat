@echo off
title Client - Dev Mode
cd /d "%~dp0client"
echo Installing client dependencies...
call npm install
echo.
echo Starting client on http://localhost:5173 ...
echo.
call npm run dev
pause
