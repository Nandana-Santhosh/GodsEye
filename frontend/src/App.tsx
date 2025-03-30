import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AnonymousReport from './components/AnonymousReport';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import Home from './components/Home';

function App() {
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