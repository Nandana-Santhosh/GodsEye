@echo off
echo Starting GodsEye Frontend System
echo ================================

cd frontend

REM Kill any existing Node processes that might be using the ports
taskkill /f /im node.exe >nul 2>&1

echo Starting notification server in background...
start cmd /k "node server.js"

echo Waiting for server to initialize...
timeout /t 5

echo Starting frontend development server...
start cmd /k "npm run dev"

echo.
echo Frontend system started!
echo - Notification server running on http://127.0.0.1:5000 (logs in frontend/server_logs.txt)
echo - Frontend application running on http://127.0.0.1:5173 (logs in frontend/dev_logs.txt)
echo.
echo Both servers are now running in the background.
echo.
echo When ready to run the ML detection, open a new terminal and execute:
echo cd ml2
echo python accident_detection.py --dashboard-url http://127.0.0.1:5173 --display
echo.
echo To stop the frontend servers when done: taskkill /f /im node.exe 