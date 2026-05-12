@echo off
title Server - Dev Mode
cd /d "%~dp0server"
echo Installing server dependencies...
call npm install
echo Generating Prisma client...
call npx prisma generate
echo.
echo Starting server on http://localhost:3000 ...
echo.
call npm run dev
pause
