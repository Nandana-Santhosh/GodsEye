// Import required modules
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import supabase, { accidentDB } from './supabase.js';
import { uploadToIpfs, uploadBase64ToIpfs } from './ipfs.js';
import { storeInBlockchain, isHardhatNodeRunning } from './blockchain.js';

// Load environment variables
dotenv.config({ path: './.env' });

// Twilio Configuration - add your credentials here when ready to use real API
const TWILIO_CONFIG = {
  enabled: process.env.TWILIO_ENABLED === 'true', // Set to true to enable real Twilio API calls
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  fromPhone: process.env.TWILIO_PHONE_NUMBER
};

// Show Twilio configuration status on startup (without exposing sensitive data)
console.log(`Twilio configuration status:
- Enabled: ${TWILIO_CONFIG.enabled}
- Account SID configured: ${!!TWILIO_CONFIG.accountSid}
- Auth Token configured: ${!!TWILIO_CONFIG.authToken}
- Phone Number configured: ${!!TWILIO_CONFIG.fromPhone}
- Emergency numbers configured: Ambulance (${!!process.env.AMBULANCE_PHONE}), Fire Force (${!!process.env.FIREFORCE_PHONE})
`);

// Emergency service phone numbers - replace with actual numbers when using real API
const EMERGENCY_PHONES = {
  ambulance: process.env.AMBULANCE_PHONE,
  fireforce: process.env.FIREFORCE_PHONE
};

// Function to send SMS using Twilio
async function sendTwilioSMS(to, body) {
  if (!TWILIO_CONFIG.enabled) {
    console.log('TWILIO SIMULATION: Would send SMS to', to);
    console.log('Message:', body);
    return { success: true, simulation: true };
  }
  
  try {
    console.log(`Attempting to send SMS to ${to} using Twilio...`);
    
    if (!TWILIO_CONFIG.accountSid || !TWILIO_CONFIG.authToken || !TWILIO_CONFIG.fromPhone) {
      throw new Error('Missing Twilio credentials. Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env');
    }
    
    // Dynamic import of Twilio library to avoid requiring it when not in use
    const twilio = await import('twilio');
    const client = twilio.default(TWILIO_CONFIG.accountSid, TWILIO_CONFIG.authToken);
    
    console.log(`Using Twilio phone number: ${TWILIO_CONFIG.fromPhone}`);
    console.log(`Sending SMS to: ${to}`);
    
    const message = await client.messages.create({
      body: body,
      from: TWILIO_CONFIG.fromPhone,
      to: to
    });
    
    console.log(`SMS sent successfully with SID: ${message.sid}`);
    return { success: true, messageSid: message.sid };
  } catch (error) {
    console.error('Error sending SMS with Twilio:');
    console.error(`- Error Name: ${error.name}`);
    console.error(`- Error Message: ${error.message}`);
    console.error(`- Error Code: ${error.code || 'N/A'}`);
    console.error(`- Error Status: ${error.status || 'N/A'}`);
    console.error(`- More Info: ${error.moreInfo || error.more_info || 'N/A'}`);
    
    if (error.message.includes('authenticate')) {
      console.error('Authentication error: Check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
    } else if (error.message.includes('phone number')) {
      console.error('Phone number error: Check your TWILIO_PHONE_NUMBER and recipient numbers');
    }
    
    return { 
      success: false, 
      error: error.message,
      code: error.code,
      status: error.status,
      moreInfo: error.moreInfo || error.more_info
    };
  }
}

// Get current file directory (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Path to frontend dist directory for production
const distPath = path.join(__dirname, '..', 'frontend', 'dist');
const isProduction = fs.existsSync(distPath);

// Serve static files in production mode
if (isProduction) {
  console.log('Running in production mode, serving from dist directory');
  app.use(express.static(distPath));
} else {
  console.log('Running in development mode, static files served by Vite');
}

// Serve AccSnaps directory from ml2
const snapsPath = path.join(__dirname, '..', 'ml2', 'AccSnaps');
if (fs.existsSync(snapsPath)) {
  // Serve with explicit options for better access
  app.use('/AccSnaps', express.static(snapsPath, {
    setHeaders: (res, path) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cache-Control', 'public, max-age=300');
    }
  }));
  console.log('Serving accident snapshots from:', snapsPath);
  
  // Create the directory if it doesn't exist
  if (!fs.existsSync(snapsPath)) {
    fs.mkdirSync(snapsPath, { recursive: true });
    console.log('Created AccSnaps directory at:', snapsPath);
  }
} else {
  console.warn('AccSnaps directory not found, will create it if needed');
  // Create the directory if it doesn't exist
  fs.mkdirSync(snapsPath, { recursive: true });
  app.use('/AccSnaps', express.static(snapsPath, {
    setHeaders: (res, path) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cache-Control', 'public, max-age=300');
    }
  }));
  console.log('Created and serving AccSnaps directory at:', snapsPath);
}

// Also serve the root directory for images
app.use('/ml2', express.static(path.join(__dirname, '..', 'ml2'), {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
  }
}));

// Serve videos directory for camera feeds
const videosPath = path.join(__dirname, '..', 'videos');
if (fs.existsSync(videosPath)) {
  app.use('/videos', express.static(videosPath, {
    setHeaders: (res, path) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cache-Control', 'public, max-age=300');
    }
  }));
  console.log('Serving videos from:', videosPath);
} else {
  console.warn('Videos directory not found, will create it if needed');
  fs.mkdirSync(videosPath, { recursive: true });
  app.use('/videos', express.static(videosPath, {
    setHeaders: (res, path) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cache-Control', 'public, max-age=300');
    }
  }));
  console.log('Created and serving videos directory at:', videosPath);
}

