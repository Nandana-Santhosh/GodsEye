import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// You need to replace these values with your actual Supabase project URL and anon key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'your-supabase-project-url';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database related functions
export const accidentDB = {
  // Get all accidents
  getAll: async () => {
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
  getById: async (id: string) => {
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
  addAccident: async (accidentData: any) => {
    // Add created_at timestamp if not provided
    if (!accidentData.created_at) {
      accidentData.created_at = new Date().toISOString();
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
  
  // Update accident status
  updateStatus: async (id: string, status: string) => {
    const { data, error } = await supabase
      .from('accidents')
      .update({ status })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error(`Error updating accident ${id}:`, error);
      return { error };
    }
    
    return { data: data[0] };
  },
  
  // Update accident images (add more images to an existing accident)
  addImagesToAccident: async (id: string, newImages: string[]) => {
    // First, get the current images
    const { data: currentData, error: fetchError } = await supabase
      .from('accidents')
      .select('images')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error(`Error fetching accident ${id} images:`, fetchError);
      return { error: fetchError };
    }
    
    // Combine current images with new ones, removing duplicates
    const currentImages = currentData.images || [];
    const updatedImages = [...new Set([...currentImages, ...newImages])];
    
    // Update the record
    const { data, error: updateError } = await supabase
      .from('accidents')
      .update({ images: updatedImages })
      .eq('id', id)
      .select();
    
    if (updateError) {
      console.error(`Error updating accident ${id} images:`, updateError);
      return { error: updateError };
    }
    
    return { data: data[0] };
  },
  
  // Check if an accident exists for a specific camera within a time window
  findSimilarAccident: async (cameraName: string, timestamp: string, timeWindowMinutes: number = 5) => {
    // Calculate time window (default: 5 minutes)
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