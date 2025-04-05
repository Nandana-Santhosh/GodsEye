@echo off
echo Starting GodsEye Backend Server...

:: Check if node_modules exists, if not run npm install
if not exist node_modules (
  echo Installing dependencies...
  npm install
)

:: Run the server
echo Starting the server...
node server.js

:: If we get here, server crashed or was stopped
echo.
echo Server stopped.
pause 