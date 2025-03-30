import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import DeAcc from '../contracts/DeAcc.json';
import { Link } from 'react-router-dom';

const API_URL = 'http://localhost:5000';
const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// Add type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Prediction {
  is_accident: boolean;
  confidence: number;
  success: boolean;
}

const AnonymousReport: React.FC = () => {
  const [account, setAccount] = useState<string>('');
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [transactionHash, setTransactionHash] = useState<string>('');

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    try {
      if (window.ethereum) {
        // Check if already connected
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setupContract();
        }
      } else {
        setError('Please install MetaMask to use blockchain features');
      }
    } catch (error) {
      console.error('Error checking wallet:', error);
    }
  };

  const setupContract = async () => {
    try {
      // Try to switch to the correct network first
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x7A69' }], // 31337 in hex
        });
      } catch (switchError: any) {
        // Network doesn't exist, so add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x7A69',
              chainName: 'Hardhat Local',
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: ['http://127.0.0.1:8545'],
            }]
          });
        } else {
          throw switchError;
        }
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, DeAcc.abi, signer);
      setContract(contract);
    } catch (error) {
      console.error('Error setting up contract:', error);
      setError('Error setting up blockchain connection');
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError('Please install MetaMask to use blockchain features');
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      await setupContract();
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      setError('Failed to connect wallet. Please try again.');
    }
  };

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
    console.log("Contract available:", !!contract);
    
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
    
    if (!contract) {
      console.log("Error: Blockchain connection not available");
      setError('Blockchain connection not available. Please connect your wallet first.');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    setTransactionHash('');
    
    try {
      console.log('Reporting accident to blockchain...');
      const imageHash = image ? `image_${Date.now()}` : 'no_image';
      console.log("Calling contract.reportAccident with:", location, description, imageHash);
      
      const tx = await contract.reportAccident(location, description, imageHash);
      console.log('Transaction sent:', tx.hash);
      setTransactionHash(tx.hash);
      
      // Wait for transaction to be mined
      await tx.wait();
      console.log('Transaction confirmed');
      
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
      console.error('Blockchain error:', error);
      setError(`Error recording to blockchain: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testContractInteraction = async () => {
    try {
      if (!contract) {
        console.error("Contract not available");
        setError("Contract not available. Please connect your wallet first.");
        return;
      }

      console.log("Testing contract interaction...");
      setLoading(true);
      setError("");
      
      // Try to get the current accident count
      const count = await contract.accidentCount();
      console.log("Current accident count:", count.toString());
      
      // Get pending count
      const pendingCount = await contract.pendingCount();
      console.log("Current pending count:", pendingCount.toString());
      
      // Test directly calling the report function
      const testLoc = "Test Location";
      const testDesc = "Test Description";
      const testHash = "test_hash";
      
      console.log("Attempting to call reportAccident...");
      const tx = await contract.reportAccident(testLoc, testDesc, testHash);
      console.log("Transaction sent:", tx.hash);
      
      setSuccess(`Test transaction sent: ${tx.hash}`);
      setTransactionHash(tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);
      
      setSuccess("Test transaction confirmed! Contract interaction is working correctly. Your report has been submitted for admin approval.");
    } catch (error: any) {
      console.error("Contract test error:", error);
      setError(`Contract test error: ${error.message}`);
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
            {transactionHash && (
              <p className="mt-2 text-sm">
                Transaction Hash: <span className="font-mono">{transactionHash}</span>
              </p>
            )}
          </div>
        )}
        
        {/* Test Button - Only visible when connected */}
        {account && (
          <div className="mb-4 p-2 bg-gray-100 rounded">
            <p className="text-sm text-gray-700 mb-2">Troubleshooting: Test contract interaction directly</p>
            <button 
              type="button"
              onClick={testContractInteraction}
              className="bg-gray-500 hover:bg-gray-700 text-white text-sm py-1 px-2 rounded"
              disabled={loading}
            >
              Test Contract
            </button>
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

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(e);
          }}
        >
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
            {!account ? (
                      <button
                        type="button"
                onClick={connectWallet}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Connect Wallet to Report
                      </button>
                ) : (
              <div>
                <p className="mb-2 text-sm text-gray-600">Connected as: {account.substring(0, 6)}...{account.substring(account.length - 4)}</p>
                    <button
                  type="submit"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSubmit(e);
                  }}
                  className={`bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded ${
                    loading || !prediction?.is_accident ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={loading || !prediction?.is_accident}
                >
                  {loading ? 'Processing...' : 'Submit Accident Report'}
                    </button>
              </div>
            )}
            </div>
          </form>
      </div>
    </div>
  );
};

export default AnonymousReport;