// Create HTTP server and Socket.IO instance
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  allowEIO3: true, // Allow Engine.IO 3 compatibility
  transports: ['polling', 'websocket'], // Support both polling and websocket
  pingTimeout: 10000, // Longer ping timeout
  pingInterval: 25000, // Longer ping interval
  connectTimeout: 10000, // Longer connect timeout
  maxHttpBufferSize: 1e8 // Increase buffer size for larger payloads
});

// In-memory store for received accidents (as fallback if database is unavailable)
const accidents = [];

// Function to find similar accident (same camera within 5 minutes)
const findSimilarAccident = (newAccident) => {
  const newTime = new Date(newAccident.timestamp).getTime();
  // Look for accidents from the same camera within 5 minutes
  return accidents.find(acc => {
    const accTime = new Date(acc.timestamp).getTime();
    const timeDiff = Math.abs(newTime - accTime) / (1000 * 60); // difference in minutes
    return acc.location.address === newAccident.location.address && timeDiff <= 5;
  });
};

// Helper function to save accidents to database
async function saveAccidentToDatabase(accident) {
  try {
    if (!supabase) {
      console.log('Supabase not initialized, skipping database save');
      return null;
    }
    
    // Check if this is an existing accident by querying the database
    const { data: existingData } = await accidentDB.getById(accident.id);
    
    if (existingData) {
      console.log(`Updating existing accident in database: ${accident.id}`);
      
      // Format the data for update
      const updateData = {
        status: accident.status,
        images: accident.images,
        updated_at: new Date().toISOString()
      };
      
      // Handle IPFS hashes - ensure pinata_hash is a string
      if (accident.ipfs_hashes && accident.ipfs_hashes.length > 0) {
        // Store all hashes in ipfs_hashes array
        updateData.ipfs_hashes = accident.ipfs_hashes;
        // Use the first hash as pinata_hash string
        updateData.pinata_hash = accident.ipfs_hashes[0];
        console.log(`Updating with ${accident.ipfs_hashes.length} IPFS hashes. Primary hash: ${updateData.pinata_hash}`);
      } else if (accident.pinata_hash) {
        // For backward compatibility
        updateData.pinata_hash = accident.pinata_hash;
        // Ensure ipfs_hashes is an array even if we only have one hash
        updateData.ipfs_hashes = [accident.pinata_hash];
        console.log(`Updating with Pinata hash: ${updateData.pinata_hash}`);
      }
      
      // Update in database
      const { data, error } = await accidentDB.updateAccident(accident.id, updateData);
      
      if (error) {
        console.error(`Error updating accident ${accident.id} in database:`, error);
        return null;
      }
      
      return data;
    } else {
      console.log(`Adding new accident to database: ${accident.id}`);
      
      // Format location data 
      let locationString = "";
      if (accident.location) {
        if (typeof accident.location === 'string') {
          locationString = accident.location;
        } else if (accident.location.lat && accident.location.lng) {
          locationString = `${accident.location.lat},${accident.location.lng}`;
        }
      }
      
      // Format the data for insertion
      const dbData = {
        id: accident.id,
        camera_name: accident.source === 'camera' ? accident.description.split(' ')[3] : 'Unknown',
        timestamp: accident.timestamp,
        location: locationString,
        location_address: accident.location?.address || '',
        images: accident.images || [],
        status: accident.status || 'pending',
        source: accident.source || 'camera',
        description: accident.description || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Handle IPFS hashes - ensure pinata_hash is a string
      if (accident.ipfs_hashes && accident.ipfs_hashes.length > 0) {
        // Store all hashes in ipfs_hashes array
        dbData.ipfs_hashes = accident.ipfs_hashes;
        // Use the first hash as pinata_hash string
        dbData.pinata_hash = accident.ipfs_hashes[0];
        console.log(`Adding with ${accident.ipfs_hashes.length} IPFS hashes. Primary hash: ${dbData.pinata_hash}`);
      } else if (accident.pinata_hash) {
        // For backward compatibility
        dbData.pinata_hash = accident.pinata_hash;
        // Ensure ipfs_hashes is an array even if we only have one hash
        dbData.ipfs_hashes = [accident.pinata_hash];
        console.log(`Adding with Pinata hash: ${dbData.pinata_hash}`);
      }
      
      // Insert into database
      const { data, error } = await accidentDB.addAccident(dbData);
      
      if (error) {
        console.error(`Error adding accident ${accident.id} to database:`, error);
        return null;
      }
      
      return data;
    }
  } catch (dbError) {
    console.error('Database error:', dbError);
    return null;
  }
}

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send all existing accidents to newly connected client
  socket.emit('accident-history', accidents);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Camera control endpoints
let activeCameras = new Map(); // Track which cameras are being processed

// Start processing a specific camera
app.post('/api/cameras/start', async (req, res) => {
  try {
    const { cameraId, cameraName, videoPath, location } = req.body;
    
    if (!cameraId || !videoPath) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields (cameraId, videoPath)'
      });
    }
    
    console.log(`Request to start processing camera: ${cameraName} (${videoPath})`);
    
    // If this camera is already being processed, just return success
    if (activeCameras.has(cameraId)) {
      return res.json({
        success: true,
        message: `Camera ${cameraName} is already being processed`,
        cameraId
      });
    }
    
    // Use child_process to start the detection for this specific video
    const { exec } = await import('child_process');
    
    // Format the command for the ML system (using relative path from server root)
    const mlScript = 'accident_detection.py';
    const mlDir = path.join(__dirname, '..', 'ml2');
    const snapshotDir = path.join(mlDir, 'AccSnaps');
    
    // Build the command with proper escaping
    const videoPathResolved = path.join(__dirname, '..', videoPath.replace(/^\//, ''));
    
    // Start the process with cwd set to ml2 directory
    console.log(`Starting ML process for camera ${cameraName}`);
    const cmd = `python "${mlScript}" --single-video "${videoPathResolved}" --camera-name "${cameraName}" --camera-location "${location || cameraName}" --dashboard-url http://127.0.0.1:5000 --snapshot-dir "${snapshotDir}"`;
    
    console.log(`Executing command in directory: ${mlDir}`);
    console.log(`Command: ${cmd}`);
    
    const process = exec(cmd, { cwd: mlDir }, (error, stdout, stderr) => {
      if (error) {
        console.error(`ML process error for camera ${cameraName}:`, error);
        activeCameras.delete(cameraId);
        return;
      }
      
      if (stderr) {
        console.error(`ML process stderr for camera ${cameraName}:`, stderr);
      }
      
      console.log(`ML process stdout for camera ${cameraName}:`, stdout);
    });
    
    // Store the process reference
    activeCameras.set(cameraId, { 
      process, 
      cameraName, 
      videoPath,
      startTime: new Date().toISOString()
    });
    
    // Send success response
    res.json({
      success: true,
      message: `Started processing camera ${cameraName}`,
      cameraId
    });
    
    // Emit event to notify all clients that camera is active
    io.emit('camera-status-update', {
      cameraId,
      status: 'active',
      cameraName,
      videoPath
    });
  
  } catch (error) {
    console.error('Error starting camera processing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start camera processing'
    });
  }
});

