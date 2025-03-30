import express from 'express'
import bodyParser from 'body-parser'
import {ThirdwebSDK} from '@thirdweb-dev/sdk'
import dotenv from 'dotenv'
import { Configuration, OpenAIApi } from "openai";
import cors from 'cors'
import { createHelia } from 'helia'
import { strings } from '@helia/strings'
import { json } from '@helia/json'
import { registerMLRoutes, initializeML } from './ml-integration.js'

dotenv.config()

const app = express();
app.use(express.json({ limit: '10mb' }));
const port = process.env.PORT || 3000;
app.use(cors())

app.use(bodyParser.json());

// Initialize Thirdweb SDK
const sdk = ThirdwebSDK.fromPrivateKey(`0x${process.env.PRIVATE_KEY}`, "mumbai", {
  secretKey: process.env.SECRET_KEY
});

console.log(`Connecting to contract at ${process.env.CONTRACT_ADDRESS}`);

// Initialize contract promise
const contractPromise = new Promise((resolve, reject) => {
  sdk.getContract(process.env.CONTRACT_ADDRESS).then((contract) => {
    resolve(contract);
  }).catch((error) => {
    reject(error);
  });
});

let contract;
contractPromise.then((_contract) => {
  contract = _contract;
  console.log("Contract connected successfully");
}).catch((error) => {
  console.log("Error connecting to contract:", error);
});

// Initialize IPFS for storing images
const heliaPromise = createHelia().then(helia => {
  console.log("IPFS node initialized");
  return {
    helia,
    stringHandler: strings(helia)
  };
}).catch(error => {
  console.error("Failed to initialize IPFS:", error);
  throw error;
});

// Root endpoint
app.get('/', async(req, res) => {
  res.send('Accident Monitoring System API');
});

// Register ML routes
registerMLRoutes(app);

// Accident endpoints
app.get('/accidents', async(req, res) => {
  try {
    // Get accidents from blockchain
    const contract = await contractPromise;
    const accidents = await contract.call("getAccidents");
    
    // Format the response
    const formattedAccidents = accidents.map((accident, index) => ({
      id: `${index + 1}`,
      timestamp: new Date().toISOString(), // Blockchain doesn't store timestamp, using current time as placeholder
      location: {
        lat: 0,
        lng: 0,
        address: accident.loc
      },
      images: [accident.snapShot],
      status: 'verified',
      source: 'camera',
      description: `Accident detected at ${accident.loc} on ${accident.date} at ${accident.time}`
    }));
    
    res.json(formattedAccidents);
  } catch (error) {
    console.error("Error fetching accidents:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/addAccident", async (req, res) => {
  try {
    const { location, description, images, source } = req.body;
    
    if (!images || images.length === 0) {
      return res.status(400).json({ error: "At least one image is required" });
    }
    
    // Process the first image
    const image = images[0];
    const base64Data = image.split(',')[1];
    
    // Upload to IPFS
    const { stringHandler } = await heliaPromise;
    const cid = await stringHandler.add(base64Data);
    
    // Get current date and time
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0];
    
    // Add to blockchain
    const contract = await contractPromise;
    
    if (source === 'anonymous') {
      // If source is anonymous user
      await contract.call("userAddsAccident", 
        cid, 
        location.lat.toString(), 
        location.lng.toString()
      );
    } else {
      // If source is system camera
      await contract.call("addAccident", 
        location.address, 
        date, 
        time, 
        cid, 
        "Unknown" // Placeholder for license plate
      );
    }
    
    res.status(201).json({
      id: Math.floor(Math.random() * 10000).toString(),
      timestamp: now.toISOString(),
      location,
      images: [cid],
      status: 'pending',
      source,
      description
    });
  } catch (error) {
    console.error("Error adding accident:", error);
    res.status(500).json({ error: error.message });
  }
});

// Emergency services endpoints
app.get('/emergency-services', async(req, res) => {
  // Mock data for emergency services
  const services = [
    {
      id: "1",
      name: "City Ambulance Service",
      type: "ambulance",
      location: {
        lat: 40.7128,
        lng: -74.0060
      },
      status: "available"
    },
    {
      id: "2",
      name: "Central Fire Department",
      type: "fireforce",
      location: {
        lat: 40.7135,
        lng: -74.0070
      },
      status: "available"
    },
    {
      id: "3",
      name: "City Police Department",
      type: "police",
      location: {
        lat: 40.7140,
        lng: -74.0050
      },
      status: "available"
    }
  ];
  
  res.json(services);
});

app.post('/emergency-services/dispatch', async(req, res) => {
  const { serviceId, accidentId } = req.body;
  
  if (!serviceId || !accidentId) {
    return res.status(400).json({ error: "Service ID and Accident ID are required" });
  }
  
  // Mock dispatching an emergency service
  const service = {
    id: serviceId,
    name: "Emergency Service",
    type: "ambulance",
    location: {
      lat: 40.7128,
      lng: -74.0060
    },
    status: "dispatched"
  };
  
  res.json(service);
});

// Statistics endpoint
app.get('/statistics', async(req, res) => {
  try {
    // Get accidents count from blockchain
    const contract = await contractPromise;
    const accidentCount = await contract.call("getNumberOfAccidents");
    
    // Mock statistics
    const statistics = {
      total: parseInt(accidentCount.toString()),
      verified: Math.floor(parseInt(accidentCount.toString()) * 0.7),
      pending: Math.floor(parseInt(accidentCount.toString()) * 0.2),
      rejected: Math.floor(parseInt(accidentCount.toString()) * 0.1),
      byLocation: {
        "Downtown": Math.floor(parseInt(accidentCount.toString()) * 0.4),
        "Uptown": Math.floor(parseInt(accidentCount.toString()) * 0.3),
        "Midtown": Math.floor(parseInt(accidentCount.toString()) * 0.3)
      },
      byTimeOfDay: {
        "Morning": Math.floor(parseInt(accidentCount.toString()) * 0.3),
        "Afternoon": Math.floor(parseInt(accidentCount.toString()) * 0.4),
        "Evening": Math.floor(parseInt(accidentCount.toString()) * 0.2),
        "Night": Math.floor(parseInt(accidentCount.toString()) * 0.1)
      }
    };
    
    res.json(statistics);
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({ error: error.message });
  }
});

// Blockchain-specific endpoints
app.get('/blockchain/accidents', async(req, res) => {
  try {
    const contract = await contractPromise;
    const result = await contract.call("getAccidents");
    res.json(result);
  } catch (error) {
    console.error("Error fetching blockchain accidents:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/blockchain/accidents/:id', async(req, res) => {
  try {
    const { id } = req.params;
    const contract = await contractPromise;
    const result = await contract.call("getAccident", id);
    
    res.json({
      loc: result[0],
      date: result[1],
      time: result[2],
      snapShot: result[3],
      plate: result[4]
    });
  } catch (error) {
    console.error(`Error fetching blockchain accident ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/blockchain/insurance', async(req, res) => {
  try {
    const { name, phone, blockNo } = req.body;
    
    if (!name || !phone || !blockNo) {
      return res.status(400).json({ error: "Name, phone and block number are required" });
    }
    
    const contract = await contractPromise;
    await contract.call("reqInsurance", name, phone, blockNo);
    
    res.status(201).json({
      success: true,
      message: "Insurance request submitted successfully"
    });
  } catch (error) {
    console.error("Error submitting insurance request:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
const startServer = async () => {
  try {
    // Initialize ML model
    await initializeML();
    console.log("ML model initialized successfully");
    
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
  }
};

startServer();