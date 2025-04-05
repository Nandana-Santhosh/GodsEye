

/*
const hre = require("hardhat");

const main = async () => {
    const DeAcc = await hre.ethers.getContractFactory("DeAcc");
    const deAcc = await DeAcc.deploy(); // Deploy the contract

    await deAcc.waitForDeployment(); // Use waitForDeployment() instead of deployed()

    console.log("DeAcc deployed to:", await deAcc.getAddress());
};

const runMain = async () => {
    try {
        await main();
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

runMain();
*/

const hre = require("hardhat");

const main = async () => {
    const DeAcc = await hre.ethers.getContractFactory("DeAcc");
    const deAcc = await DeAcc.deploy(); // Deploy the contract
    await deAcc.waitForDeployment(); // Wait for deployment
    console.log("DeAcc deployed to:", await deAcc.getAddress());

    // Get IPFS hash from environment variable
    const ipfsHash = process.env.IPFS_HASH;

    if (!ipfsHash) {
        console.error("❌ No IPFS hash provided in environment variables!");
        process.exit(1);
    }

    // Store the IPFS hash using addAccident function with empty strings for other params
    const txn = await deAcc.addAccident("", "", "", ipfsHash, "");
    await txn.wait(); // Wait for transaction confirmation

    //console.log("✅ IPFS Hash stored successfully:", ipfsHash);
};

const runMain = async () => {
    try {
        await main();
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

runMain();

