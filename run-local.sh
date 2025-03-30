#!/bin/bash

# Start Hardhat local network
echo "Starting Hardhat local network..."
cd web3
npm run node &
HARDHAT_PID=$!

# Wait for Hardhat to start
sleep 5

# Deploy contract
echo "Deploying contract..."
npm run deploy:local
CONTRACT_ADDRESS=$(grep "DeAcc contract deployed to:" output.txt | cut -d' ' -f5)

# Start ML API server
echo "Starting ML API server..."
cd ../ml
python app.py &
ML_PID=$!

# Start frontend
echo "Starting frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Update contract address in frontend
echo "Updating contract address in frontend..."
sed -i "s/YOUR_DEPLOYED_CONTRACT_ADDRESS/$CONTRACT_ADDRESS/" src/App.tsx

echo "All components are running!"
echo "Frontend: http://localhost:5173"
echo "ML API: http://localhost:5000"
echo "Hardhat Network: http://localhost:8545"
echo "Contract Address: $CONTRACT_ADDRESS"

# Wait for all processes
wait $HARDHAT_PID $ML_PID $FRONTEND_PID 