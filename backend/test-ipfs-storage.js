// Test script for IPFS hash storage in Supabase
import supabase, { accidentDB } from './supabase.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test IPFS hash storage
async function testIpfsStorage() {
  console.log('=======================================');
  console.log('IPFS HASH STORAGE TEST');
  console.log('=======================================');
  
  // Check if Supabase is initialized
  if (!supabase) {
    console.error('ERROR: Supabase is not initialized. Check your environment variables.');
    process.exit(1);
  }
  
  console.log('Supabase client is initialized correctly.');
  
  try {
    // 1. Create a test accident with IPFS hash
    const testId = `test_ipfs_${Date.now()}`;
    const testIpfsHash = `QmTest${Date.now()}`;
    const testIpfsHashes = [testIpfsHash, `QmTest2${Date.now()}`];
    
    console.log('\nSTEP 1: Creating test accident with IPFS hashes');
    console.log(`Test ID: ${testId}`);
    console.log(`Test IPFS Hashes: ${JSON.stringify(testIpfsHashes)}`);
    
    const accidentData = {
      id: testId,
      camera_name: 'Test Camera',
      timestamp: new Date().toISOString(),
      location: '40.7128,-74.0060',
      location_address: 'Test Location',
      images: ['/test/image1.jpg', '/test/image2.jpg'],
      status: 'pending',
      source: 'test',
      description: 'Test accident for IPFS hash storage',
      ipfs_hashes: testIpfsHashes,
      pinata_hash: testIpfsHash
    };
    
    // Add test accident
    const { data: createdData, error: createError } = await accidentDB.addAccident(accidentData);
    
    if (createError) {
      throw new Error(`Failed to create test accident: ${createError.message}`);
    }
    
    console.log('\nCreated test accident:');
    console.log(`- ID: ${createdData.id}`);
    console.log(`- Pinata Hash: ${createdData.pinata_hash}`);
    console.log(`- IPFS Hashes: ${JSON.stringify(createdData.ipfs_hashes)}`);
    
    // Wait a bit to allow database to update
    await wait(1000);
    
    // 2. Retrieve the test accident
    console.log('\nSTEP 2: Retrieving test accident');
    
    const { data: retrievedData, error: retrieveError } = await accidentDB.getById(testId);
    
    if (retrieveError) {
      throw new Error(`Failed to retrieve test accident: ${retrieveError.message}`);
    }
    
    if (!retrievedData) {
      throw new Error('Test accident was not retrieved from database');
    }
    
    console.log('Retrieved test accident:');
    console.log(`- ID: ${retrievedData.id}`);
    console.log(`- Pinata Hash: ${retrievedData.pinata_hash}`);
    console.log(`- IPFS Hashes: ${JSON.stringify(retrievedData.ipfs_hashes)}`);
    
    // Verify the IPFS data
    if (retrievedData.pinata_hash !== testIpfsHash) {
      console.error(`ERROR: Pinata hash mismatch. Expected: ${testIpfsHash}, Got: ${retrievedData.pinata_hash}`);
    } else {
      console.log('✓ Pinata hash stored correctly');
    }
    
    if (!retrievedData.ipfs_hashes || !Array.isArray(retrievedData.ipfs_hashes)) {
      console.error('ERROR: IPFS hashes not found or not an array');
    } else if (retrievedData.ipfs_hashes.length !== testIpfsHashes.length) {
      console.error(`ERROR: IPFS hashes count mismatch. Expected: ${testIpfsHashes.length}, Got: ${retrievedData.ipfs_hashes.length}`);
    } else {
      console.log('✓ IPFS hashes stored correctly');
    }
    
    // 3. Update the test accident with new IPFS hash
    console.log('\nSTEP 3: Updating test accident with new IPFS hash');
    
    const updatedIpfsHash = `QmUpdated${Date.now()}`;
    const updatedIpfsHashes = [...testIpfsHashes, updatedIpfsHash];
    
    console.log(`New IPFS hash: ${updatedIpfsHash}`);
    console.log(`Updated IPFS hashes: ${JSON.stringify(updatedIpfsHashes)}`);
    
    const { data: updatedData, error: updateError } = await accidentDB.updateAccident(testId, {
      ipfs_hashes: updatedIpfsHashes,
      pinata_hash: updatedIpfsHash
    });
    
    if (updateError) {
      throw new Error(`Failed to update test accident: ${updateError.message}`);
    }
    
    console.log('\nUpdated test accident:');
    console.log(`- ID: ${updatedData.id}`);
    console.log(`- Pinata Hash: ${updatedData.pinata_hash}`);
    console.log(`- IPFS Hashes: ${JSON.stringify(updatedData.ipfs_hashes)}`);
    
    // Verify the updated IPFS data
    if (updatedData.pinata_hash !== updatedIpfsHash) {
      console.error(`ERROR: Updated Pinata hash mismatch. Expected: ${updatedIpfsHash}, Got: ${updatedData.pinata_hash}`);
    } else {
      console.log('✓ Updated Pinata hash stored correctly');
    }
    
    if (!updatedData.ipfs_hashes || !Array.isArray(updatedData.ipfs_hashes)) {
      console.error('ERROR: Updated IPFS hashes not found or not an array');
    } else if (updatedData.ipfs_hashes.length !== updatedIpfsHashes.length) {
      console.error(`ERROR: Updated IPFS hashes count mismatch. Expected: ${updatedIpfsHashes.length}, Got: ${updatedData.ipfs_hashes.length}`);
    } else {
      console.log('✓ Updated IPFS hashes stored correctly');
    }
    
    // 4. Clean up - delete the test accident
    console.log('\nSTEP 4: Cleaning up test data');
    
    const { error: deleteError } = await supabase
      .from('accidents')
      .delete()
      .eq('id', testId);
    
    if (deleteError) {
      throw new Error(`Failed to delete test accident: ${deleteError.message}`);
    }
    
    console.log(`✓ Test accident ${testId} deleted successfully`);
    
    console.log('\n=======================================');
    console.log('IPFS HASH STORAGE TEST COMPLETED SUCCESSFULLY');
    console.log('=======================================');
    
  } catch (error) {
    console.error('\nTEST FAILED:');
    console.error(error);
    console.error('\n=======================================');
    console.error('IPFS HASH STORAGE TEST FAILED');
    console.error('=======================================');
    process.exit(1);
  }
}

// Run the test
testIpfsStorage().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 