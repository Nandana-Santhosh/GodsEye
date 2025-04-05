import React, { useState, useEffect } from 'react';
import { BarChart3, Bell, Camera, FileCheck, MapPin } from 'lucide-react';
import { Statistics as StatsType, Accident } from '../types';
import AccidentList from './AccidentList';
import StatisticsComponent from './Statistics';
import NotificationPanel from './NotificationPanel';
import CameraGrid from './CameraGrid';
import { useNavigate, Link } from 'react-router-dom';
import notificationService from '../services/AccidentNotificationService';
import { toast } from 'react-hot-toast';
import { accidentDB } from '../services/supabase';

// Mock data for testing without blockchain
const MOCK_ACCIDENTS = [
  {
    id: '1',
    location: { lat: 37.7749, lng: -122.4194, address: 'San Francisco, CA' },
    description: 'Vehicle collision near intersection',
    images: ['AccSnaps/sample1.jpg'],
    timestamp: new Date().toISOString(),
    status: 'pending',
    source: 'camera'
  },
  {
    id: '2',
    location: { lat: 37.3352, lng: -121.8811, address: 'San Jose, CA' },
    description: 'Multi-car accident on highway',
    images: ['AccSnaps/sample2.jpg'],
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    status: 'acknowledged',
    source: 'camera'
  }
];

// Mock statistics for testing
const MOCK_STATS: StatsType = {
  total: 24,
  verified: 18,
  pending: 4,
  rejected: 2,
  byLocation: {
    'San Francisco': 8,
    'Oakland': 6,
    'San Jose': 10
  },
  byTimeOfDay: {
    'Morning': 5,
    'Afternoon': 8,
    'Evening': 7,
    'Night': 4
  }
};

