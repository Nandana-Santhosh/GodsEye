import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Use environment variable for API URL, or dynamically determine it
const API_URL = import.meta.env.VITE_API_URL || window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : `http://${window.location.hostname}:5000`;

interface Prediction {
  is_accident: boolean;
  confidence: number;
  success: boolean;
}

interface LocalReport {
  id: string;
  location: string;
  description: string;
  image: File | null;
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected';
}

const AnonymousReport: React.FC = () => {
  const [image, setImage] = useState<File | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImage(file);
    setError('');
    
    // Display a preview of the image
    try {
      const imageUrl = URL.createObjectURL(file);
      console.log('Created preview URL:', imageUrl);
      
      // Set a mock prediction to allow submission
      setPrediction({
        is_accident: true,
        confidence: 1.0,
        success: true
      });
    } catch (error: any) {
      console.error('Error creating image preview:', error);
      setError(`Error processing image: ${error.message || 'Unknown error'}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submit button clicked!");
    
    if (!image) {
      console.log("Error: No image uploaded");
      setError('Please upload an image of the accident');
      return;
    }
    
    if (!location || !description) {
      console.log("Error: Missing location or description");
      setError('Please provide location and description');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Convert image to base64 if it exists
      let base64Image = null;
      if (image) {
        base64Image = await convertImageToBase64(image);
      }
      
      // Send data to the API
      const response = await fetch(`${API_URL}/api/anonymous-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: base64Image,
          location,
          description
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Error submitting accident report');
      }
      
      // Set success message
      setSuccess(
        'Accident reported successfully! Your report has been submitted for admin approval. ' +
        'Once approved, it will be permanently recorded on the blockchain.'
      );
      
      // Reset form after successful submission
      setTimeout(() => {
        setLocation('');
        setDescription('');
        setImage(null);
        setPrediction(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error saving report:', error);
      setError(`Error saving report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert image to base64
  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 my-8">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Report an Accident</h1>
          <Link to="/" className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded">
            Back to Home
          </Link>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            <p>{success}</p>
          </div>
        )}
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Step 1: Upload Accident Image</h2>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="block w-full border border-gray-300 rounded px-3 py-2"
          />
          
          {loading && (
            <div className="text-blue-500 my-2">Processing...</div>
          )}
          
          {image && (
            <div className="mt-4 p-4 rounded bg-green-50">
              <p className="font-bold">✓ Image Uploaded</p>
              <div className="mt-2">
                <img 
                  src={URL.createObjectURL(image)} 
                  alt="Accident preview" 
                  className="max-h-[200px] object-contain"
                />
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">Step 2: Provide Details</h2>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Enter location (e.g., street address)"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Describe what happened"
                rows={4}
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Step 3: Submit Report</h2>
            <button
              type="submit"
              className={`bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded ${
                loading || !image || !location || !description ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={loading || !image || !location || !description}
            >
              {loading ? 'Processing...' : 'Submit Accident Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnonymousReport;