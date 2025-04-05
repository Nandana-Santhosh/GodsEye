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
    
    const { data, error } = await supabase
      .from('accidents')
      .insert([accidentData])
      .select();
    
    if (error) {
      console.error('Error adding accident:', error);
      return { error };
    }
    
    return { data: data[0] };
  },
  
  // Update accident
  updateAccident: async (id, updateData) => {
    if (!supabase) return { data: null, error: 'Supabase not initialized' };
    
    // Always update the updated_at timestamp
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('accidents')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error(`Error updating accident ${id}:`, error);
      return { error };
    }
    
    return { data: data[0] };
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