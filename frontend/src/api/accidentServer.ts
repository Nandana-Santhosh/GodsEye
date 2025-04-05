import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Accident } from '../types';

// Create an Express application
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Create HTTP server and Socket.IO instance
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory store for received accidents (in a real app, use a database)
const accidents: Accident[] = [];

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send all existing accidents to newly connected client
  socket.emit('accident-history', accidents);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// API endpoint to receive accident notifications from ML system
app.post('/api/accidents', (req, res) => {
  try {
    const { camera_name, location, timestamp, confidence, snapshot_path } = req.body;
    
    // Convert location string to coordinates (assuming format: "lat,lng")
    const [lat, lng] = location.split(',').map(Number);
    
    // Create a new accident object
    const newAccident: Accident = {
      id: `acc_${Date.now()}`,
      timestamp: timestamp || new Date().toISOString(),
      location: {
        lat,
        lng,
        address: `Camera: ${camera_name}`
      },
      images: [snapshot_path],
      status: 'pending',
      source: 'camera',
      description: `Accident detected by ${camera_name} with ${(confidence * 100).toFixed(1)}% confidence`
    };
    
    // Add to in-memory store
    accidents.unshift(newAccident);
    
    // Emit to all connected clients
    io.emit('new-accident', newAccident);
    
    console.log(`New accident received from ${camera_name}:`, newAccident);
    
    // Send successful response
    res.status(200).json({ 
      success: true, 
      message: 'Accident notification received',
      accident: newAccident
    });
  } catch (error) {
    console.error('Error processing accident notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process accident notification' 
    });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Accident notification server listening on port ${PORT}`);
});

export default httpServer; 