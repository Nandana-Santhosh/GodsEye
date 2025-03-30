import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import DeAcc from '../contracts/DeAcc.json';
import { Link } from 'react-router-dom';

const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const Home: React.FC = () => {
  const [accidentCount, setAccidentCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [approvedCount, setApprovedCount] = useState<number>(0);
  const [rejectedCount, setRejectedCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadContractData = async () => {
      try {
        // Check if MetaMask is installed
        if (!window.ethereum) {
          // If we're in read-only mode (no MetaMask), use a provider that doesn't require signing
          const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
          const contract = new ethers.Contract(CONTRACT_ADDRESS, DeAcc.abi, provider);
          await fetchStats(contract);
          return;
        }

        // If MetaMask is available
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, DeAcc.abi, provider);
        await fetchStats(contract);
      } catch (error: any) {
        console.error('Error loading contract data:', error);
        setError('Failed to load accident statistics. Please try again later.');
        setLoading(false);
      }
    };

    loadContractData();
  }, []);

  const fetchStats = async (contract: ethers.Contract) => {
    try {
      const totalCount = await contract.accidentCount();
      const pendingCount = await contract.pendingCount();
      const approvedCount = await contract.approvedCount();
      const rejectedCount = await contract.rejectedCount();

      setAccidentCount(totalCount.toNumber());
      setPendingCount(pendingCount.toNumber());
      setApprovedCount(approvedCount.toNumber());
      setRejectedCount(rejectedCount.toNumber());
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Failed to fetch accident statistics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 my-8">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-600">
          Decentralized Accident Monitoring System
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="mb-8">
          <p className="text-lg text-gray-700 mb-4 text-center">
            A blockchain-based platform for reporting, verifying, and tracking accidents with machine learning validation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <h3 className="text-lg font-semibold text-gray-700">Total Reports</h3>
            <p className="text-3xl font-bold text-blue-600">{loading ? '...' : accidentCount}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <h3 className="text-lg font-semibold text-gray-700">Pending</h3>
            <p className="text-3xl font-bold text-yellow-600">{loading ? '...' : pendingCount}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <h3 className="text-lg font-semibold text-gray-700">Approved</h3>
            <p className="text-3xl font-bold text-green-600">{loading ? '...' : approvedCount}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <h3 className="text-lg font-semibold text-gray-700">Rejected</h3>
            <p className="text-3xl font-bold text-red-600">{loading ? '...' : rejectedCount}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/report"
            className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold text-center"
          >
            Report an Accident
          </Link>
          <Link
            to="/admin/login"
            className="bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg font-semibold text-center"
          >
            Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home; 