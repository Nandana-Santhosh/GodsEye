# GodsEye - System Architecture and Workflow

## Overview

GodsEye is a comprehensive accident detection and reporting system that combines machine learning, blockchain technology, and real-time notification systems to create an end-to-end solution for monitoring, detecting, verifying, and responding to traffic accidents. The system uses advanced computer vision to detect accidents from video streams, stores the accident data securely, provides a real-time dashboard for emergency response, and offers a public accident reporting interface.

## System Components

The GodsEye system is built using a modern microservices architecture divided into several core components:

1. **ML Component**: Computer vision system for accident detection
2. **Backend Server**: API server and real-time notification system
3. **Frontend Application**: User interface for monitoring and administration
4. **Blockchain Component**: Immutable storage of accident records
5. **Database**: Persistent storage of accident data and system state
6. **IPFS Integration**: Decentralized storage for accident images

## Technology Stack

### Machine Learning Component
- **Language**: Python 3.8+
- **Framework**: YOLOv8 (You Only Look Once) for object detection
- **Libraries**: OpenCV, PyTorch, Ultralytics, Socket.IO client
- **Video Processing**: Real-time camera feeds and pre-recorded video support

### Backend Server
- **Language**: JavaScript (Node.js)
- **Framework**: Express.js
- **Real-time Communication**: Socket.IO
- **Database Interface**: Supabase JavaScript client
- **Additional Libraries**: 
  - Form-data and node-fetch for IPFS integration
  - Twilio for emergency notifications

### Frontend Application
- **Language**: TypeScript
- **Framework**: React
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **Charting**: Recharts for statistical visualizations
- **UI Components**: Lucide React for icons, React Hot Toast for notifications

### Blockchain Component
- **Platform**: Ethereum (using Hardhat for local development)
- **Smart Contract Language**: Solidity
- **Libraries**: ethers.js for blockchain interaction

### Database
- **Service**: Supabase (PostgreSQL-based)
- **Features**: Row-Level Security, Real-time subscriptions
- **Schema**: Custom schema with accident tracking, statistics views

### IPFS Integration
- **Service**: Pinata (IPFS pinning service)
- **Storage**: Decentralized storage for accident images
- **Integration**: Custom JavaScript API wrapper for Pinata service

## Component Interaction Flow

### Accident Detection Workflow

1. **Video Input Processing**:
   - The ML system processes video feeds from multiple sources (cameras, videos)
   - YOLOv8 model analyzes frames for potential accident scenarios
   - When confidence exceeds threshold, an accident is detected

2. **Accident Verification**:
   - The system captures a snapshot of the accident scene
   - The snapshot is saved to the local filesystem
   - Accident details are compiled (location, timestamp, confidence)

3. **Backend Notification**:
   - The ML system sends accident data to the backend server via HTTP
   - The server validates the input and creates an accident record
   - If Supabase is configured, the accident is stored in the database
   - The server broadcasts the notification to all connected clients

4. **IPFS Storage** (if enabled):
   - The system uploads the accident snapshot to IPFS via Pinata
   - The IPFS hash is stored with the accident record for verification
   - If blockchain is enabled, the IPFS hash is stored on the Ethereum blockchain

5. **Frontend Updates**:
   - Connected clients receive the accident notification via Socket.IO
   - The dashboard updates in real-time with the new accident
   - Users are alerted with a notification toast
   - The accident appears in the accident list for admin review

### Anonymous Report Workflow

1. **User Report Submission**:
   - A user submits an accident report through the public interface
   - The report includes location, description, and an optional image
   - The system assigns a unique ID to the anonymous report

2. **Report Processing**:
   - The report is saved to the database with 'pending' status
   - The image is stored on the server (not uploaded to IPFS yet)
   - A notification is sent to the admin dashboard

3. **Admin Verification**:
   - Admins see pending anonymous reports in a separate section
   - They can approve or reject the report
   - If approved:
     - The image is uploaded to IPFS
     - The IPFS hash is stored in the database
     - If enabled, the hash is stored on the blockchain
   - If rejected:
     - The report and image are deleted from the system

### Emergency Dispatch Workflow

1. **Emergency Notification**:
   - Admin selects to dispatch emergency services (ambulance or fire force)
   - The system sends an SMS via Twilio to the configured emergency service
   - The SMS includes accident location, timestamp, and description

2. **Status Tracking**:
   - Admins can update the status of accidents (acknowledged, resolved)
   - Status updates are stored in the database
   - All connected clients are notified of status changes

## Data Flow

```
┌──────────────┐    Detection    ┌──────────────┐    Notification   ┌──────────────┐
│              │───────────────>│              │────────────────>│              │
│  ML System   │                │  Backend     │                  │  Frontend    │
│  (Python)    │<───────────────│  (Node.js)   │<────────────────│  (React)     │
│              │    Control     │              │    User Input    │              │
└──────────────┘                └───────┬──────┘                  └──────────────┘
                                        │
                                        │ Storage
                                        ▼
                 ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
                 │              │    │              │    │              │
                 │  Supabase    │<─>│     IPFS     │<─>│  Blockchain   │
                 │  (PostgreSQL)│    │   (Pinata)   │    │  (Ethereum)  │
                 │              │    │              │    │              │
                 └──────────────┘    └──────────────┘    └──────────────┘
```

