@echo off
:: Generate .env with random secure values
:: Usage: generate-env.bat <path-to-.env>

set ENV_FILE=%1
if exist "%ENV_FILE%" exit /b 0

for /f "delims=" %%J in ('powershell -Command "-join ((65..90)+(97..122)+(48..57) | Get-Random -Count 48 | %% {[char]$_})"') do set JWT_SECRET=%%J
for /f "delims=" %%N in ('powershell -Command "-join ((65..90)+(97..122)+(48..57) | Get-Random -Count 24 | %% {[char]$_})"') do set N8N_SECRET=%%N

(
echo FIRM_NAME=משרד עורכי דין
echo PORT=4000
echo DATABASE_URL=file:C:/LawFirmSystem/data/lawfirm.db
echo JWT_SECRET=%JWT_SECRET%
echo UPLOAD_DIR=C:/LawFirmSystem/uploads
echo MAX_FILE_SIZE_MB=20
echo N8N_WEBHOOK_SECRET=%N8N_SECRET%
) > "%ENV_FILE%"

echo [OK] .env generated.
