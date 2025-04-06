import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import net from 'net';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config({ path: './.env' });

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get hardhat directory path
const HARDHAT_DIR = process.env.HARDHAT_DIR || path.join(path.dirname(__dirname), 'web3', 'web3');

/**
 * Check if the Hardhat node is running
 * @returns {Promise<boolean>} True if the node is running
 */
export async function isHardhatNodeRunning() {
  // First try to connect via TCP
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(8545, '127.0.0.1', () => {
      socket.destroy();
      
      // Now try to make an RPC call to verify it's actually Hardhat
      fetch('http://127.0.0.1:8545', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        }),
        timeout: 3000
      })
        .then(response => response.json())
        .then(data => {
          if (data.result) {
            console.log(`✅ Hardhat node is running (block: ${parseInt(data.result, 16)})`);
            resolve(true);
          } else {
            console.error('❌ Connected to port 8545 but received invalid response');
            resolve(false);
          }
        })
        .catch(error => {
          console.error('❌ Error verifying Hardhat node:', error.message);
          resolve(false);
        });
    });
  });
}

/**
 * Store an IPFS hash in the blockchain
 * @param {string} ipfsHash - The IPFS hash to store
 * @returns {Promise<boolean>} True if stored successfully
 */
export async function storeInBlockchain(ipfsHash) {
  if (!ipfsHash) {
    console.error('No IPFS hash provided');
    return false;
  }
  
  if (!fs.existsSync(HARDHAT_DIR)) {
    console.error(`Hardhat directory not found: ${HARDHAT_DIR}`);
    return false;
  }
  
  console.log(`Using Hardhat directory: ${HARDHAT_DIR}`);
  
  // Check if Hardhat node is running
  const nodeRunning = await isHardhatNodeRunning();
  if (!nodeRunning) {
    console.error('❌ Hardhat node is not running! Please start the blockchain node first.');
    return false;
  }
  
  return new Promise((resolve) => {
    try {
      console.log(`[BLOCKCHAIN] Storing IPFS hash in blockchain: ${ipfsHash}`);
      
      // Create environment with IPFS_HASH
      const env = { ...process.env, IPFS_HASH: ipfsHash };
      
      // Run the Hardhat script
      const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      const hardhat = spawn(cmd, ['hardhat', 'run', 'scripts/deploy.js', '--network', 'localhost'], {
        cwd: HARDHAT_DIR,
        env,
        shell: true
      });
      
      let output = '';
      hardhat.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log(`[BLOCKCHAIN] ${text.trim()}`);
      });
      
      hardhat.stderr.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.error(`[BLOCKCHAIN ERROR] ${text.trim()}`);
      });
      
      hardhat.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ IPFS Hash stored in blockchain: ${ipfsHash}`);
          resolve(true);
        } else {
          console.error(`❌ Error storing hash in blockchain (exit code: ${code})`);
          
          // Check for specific errors in the output
          if (output.includes('Cannot connect to the network localhost') || 
              output.includes('ECONNREFUSED')) {
            console.error('Cannot connect to Hardhat node. Please run start_blockchain.bat first.');
            console.error('Your data is still saved to IPFS, but not stored in blockchain.');
          }
          
          resolve(false);
        }
      });
      
      hardhat.on('error', (err) => {
        console.error(`❌ Failed to start Hardhat: ${err.message}`);
        
        if (err.code === 'ENOENT') {
          console.error('Make sure Node.js and NPM are installed and in your PATH');
        }
        
        resolve(false);
      });
      
    } catch (error) {
      console.error(`❌ Unexpected error storing hash in blockchain: ${error.message}`);
      resolve(false);
    }
  });
}

export default {
  isHardhatNodeRunning,
  storeInBlockchain
}; 