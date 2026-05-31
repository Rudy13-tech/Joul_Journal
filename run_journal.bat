@echo off
title Joul Journal Launcher
echo ==========================================
echo          Starting Joul Journal...
echo ==========================================
cd /d "%~dp0"

:: Start the Vite local server in a minimized window to keep your desktop clean
start "Joul Dev Server" /min npm run dev

:: Give the server 2 seconds to initialize
timeout /t 2 >nul

:: Launch Joul directly in your default browser
start http://localhost:5173/

echo.
echo [Success] Joul is now running at http://localhost:5173/
echo.
echo You can close this window. Have a great writing session!
timeout /t 4 >nul
exit
