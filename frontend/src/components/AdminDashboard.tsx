import React, { useState, useEffect } from 'react';
import { BarChart3, Bell, Camera, FileCheck, MapPin } from 'lucide-react';
import { Statistics as StatsType } from '../types';
import AccidentList from './AccidentList';
import StatisticsComponent from './Statistics';
import NotificationPanel from './NotificationPanel';
import EmergencyDispatch from './EmergencyDispatch';
import { ethers } from 'ethers';
import DeAcc from '../contracts/DeAcc.json';
import { useNavigate, Link } from 'react-router-dom';

const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

interface BlockchainAccident {
  id: number;
  location: string;
  description: string;
  timestamp: number;
  status: number; // 0 = Pending, 1 = Approved, 2 = Rejected
  imageHash: string;
  reporter: string;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'accidents' | 'statistics' | 'dispatch'>('accidents');
  const [showNotifications, setShowNotifications] = useState(false);
  const [account, setAccount] = useState<string>('');
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [accidents, setAccidents] = useState<BlockchainAccident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [refreshCounter, setRefreshCounter] = useState<number>(0);
  const [statsData, setStatsData] = useState<StatsType>({
    total: 0,
    verified: 0,
    pending: 0,
    rejected: 0,
    byLocation: {},
    byTimeOfDay: {
      'Morning': 0,
      'Afternoon': 0,
      'Evening': 0,
      'Night': 0
    }
  });
  const navigate = useNavigate();

  // Check authentication on load
  useEffect(() => {
    const isAdminAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';
    if (!isAdminAuthenticated) {
      navigate('/admin/login');
    }
  }, [navigate]);

  // Listen for all accident events
  useEffect(() => {
    if (contract) {
      const accidentReportedFilter = contract.filters.AccidentReported();
      const accidentApprovedFilter = contract.filters.AccidentApproved();
      const accidentRejectedFilter = contract.filters.AccidentRejected();
      
      const handleAccidentReported = async () => {
        console.log('New accident reported!');
        setSuccess('New accident report detected!');
        await loadAccidents(contract);
        if (activeTab === 'statistics') {
          await loadStatistics(contract);
        }
        setTimeout(() => setSuccess(''), 5000);
      };
      
      const handleAccidentApproved = async () => {
        console.log('Accident approved!');
        setSuccess('An accident report has been approved!');
        await loadAccidents(contract);
        if (activeTab === 'statistics') {
          await loadStatistics(contract);
        }
        setTimeout(() => setSuccess(''), 5000);
      };
      
      const handleAccidentRejected = async () => {
        console.log('Accident rejected!');
        setSuccess('An accident report has been rejected!');
        await loadAccidents(contract);
        if (activeTab === 'statistics') {
          await loadStatistics(contract);
        }
        setTimeout(() => setSuccess(''), 5000);
      };
      
      contract.on(accidentReportedFilter, handleAccidentReported);
      contract.on(accidentApprovedFilter, handleAccidentApproved);
      contract.on(accidentRejectedFilter, handleAccidentRejected);
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(() => {
        setRefreshCounter(prev => prev + 1);
      }, 30000);
      
      return () => {
        contract.off(accidentReportedFilter, handleAccidentReported);
        contract.off(accidentApprovedFilter, handleAccidentApproved);
        contract.off(accidentRejectedFilter, handleAccidentRejected);
        clearInterval(interval);
      };
    }
  }, [contract, activeTab]);
  
  // Reload accidents when refreshCounter changes
  useEffect(() => {
    if (contract) {
      loadAccidents(contract);
    }
  }, [refreshCounter]);

  useEffect(() => {
    connectWallet();
    console.log("AdminDashboard initialized, connecting wallet...");
  }, []);

  const connectWallet = async () => {
    try {
      console.log("Attempting to connect wallet...");
      if (!window.ethereum) {
        setError('Please install MetaMask to use this dashboard');
        console.error("MetaMask not found");
        setLoading(false);
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log("Connected to account:", accounts[0]);
      setAccount(accounts[0]);

      // Setup contract
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      console.log("Creating contract instance at address:", CONTRACT_ADDRESS);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, DeAcc.abi, signer);
      setContract(contract);

      // Load accidents
      console.log("Loading accidents...");
      await loadAccidents(contract);
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      setError('Failed to connect wallet. Please try again.');
      setLoading(false);
    }
  };

