@echo off
cls
echo =====================================================
echo    IPFS HASH CONSOLIDATOR - UNIFIED CONTRACT
echo =====================================================
echo.
echo This tool will:
echo 1. Find all IPFS hashes across multiple contracts
echo 2. Create a new contract with all hashes in one place
echo 3. Save the new contract address for future use
echo.
echo IMPORTANT: Please run scan-all-hashes.bat first!
echo.
echo Press any key to begin the consolidation...
pause > nul

REM Run the consolidation script
call npx hardhat run scripts/consolidate-hashes.js --network localhost

echo.
echo =====================================================
echo    Press any key to exit
echo =====================================================
pause > nul 