import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });

// Get Pinata credentials
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;

/**
 * Upload a file to IPFS using Pinata
 * @param {string} filePath - Path to the file to upload
 * @returns {Promise<string|null>} - IPFS hash or null if upload failed
 */
export async function uploadToIpfs(filePath) {
  if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
    console.warn("Pinata API keys not found in environment variables. Skipping IPFS upload.");
    return null;
  }
  
  const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";
  
  try {
    // Validate file path
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return null;
    }
    
    console.log(`Uploading to IPFS: ${filePath}`);
    
    // Create form data for file upload
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    
    // Make the request to Pinata
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_API_KEY,
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (response.ok) {
      const ipfsHash = data.IpfsHash;
      console.log(`Successfully uploaded to IPFS: ${ipfsHash}`);
      return ipfsHash;
    } else {
      console.error(`Error uploading to IPFS: ${response.status} ${response.statusText}`);
      console.error('Response:', JSON.stringify(data));
      return null;
    }
  } catch (error) {
    console.error(`Exception during IPFS upload: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    return null;
  }
}

/**
 * Upload a base64 image to IPFS
 * @param {string} base64Data - Base64 encoded image data (with or without data URI prefix)
 * @param {string} outputFileName - Name to save the file as temporarily
 * @returns {Promise<string|null>} - IPFS hash or null if upload failed
 */
export async function uploadBase64ToIpfs(base64Data, outputFileName) {
  try {
    // Remove data URI prefix if it exists
    let base64Content = base64Data;
    if (base64Data.includes(';base64,')) {
      base64Content = base64Data.split(';base64,').pop();
    }
    
    // Create temporary file
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFile = path.join(tempDir, outputFileName);
    
    // Write base64 data to file
    fs.writeFileSync(tempFile, base64Content, { encoding: 'base64' });
    console.log(`Temporary file created: ${tempFile}`);
    
    // Upload to IPFS
    const hash = await uploadToIpfs(tempFile);
    
    // Clean up the temporary file
    try {
      fs.unlinkSync(tempFile);
      console.log(`Temporary file removed: ${tempFile}`);
    } catch (cleanupError) {
      console.warn(`Error cleaning up temporary file: ${cleanupError.message}`);
    }
    
    return hash;
  } catch (error) {
    console.error(`Error uploading base64 to IPFS: ${error.message}`);
    return null;
  }
}

export default {
  uploadToIpfs,
  uploadBase64ToIpfs
}; 