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

interface LocalReport {
  id: string;
  location: string;
  description: string;
  image: File | null;
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected';
}

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
  const [localReports, setLocalReports] = useState<LocalReport[]>([]);
  const [blockchainAccidents, setBlockchainAccidents] = useState<BlockchainAccident[]>([]);
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

  // Load local reports
  useEffect(() => {
    const loadLocalReports = () => {
      const reports = JSON.parse(localStorage.getItem('pendingReports') || '[]');
      // Filter out test data (IDs 1-5)
      const filteredReports = reports.filter((report: LocalReport) => 
        !['1', '2', '3', '4', '5'].includes(report.id)
      );
      setLocalReports(filteredReports);
      // Update localStorage with filtered data
      localStorage.setItem('pendingReports', JSON.stringify(filteredReports));
    };

    loadLocalReports();
    // Set up interval to check for new reports
    const interval = setInterval(loadLocalReports, 5000);
    return () => clearInterval(interval);
  }, []);

  // Listen for blockchain events
  useEffect(() => {
    if (contract) {
      const accidentReportedFilter = contract.filters.AccidentReported();
      const accidentApprovedFilter = contract.filters.AccidentApproved();
      const accidentRejectedFilter = contract.filters.AccidentRejected();
      
      const handleAccidentReported = async () => {
        console.log('New accident reported on blockchain!');
        setSuccess('New accident report detected on blockchain!');
        await loadBlockchainAccidents(contract);
        if (activeTab === 'statistics') {
          await loadStatistics(contract);
        }
        setTimeout(() => setSuccess(''), 5000);
      };
      
      const handleAccidentApproved = async () => {
        console.log('Accident approved on blockchain!');
        setSuccess('An accident report has been approved on blockchain!');
        await loadBlockchainAccidents(contract);
        if (activeTab === 'statistics') {
          await loadStatistics(contract);
        }
        setTimeout(() => setSuccess(''), 5000);
      };
      
      const handleAccidentRejected = async () => {
        console.log('Accident rejected on blockchain!');
        setSuccess('An accident report has been rejected on blockchain!');
        await loadBlockchainAccidents(contract);
        if (activeTab === 'statistics') {
          await loadStatistics(contract);
        }
        setTimeout(() => setSuccess(''), 5000);
      };
      
      contract.on(accidentReportedFilter, handleAccidentReported);
      contract.on(accidentApprovedFilter, handleAccidentApproved);
      contract.on(accidentRejectedFilter, handleAccidentRejected);
      
      return () => {
        contract.off(accidentReportedFilter, handleAccidentReported);
        contract.off(accidentApprovedFilter, handleAccidentApproved);
        contract.off(accidentRejectedFilter, handleAccidentRejected);
      };
    }
  }, [contract, activeTab]);

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

      // Load blockchain accidents
      console.log("Loading blockchain accidents...");
      await loadBlockchainAccidents(contract);
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      setError('Failed to connect wallet. Please try again.');
      setLoading(false);
    }
  };

  const loadBlockchainAccidents = async (contractInstance: ethers.Contract) => {
    try {
      setLoading(true);
      console.log("Loading accidents from blockchain...");
      
      // Get accident count
      const count = await contractInstance.accidentCount();
      console.log("Total accident count:", count.toString());
      
      // Load all accidents
      const accidentsData: BlockchainAccident[] = [];
      for (let i = 1; i <= count; i++) {
        // Skip test data IDs
        if (['1', '2', '3', '4', '5'].includes(i.toString())) {
          continue;
        }
        
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
      setBlockchainAccidents(accidentsData);
    } catch (error: any) {
      console.error('Error loading accidents:', error);
      setError('Failed to load accident reports from blockchain');
    } finally {
      setLoading(false);
    }
  };

  const approveAccident = async (reportId: string) => {
    try {
      if (!contract) {
        setError('Please connect MetaMask to approve reports');
        return;
      }

      // Check if connected to the correct network
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      if (network.chainId !== 31337) { // Hardhat network chain ID
        setError('Please switch to Localhost network in MetaMask');
        return;
      }

      setLoading(true);
      setError('');
      setSuccess('');
      
      // Find the report in local storage
      const reports = JSON.parse(localStorage.getItem('pendingReports') || '[]');
      const report = reports.find((r: LocalReport) => r.id === reportId);
      
      if (!report) {
        setLocalReports(prevReports => prevReports.filter(r => r.id !== reportId));
        setBlockchainAccidents(prevAccidents => prevAccidents.filter(a => a.id.toString() !== reportId));
        throw new Error('Report not found');
      }

      // Upload to blockchain
      const imageHash = report.image ? `image_${report.id}` : 'no_image';
      console.log(`Approving accident #${reportId}...`);
      
      try {
        // Get the current gas price
        const gasPrice = await provider.getGasPrice();
        console.log('Current gas price:', gasPrice.toString());

        // Estimate gas for the transaction
        const gasEstimate = await contract.estimateGas.reportAccident(
          report.location,
          report.description,
          imageHash
        );
        console.log('Gas estimate:', gasEstimate.toString());

        // Send transaction with higher gas limit and current gas price
        const tx = await contract.reportAccident(
          report.location,
          report.description,
          imageHash,
          {
            gasLimit: gasEstimate.mul(2), // Double the estimated gas
            gasPrice: gasPrice.mul(2) // Double the current gas price
          }
        );
        
        console.log(`Approval transaction sent: ${tx.hash}`);
        setSuccess(`Approving accident #${reportId}. Transaction sent!`);
        
        // Wait for transaction to be mined
        const receipt = await tx.wait();
        console.log(`Approval transaction confirmed for accident #${reportId}`, receipt);
        
        // Update local storage
        const updatedReports = reports.map((r: LocalReport) => 
          r.id === reportId ? { ...r, status: 'approved' } : r
        );
        localStorage.setItem('pendingReports', JSON.stringify(updatedReports));
        setLocalReports(updatedReports);
        
        setSuccess(`Accident #${reportId} has been approved successfully!`);
        
        // Reload the blockchain accidents after approval
        await loadBlockchainAccidents(contract);
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(''), 5000);
      } catch (error: any) {
        console.error('Transaction error:', error);
        if (error.code === 'INSUFFICIENT_FUNDS') {
          setError('Insufficient funds for gas. Please add more ETH to your account.');
        } else if (error.code === 'NETWORK_ERROR') {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError(`Transaction failed: ${error.message}`);
        }
      }
    } catch (error: any) {
      console.error('Error approving accident:', error);
      setError(`Failed to approve accident: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const rejectAccident = async (reportId: string) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      // Update local storage
      const reports = JSON.parse(localStorage.getItem('pendingReports') || '[]');
      const updatedReports = reports.map((r: LocalReport) => 
        r.id === reportId ? { ...r, status: 'rejected' } : r
      );
      localStorage.setItem('pendingReports', JSON.stringify(updatedReports));
      setLocalReports(updatedReports);
      
      setSuccess(`Accident #${reportId} has been rejected successfully!`);
      
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
      await loadBlockchainAccidents(contract);
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
        verified: approvedCount.toNumber(),
        pending: pendingCount.toNumber() + localReports.length,
        rejected: rejectedCount.toNumber(),
        byLocation: locationData,
        byTimeOfDay: {
          'Morning': 0,
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
  }, [activeTab, contract, refreshCounter, localReports]);

  const clearTestData = () => {
    try {
      // Clear specific test IDs from local storage
      const reports = JSON.parse(localStorage.getItem('pendingReports') || '[]');
      const filteredReports = reports.filter((report: LocalReport) => 
        !['1', '2', '3', '4', '5'].includes(report.id)
      );
      localStorage.setItem('pendingReports', JSON.stringify(filteredReports));
      setLocalReports(filteredReports);
      
      // Update blockchain accidents state to remove test entries
      setBlockchainAccidents(prevAccidents => 
        prevAccidents.filter(accident => 
          !['1', '2', '3', '4', '5'].includes(accident.id.toString())
        )
      );
      
      setSuccess('Test data has been cleared successfully!');
      setTimeout(() => setSuccess(''), 5000);
    } catch (error: any) {
      console.error('Error clearing test data:', error);
      setError('Failed to clear test data');
    }
  };

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
              onClick={clearTestData}
              className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1 rounded"
            >
              Clear Test Data
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
                Total Reports: <span className="font-bold">{blockchainAccidents.length + localReports.length}</span>
                {blockchainAccidents.length + localReports.length > 0 && (
                  <>
                    <span className="mx-2">|</span>
                    Approved: <span className="font-bold">{blockchainAccidents.filter(a => a.status === 1).length}</span>
                    <span className="mx-2">|</span>
                    Rejected: <span className="font-bold">{blockchainAccidents.filter(a => a.status === 2).length + localReports.filter(r => r.status === 'rejected').length}</span>
                    <span className="mx-2">|</span>
                    Pending: <span className="font-bold">
                      {localReports.filter(r => r.status === 'pending').length}
                    </span>
                  </>
                )}
              </p>
            </div>
          
            {localReports.length === 0 && blockchainAccidents.length === 0 && !loading ? (
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
                      <th className="py-2 px-4 border-b">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localReports.map((report) => (
                      <tr key={report.id}>
                        <td className="py-2 px-4 border-b">{report.id}</td>
                        <td className="py-2 px-4 border-b">{report.location}</td>
                        <td className="py-2 px-4 border-b">{report.description}</td>
                        <td className="py-2 px-4 border-b">
                          {formatDate(report.timestamp)}
                        </td>
                        <td className="py-2 px-4 border-b">
                          {report.status === 'approved' ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                              Approved
                            </span>
                          ) : report.status === 'rejected' ? (
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
                          {report.status === 'pending' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => approveAccident(report.id)}
                                className="bg-green-500 hover:bg-green-700 text-white text-xs py-1 px-2 rounded"
                                disabled={loading}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => rejectAccident(report.id)}
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
                    {blockchainAccidents.map((accident) => (
                      <tr key={accident.id}>
                        <td className="py-2 px-4 border-b">{accident.id}</td>
                        <td className="py-2 px-4 border-b">{accident.location}</td>
                        <td className="py-2 px-4 border-b">{accident.description}</td>
                        <td className="py-2 px-4 border-b">
                          {formatDate(accident.timestamp)}
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
                          {accident.status === 0 && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => approveAccident(accident.id.toString())}
                                className="bg-green-500 hover:bg-green-700 text-white text-xs py-1 px-2 rounded"
                                disabled={loading}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => rejectAccident(accident.id.toString())}
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