// Stop processing a specific camera
app.post('/api/cameras/stop', async (req, res) => {
  try {
    const { cameraId } = req.body;
    
    if (!cameraId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: cameraId'
      });
    }
    
    // Check if this camera is being processed
    if (!activeCameras.has(cameraId)) {
      return res.status(404).json({
        success: false,
        message: `Camera ${cameraId} is not currently being processed`
      });
    }
    
    const camera = activeCameras.get(cameraId);
    console.log(`Stopping processing for camera: ${camera.cameraName}`);
    
    // Kill the process
    try {
      if (camera.process) {
        camera.process.kill();
      }
    } catch (err) {
      console.error(`Error killing process for camera ${cameraId}:`, err);
    }
    
    // Remove from active cameras
    activeCameras.delete(cameraId);
    
    // Send success response
    res.json({
      success: true,
      message: `Stopped processing camera ${camera.cameraName}`,
      cameraId
    });
    
    // Emit event to notify all clients
    io.emit('camera-status-update', {
      cameraId,
      status: 'inactive',
      cameraName: camera.cameraName
    });
    
  } catch (error) {
    console.error('Error stopping camera processing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop camera processing'
    });
  }
});

// Get status of all active cameras
app.get('/api/cameras/active', (req, res) => {
  const activeList = Array.from(activeCameras.entries()).map(([id, camera]) => ({
    cameraId: id,
    cameraName: camera.cameraName,
    videoPath: camera.videoPath,
    startTime: camera.startTime
  }));
  
  res.json({
    success: true,
    activeCameras: activeList
  });
});

// Test API endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API connection successful',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    database: supabase ? 'connected' : 'disconnected',
    clients: io.engine.clientsCount
  });
});

