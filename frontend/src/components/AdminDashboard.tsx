import React, { useState } from 'react';
import { BarChart3, Bell, Camera, FileCheck, MapPin } from 'lucide-react';
import { Accident, Statistics as StatsType } from '../types';
import AccidentList from './AccidentList';
import StatisticsComponent from './Statistics';
import NotificationPanel from './NotificationPanel';
import EmergencyDispatch from './EmergencyDispatch';

const mockStatistics: StatsType = {
  total: 156,
  verified: 120,
  pending: 26,
  rejected: 10,
  byLocation: {
    'Downtown': 45,
    'Suburbs': 65,
    'Highway': 46
  },
  byTimeOfDay: {
    'Morning': 35,
    'Afternoon': 58,
    'Evening': 42,
    'Night': 21
  }
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'accidents' | 'statistics' | 'dispatch'>('accidents');
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Camera className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Accident Monitoring System</h1>
          </div>
          <div className="flex items-center space-x-4">
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
        {activeTab === 'accidents' && <AccidentList />}
        {activeTab === 'statistics' && <StatisticsComponent data={mockStatistics} />}
        {activeTab === 'dispatch' && <EmergencyDispatch />}
      </main>

      {showNotifications && (
        <NotificationPanel onClose={() => setShowNotifications(false)} />
      )}
    </div>
  );
}