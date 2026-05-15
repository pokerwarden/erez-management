@echo off
set NSSM=C:\LawFirmSystem\nssm.exe
set SVC=LawFirmApp

echo Stopping and removing LawFirmApp service...
"%NSSM%" stop %SVC% 2>nul
"%NSSM%" remove %SVC% confirm 2>nul
echo [OK] Service removed.
