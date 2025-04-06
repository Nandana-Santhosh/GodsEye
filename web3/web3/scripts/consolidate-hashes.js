const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { saveContractAddress } = require("./track-contract");

/**
 * Script to consolidate all IPFS hashes into a single contract
 * This fixes the issue where hashes are spread across multiple contracts
 */
async function main() {
  console.log("==================================================");
  console.log("   IPFS HASH CONSOLIDATOR - CREATE SINGLE SOURCE  ");
  console.log("==================================================");
  
  try {
    // First, run a scan to find all hashes across all contracts
    console.log("Scanning for existing hashes...");
    
    const DeAcc = await hre.ethers.getContractFactory("DeAcc");
    const [deployer] = await hre.ethers.getSigners();
    
    // Check if we already have a consolidated hashes file
    const hashesFile = path.join(__dirname, '..', 'all-found-hashes.json');
    let allHashes = [];
    
    if (fs.existsSync(hashesFile)) {
      console.log(`Found existing hashes file: ${hashesFile}`);
      const hashData = JSON.parse(fs.readFileSync(hashesFile));
      allHashes = hashData.allHashes || [];
      console.log(`Loaded ${allHashes.length} hashes from file`);
    } else {
      console.log("No hashes file found. Please run scan-all-hashes.bat first.");
      return;
    }
    
    if (allHashes.length === 0) {
      console.log("No hashes found to consolidate.");
      return;
    }

    // Deploy a new contract to hold all hashes
    console.log("\nDeploying a new contract to hold all hashes...");
    const deAcc = await DeAcc.deploy();
    await deAcc.deployed();
    
    console.log(`New contract deployed at: ${deAcc.address}`);
    
    // Save this address as our primary contract
    saveContractAddress(deAcc.address);
    console.log("Contract address saved for future use.");
    
    // Add all hashes to the new contract
    console.log(`\nAdding ${allHashes.length} hashes to the contract...`);
    
    for (let i = 0; i < allHashes.length; i++) {
      const hash = allHashes[i];
      console.log(`Adding hash ${i+1}/${allHashes.length}: ${hash}`);
      
      // Add the hash to the contract
      const tx = await deAcc.addAccident("", "", "", hash, "");
      await tx.wait();
    }
    
    console.log("\n✅ All hashes have been consolidated into one contract!");
    console.log(`Contract address: ${deAcc.address}`);
    console.log("\nYou can now use view-hashes.bat to see all your hashes in one place.");
    
  } catch (error) {
    console.error("Error consolidating hashes:", error.message);
    
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