// ML accident detection endpoint
app.post('/api/accidents', async (req, res) => {
  try {
    const { 
      camera_name, 
      location, 
      timestamp, 
      confidence, 
      snapshot_path, 
      images,
      ipfs_hashes // New field for IPFS hashes
    } = req.body;
    
    console.log(`Accident notification received from ${camera_name}`);
    console.log('Data:', JSON.stringify({
      camera_name,
      location: typeof location === 'object' ? `${location.lat},${location.lng}` : location,
      timestamp,
      confidence,
      snapshot_count: images ? images.length : (snapshot_path ? 1 : 0),
      ipfs_hashes: ipfs_hashes || []
    }, null, 2));
    
    // Log IPFS hashes specifically for debugging
    if (ipfs_hashes && ipfs_hashes.length > 0) {
      console.log(`Received ${ipfs_hashes.length} IPFS hashes:`, JSON.stringify(ipfs_hashes));
    }
    
    // Validate required fields
    if (!camera_name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required field: camera_name' 
      });
    }
    
    // Convert location string to coordinates (assuming format: "lat,lng")
    let lat = 0, lng = 0;
    if (typeof location === 'string' && location.includes(',')) {
      [lat, lng] = location.split(',').map(Number);
    }
    
    // Create a new accident object
    const newAccident = {
      id: `acc_${Date.now()}`,
      timestamp: timestamp || new Date().toISOString(),
      location: {
        lat,
        lng,
        address: `Camera: ${camera_name}`
      },
      // Use the images array if provided, otherwise fall back to snapshot_path in an array
      images: images || (snapshot_path ? [snapshot_path] : []),
      status: 'pending',
      source: 'camera',
      description: `Accident detected by ${camera_name} with ${(confidence * 100).toFixed(1)}% confidence`
    };
    
    // Add IPFS hashes if available - ensure they are properly formatted
    if (ipfs_hashes && ipfs_hashes.length > 0) {
      // Ensure ipfs_hashes is an array
      newAccident.ipfs_hashes = Array.isArray(ipfs_hashes) ? ipfs_hashes : [ipfs_hashes];
      // Use the first hash as pinata_hash
      newAccident.pinata_hash = newAccident.ipfs_hashes[0];
      console.log(`Setting IPFS data on accident object: pinata_hash=${newAccident.pinata_hash}, ipfs_hashes=[${newAccident.ipfs_hashes.join(', ')}]`);
    }
    
    // Check if we already have a similar accident (same camera within 5 mins)
    const existingAccident = findSimilarAccident(newAccident);
    
    if (existingAccident) {
      console.log(`Similar accident found, updating images and IPFS hashes for: ${existingAccident.id}`);
      
      // Add the new image if not already present
      newAccident.images.forEach(img => {
        if (!existingAccident.images.includes(img)) {
          existingAccident.images.push(img);
        }
      });
      
      // Limit to 2 images maximum
      if (existingAccident.images.length > 2) {
        existingAccident.images = existingAccident.images.slice(0, 2);
      }
      
      // Add new IPFS hashes if available
      if (newAccident.ipfs_hashes && newAccident.ipfs_hashes.length > 0) {
        // Initialize the array if it doesn't exist
        if (!existingAccident.ipfs_hashes) {
          existingAccident.ipfs_hashes = [];
        }
        
        // Add new hashes if they don't already exist
        newAccident.ipfs_hashes.forEach(hash => {
          if (!existingAccident.ipfs_hashes.includes(hash)) {
            existingAccident.ipfs_hashes.push(hash);
            console.log(`Added IPFS hash to existing accident: ${hash}`);
          }
        });
        
        // Set primary pinata_hash from first hash if not already set
        if (!existingAccident.pinata_hash && existingAccident.ipfs_hashes.length > 0) {
          existingAccident.pinata_hash = existingAccident.ipfs_hashes[0];
          console.log(`Set pinata_hash to ${existingAccident.pinata_hash}`);
        }
      }
      
      // Update timestamp to be the earliest
      if (new Date(newAccident.timestamp) < new Date(existingAccident.timestamp)) {
        existingAccident.timestamp = newAccident.timestamp;
      }
      
      // Update confidence if higher
      const existingConf = parseFloat(existingAccident.description.match(/(\d+\.\d+)%/)?.[1] || 0);
      const newConf = confidence * 100;
      if (newConf > existingConf) {
        existingAccident.description = `Accident detected by ${camera_name} with ${newConf.toFixed(1)}% confidence`;
      }
      
      // Directly update the database with the accident including IPFS hashes
      console.log('Updating accident in database with the following fields:');
      console.log('- id:', existingAccident.id);
      console.log('- pinata_hash:', existingAccident.pinata_hash);
      console.log('- ipfs_hashes:', existingAccident.ipfs_hashes);
      
      // Create specific update data for database
      const dbUpdateData = {
        status: existingAccident.status,
        images: existingAccident.images,
        description: existingAccident.description,
        updated_at: new Date().toISOString()
      };
      
      // Explicitly add IPFS fields to ensure they're included in the update
      if (existingAccident.ipfs_hashes && existingAccident.ipfs_hashes.length > 0) {
        dbUpdateData.ipfs_hashes = existingAccident.ipfs_hashes;
        dbUpdateData.pinata_hash = existingAccident.pinata_hash || existingAccident.ipfs_hashes[0];
      }
      
      // Emit update event with all data including IPFS hashes
      io.emit('accident-updated', {
        ...existingAccident,
        // Ensure ipfs_hashes is an array, using pinata_hash as fallback
        ipfs_hashes: existingAccident.ipfs_hashes && existingAccident.ipfs_hashes.length > 0 
          ? existingAccident.ipfs_hashes 
          : (existingAccident.pinata_hash ? [existingAccident.pinata_hash] : [])
      });
      
      // Save to database if available - use direct update to database
      if (supabase) {
        try {
          const { data, error } = await accidentDB.updateAccident(existingAccident.id, dbUpdateData);
          
          if (error) {
            console.error(`Error updating accident ${existingAccident.id} in database:`, error);
          } else {
            console.log(`Successfully updated accident ${existingAccident.id} with IPFS data in database`);
          }
        } catch (dbError) {
          console.error(`Database error updating accident ${existingAccident.id}:`, dbError);
        }
      }
      
      return res.status(200).json({ 
        success: true, 
        message: 'Accident updated with new images and IPFS hashes',
        accident: existingAccident
      });
    } else {
      // Add to in-memory store
      accidents.unshift(newAccident);
      
      // Keep only the latest 20 accidents for memory management
      if (accidents.length > 20) {
        accidents.splice(20);
      }
      
      // Emit to all connected clients with complete data
      io.emit('new-accident', newAccident);
      
      // Save to database if available - with explicit IPFS data
      if (supabase) {
        try {
          // Format data explicitly for database insertion
          const dbData = {
            id: newAccident.id,
            camera_name: camera_name,
            timestamp: newAccident.timestamp,
            location: typeof location === 'object' ? `${location.lat},${location.lng}` : location,
            location_address: newAccident.location.address,
            images: newAccident.images,
            status: 'pending',
            source: 'camera',
            description: newAccident.description,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          // Explicitly add IPFS fields
          if (newAccident.ipfs_hashes && newAccident.ipfs_hashes.length > 0) {
            dbData.ipfs_hashes = newAccident.ipfs_hashes;
            dbData.pinata_hash = newAccident.pinata_hash || newAccident.ipfs_hashes[0];
            console.log(`Adding new accident with IPFS data: 
              - pinata_hash: ${dbData.pinata_hash}
              - ipfs_hashes: [${dbData.ipfs_hashes.join(', ')}]`);
          }
          
          // Direct database insertion
          const { data, error } = await accidentDB.addAccident(dbData);
          
          if (error) {
            console.error(`Error adding accident ${newAccident.id} to database:`, error);
          } else {
            console.log(`Successfully added accident ${newAccident.id} with IPFS data to database`);
          }
        } catch (dbError) {
          console.error(`Database error adding accident ${newAccident.id}:`, dbError);
        }
      }
      
      console.log(`New accident received from ${camera_name}:`, newAccident);
      
      // Send successful response
      res.status(200).json({ 
        success: true, 
        message: 'Accident notification received',
        accident: newAccident
      });
    }
  } catch (error) {
    console.error('Error processing accident notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process accident notification' 
    });
  }
});

