import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_URL = 'http://localhost:5000';

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
    setLoading(true);
    setError('');

    try {
      // Send image to ML API
      const formData = new FormData();
      formData.append('image', file);
      
      console.log('Sending request to ML API...');
      const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      console.log('Received response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error from ML API');
      }
      
      setPrediction(data);
    } catch (error: any) {
      console.error('Error processing image:', error);
      setError(`Error processing image: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submit button clicked!");
    console.log("Prediction:", prediction);
    
    if (!prediction?.is_accident) {
      console.log("Error: Image not classified as accident");
      setError('Cannot report: The image was not classified as an accident');
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
      // Create a new report object
      const newReport: LocalReport = {
        id: Date.now().toString(),
        location,
        description,
        image,
        timestamp: Math.floor(Date.now() / 1000),
        status: 'pending'
      };

      // Get existing reports from localStorage
      const existingReports = JSON.parse(localStorage.getItem('pendingReports') || '[]');
      
      // Add new report to the list
      existingReports.push(newReport);
      
      // Save back to localStorage
      localStorage.setItem('pendingReports', JSON.stringify(existingReports));
      
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
          <h2 className="text-lg font-semibold mb-2">Step 1: Upload Image for Analysis</h2>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="block w-full border border-gray-300 rounded px-3 py-2"
          />
          
          {loading && (
            <div className="text-blue-500 my-2">Processing...</div>
          )}
          
          {prediction && (
            <div className={`mt-4 p-4 rounded ${prediction.is_accident ? 'bg-red-50' : 'bg-green-50'}`}>
              <p className="font-bold">{prediction.is_accident ? '⚠️ Accident Detected' : '✓ No Accident Detected'}</p>
              <p>Confidence: {(prediction.confidence * 100).toFixed(2)}%</p>
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
                loading || !prediction?.is_accident ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={loading || !prediction?.is_accident}
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