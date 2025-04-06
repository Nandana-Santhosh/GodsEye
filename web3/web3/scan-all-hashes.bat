@echo off
cls
echo =====================================================
echo    BLOCKCHAIN SCANNER - FIND ALL DEPLOYED HASHES
echo =====================================================
echo.
echo This tool will scan the blockchain for all deployed contracts 
echo and find all IPFS hashes stored across them.
echo.
echo Please wait, this may take a few minutes...
echo.

REM Run the scanner script
call npx hardhat run scripts/scan-contracts.js --network localhost

echo.
echo =====================================================
echo    Press any key to exit
echo =====================================================
pause > nul 