// Provide an API endpoint to get all accidents
app.get('/api/accidents', async (req, res) => {
  try {
    // If Supabase is configured, get accidents from database
    if (supabase) {
      const { data, error } = await accidentDB.getAll();
      
      if (error) {
        console.error('Error fetching accidents from database:', error);
        // Fall back to in-memory accidents
        return res.json(accidents);
      }
      
      // Transform database records to match the expected format
      const formattedAccidents = data.map(acc => ({
        id: acc.id,
        timestamp: acc.timestamp,
        location: {
          lat: parseFloat(acc.location?.split(',')[0] || 0),
          lng: parseFloat(acc.location?.split(',')[1] || 0),
          address: acc.location_address || `Camera: ${acc.camera_name}`
        },
        images: acc.images || [],
        status: acc.status || 'pending',
        source: acc.source || 'camera',
        description: acc.description || `Accident detected by ${acc.camera_name}`,
        pinata_hash: acc.pinata_hash || null,
        ipfs_hashes: acc.ipfs_hashes || []
      }));
      
      return res.json(formattedAccidents);
    } else {
      // No database, return in-memory accidents
      res.json(accidents);
    }
  } catch (error) {
    console.error('Error getting accidents:', error);
    res.status(500).json({ error: 'Failed to retrieve accidents' });
  }
});

