@echo off
cls
echo =====================================================
echo    IPFS HASH VIEWER - ACCIDENT DETECTION SYSTEM
echo =====================================================
echo.
echo Checking blockchain for stored IPFS hashes...
echo.

REM Run the script with hardhat
call npx hardhat run scripts/display-hashes.js --network localhost

echo.
echo =====================================================
echo    Press any key to exit
echo =====================================================
pause > nul 