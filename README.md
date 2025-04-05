# GodsEye - Accident Detection and Reporting System

This project combines ML-based accident detection with blockchain-based reporting and real-time notification.

## System Components

1. **ML Component**: YOLOv8-based accident detection for video streams
2. **Backend**: Express-based API and Socket.IO notification server
3. **Frontend**: React-based UI with real-time accident notifications
4. **Database**: Supabase for persistent storage
5. **Blockchain Component**: Ethereum smart contract for immutable accident reporting
6. **Camera Monitoring**: Real-time camera grid with webcam support and video playback

## Project Structure

- **backend/**: Express server with Socket.IO for notifications and API endpoints
- **frontend/**: React-based web application
- **ml2/**: Python-based ML models for accident detection using YOLOv8
- **web3/**: Solidity smart contracts for blockchain integration

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- Python 3.8+
- MetaMask browser extension
- Supabase account (for database)

### Installation

#### 1. Clone the repository
```bash
git clone https://github.com/yourusername/GodsEye.git
cd GodsEye
```

#### 2. Install ML dependencies
```bash
cd ml2
pip install -r requirements.txt
```

#### 3. Install Backend dependencies
```bash
cd ../backend
npm install
```

#### 4. Install Frontend dependencies
```bash
cd ../frontend
npm install
```

#### 5. Set up Supabase Database
1. Create a free account at [Supabase](https://supabase.com)
2. Create a new project
3. Go to SQL Editor and run the SQL commands from `backend/database_schema.sql`
4. Navigate to Project Settings → API → API Settings
5. Copy the "Project URL" and "anon/public" API key
6. Create a `.env` file in the `backend` directory:
   ```
   PORT=5000
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   FRONTEND_URL=http://127.0.0.1:5173
   ```

## Running the System

You can run the system in two modes:
1. **Local Testing Mode** - Everything on a single laptop
2. **Presentation Mode** - Frontend and ML components on separate laptops

### Quick Start

The easiest way to run the entire system is using the unified start script:

```bash
# Start all components with one script
./start_system.bat
```

This will:
1. Start the backend server
2. Launch the frontend application
3. Give you options to start the ML system with or without webcam

### Local Testing Mode (Single Laptop)

Use this mode for development and testing when everything is running on your own laptop.

#### 1. Start the Backend Server
```bash
# Run the backend server
cd backend
./start_backend.bat
```
This starts the notification server (port 5000).

#### 2. Start the Frontend
```bash
# In a new terminal, start the frontend development server
cd frontend
npm run dev
```
This starts the React frontend (port 5173).

#### 3. Run the ML Detection System
Open a new terminal and run:
```bash
cd ml2
python accident_detection.py --display
```

Options:
- `--display`: Show video feeds with accident detection (recommended)
- `--video-dir`: Directory containing video files to process (default: "videos")
- `--snapshot-dir`: Directory to save accident snapshots (default: "AccSnaps")
- `--threshold`: Confidence threshold for accident detection (default: 0.5)
- `--webcam`: Use webcam as an additional camera source for live detection

#### 4. Access the Dashboard
Open a browser and navigate to:
```
http://127.0.0.1:5173
```

### Presentation Mode (Two Laptops)

Use this mode when demonstrating the system using two separate laptops.

#### Setup Frontend Laptop:

1. **Start the Backend Server**
   ```bash
   cd backend
   ./start_backend.bat
   ```

2. **Start the Frontend in a separate terminal**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Find Your IP Address**
   ```bash
   # Windows
   ipconfig
   
   # Look for IPv4 Address under your active network adapter
   # Example: 192.168.1.105
   ```

4. **Access the Dashboard**
   Open a browser and navigate to:
   ```
   http://127.0.0.1:5173
   ```

#### Setup ML Laptop:

1. **Option 1: Using the Presentation Script**
   ```bash
   # Run the presentation mode script
   ./run_presentation_ml.bat
   ```
   When prompted, enter the IP address of the frontend laptop.

2. **Option 2: Manual Command**
   ```bash
   cd ml2
   python accident_detection.py --mode presentation --dashboard-url http://<frontend-laptop-ip>:5000 --display
   ```
   Replace `<frontend-laptop-ip>` with the actual IP address of the frontend laptop.

### Network Configuration for Presentation Mode

Important configuration notes:

1. **Same Network**: Ensure both laptops are on the same network (WiFi or LAN)
2. **Firewall Settings**: Make sure Windows Firewall on the Frontend Laptop allows incoming connections on ports 5000 and 5173
   - Control Panel → System and Security → Windows Defender Firewall → Advanced Settings
   - Add inbound rules for TCP ports 5000 and 5173
3. **Testing Connection**: You can test connectivity between laptops by running:
   ```bash
   # On ML Laptop
   ping <frontend-laptop-ip>
   ```
   
If you encounter connection issues:
- Verify both laptops are on the same network
- Temporarily disable firewalls for testing
- Restart the servers on both laptops

## Real-Time Notification System

The system includes:

1. **Socket.IO Server**: Handles real-time accident notification distribution
2. **Notification Service**: Frontend service that connects to the Socket.IO server
3. **Notification Panel**: UI component that displays accident notifications in real-time
4. **ML Integration**: Detection system sends accident data to the notification server

### How Notifications Work

1. The ML system detects an accident in a video stream
2. It captures a snapshot and sends data to the notification server
3. The server processes the data and broadcasts it to all connected clients
4. The frontend receives the notification and displays it in the NotificationPanel
5. Users can click on notifications to view accident details

## Database Integration

The system uses Supabase as a database backend for persistent storage:

1. Accident records are stored in the `accidents` table
2. The database schema includes organization of accidents by camera, timestamp, and status
3. The accident images are referenced by URL paths
4. The system provides statistics views for analytical insights

Benefits of database integration:
- Persistent storage of accident records
- Prevention of duplicate accident reports 
- Ability to track accident status changes
- Support for statistical analysis
- Integration with blockchain via Pinata hash storage

## System Architecture

- **ML Model**: YOLOv8 model for accident detection
- **Smart Contract**: Solidity contract for storing accident reports
- **Frontend**: React + TypeScript + Tailwind CSS

## Features

- **ML-based Accident Detection**: Automatically detect accidents in video feeds
- **Anonymous Accident Reporting**: Allow citizens to report accidents with image verification
- **Blockchain Integration**: Store accident data securely on the blockchain for immutable records
- **Admin Dashboard**: Monitor and manage reported accidents
- **Emergency Services Integration**: Dispatch emergency services to accident locations
- **Camera Monitoring**: Real-time camera grid with webcam support and video playback

## Prerequisites

- Node.js (v16+)
- Python (v3.8+)
- OpenCV
- TensorFlow
- Metamask or other Web3 wallet
- Mumbai Testnet account with some MATIC (for testing blockchain features)

## Environment Setup

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/GodsEye.git
   cd GodsEye
   ```

2. Install dependencies for all modules:
   ```
   npm run install:all
   ```

3. Set up Python environment for ML:
   ```
   npm run setup:ml
   ```

4. Configure environment variables:
   Create a `.env` file in the `api/` directory with the following content:
   ```
   PORT=3000
   PRIVATE_KEY=your_ethereum_private_key
   CONTRACT_ADDRESS=your_deployed_contract_address
   SECRET_KEY=your_thirdweb_secret_key
   ```

## Running the Application

1. **Start the API Server and Frontend**:
   ```
   npm run dev
   ```

3. The application will be accessible at `http://localhost:5173`

## Deploying the Smart Contract

1. Navigate to the web3 directory:
   ```
   cd web3
   ```

2. Deploy the contract using Thirdweb:
   ```
   npm run deploy
   ```

3. Update the CONTRACT_ADDRESS in your `.env` file with the newly deployed contract address

## API Endpoints

- **GET /accidents**: Get all reported accidents
- **POST /addAccident**: Report a new accident
- **GET /emergency-services**: Get available emergency services
- **POST /emergency-services/dispatch**: Dispatch emergency service to an accident
- **GET /statistics**: Get accident statistics
- **POST /ml/detect**: Detect accidents in an image

## Technology Stack

- **Frontend**: React, TypeScript, TailwindCSS
- **Backend**: Express.js, Node.js
- **ML**: TensorFlow, OpenCV, Python
- **Blockchain**: Solidity, Thirdweb SDK, Polygon Mumbai
- **Storage**: IPFS (via Helia)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Smart Contract Integration

The contract provides:
1. **Immutable Record**: Once an accident is reported to the blockchain, it cannot be altered
2. **Public Verification**: Anyone can verify the authenticity of accident reports
3. **Timestamp Verification**: Blockchain transactions include tamper-proof timestamps
4. **Decentralization**: No central authority controls the accident records

## Camera Monitoring System

The system includes a comprehensive camera monitoring feature:

### Camera Grid Dashboard

The admin dashboard includes a dedicated camera monitoring section where you can:
- View a grid of up to 4 cameras simultaneously
- Start and stop individual camera feeds
- See real-time analysis of video streams for accident detection

### Supported Camera Types

1. **Webcam Integration**: 
   - Connect to your laptop's built-in or external webcam
   - Process the live webcam feed for real-time accident detection
   - Capture snapshots when accidents are detected

2. **Video File Playback**:
   - Play sample traffic videos from the videos directory
   - Analyze video files in real-time for accidents
   - Multiple sample videos can be played simultaneously

### On-Demand Video Processing

When you click play on a camera in the grid:

1. The video starts playing in the frontend
2. A request is sent to the backend server
3. The server launches a dedicated ML process specifically for that video
4. The ML process analyzes the video in real-time
5. Any detected accidents are immediately reported to the dashboard
6. The video loops continuously until stopped
7. When you click stop, the ML process is terminated

This on-demand approach:
- Saves system resources by only processing active cameras
- Allows multiple videos to be analyzed simultaneously
- Enables independent control of each camera
- Provides visual feedback with a "Processing" indicator

### Using the Webcam Feature

To use the webcam for accident detection:

1. **From the Unified Start Script**:
   - Run `start_system.bat`
   - When prompted "Do you want to use webcam?", select "y"
   - Choose whether to auto-start the ML system with webcam

2. **Manually**:
   - Start the backend and frontend as usual
   - Run the ML system with the webcam flag:
     ```bash
     cd ml2
     python accident_detection.py --display --webcam
     ```

3. **From the Camera Grid**:
   - Navigate to the "Cameras" tab in the admin dashboard
   - Click the play button on the webcam feed
   - The system will request camera permissions from your browser

### Sample Videos

Place your sample traffic videos in the `videos` directory. The system will automatically detect them and make them available in the camera grid. Recommended naming format:

- Use descriptive location names (e.g., `highway101.mp4`, `downtown_intersection.mp4`)
- The system will extract the name from the filename and use it in the UI

When accidents are detected in any camera feed (webcam or video), the system will:
1. Capture snapshot images of the accident
2. Store them in the AccSnaps directory
3. Send real-time notifications to the dashboard
4. Display alerts in the Notification Panel
5. Add the accident to the Accidents list with all details

This integrated approach provides a complete end-to-end system for monitoring, detecting, and responding to traffic accidents in real-time.

