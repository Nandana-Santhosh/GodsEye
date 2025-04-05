// Import required modules
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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

// Check if dist directory exists (for production)
const distPath = path.join(__dirname, 'dist');
const isProduction = fs.existsSync(distPath);

// Serve static files
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

// Create HTTP server and Socket.IO instance
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory store for received accidents
const accidents = [];

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
    console.log('Received accident notification:', req.body);
    const { camera_name, location, timestamp, confidence, snapshot_path, images } = req.body;
    
    if (!camera_name || !location) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields (camera_name, location)'
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
    
    // Add to in-memory store
    accidents.unshift(newAccident);
    
    // Keep only the latest 20 accidents for memory management
    if (accidents.length > 20) {
      accidents.splice(20);
    }
    
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

// Provide an API endpoint to get all accidents
app.get('/api/accidents', (req, res) => {
  res.json(accidents);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
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
}); 