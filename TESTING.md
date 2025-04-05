# GodsEye Accident Detection System - Testing Instructions

These instructions will help you set up and test the GodsEye accident detection system on a single laptop.

## Prerequisites

- Python 3.8+ with pip
- Node.js 14+ with npm
- Git (to clone the repository)

## Quick Start (Windows)

1. Clone the repository
   ```
   git clone https://github.com/yourusername/GodsEye.git
   cd GodsEye
   ```

2. Run the test setup script
   ```
   test_setup.bat
   ```
   This script will:
   - Install all required dependencies
   - Create a test video for accident detection
   - Start the system automatically

## Quick Start (Mac/Linux)

1. Clone the repository
   ```
   git clone https://github.com/yourusername/GodsEye.git
   cd GodsEye
   ```

2. Make scripts executable
   ```
   chmod +x start_system.sh
   ```

3. Install dependencies and create test content
   ```
   mkdir -p videos ml2/AccSnaps
   cd ml2
   pip install -r requirements.txt
   python create_test_video.py
   cd ../frontend
   npm install
   cd ..
   ```

4. Start the system
   ```
   ./start_system.sh
   ```

## Manual Setup

If you prefer to set up the system manually:

### 1. Install ML Dependencies

```bash
cd ml2
pip install -r requirements.txt
cd ..
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 3. Create Test Video

```bash
cd ml2
python create_test_video.py
cd ..
```

### 4. Start Components Manually

Terminal 1 (Notification Server):
```bash
cd frontend
npm run start:server
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Terminal 3 (ML Detection):
```bash
cd ml2
python accident_detection.py --dashboard-url http://localhost:5000 --display
```

## Troubleshooting

### Common Issues

1. **Module not found errors in Python**
   - Ensure you've installed all dependencies: `pip install -r ml2/requirements.txt`

2. **Socket.IO connection errors**
   - Make sure the notification server is running on port 5000
   - Check that no other application is using port 5000

3. **No video displayed in detection window**
   - Make sure your test video was created successfully
   - Check that OpenCV is properly installed

4. **Frontend not receiving notifications**
   - Verify the dashboard URL is set correctly (default: http://localhost:5000)
   - Check browser console for connection errors

5. **Node.js ES module issues**
   - If you encounter ES module errors, make sure the server.js file is using ES modules (import/export) not CommonJS (require/module.exports)

### Resetting the System

If you need to reset the system:

1. Stop all running processes (Ctrl+C or close terminal windows)
2. Delete the AccSnaps directory: `rm -rf ml2/AccSnaps` (or on Windows: `rmdir /s /q ml2\AccSnaps`)
3. Start the system again

## Testing the Frontend Dashboard

1. Once the system is running, open your browser and navigate to http://localhost:5173
2. Go to the Admin Dashboard section
3. Watch for notifications that appear when accidents are detected
4. Click on a notification to view more details

## Custom Test Videos

You can create a custom test video with different parameters:

```bash
cd ml2
python create_test_video.py --output ../videos/my_test.mp4 --duration 60 --fps 20
```

## Using Your Own Videos

You can use your own videos for testing by:

1. Create a "videos" directory in the project root (if it doesn't exist)
2. Copy your video files into the directory (MP4, AVI, or MOV format)
3. Start the accident detection system as normal 