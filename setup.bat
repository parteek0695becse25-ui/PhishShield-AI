@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\setup.ps1"
set "CODE=%ERRORLEVEL%"
echo.
pause
exit /b %CODE%
