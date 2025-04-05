const hre = require("hardhat");

async function main() {
  console.log("Deploying DeAcc contract...");
  
  // Get the contract factory
  const DeAcc = await hre.ethers.getContractFactory("contracts/DeAcc.sol:DeAcc");
  
  // Deploy the contract
  const deAcc = await DeAcc.deploy();
  await deAcc.deployed();
  
  console.log(`DeAcc contract deployed to: ${deAcc.address}`);
  
  // Add a small delay to ensure the console output is captured
  await new Promise(r => setTimeout(r, 1000));
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 