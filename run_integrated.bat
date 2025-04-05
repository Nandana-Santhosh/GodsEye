@echo off
echo Starting GodsEye Accident Detection System
echo =====================================

echo Starting frontend notification server in background...
cd frontend
start /b cmd /c "node server.js > server_logs.txt 2>&1"

echo Waiting for server to initialize...
timeout /t 5

echo Starting frontend development server in background...
start /b cmd /c "npm run dev > dev_logs.txt 2>&1"

echo Waiting for frontend to initialize...
timeout /t 10

echo Starting ML detection system...
cd ..
cd ml2
echo Open http://127.0.0.1:5173 in your browser to view the dashboard
python accident_detection.py --dashboard-url http://127.0.0.1:5173 --display

REM The script will continue running until the ML detection system exits
echo System shutdown initiated. Stopping background services...
taskkill /f /im node.exe > nul 2>&1
echo System shutdown complete. 