import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ML_SCRIPT_PATH = path.join(__dirname, '..', 'ml', 'SafeTrack2.py');
const TEMP_DIR = path.join(__dirname, 'temp');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Detects if an image contains an accident using the ML model
 * @param {string} base64Image - Base64 encoded image data
 * @returns {Promise<{isAccident: boolean, confidence: number}>}
 */
export const detectAccident = async (base64Image) => {
  // Save the base64 image to a temporary file
  const timestamp = Date.now();
  const imagePath = path.join(TEMP_DIR, `image_${timestamp}.jpg`);
  
  return new Promise((resolve, reject) => {
    // Write the base64 image to a file
    fs.writeFile(imagePath, Buffer.from(base64Image, 'base64'), (err) => {
      if (err) {
        return reject(new Error(`Failed to save image: ${err.message}`));
      }
      
      // Call the Python script with the image path
      const pythonProcess = spawn('python', [ML_SCRIPT_PATH, '--analyze-image', imagePath]);
      
      let outputData = '';
      let errorData = '';
      
      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        // Clean up the temporary file
        fs.unlink(imagePath, () => {});
        
        if (code !== 0) {
          return reject(new Error(`ML process exited with code ${code}: ${errorData}`));
        }
        
        try {
          // Parse the output from the Python script
          const result = JSON.parse(outputData);
          resolve({
            isAccident: result.is_accident,
            confidence: result.confidence
          });
        } catch (error) {
          reject(new Error(`Failed to parse ML output: ${error.message}`));
        }
      });
    });
  });
};

/**
 * Initialize and load the ML model
 * This should be called when the server starts
 */
export const initializeML = () => {
  return new Promise((resolve, reject) => {
    // Call the Python script with the initialize flag
    const pythonProcess = spawn('python', [ML_SCRIPT_PATH, '--initialize']);
    
    let errorData = '';
    
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`ML initialization failed with code ${code}: ${errorData}`));
      }
      resolve();
    });
  });
};

/**
 * Register ML routes with the Express app
 * @param {Express} app - Express application
 */
export const registerMLRoutes = (app) => {
  // Endpoint to detect accident in an image
  app.post('/ml/detect', async (req, res) => {
    try {
      const { image } = req.body;
      
      if (!image) {
        return res.status(400).json({ error: 'No image provided' });
      }
      
      const result = await detectAccident(image);
      res.json(result);
    } catch (error) {
      console.error('ML detection error:', error);
      res.status(500).json({ error: error.message });
    }
  });
}; 