interface TabSwitchProps {
  activeTab: string;
  tabName: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const TabSwitch: React.FC<TabSwitchProps> = ({ activeTab, tabName, icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
      activeTab === tabName
        ? 'bg-blue-100 text-blue-700'
        : 'hover:bg-gray-100'
    }`}
  >
    <span className="mr-2">{icon}</span>
    <span>{label}</span>
  </button>
);

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'accidents' | 'statistics' | 'cameras'>('accidents');
  const [localReports, setLocalReports] = useState<Accident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [statsData, setStatsData] = useState<StatsType>(MOCK_STATS);
  const navigate = useNavigate();

  // Check authentication on load (simplified for testing)
  useEffect(() => {
    const checkAuth = () => {
      // For testing, we'll skip authentication
      console.log("Authentication check skipped for testing");
    };
    checkAuth();
  }, [navigate]);

  // Load accidents from server
  const loadAccidents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/accidents');
      
      if (!response.ok) {
        throw new Error(`Error fetching accidents: ${response.status}`);
      }
      
      const accidents = await response.json();
      console.log("Accidents loaded from server:", accidents);
      
      if (Array.isArray(accidents) && accidents.length > 0) {
        setLocalReports(accidents);
      }
    } catch (error) {
      console.error("Failed to load accidents:", error);
      setError("Failed to load accident data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Connect to the notification service for real-time updates
  useEffect(() => {
    try {
      // Connect to notification service with relative URL
      console.log("Connecting to notification service");
      notificationService.connect();
      
      // Listen for new accidents from the ML system and add them to local reports
      notificationService.on('new-accident', (accident: Accident) => {
        console.log("New accident notification received:", accident);
        
        // Update local state
        setLocalReports(prev => {
          // Check if this accident already exists by ID
          const exists = prev.some(a => a.id === accident.id);
          if (exists) {
            return prev.map(a => a.id === accident.id ? accident : a);
          } else {
            return [accident, ...prev];
          }
        });
        
        // Show a toast notification
        toast.success(`New accident detected at ${accident.location.address}`, {
          duration: 5000,
          position: 'top-right'
        });
      });
      
      // Listen for updated accidents
      notificationService.on('accident-updated', (accident: Accident) => {
        console.log("Accident update received:", accident);
        
        setLocalReports(prev => {
          // Replace the accident with the updated version
          return prev.map(a => a.id === accident.id ? accident : a);
        });
        
        toast.info(`Accident at ${accident.location.address} has been updated`, {
          duration: 3000,
          position: 'top-right'
        });
      });
      
      // Handle accident history
      notificationService.on('accident-history', (accidents: Accident[]) => {
        console.log("Received accident history:", accidents);
        if (accidents && accidents.length > 0) {
          setLocalReports(accidents);
        }
      });
      
      // Initial data load
      loadAccidents();
      
      // Clean up on component unmount
      return () => {
        console.log("Cleaning up notification service");
        notificationService.off('new-accident');
        notificationService.off('accident-updated');
        notificationService.off('accident-history');
        notificationService.disconnect();
      };
    } catch (error) {
      console.error("Error setting up notification service:", error);
      setLoading(false);
      
      // Still try to load accidents even if notification service fails
      loadAccidents();
    }
  }, []);

  // Load statistics
  const loadStatistics = async () => {
    try {
      // For now, using mock stats
      setStatsData(MOCK_STATS);
      
      // TODO: implement real statistics from the database
      // const response = await fetch('/api/statistics');
      // if (response.ok) {
      //   const stats = await response.json();
      //   setStatsData(stats);
      // }
    } catch (error) {
      console.error("Error loading statistics:", error);
    }
  };

  // Handle tab changes
  useEffect(() => {
    if (activeTab === 'statistics') {
      loadStatistics();
    }
  }, [activeTab]);

  // Handler for acknowledging accidents
  const handleAccidentAction = async (accidentId: string, action: 'acknowledge' | 'resolve') => {
    try {
      console.log(`${action} accident with ID: ${accidentId}`);
      
      // Optimistically update the UI
      setLocalReports(prev => prev.map(accident => 
        accident.id === accidentId 
          ? {...accident, status: action === 'acknowledge' ? 'acknowledged' : 'resolved'} 
          : accident
      ));
      
      // Send update to the server
      const response = await fetch(`/api/accidents/${accidentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: action === 'acknowledge' ? 'acknowledged' : 'resolved' 
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update accident status: ${response.status}`);
      }
      
      toast.success(`Accident ${action === 'acknowledge' ? 'acknowledged' : 'resolved'} successfully`);
    } catch (error) {
      console.error(`Error updating accident ${accidentId}:`, error);
      
      // Revert the optimistic update on error
      loadAccidents();
      
      toast.error(`Failed to ${action} accident. Please try again.`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>
      </header>
      
      <NotificationPanel />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Tab navigation */}
        <div className="mb-6 bg-white rounded-lg shadow p-2 flex space-x-2">
          <TabSwitch
            activeTab={activeTab}
            tabName="accidents"
            icon={<Camera />}
            label="Accident Reports"
            onClick={() => setActiveTab('accidents')}
          />
          <TabSwitch
            activeTab={activeTab}
            tabName="statistics"
            icon={<BarChart3 />}
            label="Statistics"
            onClick={() => setActiveTab('statistics')}
          />
          <TabSwitch
            activeTab={activeTab}
            tabName="cameras"
            icon={<Camera size={18} />}
            label="Cameras"
            onClick={() => setActiveTab('cameras')}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="text-center py-10">
            <div className="spinner"></div>
            <p className="mt-2 text-gray-600">Loading data...</p>
          </div>
        )}

        {/* Content based on active tab */}
        {!loading && activeTab === 'accidents' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Accidents</h2>
            <AccidentList 
              accidents={localReports} 
              onAcknowledge={(id) => handleAccidentAction(id, 'acknowledge')}
              onResolve={(id) => handleAccidentAction(id, 'resolve')}
            />
          </div>
        )}

        {activeTab === 'statistics' && (
          <StatisticsComponent data={statsData} />
        )}

        {activeTab === 'cameras' && (
          <CameraGrid gridSize={4} />
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;