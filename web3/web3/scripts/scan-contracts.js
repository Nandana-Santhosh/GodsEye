const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Script to scan for deployed contracts and check for IPFS hashes in them
 * This helps identify if multiple deployments have different hashes
 */
async function main() {
  console.log("==================================================");
  console.log("   CONTRACT SCANNER - FIND ALL DEPLOYED HASHES    ");
  console.log("==================================================");
  
  try {
    const DeAcc = await hre.ethers.getContractFactory("DeAcc");
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Scanning for contracts deployed by: ${deployer.address}`);
    
    // Fetch recent transactions
    const provider = hre.ethers.provider;
    const blockNumber = await provider.getBlockNumber();
    
    // How many blocks to look back
    const lookBackBlocks = 5000;
    const startBlock = Math.max(0, blockNumber - lookBackBlocks);
    
    console.log(`\nScanning last ${lookBackBlocks} blocks (${startBlock}-${blockNumber})...`);
    
    // Store found contract addresses
    const deployedContracts = new Set();
    const hashesFound = new Map(); // Maps contract address to array of hashes
    
    // Get all transaction hashes for the deployer account
    console.log(`Looking for transactions by ${deployer.address}...`);
    
    // Loop through recent blocks to find contract deployments
    for (let i = blockNumber; i >= startBlock; i--) {
      if (i % 100 === 0) {
        process.stdout.write(`.`); // Show progress
      }
      
      const block = await provider.getBlock(i);
      
      if (!block || !block.transactions) continue;
      
      for (const txHash of block.transactions) {
        const tx = await provider.getTransaction(txHash);
        
        // Skip if not from our deployer
        if (tx.from.toLowerCase() !== deployer.address.toLowerCase()) continue;
        
        // Check if this is a contract creation transaction (to is null)
        if (!tx.to) {
          const receipt = await provider.getTransactionReceipt(txHash);
          
          if (receipt && receipt.contractAddress) {
            const contractAddress = receipt.contractAddress;
            deployedContracts.add(contractAddress);
            
            try {
              // Try to attach to this contract and check if it's our DeAcc contract
              const contract = await DeAcc.attach(contractAddress);
              
              // Try to call a method to see if it's our contract
              try {
                const count = await contract.numberOfAccidents();
                
                // If we get here, it's a valid DeAcc contract
                console.log(`\nFound DeAcc contract at ${contractAddress} with ${count} accidents`);
                
                // If it has accident records, retrieve them
                if (count > 0) {
                  const contractHashes = [];
                  
                  for (let j = 1; j <= count; j++) {
                    const accident = await contract.getAccident(j);
                    const hash = accident[3]; // IPFS hash is at position 3
                    
                    if (hash && hash !== "") {
                      contractHashes.push(hash);
                    }
                  }
                  
                  hashesFound.set(contractAddress, contractHashes);
                }
              } catch (error) {
                // Not our contract, skip
              }
            } catch (error) {
              // Error attaching to contract, skip
            }
          }
        }
      }
    }
    
    console.log(`\n\nScan complete. Found ${deployedContracts.size} contracts created by this account.`);
    console.log(`Found ${hashesFound.size} DeAcc contracts with IPFS hashes.`);
    
    // Display all found hashes across all contracts
    if (hashesFound.size > 0) {
      console.log("\n==================================================");
      console.log("   ALL IPFS HASHES FOUND ACROSS ALL CONTRACTS    ");
      console.log("==================================================");
      
      const allUniqueHashes = new Set();
      
      for (const [address, hashes] of hashesFound.entries()) {
        console.log(`\nContract: ${address}`);
        console.log(`Found ${hashes.length} hashes:`);
        
        for (const hash of hashes) {
          allUniqueHashes.add(hash);
          console.log(`- ${hash}`);
          console.log(`  View at: https://gateway.pinata.cloud/ipfs/${hash}`);
        }
        
        console.log("--------------------------------------------------");
      }
      
      console.log(`\nTotal unique IPFS hashes found across all contracts: ${allUniqueHashes.size}`);
      
      // Save all found hashes to a file for reference
      const hashesFile = path.join(__dirname, '..', 'all-found-hashes.json');
      const hashData = {
        contracts: Object.fromEntries(hashesFound),
        totalContracts: hashesFound.size,
        totalUniqueHashes: allUniqueHashes.size,
        allHashes: Array.from(allUniqueHashes),
        scanTimestamp: new Date().toISOString()
      };
      
      fs.writeFileSync(hashesFile, JSON.stringify(hashData, null, 2));
      console.log(`\nSaved all found hashes to: ${hashesFile}`);
    } else {
      console.log("\nNo IPFS hashes found in any contracts.");
    }
    
  } catch (error) {
    console.error("\nError scanning contracts:", error.message);
    
    if (error.message.includes("connect") || error.message.includes("network")) {
      console.log("\nMake sure your Hardhat node is running!");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 