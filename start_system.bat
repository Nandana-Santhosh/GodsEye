@echo off
echo Starting GodsEye Accident Detection System
echo ===========================================

REM Create the videos directory if it doesn't exist
if not exist "videos" mkdir videos

REM Check if there are videos in the videos directory
set hasVideos=0
for %%f in (videos\*.mp4) do set hasVideos=1
for %%f in (videos\*.avi) do set hasVideos=1
for %%f in (videos\*.mov) do set hasVideos=1

if %hasVideos%==0 (
  echo No video files found in videos directory.
  echo Downloading a sample video for testing...
  
  REM Download a sample video for testing
  powershell -Command "& {Invoke-WebRequest -Uri 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4' -OutFile 'videos\sample-video.mp4'}"
  
  if not exist "videos\sample-video.mp4" (
    echo Failed to download sample video.
    echo Please manually add some video files (MP4, AVI, MOV) to the videos folder.
    pause
    exit /b
  )
  
  echo Sample video downloaded successfully.
)

REM Check if AccSnaps directory exists
if not exist "ml2\AccSnaps" mkdir ml2\AccSnaps

REM Start the Notification Server
start cmd /k "cd frontend && echo Starting notification server... && npm run start:server"

REM Allow time for the server to start
timeout /t 5

REM Start the Frontend
start cmd /k "cd frontend && echo Starting frontend... && npm run dev"

REM Start the ML Detection System
start cmd /k "cd ml2 && echo Starting accident detection... && python accident_detection.py --dashboard-url http://localhost:5000 --display"

echo All systems started!
echo - Notification server is running on port 5000
echo - Frontend is accessible at http://localhost:5173
echo - ML detection system is running and sending notifications to the server
echo.
echo Press any key to shut down all systems...
pause > nul

REM Kill all related processes
taskkill /f /im node.exe
taskkill /f /im python.exe

echo System shutdown complete.