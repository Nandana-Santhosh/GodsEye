import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AnonymousReport from './components/AnonymousReport';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import Home from './components/Home';
import notificationService from './services/AccidentNotificationService';

function App() {
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const MAX_RECONNECT_ATTEMPTS = 3;

  // Connect to the notification service when the app starts
  useEffect(() => {
    console.log('Connecting to notification service...');
    
    let retryTimer: number | null = null;
    
    const connectWithRetry = () => {
      notificationService.connect();
      
      // After a delay, check if we're still not connected and retry
      if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
        retryTimer = window.setTimeout(() => {
          setConnectionAttempts(prev => {
            const newCount = prev + 1;
            if (newCount >= MAX_RECONNECT_ATTEMPTS) {
              console.log(`Maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Using HTTP fallback.`);
              // Don't show an error toast since the service will fall back to HTTP polling
            } else {
              console.log(`Retrying connection (attempt ${newCount + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
              connectWithRetry();
            }
            return newCount;
          });
        }, 5000); // 5 second delay before retry
      }
    };
    
    connectWithRetry();
    
    return () => {
      console.log('Disconnecting from notification service...');
      notificationService.disconnect();
      
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, []);

  return (
    <Router>
      <div>
        <nav className="bg-blue-600 text-white p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link to="/" className="text-xl font-bold">
              Accident Monitoring System
            </Link>
            <div className="space-x-4">
              <Link to="/" className="hover:text-blue-200">
                Home
              </Link>
              <Link to="/report" className="hover:text-blue-200">
                Report Accident
              </Link>
              <Link to="/admin/login" className="hover:text-blue-200">
                Admin Login
              </Link>
            </div>
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/report" element={<AnonymousReport />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;