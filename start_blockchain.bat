@echo off
echo Starting Hardhat local node for blockchain integration...
echo.

cd web3\web3
echo Changed directory to: %cd%
echo.

echo Running Hardhat node (local blockchain)...
start cmd /k "npx hardhat node"
echo.

echo Hardhat node should now be running in a separate window.
echo Keep that window open for blockchain integration to work.
echo.

echo Waiting for Hardhat node to initialize...
timeout /t 5 /nobreak >nul

echo Done! The blockchain node is now ready.
echo You can now start the accident detection system.
echo.

timeout /t 2 /nobreak >nul 