## Database Schema

The Supabase database uses the following schema for accidents:

```sql
create table public.accidents (
  id text primary key,
  camera_name text not null,
  location text,
  location_address text,
  timestamp timestamptz not null default now(),
  images text[] default array[]::text[],
  status text not null default 'pending',
  description text,
  confidence real,
  source text default 'camera',
  pinata_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

This schema stores all accident information with the following key fields:
- `id`: Unique identifier for the accident
- `camera_name`: Source camera or "anonymous" for user reports
- `location`: Geographical coordinates
- `location_address`: Human-readable address
- `images`: Array of image paths
- `status`: Current status (pending, acknowledged, resolved, rejected)
- `source`: Origin of the report (camera or anonymous)
- `pinata_hash`: IPFS hash for the accident image

## Smart Contract

The Ethereum smart contract (`DeAcc.sol`) provides the following key functions:

1. `addAccident`: Stores accident details on the blockchain
2. `userAddsAccident`: Allows users to report accidents
3. `getAccidents`: Retrieves all accidents
4. `reqInsurance`: Requests insurance information for an accident
5. `checkIfAccidentExistsByPlate`: Verifies if an accident exists by license plate

## Key Files and Components

### Machine Learning
- `ml2/accident_detection.py`: Main accident detection system
- `ml2/best.pt`: YOLOv8 trained model
- `ml2/accident_api.py`: API client for communicating with the backend

### Backend
- `backend/server.js`: Main Express server with Socket.IO
- `backend/supabase.js`: Database interface
- `backend/ipfs.js`: IPFS integration
- `backend/blockchain.js`: Blockchain integration

### Frontend
- `frontend/src/App.tsx`: Main application component
- `frontend/src/components/AdminDashboard.tsx`: Admin interface
- `frontend/src/components/AccidentList.tsx`: Accident display
- `frontend/src/components/CameraGrid.tsx`: Camera monitoring interface
- `frontend/src/components/AnonymousReport.tsx`: Public reporting interface

### Blockchain
- `web3/web3/contracts/DeAcc.sol`: Solidity smart contract
- `web3/web3/scripts/deploy.js`: Contract deployment script

## System Deployment

The system supports two deployment modes:

### Local Test Mode
- All components run on a single machine
- Uses `start_system.bat` to launch all components
- Good for development and testing

### Presentation Mode
- Components distributed across multiple machines
- ML laptop connects to frontend laptop for demonstration
- Uses `run_presentation_ml.bat` for configuration

## System Configuration

Configuration is managed through environment variables:

### Backend `.env` Variables
- `PORT`: Server port (default: 5000)
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous API key
- `FRONTEND_URL`: Frontend application URL
- `TWILIO_ACCOUNT_SID`: Twilio account ID
- `TWILIO_AUTH_TOKEN`: Twilio authentication token
- `TWILIO_PHONE_NUMBER`: Twilio sender phone number
- `AMBULANCE_PHONE`: Ambulance service phone number
- `FIRE_FORCE_PHONE`: Fire service phone number
- `PINATA_API_KEY`: Pinata API key
- `PINATA_SECRET_API_KEY`: Pinata API secret key
- `HARDHAT_DIR`: Path to Hardhat project directory

### ML `.env` Variables
- `PINATA_API_KEY`: Pinata API key
- `PINATA_SECRET_API_KEY`: Pinata secret API key

## Running the System

The system includes several startup scripts to simplify operation:

1. `start_system.bat`: Launches the entire system
2. `start_blockchain.bat`: Starts the Ethereum Hardhat node
3. `start_frontend.bat`: Starts only the frontend
4. `backend/start_backend.bat`: Starts only the backend server
5. `run_presentation_ml.bat`: Configures ML for presentation mode

## Monitoring and Analytics

The system provides several monitoring and analytics capabilities:

1. **Real-time Dashboard**: Shows active accidents and their status
2. **Statistical Reports**: Provides insights on accident trends:
   - Accidents by location
   - Accidents by time of day
   - Accident status distribution
3. **Camera Monitoring**: Real-time view of all connected cameras

## Security and Authentication

The system implements the following security measures:

1. **Admin Authentication**: Login required for admin dashboard access
2. **Database Security**: Supabase Row-Level Security for data protection
3. **Blockchain Verification**: Immutable accident records
4. **IPFS Content Addressing**: Tamper-proof image storage with content hashing

## Integration Points

The system offers several integration points for external systems:

1. **REST API**: Backend provides endpoints for accident management
2. **Socket.IO Events**: Real-time notification system for external clients
3. **Ethereum Contract**: Smart contract interface for blockchain integration
4. **Twilio Integration**: Emergency services notification
5. **IPFS Gateway**: Public access to accident images via IPFS

## Conclusion

GodsEye is a modern, comprehensive accident detection and management system that leverages cutting-edge technologies to provide real-time accident detection, secure storage, and emergency response capabilities. The system's modular architecture allows for flexibility in deployment and scaling, while its integration with blockchain and IPFS ensures data integrity and verification.

The combination of machine learning for detection, real-time notifications for alerting, and blockchain for verification makes GodsEye a powerful solution for improving road safety and emergency response times. 