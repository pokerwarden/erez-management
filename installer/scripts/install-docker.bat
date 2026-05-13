@echo off
:: Check if Docker is already running
docker info >nul 2>&1
if not errorlevel 1 (
    echo Docker is already running.
    exit /b 0
)

:: Check if Docker Desktop is installed but just not running
if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
    echo Starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    goto :wait_docker
)

:: Download Docker Desktop
echo Downloading Docker Desktop (this may take a few minutes)...
curl -L -o "%TEMP%\DockerInstaller.exe" "https://desktop.docker.com/win/main/amd64/Docker%%20Desktop%%20Installer.exe"
if errorlevel 1 (
    echo Failed to download Docker Desktop.
    exit /b 1
)

:: Install Docker Desktop silently
echo Installing Docker Desktop...
"%TEMP%\DockerInstaller.exe" install --quiet --accept-license
del "%TEMP%\DockerInstaller.exe" >nul 2>&1

:: Start Docker Desktop
echo Starting Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

:wait_docker
echo Waiting for Docker to be ready (up to 2 minutes)...
set /a tries=0
:loop
timeout /t 5 /nobreak >nul
docker info >nul 2>&1
if not errorlevel 1 (
    echo Docker is ready!
    exit /b 0
)
set /a tries+=1
if %tries% lss 24 goto :loop

echo Docker did not start in time. Please start Docker Desktop manually and retry.
exit /b 1
