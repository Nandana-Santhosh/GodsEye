@echo off
cls
color 0A
echo =====================================================
echo    IPFS HASH MANAGER - COMPLETE SOLUTION
echo =====================================================
echo.
echo This tool will perform three operations in sequence:
echo.
echo 1. SCAN the blockchain for all deployed contracts
echo 2. CONSOLIDATE all IPFS hashes into a single contract
echo 3. VIEW all hashes with links to the original images
echo.
echo This is the recommended way to access all your
echo accident images stored in the blockchain.
echo.
echo =====================================================
echo.
echo Press any key to begin...
pause > nul
cls

echo =====================================================
echo    STEP 1: SCANNING BLOCKCHAIN FOR CONTRACTS
echo =====================================================
echo.
echo Running scan-all-hashes.bat...
echo.
call scan-all-hashes.bat
cls

echo =====================================================
echo    STEP 2: CONSOLIDATING HASHES INTO ONE CONTRACT
echo =====================================================
echo.
echo Running consolidate-hashes.bat...
echo.
call consolidate-hashes.bat
cls

echo =====================================================
echo    STEP 3: VIEWING ALL IPFS HASHES
echo =====================================================
echo.
echo Running view-hashes.bat...
echo.
call view-hashes.bat
cls

echo =====================================================
echo    PROCESS COMPLETE
echo =====================================================
echo.
echo All operations completed successfully!
echo.
echo You should now be able to see all your IPFS hashes
echo and access all accident images through the provided links.
echo.
echo =====================================================
echo    Press any key to exit
echo =====================================================
pause > nul 