// Update accident status endpoint
app.patch('/api/accidents/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['pending', 'acknowledged', 'resolved', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status value' 
      });
    }
    
    // Get the current accident data to check if it's anonymous
    let accidentData = null;
    let isAnonymous = false;
    
    // Check in memory first
    const accidentIndex = accidents.findIndex(acc => acc.id === id);
    if (accidentIndex !== -1) {
      accidentData = accidents[accidentIndex];
      isAnonymous = accidentData.source === 'anonymous';
    }
    
    // If not found in memory or if we need more details for IPFS, check database
    if (!accidentData && supabase) {
      const { data, error } = await accidentDB.getById(id);
      if (!error && data) {
        accidentData = data;
        isAnonymous = accidentData.source === 'anonymous';
      }
    }
    
    // Handle anonymous report rejection (delete from database)
    if (isAnonymous && status === 'rejected') {
      console.log(`Anonymous report ${id} rejected - deleting from database`);
      
      // Delete from database if available
      if (supabase) {
        const { error: deleteError } = await supabase
          .from('accidents')
          .delete()
          .eq('id', id);
        
        if (deleteError) {
          console.error(`Error deleting rejected anonymous report ${id}:`, deleteError);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to delete rejected anonymous report'
          });
        }
        
        console.log(`Successfully deleted rejected anonymous report ${id} from database`);
      }
      
      // Remove from in-memory storage
      if (accidentIndex !== -1) {
        accidents.splice(accidentIndex, 1);
      }
      
      // Notify clients about the deletion
      io.emit('accident-deleted', { id });
      
      return res.json({
        success: true,
        message: `Anonymous report ${id} rejected and deleted`,
        accidentDeleted: true
      });
    }
    
    // Handle anonymous report approval (upload to IPFS and save hash)
    if (isAnonymous && status === 'resolved') {
      console.log(`Anonymous report ${id} approved - processing for IPFS and blockchain`);
      
      try {
        // Attempt to upload image to IPFS if not already done
        if (accidentData && accidentData.images && accidentData.images.length > 0 && !accidentData.pinata_hash) {
          // Get the image path
          const imagePath = accidentData.images[0];
          console.log(`Processing approved anonymous report image for IPFS upload: ${imagePath}`);
          
          // Get the absolute path to the image - FIX: Use correct path joining for AccSnaps
          // The issue is we need to join from the project root directory, not include 'AccSnaps' twice
          const imageAbsPath = imagePath.startsWith('AccSnaps/') 
            ? path.join(__dirname, '..', imagePath) // Path already includes AccSnaps
            : path.join(__dirname, '..', 'ml2', 'AccSnaps', path.basename(imagePath)); // Just use filename
          
          console.log(`Looking for image at path: ${imageAbsPath}`);
          
          if (!fs.existsSync(imageAbsPath)) {
            console.error(`⚠️ Image file not found at path: ${imageAbsPath}`);
            console.log('Trying alternative path locations...');
            
            // Try alternative paths
            const altPaths = [
              path.join(__dirname, '..', 'ml2', imagePath), // Full path relative to ml2
              path.join(__dirname, '..', imagePath), // Full path relative to project root
              path.join(__dirname, '..', 'ml2', 'AccSnaps', imagePath) // Assuming AccSnaps is already in the path
            ];
            
            let foundPath = null;
            for (const tryPath of altPaths) {
              console.log(`Trying path: ${tryPath}`);
              if (fs.existsSync(tryPath)) {
                foundPath = tryPath;
                console.log(`✅ Found image at alternative path: ${foundPath}`);
                break;
              }
            }
            
            if (!foundPath) {
              // Still update the status but no IPFS upload
              console.error('❌ Could not find image file in any location. Continuing without IPFS upload.');
              if (supabase) {
                const { data, error } = await accidentDB.updateAccident(id, { 
                  status,
                  updated_at: new Date().toISOString(),
                  verified: true 
                });
                if (error) {
                  console.error(`Error updating anonymous report ${id} status:`, error);
                } else {
                  console.log(`Updated anonymous report ${id} status to ${status} (no image found)`);
                  accidentData = data;
                }
              }
            } else {
              // Use the found path for IPFS upload
              console.log(`✅ Image file found, uploading to IPFS: ${foundPath}`);
              const ipfsHash = await uploadToIpfs(foundPath);
              processIpfsUploadResult(ipfsHash);
            }
          } else {
            console.log(`✅ Image file found, uploading to IPFS: ${imageAbsPath}`);
            const ipfsHash = await uploadToIpfs(imageAbsPath);
            processIpfsUploadResult(ipfsHash);
          }
          
          // Helper function to process IPFS result and update database
          async function processIpfsUploadResult(ipfsHash) {
            if (ipfsHash) {
              console.log(`✅ Successfully uploaded to IPFS: ${ipfsHash}`);
              
              // Try to store in blockchain if it's running
              const blockchainStored = await storeInBlockchain(ipfsHash);
              if (blockchainStored) {
                console.log(`✅ IPFS hash stored in blockchain: ${ipfsHash}`);
              } else {
                console.log(`⚠️ IPFS hash not stored in blockchain, but continuing with approval`);
              }
              
              // Update with the IPFS hash and status
              if (supabase) {
                const updateData = {
                  status,
                  pinata_hash: ipfsHash,
                  ipfs_hashes: [ipfsHash],
                  updated_at: new Date().toISOString(),
                  verified: true // Add a verified flag
                };
                
                console.log(`Updating database with IPFS hash and resolved status: ${JSON.stringify(updateData)}`);
                const { data, error } = await accidentDB.updateAccident(id, updateData);
                
                if (error) {
                  console.error(`Error updating anonymous report ${id} with IPFS hash:`, error);
                } else {
                  console.log(`Successfully updated anonymous report ${id} with IPFS hash: ${ipfsHash}`);
                  accidentData = data; // Update the accident data for the response
                }
              }
            } else {
              console.error(`Failed to upload image to IPFS`);
              // Just update the status without IPFS hash
              if (supabase) {
                const { data, error } = await accidentDB.updateAccident(id, { 
                  status, 
                  updated_at: new Date().toISOString(),
                  verified: true 
                });
                
                if (error) {
                  console.error(`Error updating anonymous report ${id} status:`, error);
                } else {
                  console.log(`Updated anonymous report ${id} status to ${status} without IPFS hash`);
                  accidentData = data; // Update the accident data for the response
                }
              }
            }
          }
        } else {
          // Just update the status (already has hash or no image)
          if (supabase) {
            const updateData = { 
              status, 
              updated_at: new Date().toISOString(),
              verified: true 
            };
            
            console.log(`Updating anonymous report status to ${status}: ${JSON.stringify(updateData)}`);
            const { data, error } = await accidentDB.updateAccident(id, updateData);
            
            if (error) {
              console.error(`Error updating anonymous report ${id} status:`, error);
            } else {
              console.log(`Successfully updated anonymous report ${id} status to ${status}`);
              accidentData = data; // Update the accident data for the response
            }
          }
        }
        
        // Log IPFS status for the approved report
        if (accidentData && accidentData.pinata_hash) {
          console.log(`Approved report has IPFS hash: ${accidentData.pinata_hash}`);
          if (accidentData.ipfs_hashes && accidentData.ipfs_hashes.length > 0) {
            console.log(`Approved report has ${accidentData.ipfs_hashes.length} IPFS hashes`);
          }
        } else {
          console.log(`Approved report does not have IPFS hash yet`);
        }
      } catch (ipfsError) {
        console.error(`Error processing IPFS for anonymous report ${id}:`, ipfsError);
        // Continue with just the status update
        if (supabase) {
          const { data, error } = await accidentDB.updateAccident(id, { 
            status,
            updated_at: new Date().toISOString(),
            verified: true
          });
          if (!error) {
            accidentData = data;
          }
        }
      }
    } else {
      // Regular status update (not special case)
      // Update in-memory accident
      if (accidentIndex !== -1) {
        accidents[accidentIndex].status = status;
        accidentData = accidents[accidentIndex];
      }
      
      // Update in database if available
      if (supabase) {
        const { data, error } = await accidentDB.updateAccident(id, { status });
        
        if (error) {
          console.error(`Error updating accident ${id} status in database:`, error);
        } else {
          console.log(`Updated accident ${id} status to ${status} in database`);
          accidentData = data; // Update the accident data for the response
        }
      }
    }
    
    // Emit update to all connected clients
    if (accidentData) {
      io.emit('accident-updated', accidentData);
    }
    
    res.json({ 
      success: true, 
      message: `Accident status updated to ${status}`,
      accident: accidentData
    });
  } catch (error) {
    console.error('Error updating accident status:', error);
    res.status(500).json({ success: false, message: 'Failed to update accident status' });
  }
});

// Update accident Pinata hash
app.patch('/api/accidents/:id/pinata-hash', async (req, res) => {
  try {
    const { id } = req.params;
    const { pinata_hash } = req.body;
    
    if (!pinata_hash) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing pinata_hash value' 
      });
    }
    
    // Update in database if available
    if (supabase) {
      const { data, error } = await accidentDB.updateAccident(id, { pinata_hash });
      
      if (error) {
        console.error(`Error updating accident ${id} pinata hash in database:`, error);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to update pinata hash' 
        });
      }
      
      console.log(`Updated accident ${id} pinata hash to ${pinata_hash} in database`);
      
      // Send successful response
      return res.json({ 
        success: true, 
        message: 'Pinata hash updated',
        accident: data
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Database not configured, cannot update pinata hash' 
      });
    }
  } catch (error) {
    console.error('Error updating pinata hash:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update pinata hash' 
    });
  }
});

