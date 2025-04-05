# Accident Detection System

This system uses YOLOv8 to detect traffic accidents in videos, treats them as different traffic cameras, and sends accident alerts to a frontend dashboard.

## Setup

1. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Ensure you have the YOLOv8 model file (`best.pt`) in the current directory.

3. Make sure the test videos (`testing1.mp4` and `testing2.mp4`) are in the current directory.

## Project Presentation Setup

This system is designed for a two-laptop presentation setup:

### Laptop 1: Frontend Dashboard
- Run your React frontend admin dashboard
- Make sure it has an API endpoint to receive accident notifications (e.g., `http://192.168.1.100:3000`)

### Laptop 2: Accident Detection System
- Run this accident detection script
- It will monitor both test videos as if they were traffic cameras
- When accidents are detected, it will:
  - Save snapshots in the format `cameraname_timestamp_uniquenumber.jpg`
  - Send accident data to the frontend dashboard

## Running the System

```
python accident_detection.py --dashboard http://FRONTEND_IP:PORT
```

Replace `FRONTEND_IP:PORT` with the IP address and port of your frontend dashboard.

### Command-line Options:

- `--model PATH`: Path to the YOLOv8 model file (default: `best.pt`)
- `--conf FLOAT`: Confidence threshold for detection (default: 0.5)
- `--no-display`: Disable video display windows (useful for headless operation)
- `--snapshot-dir DIR`: Directory to save accident snapshots (default: AccSnaps)
- `--dashboard URL`: URL of the frontend dashboard API (required for integration)

## How It Works

1. The script simultaneously monitors two video sources:
   - `testing1.mp4` (treated as Camera 1 at Highway 101 North)
   - `testing2.mp4` (treated as Camera 2 at Main Street Intersection)

2. When an accident is detected:
   - The detection is highlighted on the video display
   - Up to 3 snapshots are saved in the `AccSnaps` folder
   - An alert is sent to the frontend dashboard with:
     - Camera name
     - Location coordinates
     - Timestamp
     - Confidence level
     - Path to the snapshot image

3. The frontend dashboard can:
   - Display the accident alerts
   - Show the accident location
   - Display the snapshot images
   - Allow admins to acknowledge and manage the alerts

## Dashboard Integration

The system sends JSON data to your frontend with the following structure:

```json
{
  "camera_name": "cam1",
  "location": "37.7749,-122.4194",
  "timestamp": "2023-04-04T15:30:45.123456",
  "confidence": 0.85,
  "snapshot_path": "AccSnaps/cam1_20230404_153045_0.jpg"
}
```

Your frontend should implement an API endpoint that can receive this data and update the dashboard accordingly.

## Testing Without a Frontend

For testing without connecting to a frontend, you can run:

```
python accident_detection.py
```

This will still detect accidents and save snapshots, but won't try to send notifications to a dashboard. The accident details will be printed to the console. 