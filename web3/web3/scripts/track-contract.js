const fs = require('fs');
const path = require('path');

// Path to the file storing the contract address
const addressFilePath = path.join(__dirname, '..', 'contract-address.json');

/**
 * Saves the deployed contract address to a file
 * @param {string} address - The contract address to save
 */
function saveContractAddress(address) {
  const data = {
    address: address,
    timestamp: new Date().toISOString(),
    network: 'localhost'
  };
  
  fs.writeFileSync(addressFilePath, JSON.stringify(data, null, 2));
  console.log(`Contract address saved to ${addressFilePath}`);
}

/**
 * Gets the saved contract address
 * @returns {string|null} The contract address or null if not found
 */
function getContractAddress() {
  try {
    if (fs.existsSync(addressFilePath)) {
      const data = JSON.parse(fs.readFileSync(addressFilePath));
      return data.address;
    }
  } catch (error) {
    console.error(`Error reading contract address: ${error.message}`);
  }
  
  return null;
}

module.exports = {
  saveContractAddress,
  getContractAddress
}; 