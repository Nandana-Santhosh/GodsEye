# GodsEye - Accident Detection and Reporting System

This project combines ML-based accident detection with blockchain-based reporting.

## System Components

1. **ML Component**: Convolutional Neural Network for detecting accidents from images
2. **Blockchain Component**: Ethereum smart contract for immutable accident reporting
3. **Frontend**: React-based UI for interaction with the system

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

#### 2. Install Web3 dependencies
```bash
cd web3
npm install
```

#### 3. Install ML dependencies
```bash
cd ../ml
pip install -r requirements.txt
```

#### 4. Install Frontend dependencies
```bash
cd ../frontend
npm install
```

### Running the Application

#### 1. Start the Blockchain (Hardhat node)
```bash
cd web3
npx hardhat node
```

#### 2. Deploy the Smart Contract
Open a new terminal and run:
```bash
cd web3
npx hardhat run scripts/deploy.js --network localhost
```
Note: The contract will be deployed to: `0x5FbDB2315678afecb367f032d93F642f64180aa3`

#### 3. Start the ML API
Open a new terminal and run:
```bash
cd ml
python app.py
```

#### 4. Start the Frontend
Open a new terminal and run:
```bash
cd frontend
npm run dev
```

#### 5. Set up MetaMask
1. Install the MetaMask browser extension if you haven't already
2. Add a new network with these settings:
   - Network Name: Hardhat Local
   - New RPC URL: http://127.0.0.1:8545
   - Chain ID: 31337
   - Currency Symbol: ETH
3. Import a test account using one of these private keys:
   ```
   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
   ```

### Using the Application

1. Open your browser and go to: `http://localhost:5173`
2. Connect your MetaMask wallet to the application
3. Upload an image to detect accidents
4. If an accident is detected, it will be recorded on the blockchain

## System Architecture

- **ML Model**: CNN for image classification
- **Smart Contract**: Solidity contract for storing accident reports
- **Frontend**: React + TypeScript + Tailwind CSS

## Future Improvements

- Add real-time video processing
- Implement geolocation for accurate accident reporting
- Add user authentication and role-based access control
- Create mobile app for on-the-go reporting

## Features

- **ML-based Accident Detection**: Automatically detect accidents in images and video feeds
- **Anonymous Accident Reporting**: Allow citizens to report accidents with image verification
- **Blockchain Integration**: Store accident data securely on the blockchain for immutable records
- **Admin Dashboard**: Monitor and manage reported accidents
- **Emergency Services Integration**: Dispatch emergency services to accident locations

## Project Structure

- **frontend/**: React-based web application
- **api/**: Express.js API server
- **ml/**: Python-based ML models for accident detection
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