  const loadAccidents = async (contractInstance: ethers.Contract) => {
    try {
      setLoading(true);
      console.log("Loading accidents from contract...");
      
      // Get accident count
      const count = await contractInstance.accidentCount();
      console.log("Total accident count:", count.toString());
      
      // Load all accidents
      const accidentsData: BlockchainAccident[] = [];
      for (let i = 1; i <= count; i++) {
        console.log(`Fetching accident #${i}...`);
        const accident = await contractInstance.getAccident(i);
        console.log("Accident data:", accident);
        
        accidentsData.push({
          id: i,
          location: accident.location,
          description: accident.description,
          timestamp: accident.timestamp.toNumber(),
          status: accident.status,
          imageHash: accident.imageHash,
          reporter: accident.reporter
        });
      }
      
      // Sort by timestamp (newest first)
      accidentsData.sort((a, b) => b.timestamp - a.timestamp);
      console.log("Processed accidents:", accidentsData);
      setAccidents(accidentsData);
    } catch (error: any) {
      console.error('Error loading accidents:', error);
      setError('Failed to load accident reports from blockchain');
    } finally {
      setLoading(false);
    }
  };

  const approveAccident = async (accidentId: number) => {
    try {
      if (!contract) return;
      
      setLoading(true);
      setError('');
      setSuccess('');
      
      console.log(`Approving accident #${accidentId}...`);
      const tx = await contract.approveAccident(accidentId);
      
      console.log(`Approval transaction sent: ${tx.hash}`);
      setSuccess(`Approving accident #${accidentId}. Transaction sent!`);
      
      await tx.wait();
      console.log(`Approval transaction confirmed for accident #${accidentId}`);
      
      setSuccess(`Accident #${accidentId} has been approved successfully!`);
      
      // Reload the accidents after approval
      await loadAccidents(contract);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (error: any) {
      console.error('Error approving accident:', error);
      setError(`Failed to approve accident: ${error.message}`);
      setLoading(false);
    }
  };

  const rejectAccident = async (accidentId: number) => {
    try {
      if (!contract) return;
      
      setLoading(true);
      setError('');
      setSuccess('');
      
      console.log(`Rejecting accident #${accidentId}...`);
      const tx = await contract.rejectAccident(accidentId);
      
      console.log(`Rejection transaction sent: ${tx.hash}`);
      setSuccess(`Rejecting accident #${accidentId}. Transaction sent!`);
      
      await tx.wait();
      console.log(`Rejection transaction confirmed for accident #${accidentId}`);
      
      setSuccess(`Accident #${accidentId} has been rejected successfully!`);
      
      // Reload the accidents after rejection
      await loadAccidents(contract);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (error: any) {
      console.error('Error rejecting accident:', error);
      setError(`Failed to reject accident: ${error.message}`);
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    if (contract) {
      setSuccess('Refreshing data...');
      await loadAccidents(contract);
      if (activeTab === 'statistics') {
        await loadStatistics(contract);
      }
      setSuccess('Data refreshed successfully!');
      setTimeout(() => setSuccess(''), 5000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuthenticated');
    navigate('/admin/login');
  };

  // Format timestamp to readable date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const loadStatistics = async (contractInstance: ethers.Contract) => {
    try {
      // Get the counts from the contract
      const totalCount = await contractInstance.accidentCount();
      const pendingCount = await contractInstance.pendingCount();
      const approvedCount = await contractInstance.approvedCount();
      const rejectedCount = await contractInstance.rejectedCount();

      // Prepare location data
      const locationData: Record<string, number> = {};
      
      // Load all accidents to get location data
      for (let i = 1; i <= totalCount; i++) {
        const accident = await contractInstance.getAccident(i);
        const location = accident.location;
        
        // Group by location
        if (location in locationData) {
          locationData[location]++;
        } else {
          locationData[location] = 1;
        }
      }

      // Update the stats data
      setStatsData({
        total: totalCount.toNumber(),
        verified: approvedCount.toNumber(), // Renamed for compatibility with existing Stats component
        pending: pendingCount.toNumber(),
        rejected: rejectedCount.toNumber(),
        byLocation: locationData,
        byTimeOfDay: {
          'Morning': 0,   // These could be calculated based on timestamp if needed
          'Afternoon': 0,
          'Evening': 0, 
          'Night': 0
        }
      });
    } catch (error: any) {
      console.error('Error loading statistics:', error);
      setError('Failed to load statistics from blockchain');
    }
  };

  // Call loadStatistics when opening the statistics tab
  useEffect(() => {
    if (activeTab === 'statistics' && contract) {
      loadStatistics(contract);
    }
  }, [activeTab, contract, refreshCounter]);

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto p-4 my-8 text-center">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          <button
            onClick={connectWallet}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Connect Wallet to Access Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Camera className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Accident Monitoring System</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/" className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded">
              Home
            </Link>
            <button
              onClick={handleManualRefresh}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded"
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <button
              onClick={handleLogout}
              className="bg-gray-500 hover:bg-gray-600 text-white text-sm px-3 py-1 rounded"
            >
              Logout
            </button>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-full hover:bg-gray-100"
            >
              <Bell className="h-6 w-6 text-gray-600" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-600 transform translate-x-1/2 -translate-y-1/2"></span>
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('accidents')}
              className={`px-3 py-4 text-sm font-medium ${
                activeTab === 'accidents'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileCheck className="inline-block h-5 w-5 mr-2" />
              Accidents
            </button>
            <button
              onClick={() => setActiveTab('statistics')}
              className={`px-3 py-4 text-sm font-medium ${
                activeTab === 'statistics'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart3 className="inline-block h-5 w-5 mr-2" />
              Statistics
            </button>
            <button
              onClick={() => setActiveTab('dispatch')}
              className={`px-3 py-4 text-sm font-medium ${
                activeTab === 'dispatch'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MapPin className="inline-block h-5 w-5 mr-2" />
              Emergency Dispatch
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="text-center py-4 mb-4 bg-blue-50 rounded">
            <p>Loading data from blockchain...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {activeTab === 'accidents' && (
          <div>
            <div className="mb-4">
              <p className="text-gray-700">
                Total Reports: <span className="font-bold">{accidents.length}</span>
                {accidents.length > 0 && (
                  <>
                    <span className="mx-2">|</span>
                    Approved: <span className="font-bold">{accidents.filter(a => a.status === 1).length}</span>
                    <span className="mx-2">|</span>
                    Rejected: <span className="font-bold">{accidents.filter(a => a.status === 2).length}</span>
                    <span className="mx-2">|</span>
                    Pending: <span className="font-bold">
                      {accidents.filter(a => a.status === 0).length}
                    </span>
                  </>
                )}
              </p>
            </div>
          
            {accidents.length === 0 && !loading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No accident reports found.</p>
                <button 
                  onClick={handleManualRefresh}
                  className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Refresh
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="py-2 px-4 border-b">ID</th>
                      <th className="py-2 px-4 border-b">Location</th>
                      <th className="py-2 px-4 border-b">Description</th>
                      <th className="py-2 px-4 border-b">Date/Time</th>
                      <th className="py-2 px-4 border-b">Status</th>
                      <th className="py-2 px-4 border-b">Reporter</th>
                      <th className="py-2 px-4 border-b">Image</th>
                      <th className="py-2 px-4 border-b">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accidents.map((accident) => (
                      <tr key={accident.id}>
                        <td className="py-2 px-4 border-b">{accident.id}</td>
                        <td className="py-2 px-4 border-b">{accident.location}</td>
                        <td className="py-2 px-4 border-b">{accident.description}</td>
                        <td className="py-2 px-4 border-b">
                          {new Date(accident.timestamp * 1000).toLocaleString()}
                        </td>
                        <td className="py-2 px-4 border-b">
                          {accident.status === 1 ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                              Approved
                            </span>
                          ) : accident.status === 2 ? (
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                              Rejected
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-4 border-b">
                          <span className="text-xs font-mono">
                            {accident.reporter.substring(0, 6)}...{accident.reporter.substring(38)}
                          </span>
                        </td>
                        <td className="py-2 px-4 border-b">
                          {accident.imageHash && (
                            <a
                              href={`https://ipfs.io/ipfs/${accident.imageHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              View Image
                            </a>
                          )}
                        </td>
                        <td className="py-2 px-4 border-b">
                          {accident.status === 0 && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => approveAccident(accident.id)}
                                className="bg-green-500 hover:bg-green-700 text-white text-xs py-1 px-2 rounded"
                                disabled={loading}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => rejectAccident(accident.id)}
                                className="bg-red-500 hover:bg-red-700 text-white text-xs py-1 px-2 rounded"
                                disabled={loading}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {activeTab === 'statistics' && <StatisticsComponent data={statsData} />}
        {activeTab === 'dispatch' && <EmergencyDispatch />}
      </main>

      {showNotifications && (
        <NotificationPanel onClose={() => setShowNotifications(false)} />
      )}
    </div>
  );
};

export default AdminDashboard;