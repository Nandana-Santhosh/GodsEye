import React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { Accident } from '../types';

const mockAccidents: Accident[] = [
  {
    id: '1',
    timestamp: '2024-03-15T10:30:00Z',
    location: {
      lat: 40.7128,
      lng: -74.0060,
      address: 'Broadway & 7th Ave, New York, NY'
    },
    images: [
      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=1000',
    ],
    status: 'pending',
    source: 'camera'
  },
  // Add more mock accidents as needed
];

export default function AccidentList() {
  const getStatusIcon = (status: Accident['status']) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-5 sm:px-6">
        <h2 className="text-lg font-medium text-gray-900">Recent Accidents</h2>
      </div>
      <ul className="divide-y divide-gray-200">
        {mockAccidents.map((accident) => (
          <li key={accident.id} className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {getStatusIcon(accident.status)}
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {accident.location.address}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(accident.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-200">
                  View Details
                </button>
                {accident.status === 'pending' && (
                  <>
                    <button className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm font-medium hover:bg-green-200">
                      Verify
                    </button>
                    <button className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200">
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}