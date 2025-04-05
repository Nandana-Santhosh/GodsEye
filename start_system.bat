@echo off
echo ================================
echo GodsEye System Startup
echo ================================
echo Features:
echo - Accident Detection with ML
echo - Real-time Alerts Dashboard
echo - Camera Monitoring Grid
echo - Webcam Support for Live Detection
echo ================================
echo.
echo Camera Monitoring Instructions:
echo 1. Go to the Cameras tab in the Admin Dashboard
echo 2. Click the play button for any camera to start it
echo 3. ML model will automatically start analyzing the video
echo 4. Any detected accidents will appear in the Accidents tab
echo NOTE: Camera controls and images use the backend API (port 5000)
echo ================================

:: Check if required directories exist
if not exist ml2\AccSnaps (
  echo Creating AccSnaps directory...
  mkdir ml2\AccSnaps
)

if not exist videos (
  echo Creating videos directory...
  mkdir videos
)

:: Check if model file exists
if not exist ml2\best.pt (
  echo WARNING: ML model file 'best.pt' not found in ml2 directory!
  echo This will cause errors when running accident detection.
  echo Please run 'check_model.bat' or 'fix_model_path.bat' to resolve this.
  echo.
  set /p continue="Do you want to continue anyway? (y/n): "
  if /i not "%continue%"=="y" exit /b 1
)

:: Start the backend server in a new window
echo Starting Backend Server...
start "GodsEye Backend" cmd /c "cd backend && call start_backend.bat"

:: Wait a moment for backend to initialize
timeout /t 3 /nobreak > nul

:: Start the frontend in a new window
echo Starting Frontend...
start "GodsEye Frontend" cmd /c "cd frontend && npm run dev"

:: Wait a moment for frontend to initialize
timeout /t 5 /nobreak > nul

echo.
echo ================================
echo System started successfully!
echo.
echo Access the dashboard at: http://127.0.0.1:5173
echo Backend API running at: http://127.0.0.1:5000
echo.
echo If you encounter connection issues, run 'fix_connection.bat'
echo If ML model errors occur, run 'fix_model_path.bat'
echo ================================

:: Keep the console open
pause