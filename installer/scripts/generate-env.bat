@echo off
:: Generate .env with random secure passwords
:: Called by Inno Setup installer

set ENV_FILE=%1
if exist "%ENV_FILE%" exit /b 0

:: Generate random passwords using PowerShell
for /f "delims=" %%P in ('powershell -Command "-join ((65..90)+(97..122)+(48..57) | Get-Random -Count 24 | %% {[char]$_})"') do set PG_PASS=%%P
for /f "delims=" %%J in ('powershell -Command "-join ((65..90)+(97..122)+(48..57) | Get-Random -Count 48 | %% {[char]$_})"') do set JWT_PASS=%%J
for /f "delims=" %%N in ('powershell -Command "-join ((65..90)+(97..122)+(48..57) | Get-Random -Count 24 | %% {[char]$_})"') do set N8N_PASS=%%N

(
echo FIRM_NAME=משרד עורכי דין
echo PORT=4000
echo POSTGRES_PASSWORD=%PG_PASS%
echo DATABASE_URL=postgresql://postgres:%PG_PASS%@db:5432/lawfirm
echo JWT_SECRET=%JWT_PASS%
echo N8N_WEBHOOK_BASE=http://n8n:5678/webhook
echo N8N_WEBHOOK_SECRET=%N8N_PASS%
echo N8N_USER=admin
echo N8N_PASSWORD=%N8N_PASS%
echo UPLOAD_DIR=/app/uploads
echo MAX_FILE_SIZE_MB=20
) > "%ENV_FILE%"

echo [OK] .env generated with secure passwords.
