const hre = require("hardhat");
const { getContractAddress } = require("./track-contract");

/**
 * Simple script to display all IPFS hashes stored in the blockchain
 * Usage: npx hardhat run scripts/display-hashes.js --network localhost
 */
async function main() {
  console.log("==================================================");
  console.log("   IPFS HASH VIEWER - ACCIDENT DETECTION SYSTEM   ");
  console.log("==================================================");
  
  try {
    // Get the contract factory
    const DeAcc = await hre.ethers.getContractFactory("DeAcc");
    
    // Get the saved contract address
    const savedAddress = getContractAddress();
    let deAcc;
    
    if (savedAddress) {
      console.log(`Using saved contract at: ${savedAddress}`);
      deAcc = await DeAcc.attach(savedAddress);
    } else {
      console.log("No saved contract address found, deploying a new one for reading...");
      deAcc = await DeAcc.deploy();
      await deAcc.deployed();
      console.log(`Connected to new contract at: ${deAcc.address}`);
    }
    
    // Get the total number of accidents
    const numberOfAccidents = await deAcc.numberOfAccidents();
    console.log(`\nTotal accident records: ${numberOfAccidents.toString()}`);
    
    if (numberOfAccidents.toNumber() === 0) {
      console.log("\nNo accident records found in the blockchain.");
      console.log("Run the accident detection system first to generate records.");
      return;
    }
    
    // Use individual getAccident calls instead of getAccidents to avoid formatting issues
    console.log("\nStored IPFS Hashes:");
    console.log("==================================================");
    
    // Use a simple array to track unique hashes
    const uniqueHashes = new Set();
    
    for (let i = 1; i <= numberOfAccidents.toNumber(); i++) {
      // Get each accident individually to prevent formatting issues
      const accident = await deAcc.getAccident(i);
      
      // Extract the snapshot (IPFS hash) which is the 4th element in the returned tuple
      const ipfsHash = accident[3];
      
      // Skip if we've already seen this hash (prevents duplication)
      if (uniqueHashes.has(ipfsHash)) {
        continue;
      }
      
      // Add to our set of unique hashes
      uniqueHashes.add(ipfsHash);
      
      console.log(`\nAccident Record #${i}:`);
      console.log(`IPFS Hash: ${ipfsHash}`);
      
      // Print gateway URLs for easy access
      console.log("\nView image at:");
      console.log(`1. Pinata:     https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
      console.log(`2. IPFS.io:    https://ipfs.io/ipfs/${ipfsHash}`);
      
      // Other accident details if available
      const location = accident[0];  // Location is the first element
      if (location && location !== "") {
        console.log(`Location: ${location}`);
      }
      
      console.log("==================================================");
    }
    
    console.log(`\nFound ${uniqueHashes.size} unique IPFS hashes in the blockchain.`);
    
  } catch (error) {
    console.error("Error accessing blockchain:", error.message);
    
    if (error.message.includes("connect") || error.message.includes("network")) {
      console.log("\nMake sure your Hardhat node is running!");
      console.log("Try running: npx hardhat node");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 