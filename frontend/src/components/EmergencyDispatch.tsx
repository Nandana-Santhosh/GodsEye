import React from 'react';
import { Ambulance, Flame, Shield } from 'lucide-react';
import { EmergencyService } from '../types';

const mockServices: EmergencyService[] = [
  {
    id: '1',
    name: 'Central Ambulance',
    type: 'ambulance',
    location: { lat: 40.7128, lng: -74.0060 },
    status: 'available'
  },
  {
    id: '2',
    name: 'Downtown Fire Station',
    type: 'fireforce',
    location: { lat: 40.7148, lng: -74.0068 },
    status: 'available'
  },
  // Add more mock services
];

export default function EmergencyDispatch() {
  const getServiceIcon = (type: EmergencyService['type']) => {
    switch (type) {
      case 'ambulance':
        return <Ambulance className="h-6 w-6 text-red-500" />;
      case 'fireforce':
        return <Flame className="h-6 w-6 text-orange-500" />;
      case 'police':
        return <Shield className="h-6 w-6 text-blue-500" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-5 sm:px-6">
        <h2 className="text-lg font-medium text-gray-900">Emergency Services Dispatch</h2>
        <p className="mt-1 text-sm text-gray-500">
          Dispatch emergency services to accident locations
        </p>
      </div>
      <div className="border-t border-gray-200">
        <ul className="divide-y divide-gray-200">
          {mockServices.map((service) => (
            <li key={service.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {getServiceIcon(service.type)}
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{service.name}</p>
                    <p className="text-sm text-gray-500">
                      Status:{' '}
                      <span
                        className={
                          service.status === 'available'
                            ? 'text-green-600'
                            : 'text-yellow-600'
                        }
                      >
                        {service.status}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  disabled={service.status !== 'available'}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    service.status === 'available'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Dispatch
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}