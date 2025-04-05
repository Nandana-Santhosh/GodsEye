// Test script for Fireforce SMS functionality

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('=== FIREFORCE SMS TEST SCRIPT ===');
console.log('This script will test sending a test SMS to the configured fireforce number.');
console.log('');

// Check for required environment variables
console.log('Checking environment variables...');
const requiredVars = [
  'TWILIO_ACCOUNT_SID', 
  'TWILIO_AUTH_TOKEN', 
  'TWILIO_PHONE_NUMBER',
  'FIREFORCE_PHONE'
];

let missingVars = false;
for (const varName of requiredVars) {
  if (!process.env[varName]) {
    console.error(`❌ Missing ${varName} in .env file`);
    missingVars = true;
  } else {
    const value = process.env[varName];
    // Only show a few characters to protect sensitive data
    const maskedValue = varName.includes('PHONE') 
      ? value 
      : `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
    console.log(`✓ ${varName}: ${maskedValue}`);
  }
}

if (missingVars) {
  console.error('Please add the missing environment variables to your .env file and try again.');
  process.exit(1);
}

// Ensure TWILIO_ENABLED is set to true
if (process.env.TWILIO_ENABLED !== 'true') {
  console.warn('⚠️ Warning: TWILIO_ENABLED is not set to "true". Setting it to true for this test.');
  process.env.TWILIO_ENABLED = 'true';
}

// Import Twilio
async function runTest() {
  try {
    console.log('\nImporting Twilio library...');
    const twilio = await import('twilio');
    
    // Create Twilio client
    console.log('Creating Twilio client...');
    const client = twilio.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    // Check if FIREFORCE_PHONE is properly formatted
    const fireforcePhone = process.env.FIREFORCE_PHONE;
    console.log(`FIREFORCE_PHONE value: ${fireforcePhone}`);
    if (!fireforcePhone.startsWith('+')) {
      console.warn('⚠️ Warning: FIREFORCE_PHONE should start with a "+" followed by country code');
      console.log('Attempting to send anyway...');
    }
    
    // Send test message
    console.log(`Sending test SMS from ${process.env.TWILIO_PHONE_NUMBER} to ${fireforcePhone}...`);
    
    const message = await client.messages.create({
      body: 'This is a test message from your GodsEye fire force emergency dispatch system.',
      from: process.env.TWILIO_PHONE_NUMBER,
      to: fireforcePhone
    });
    
    console.log('\n✅ SUCCESS! SMS sent successfully.');
    console.log(`Message SID: ${message.sid}`);
    console.log('Check your phone to confirm you received the message.');
    
  } catch (error) {
    console.error('\n❌ ERROR: Failed to send SMS');
    console.error(`Error type: ${error.name}`);
    console.error(`Error message: ${error.message}`);
    
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    
    if (error.status) {
      console.error(`HTTP status: ${error.status}`);
    }
    
    const moreInfo = error.moreInfo || error.more_info;
    if (moreInfo) {
      console.error(`More info: ${moreInfo}`);
    }
    
    // Provide troubleshooting guidance based on error
    console.log('\nTroubleshooting guidance:');
    if (error.message.includes('authenticate')) {
      console.log('- Check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN for typos');
      console.log('- Verify that your Twilio account is active and not suspended');
    } else if (error.message.includes('not a valid phone') || error.code === 21211) {
      console.log('- The FIREFORCE_PHONE number format is invalid. Use E.164 format (e.g., +1XXXXXXXXXX)');
      console.log(`- Current value: ${process.env.FIREFORCE_PHONE}`);
      console.log('- Make sure it includes the country code with a leading + sign');
    } else if (error.message.includes('is not a valid')) {
      console.log('- Your Twilio phone number may not be set up correctly');
      console.log('- Verify that your Twilio phone number is active and can send SMS');
    }
  }
}

runTest(); 