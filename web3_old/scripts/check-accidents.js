const hre = require("hardhat");

async function main() {
  console.log("Checking accident count...");
  
  // Connect to the deployed contract
  const DeAcc = await hre.ethers.getContractFactory("contracts/DeAcc.sol:DeAcc");
  const deAcc = await DeAcc.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");
  
  // Get accident count
  const count = await deAcc.accidentCount();
  console.log(`Total accidents recorded: ${count.toString()}`);
  
  // If there are accidents, get the latest one
  if (count.toNumber() > 0) {
    console.log("\nAccident details:");
    
    for (let i = 1; i <= count; i++) {
      const accident = await deAcc.getAccident(i);
      console.log(`\nAccident #${i}:`);
      console.log(`Location: ${accident.location}`);
      console.log(`Description: ${accident.description}`);
      console.log(`Timestamp: ${new Date(accident.timestamp * 1000).toLocaleString()}`);
      console.log(`Verified: ${accident.isVerified}`);
      console.log(`Image Hash: ${accident.imageHash}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 