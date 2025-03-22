import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AdminDashboard from './components/AdminDashboard';
import AnonymousReport from './components/AnonymousReport';

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
              <Link to="/admin" className="hover:text-blue-200">
                Admin Dashboard
              </Link>
              <Link to="/" className="hover:text-blue-200">
                Report Accident
              </Link>
            </div>
          </div>
        </nav>
        <Routes>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/" element={<AnonymousReport />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;