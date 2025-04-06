import React, { useState, useEffect } from 'react';
import { BarChart3, Bell, Camera, FileCheck, MapPin, AlertTriangle, BarChart2, UserCheck } from 'lucide-react';
import { Accident } from '../types';
import AccidentList from './AccidentList';
import Statistics from './Statistics';
import CameraGrid from './CameraGrid';
import { useNavigate } from 'react-router-dom';
import notificationService from '../services/AccidentNotificationService';
import { toast } from 'react-hot-toast';
import { Loader } from 'lucide-react';
import { AlertOctagon } from 'lucide-react';

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
  const navigate = useNavigate();

  // Load accidents from server
  const loadAccidents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/accidents');
      
      if (!response.ok) {
        throw new Error(`Error fetching accidents: ${response.status}`);
      }
      
      const accidents = await response.json();
      console.log("Accidents loaded from server:", accidents.length, "accidents");
      
      if (Array.isArray(accidents)) {
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
      
      // Listen for new accidents from the ML system
      notificationService.on('new-accident', (accident: Accident) => {
        console.log("New accident notification received:", accident);
        
        // Show a toast notification
        toast.success(`New accident detected at ${accident.location.address}`, {
          duration: 5000,
          position: 'top-right'
        });
        
        // Reload all accidents to ensure we have the latest data
        loadAccidents();
      });
      
      // Listen for updated accidents
      notificationService.on('accident-updated', (accident: Accident) => {
        console.log("Accident update received:", accident);
        
        toast.info(`Accident at ${accident.location.address} has been updated`, {
          duration: 3000,
          position: 'top-right'
        });
        
        // Reload all accidents to ensure we have the latest data
        loadAccidents();
      });
      
      // Listen for deleted accidents
      notificationService.on('accident-deleted', (data: { id: string }) => {
        console.log("Accident deletion notification received:", data.id);
        
        // Remove the accident from local state
        setLocalReports(prev => prev.filter(a => a.id !== data.id));
        
        toast.info(`An accident report has been deleted`, {
          duration: 3000,
          position: 'top-right'
        });
      });
      
      // Initial data load
      loadAccidents();
      
      // Set up polling for regular updates
      const intervalId = setInterval(() => {
        console.log("Polling for accident updates...");
        loadAccidents();
      }, 30000); // Update every 30 seconds
      
      // Clean up on component unmount
      return () => {
        console.log("Cleaning up notification service and polling");
        notificationService.off('new-accident');
        notificationService.off('accident-updated');
        notificationService.off('accident-deleted');
        notificationService.disconnect();
        clearInterval(intervalId);
      };
    } catch (error) {
      console.error("Error setting up notification service:", error);
      setLoading(false);
      
      // Still try to load accidents even if notification service fails
      loadAccidents();
      
      // Still set up polling if socket fails
      const intervalId = setInterval(() => {
        console.log("Polling for accident updates (fallback)...");
        loadAccidents();
      }, 30000);
      
      return () => {
        clearInterval(intervalId);
      };
    }
  }, []);

  // Handler for acknowledging accidents
  const handleAccidentAction = async (accidentId: string, action: 'acknowledge' | 'resolve' | 'reject') => {
    try {
      console.log(`${action} accident with ID: ${accidentId}`);
      
      // Optimistically update the UI
      setLocalReports(prev => prev.map(accident => 
        accident.id === accidentId 
          ? {...accident, status: action === 'acknowledge' ? 'acknowledged' : (action === 'resolve' ? 'resolved' : 'rejected')} 
          : accident
      ));
      
      // Send update to the server
      const response = await fetch(`/api/accidents/${accidentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: action === 'acknowledge' ? 'acknowledged' : (action === 'resolve' ? 'resolved' : 'rejected')
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update accident status: ${response.status}`);
      }
      
      toast.success(`Accident ${action}d successfully`);
    } catch (error) {
      console.error(`Error updating accident ${accidentId}:`, error);
      
      // Revert the optimistic update on error
      loadAccidents();
      
      toast.error(`Failed to ${action} accident. Please try again.`);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-600">
          Manage accident reports, dispatch emergency services, and view statistics
        </p>
      </header>
      
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 border-b flex space-x-2">
          <TabSwitch
            activeTab={activeTab}
            tabName="accidents"
            icon={<AlertTriangle size={18} />}
            label="Accident Reports"
            onClick={() => setActiveTab('accidents')}
          />
          <TabSwitch
            activeTab={activeTab}
            tabName="statistics"
            icon={<BarChart2 size={18} />}
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
        
        <div className="p-4">
          {loading && activeTab === 'accidents' ? (
            <div className="py-20 text-center">
              <Loader className="animate-spin w-12 h-12 text-blue-500 mx-auto mb-4" />
              <p className="text-gray-500">Loading dashboard data...</p>
            </div>
          ) : error && activeTab === 'accidents' ? (
            <div className="py-20 text-center">
              <AlertOctagon className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-500">{error}</p>
              <button 
                onClick={loadAccidents}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Try Again
              </button>
            </div>
          ) : activeTab === 'accidents' ? (
            <div>
              {/* Group accidents by source */}
              {localReports.some(acc => acc.source === 'anonymous' && acc.status === 'pending') && (
                <>
                  <h2 className="text-lg font-semibold mb-3 flex items-center text-amber-700">
                    <UserCheck className="mr-2" size={20} />
                    Anonymous Reports Pending Verification
                  </h2>
                  <div className="mb-6">
                    <AccidentList 
                      accidents={localReports.filter(acc => acc.source === 'anonymous' && acc.status === 'pending')}
                      onAcknowledge={(id) => handleAccidentAction(id, 'acknowledge')}
                      onResolve={(id) => handleAccidentAction(id, 'resolve')}
                      onReject={(id) => handleAccidentAction(id, 'reject')}
                    />
                  </div>
                </>
              )}
              
              {/* Display camera-detected accidents */}
              <h2 className="text-lg font-semibold mb-3 flex items-center">
                <Camera className="mr-2" size={20} />
                Camera-Detected Accidents
              </h2>
              <AccidentList 
                accidents={localReports.filter(acc => acc.source === 'camera' || acc.status !== 'pending')}
                onAcknowledge={(id) => handleAccidentAction(id, 'acknowledge')}
                onResolve={(id) => handleAccidentAction(id, 'resolve')}
                onReject={(id) => handleAccidentAction(id, 'reject')}
              />
            </div>
          ) : activeTab === 'statistics' ? (
            <Statistics />
          ) : (
            <CameraGrid />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;