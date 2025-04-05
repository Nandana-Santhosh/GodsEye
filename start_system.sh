#!/bin/bash

echo "Starting GodsEye Accident Detection System"
echo "==========================================="

# Create the videos directory if it doesn't exist
mkdir -p videos

# Check if there are videos in the videos directory
if [ -z "$(ls -A videos/*.mp4 videos/*.avi videos/*.mov 2>/dev/null)" ]; then
  echo "No video files found in videos directory."
  echo "Please add some video files (MP4, AVI, MOV) to the videos folder."
  exit 1
fi

# Create the AccSnaps directory if it doesn't exist
mkdir -p ml2/AccSnaps

# Function to kill processes on exit
function cleanup {
  echo "Shutting down all processes..."
  pkill -f "node.*start:server"
  pkill -f "node.*run dev"
  pkill -f "python.*accident_detection.py"
  echo "System shutdown complete."
  exit
}

# Set up trap to call cleanup function on exit
trap cleanup EXIT INT TERM

# Start the Notification Server
echo "Starting notification server..."
cd frontend && npm run start:server &
SERVER_PID=$!

# Allow time for the server to start
sleep 5

# Start the Frontend
echo "Starting frontend..."
cd frontend && npm run dev &
FRONTEND_PID=$!

# Change back to root directory
cd ..

# Start the ML Detection System
echo "Starting accident detection..."
cd ml2 && python accident_detection.py --dashboard-url http://localhost:5000 --display &
ML_PID=$!

echo "All systems started!"
echo "- Notification server is running on port 5000"
echo "- Frontend is accessible at http://localhost:5173"
echo "- ML detection system is running and sending notifications to the server"
echo ""
echo "Press Ctrl+C to shut down all systems..."

# Wait for user input
wait 