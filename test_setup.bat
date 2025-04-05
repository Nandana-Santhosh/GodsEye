@echo off
echo GodsEye Accident Detection System - Test Setup
echo =============================================

REM Check if Python is installed
python --version > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo Python is not installed or not in PATH. Please install Python first.
  pause
  exit /b
)

REM Check if Node.js is installed
node --version > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo Node.js is not installed or not in PATH. Please install Node.js first.
  pause
  exit /b
)

REM Create directories
if not exist "videos" mkdir videos
if not exist "ml2\AccSnaps" mkdir ml2\AccSnaps

REM Install Python dependencies
echo Installing Python dependencies...
cd ml2
pip install -r requirements.txt
cd ..

REM Install Node.js dependencies
echo Installing Node.js dependencies...
cd frontend
npm install
cd ..

REM Create Vite config if it doesn't exist
if not exist "frontend\vite.config.js" (
  echo Creating Vite configuration file...
  (
    echo import { defineConfig } from 'vite';
    echo import react from '@vitejs/plugin-react';
    echo.
    echo // https://vitejs.dev/config/
    echo export default defineConfig({
    echo   plugins: [react()],
    echo   server: {
    echo     proxy: {
    echo       '/api': {
    echo         target: 'http://localhost:5000',
    echo         changeOrigin: true,
    echo         secure: false,
    echo         ws: true,
    echo       }
    echo     }
    echo   }
    echo });
  ) > frontend\vite.config.js
)

REM Create test video
echo Creating test video for accident detection...
cd ml2
python create_test_video.py
cd ..

echo Test setup complete!
echo Now you can run the system using:
echo 1. To start all servers in the current terminal:
echo    run_integrated.bat
echo 2. To start only the frontend servers:
echo    cd frontend && node server.js
echo    Then in another terminal: cd frontend && npm run dev
echo 3. To start only the ML system:
echo    cd ml2 && python accident_detection.py --dashboard-url http://localhost:5173 --display

echo.
echo Would you like to start the system now? (Y/N)
set /p start=

if /i "%start%"=="Y" (
  echo Creating integrated startup script...
  (
    echo @echo off
    echo echo Starting GodsEye Accident Detection System
    echo echo =====================================
    echo.
    echo echo Starting frontend notification server in background...
    echo cd frontend
    echo start /b cmd /c "node server.js > server_logs.txt 2>&1"
    echo.
    echo echo Waiting for server to initialize...
    echo timeout /t 5
    echo.
    echo echo Starting frontend development server in background...
    echo start /b cmd /c "npm run dev > dev_logs.txt 2>&1"
    echo.
    echo echo Waiting for frontend to initialize...
    echo timeout /t 10
    echo.
    echo echo Starting ML detection system...
    echo cd ..
    echo cd ml2
    echo python accident_detection.py --dashboard-url http://localhost:5173 --display
  ) > run_integrated.bat
  
  echo Integrated startup script created: run_integrated.bat
  echo Run it now? (Y/N)
  set /p run_now=
  
  if /i "%run_now%"=="Y" (
    echo Starting integrated system...
    call run_integrated.bat
  ) else (
    echo You can run the system later with: run_integrated.bat
  )
) else (
  echo Setup complete! Run the system when you're ready.
) 