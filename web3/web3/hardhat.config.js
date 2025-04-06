require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

module.exports = {
  solidity: "0.8.28",
  networks: {
    amoy: {
      url: "https://rpc-amoy.polygon.technology/", // ✅ Added missing comma
      accounts: [process.env.PRIVATE_KEY], // Your private key
      chainId: 80002, // Amoy Testnet Chain ID
    },
  },
};