// Emergency dispatch endpoints
app.post('/api/dispatch/ambulance', async (req, res) => {
  try {
    const { accidentId, location, timestamp, message, recipientPhone } = req.body;
    
    console.log('Ambulance dispatch request received:', {
      accidentId, 
      location: location ? `${location.address} (${location.lat},${location.lng})` : 'N/A',
      recipientPhone
    });
    
    if (!accidentId || !location) {
      console.error('Missing required fields for ambulance dispatch');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields (accidentId, location)'
      });
    }
    
    // Prepare dispatch message
    const currentTime = new Date().toLocaleTimeString();
    const smsMessage = message || 
      `EMERGENCY: Accident reported at ${location.address}. Ambulance required urgently. Coordinates: ${location.lat},${location.lng}. Time: ${currentTime}`;
    
    console.log('Prepared SMS message for ambulance:', smsMessage);
    
    // Phone number to send to (use provided number or default to env var)
    const targetPhone = recipientPhone || EMERGENCY_PHONES.ambulance;
    
    if (!targetPhone) {
      console.error('No ambulance phone number available');
      return res.status(400).json({
        success: false,
        message: 'No recipient phone number provided or configured in AMBULANCE_PHONE'
      });
    }
    
    console.log(`Attempting to send SMS to ambulance service at: ${targetPhone}`);
    
    // Send SMS
    const smsResult = await sendTwilioSMS(targetPhone, smsMessage);
    
    if (smsResult.success) {
      console.log(`Successfully dispatched ambulance for accident ${accidentId} via Twilio:`, smsResult);
      
      res.json({
        success: true,
        message: 'Ambulance dispatch request sent',
        simulation: smsResult.simulation || false,
        smsResult
      });
    } else {
      // Handle SMS sending failure
      console.error(`Failed to dispatch ambulance for accident ${accidentId}:`, smsResult);
      res.status(500).json({
        success: false,
        message: `Failed to dispatch ambulance: ${smsResult.error || 'Unknown error'}`,
        error: smsResult
      });
    }
  } catch (error) {
    console.error('Error dispatching ambulance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to dispatch ambulance: ' + (error.message || 'Unknown error')
    });
  }
});

app.post('/api/dispatch/fireforce', async (req, res) => {
  try {
    const { accidentId, location, timestamp, message, recipientPhone } = req.body;
    
    console.log('Fire force dispatch request received:', {
      accidentId, 
      location: location ? `${location.address} (${location.lat},${location.lng})` : 'N/A',
      recipientPhone
    });
    
    if (!accidentId || !location) {
      console.error('Missing required fields for fire force dispatch');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields (accidentId, location)'
      });
    }
    
    // Prepare dispatch message
    const currentTime = new Date().toLocaleTimeString();
    const smsMessage = message || 
      `EMERGENCY: Fire hazard/accident reported at ${location.address}. Fire response team required urgently. Coordinates: ${location.lat},${location.lng}. Time: ${currentTime}`;
    
    console.log('Prepared SMS message for fire force:', smsMessage);
    
    // Phone number to send to (use provided number or default to env var)
    const targetPhone = recipientPhone || EMERGENCY_PHONES.fireforce;
    
    if (!targetPhone) {
      console.error('No fire force phone number available');
      return res.status(400).json({
        success: false,
        message: 'No recipient phone number provided or configured in FIREFORCE_PHONE'
      });
    }
    
    console.log(`Attempting to send SMS to fire force at: ${targetPhone}`);
    
    // Send SMS
    const smsResult = await sendTwilioSMS(targetPhone, smsMessage);
    
    if (smsResult.success) {
      console.log(`Successfully dispatched fire force for accident ${accidentId} via Twilio:`, smsResult);
      
      res.json({
        success: true,
        message: 'Fire force dispatch request sent',
        simulation: smsResult.simulation || false,
        smsResult
      });
    } else {
      // Handle SMS sending failure
      console.error(`Failed to dispatch fire force for accident ${accidentId}:`, smsResult);
      res.status(500).json({
        success: false,
        message: `Failed to dispatch fire force: ${smsResult.error || 'Unknown error'}`,
        error: smsResult
      });
    }
  } catch (error) {
    console.error('Error dispatching fire force:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to dispatch fire force: ' + (error.message || 'Unknown error')
    });
  }
});

