import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Create and export Supabase client
let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('Supabase client initialized');
} else {
  console.warn('Supabase credentials not found, database features disabled');
}

// Database related functions
export const accidentDB = {
  // Get all accidents
  getAll: async () => {
    if (!supabase) return { data: null, error: 'Supabase not initialized' };
    
    const { data, error } = await supabase
      .from('accidents')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (error) {
      console.error('Error fetching accidents:', error);
      return { error };
    }
    
    // Process and normalize the data with IPFS hashes
    if (data && data.length > 0) {
      console.log(`Retrieved ${data.length} accidents from database`);
      
      // Normalize data: ensure consistent ipfs_hashes and pinata_hash fields
      data.forEach(acc => {
        // If ipfs_hashes is missing but pinata_hash exists, create ipfs_hashes array
        if (acc.pinata_hash && (!acc.ipfs_hashes || acc.ipfs_hashes.length === 0)) {
          acc.ipfs_hashes = [acc.pinata_hash];
          console.log(`Normalized accident ${acc.id}: Created ipfs_hashes array from pinata_hash`);
        }
        
        // If ipfs_hashes exists but pinata_hash is missing, set pinata_hash from first hash
        if (acc.ipfs_hashes && acc.ipfs_hashes.length > 0 && !acc.pinata_hash) {
          acc.pinata_hash = acc.ipfs_hashes[0];
          console.log(`Normalized accident ${acc.id}: Set pinata_hash from first ipfs_hash`);
        }
        
        // Log the normalized data
        if (acc.ipfs_hashes && acc.ipfs_hashes.length > 0) {
          console.log(`Accident ${acc.id} has ${acc.ipfs_hashes.length} IPFS hash(es) with primary hash: ${acc.pinata_hash}`);
        }
      });
    }
    
    return { data };
  },
  
  // Get accident by ID
  getById: async (id) => {
    if (!supabase) return { data: null, error: 'Supabase not initialized' };
    
    const { data, error } = await supabase
      .from('accidents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching accident ${id}:`, error);
      return { error };
    }
    
    return { data };
  },
  
  // Add new accident
  addAccident: async (accidentData) => {
    if (!supabase) return { data: null, error: 'Supabase not initialized' };
    
    // Add created_at timestamp if not provided
    if (!accidentData.created_at) {
      accidentData.created_at = new Date().toISOString();
    }
    
    if (!accidentData.updated_at) {
      accidentData.updated_at = new Date().toISOString();
    }
    
    // Create a clean copy of data to send to Supabase
    const dataForDb = { ...accidentData };
    
    // Handle IPFS hashes - ensure correct format for database
    if (accidentData.ipfs_hashes) {
      // Convert to array if it's not already
      let ipfsArray = Array.isArray(accidentData.ipfs_hashes) 
        ? accidentData.ipfs_hashes 
        : [accidentData.ipfs_hashes];
      
      // Filter out any empty or null values
      ipfsArray = ipfsArray.filter(hash => hash && hash.trim && hash.trim().length > 0);
      
      if (ipfsArray.length > 0) {
        // Set ipfs_hashes
        dataForDb.ipfs_hashes = ipfsArray;
        
        // Set pinata_hash to first hash if not already set
        if (!dataForDb.pinata_hash) {
          dataForDb.pinata_hash = ipfsArray[0];
        }
        
        console.log(`Saving accident with IPFS data:`);
        console.log(`- ipfs_hashes: [${ipfsArray.join(', ')}]`);
        console.log(`- pinata_hash: ${dataForDb.pinata_hash}`);
      }
    } else if (accidentData.pinata_hash) {
      // Only pinata_hash provided
      dataForDb.pinata_hash = accidentData.pinata_hash;
      dataForDb.ipfs_hashes = [accidentData.pinata_hash];
      
      console.log(`Setting ipfs_hashes from pinata_hash: ${accidentData.pinata_hash}`);
    }
    
    // Print all data being inserted
    console.log(`Adding accident to Supabase (ID: ${dataForDb.id})`);
    console.log(`Full data being saved:`, JSON.stringify({
      id: dataForDb.id,
      timestamp: dataForDb.timestamp,
      source: dataForDb.source,
      pinata_hash: dataForDb.pinata_hash,
      ipfs_hashes: dataForDb.ipfs_hashes
    }, null, 2));
    
    try {
      // Insert into database
      const { data, error } = await supabase
        .from('accidents')
        .insert([dataForDb])
        .select();
      
      if (error) {
        console.error('Error adding accident:', error);
        if (error.details) console.error('Error details:', error.details);
        if (error.hint) console.error('Error hint:', error.hint);
        return { error };
      }
      
      console.log(`Successfully added accident ${dataForDb.id} to database with IPFS data`);
      return { data: data[0] };
    } catch (error) {
      console.error('Exception during database insert:', error);
      return { error };
    }
  },
  
  // Update accident
  updateAccident: async (id, updateData) => {
    if (!supabase) return { data: null, error: 'Supabase not initialized' };
    
    // Always update the updated_at timestamp
    updateData.updated_at = new Date().toISOString();
    
    // Create a clean copy of data to send to Supabase
    const dataForUpdate = { ...updateData };
    
    // Handle IPFS hashes - ensure correct format for database
    if (updateData.ipfs_hashes) {
      // Convert to array if it's not already
      let ipfsArray = Array.isArray(updateData.ipfs_hashes) 
        ? updateData.ipfs_hashes 
        : [updateData.ipfs_hashes];
      
      // Filter out any empty or null values
      ipfsArray = ipfsArray.filter(hash => hash && hash.trim && hash.trim().length > 0);
      
      if (ipfsArray.length > 0) {
        // Set ipfs_hashes
        dataForUpdate.ipfs_hashes = ipfsArray;
        
        // Set pinata_hash to first hash if not already set
        if (!dataForUpdate.pinata_hash) {
          dataForUpdate.pinata_hash = ipfsArray[0];
        }
        
        console.log(`Updating accident ${id} with IPFS data:`);
        console.log(`- ipfs_hashes: [${ipfsArray.join(', ')}]`);
        console.log(`- pinata_hash: ${dataForUpdate.pinata_hash}`);
      }
    } else if (updateData.pinata_hash && !updateData.ipfs_hashes) {
      // Only pinata_hash provided
      dataForUpdate.pinata_hash = updateData.pinata_hash;
      dataForUpdate.ipfs_hashes = [updateData.pinata_hash];
      
      console.log(`Setting ipfs_hashes from pinata_hash: ${updateData.pinata_hash}`);
    }
    
    // Print all data being updated
    console.log(`Updating accident in Supabase (ID: ${id})`);
    console.log(`Full update data:`, JSON.stringify({
      status: dataForUpdate.status,
      pinata_hash: dataForUpdate.pinata_hash,
      ipfs_hashes: dataForUpdate.ipfs_hashes
    }, null, 2));
    
    try {
      // Update in database
      const { data, error } = await supabase
        .from('accidents')
        .update(dataForUpdate)
        .eq('id', id)
        .select();
      
      if (error) {
        console.error(`Error updating accident ${id}:`, error);
        if (error.details) console.error('Error details:', error.details);
        if (error.hint) console.error('Error hint:', error.hint);
        return { error };
      }
      
      console.log(`Successfully updated accident ${id} in database with IPFS data`);
      if (data && data.length > 0) {
        console.log(`Updated record has pinata_hash: ${data[0].pinata_hash}`);
        if (data[0].ipfs_hashes) {
          console.log(`Updated record has ipfs_hashes: ${JSON.stringify(data[0].ipfs_hashes)}`);
        }
      }
      
      return { data: data[0] };
    } catch (error) {
      console.error(`Exception during database update for ${id}:`, error);
      return { error };
    }
  },
  
  // Check if an accident exists for a specific camera within a time window
  findSimilarAccident: async (cameraName, timestamp, timeWindowMinutes = 5) => {
    if (!supabase) return { data: null, error: 'Supabase not initialized' };
    
    // Calculate time window
    const date = new Date(timestamp);
    const minDate = new Date(date.getTime() - timeWindowMinutes * 60 * 1000);
    const maxDate = new Date(date.getTime() + timeWindowMinutes * 60 * 1000);
    
    const { data, error } = await supabase
      .from('accidents')
      .select('*')
      .eq('camera_name', cameraName)
      .gte('timestamp', minDate.toISOString())
      .lte('timestamp', maxDate.toISOString())
      .order('timestamp', { ascending: false });
    
    if (error) {
      console.error('Error finding similar accidents:', error);
      return { error };
    }
    
    return { data };
  }
};

export default supabase; 