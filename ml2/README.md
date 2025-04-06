# Accident Detection and Blockchain Storage System

This system automatically detects accidents from video feeds, captures snapshots, and securely stores evidence on IPFS and blockchain.

## Features

- 🔍 Automatic accident detection using YOLOv8 model
- 📸 Captures image snapshots when accidents are detected
- 🌐 Uploads evidence to IPFS (InterPlanetary File System)
- 🔗 Stores IPFS hashes on blockchain for tamper-proof verification
- 📊 Integrates with frontend dashboard for monitoring
- 📱 Sends emergency SMS notifications via Twilio

## Requirements

### Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```
# Twilio Configuration
TWILIO_ENABLED=true
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone
AMBULANCE_PHONE=emergency_number
FIREFORCE_PHONE=fireforce_number

# IPFS/Pinata Configuration
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key

# Hardhat/Blockchain Configuration
HARDHAT_DIR=path/to/your/hardhat/project  # Optional, defaults to ../web3/web3
```

### Directory Structure

The system expects the following directories:

- `ml2/AccSnaps`: Stores snapshots for frontend dashboard display
- `ml2/snapshots`: Stores snapshots for IPFS/blockchain upload
- `ml2/Saved snapshots`: Destination for processed snapshots after blockchain upload
- `videos`: Directory containing test videos (optional)

## Usage

Run the accident detection system with integrated blockchain storage:

```
python accident_detection.py --display
```

### Command-line Options

- `--model`: Path to YOLOv8 model file (default: `best.pt`)
- `--threshold`: Confidence threshold (default: `0.5`)
- `--display`: Enable video display
- `--snapshot-dir`: Directory to save snapshots (default: `AccSnaps`)
- `--dashboard-url`: URL of the frontend dashboard API (default: `http://127.0.0.1:5000`)
- `--video-dir`: Directory with video files (default: `videos`)
- `--single-video`: Process only a single video file
- `--camera-name`: Name for the camera when using single-video mode
- `--camera-location`: Location for the camera when using single-video mode
- `--loop-video`: Loop the video in single video mode
- `--disable-blockchain`: Disable automatic blockchain storage

## Workflow

1. The system monitors video feeds for accidents
2. When an accident is detected:
   - Snapshots are captured and saved to both `AccSnaps` and `snapshots` directories
   - Dashboard is notified via API call
   - Snapshots are automatically uploaded to IPFS
   - IPFS hashes are stored on blockchain for verification
3. After processing is complete, remaining snapshots are processed

## Integration

This system replaces the previous workflow that required running `Upload3.py` separately. Now the entire process is handled automatically by `accident_detection.py`.

## Troubleshooting

- **IPFS Upload Failures**: Check that your Pinata API keys are correctly set in the `.env` file
- **Blockchain Storage Failures**: Ensure your Hardhat environment is properly set up and running
- **Dashboard Integration Issues**: Verify the dashboard URL and API endpoints 