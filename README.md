# GodsEye - Accident Detection and Reporting System

This project combines ML-based accident detection with blockchain-based reporting and real-time notification.

## System Components

1. **ML Component**: YOLOv8-based accident detection for video streams
2. **Blockchain Component**: Ethereum smart contract for immutable accident reporting
3. **Frontend**: React-based UI with real-time accident notifications
4. **Notification System**: Socket.IO-based real-time alerts

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- Python 3.8+
- MetaMask browser extension

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

#### 3. Install Frontend dependencies
```bash
cd ../frontend
npm install
```

## Running the System

You can run the system in two modes:
1. **Local Testing Mode** - Everything on a single laptop
2. **Presentation Mode** - Frontend and ML components on separate laptops

### Local Testing Mode (Single Laptop)

Use this mode for development and testing when everything is running on your own laptop.

#### 1. Start the Frontend Services
```bash
# Run the combined frontend startup script
./start_frontend.bat
```
This starts both the notification server (port 5000) and the React frontend (port 5173).

#### 2. Run the ML Detection System
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

#### 3. Access the Dashboard
Open a browser and navigate to:
```
http://127.0.0.1:5173
```

### Presentation Mode (Two Laptops)

Use this mode when demonstrating the system using two separate laptops.

#### Setup Frontend Laptop:

1. **Start the Frontend Services**
   ```bash
   # Run the combined frontend startup script
   ./start_frontend.bat
   ```

2. **Find Your IP Address**
   ```bash
   # Windows
   ipconfig
   
   # Look for IPv4 Address under your active network adapter
   # Example: 192.168.1.105
   ```

3. **Access the Dashboard**
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

## Project Structure

- **frontend/**: React-based web application with Socket.IO notification server
- **ml2/**: Python-based ML models for accident detection using YOLOv8
- **web3/**: Solidity smart contracts for blockchain integration

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

