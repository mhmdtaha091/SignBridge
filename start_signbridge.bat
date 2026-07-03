@echo off
echo ===================================
echo    Starting SignBridge
echo    http://localhost:5173
echo ===================================
cd /d "%~dp0web"
start "" http://localhost:5173
npm run dev -- --port 5173
pause