// Anonymous accident report endpoint
app.post('/api/anonymous-report', async (req, res) => {
  try {
    const { image, location, description } = req.body;
    
    // Validate required fields
    if (!location || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: location and description are required' 
      });
    }
    
    // Create a new accident ID
    const accidentId = `anon_${Date.now()}`;
    console.log(`Processing new anonymous report ${accidentId}`);
    
    // Handle the image (base64 encoded)
    let imagePath = null;
    
    if (image && image.startsWith('data:image')) {
      try {
        // Extract the base64 content
        const base64Data = image.split(';base64,').pop();
        
        // Create a filename and path
        const fileName = `anonymous_report_${accidentId}.jpg`;
        const savePath = path.join(__dirname, '..', 'ml2', 'AccSnaps', fileName);
        
        // Ensure the directory exists
        const saveDir = path.join(__dirname, '..', 'ml2', 'AccSnaps');
        if (!fs.existsSync(saveDir)) {
          fs.mkdirSync(saveDir, { recursive: true });
        }
        
        // Save the image to disk
        fs.writeFileSync(savePath, base64Data, { encoding: 'base64' });
        
        // Use the relative path for the database
        imagePath = `AccSnaps/${fileName}`;
        
        console.log(`Saved anonymous report image to ${imagePath}`);
        // Note: We'll only upload to IPFS when the report is approved
      } catch (imageError) {
        console.error('Error processing image:', imageError);
        // Continue without the image
      }
    }
    
    // Create the accident object
    const newAccident = {
      id: accidentId,
      timestamp: new Date().toISOString(),
      location: typeof location === 'string' 
        ? { address: location } 
        : location,
      images: imagePath ? [imagePath] : [],
      status: 'pending',
      source: 'anonymous',
      description: description || 'Anonymous accident report'
    };
    
    // Add to in-memory store
    accidents.unshift(newAccident);
    
    // Keep only the latest 20 accidents for memory management
    if (accidents.length > 20) {
      accidents.splice(20);
    }
    
    // Emit to all connected clients with a special flag for anonymous reports
    io.emit('new-accident', {
      ...newAccident,
      isAnonymous: true
    });
    
    // Save to database if available
    if (supabase) {
      await saveAccidentToDatabase(newAccident);
    }
    
    console.log('New anonymous accident report received:', newAccident);
    
    // Send successful response
    res.status(200).json({ 
      success: true, 
      message: 'Anonymous accident report received and awaiting admin verification',
      accident: newAccident
    });
  } catch (error) {
    console.error('Error processing anonymous accident report:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process anonymous accident report' 
    });
  }
});

// Health check endpoint to test Twilio configuration
app.get('/api/twilio/status', (req, res) => {
  res.json({
    enabled: TWILIO_CONFIG.enabled,
    configured: !!TWILIO_CONFIG.accountSid && !!TWILIO_CONFIG.authToken && !!TWILIO_CONFIG.fromPhone,
    emergencyNumbers: {
      ambulance: EMERGENCY_PHONES.ambulance || 'Not configured',
      fireforce: EMERGENCY_PHONES.fireforce || 'Not configured',
    }
  });
});

// Add a detailed test endpoint for Twilio and emergency numbers
app.get('/api/twilio/test', (req, res) => {
  // Check all environment variables
  const envStatus = {
    TWILIO_ENABLED: process.env.TWILIO_ENABLED === 'true',
    TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: !!process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || 'Not set',
    AMBULANCE_PHONE: process.env.AMBULANCE_PHONE || 'Not set',
    FIREFORCE_PHONE: process.env.FIREFORCE_PHONE || 'Not set'
  };
  
  // Check internal configuration
  const configStatus = {
    enabled: TWILIO_CONFIG.enabled,
    accountSid: !!TWILIO_CONFIG.accountSid,
    authToken: !!TWILIO_CONFIG.authToken,
    fromPhone: TWILIO_CONFIG.fromPhone || 'Not configured',
    ambulancePhone: EMERGENCY_PHONES.ambulance || 'Not configured',
    fireforcePhone: EMERGENCY_PHONES.fireforce || 'Not configured'
  };
  
  res.json({
    environment: envStatus,
    config: configStatus,
    allEnvKeys: Object.keys(process.env).filter(key => 
      key.includes('TWILIO') || 
      key.includes('PHONE') || 
      key.includes('AMBULANCE') || 
      key.includes('FIRE')
    )
  });
});

// Catch-all route for SPA in production
if (isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // In development, serve a simple page
  app.get('/', (req, res) => {
    res.send(`
      <html>
        <head>
          <title>GodsEye Notification Server</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: 0 auto; }
            h1 { color: #2c3e50; }
            a { color: #3498db; }
            .note { background-color: #f8f9fa; padding: 15px; border-left: 4px solid #3498db; margin-bottom: 20px; }
            ul { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>GodsEye Notification Server</h1>
          <div class="note">
            <p>This is the API server for accident notifications.</p>
            <p>The frontend is served by Vite at: 
              <a href="http://127.0.0.1:5173">http://127.0.0.1:5173</a>
            </p>
          </div>
          <h2>Available endpoints:</h2>
          <ul>
            <li><a href="/api/accidents">/api/accidents</a> - Get all accidents</li>
            <li><a href="/api/health">/api/health</a> - Server health check</li>
          </ul>
          <h2>Status:</h2>
          <ul>
            <li>Socket.IO server: <span style="color:green">Running</span></li>
            <li>API server: <span style="color:green">Running</span></li>
            <li>Database: <span style="color:${supabase ? 'green' : 'red'}">${supabase ? 'Connected' : 'Disabled'}</span></li>
            <li>Connected clients: <span id="clients">0</span></li>
          </ul>
          <script>
            // Update connected clients count every few seconds
            setInterval(() => {
              fetch('/api/health')
                .then(res => res.json())
                .then(data => {
                  document.getElementById('clients').textContent = ${io.engine.clientsCount};
                })
                .catch(err => console.error(err));
            }, 5000);
          </script>
        </body>
      </html>
    `);
  });
}

// Start the server
const PORT = process.env.PORT || 5000;
// Listen on all interfaces (0.0.0.0) to allow connections from both IPv4 and IPv6
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Accident notification server listening on port ${PORT}`);
  console.log(`Access the server at http://127.0.0.1:${PORT}`);
  console.log(`For presentation, access the frontend at http://127.0.0.1:5173`);
  console.log(`Database status: ${supabase ? 'Connected' : 'Disabled'}`);
}); 