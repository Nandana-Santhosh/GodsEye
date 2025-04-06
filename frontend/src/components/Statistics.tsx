import React, { useState, useEffect } from 'react';
import { Statistics as StatsType } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data?: StatsType;
}

export default function Statistics({ data: initialData }: Props) {
  const [data, setData] = useState<StatsType | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // If initial data is provided, use it
    if (initialData) {
      setData(initialData);
      setLoading(false);
      return;
    }

    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/accidents');
        
        if (!response.ok) {
          throw new Error(`Error fetching accidents: ${response.status}`);
        }
        
        const accidents = await response.json();
        
        if (Array.isArray(accidents)) {
          // Calculate statistics from actual accident data
          const total = accidents.length;
          const verified = accidents.filter(acc => acc.status === 'resolved').length;
          const pending = accidents.filter(acc => acc.status === 'pending').length;
          const rejected = accidents.filter(acc => acc.status === 'rejected').length;
          
          // Calculate location data
          const locationMap: Record<string, number> = {};
          accidents.forEach(acc => {
            const location = acc.location?.address || 'Unknown';
            // Extract city name from address if possible
            const city = location.split(',')[0]?.trim() || location;
            locationMap[city] = (locationMap[city] || 0) + 1;
          });
          
          // Calculate time of day data
          const timeOfDayMap: Record<string, number> = {
            'Morning': 0,
            'Afternoon': 0, 
            'Evening': 0,
            'Night': 0
          };
          
          accidents.forEach(acc => {
            try {
              const date = new Date(acc.timestamp);
              const hour = date.getHours();
              
              // Categorize by time of day
              if (hour >= 5 && hour < 12) {
                timeOfDayMap['Morning']++;
              } else if (hour >= 12 && hour < 17) {
                timeOfDayMap['Afternoon']++;
              } else if (hour >= 17 && hour < 21) {
                timeOfDayMap['Evening']++;
              } else {
                timeOfDayMap['Night']++;
              }
            } catch (e) {
              // Skip this accident if date is invalid
            }
          });
          
          // Create statistics object
          const accidentStats: StatsType = {
            total,
            verified,
            pending,
            rejected,
            byLocation: locationMap,
            byTimeOfDay: timeOfDayMap
          };
          
          setData(accidentStats);
          console.log('Calculated statistics:', accidentStats);
        }
      } catch (error) {
        console.error('Error fetching statistics:', error);
        setError('Failed to load statistics data');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [initialData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-10">
        <div className="text-red-500 mb-4">
          {error || 'Failed to load statistics'}
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  const locationData = Object.entries(data.byLocation || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value) // Sort by highest count first
    .slice(0, 10); // Limit to top 10 locations

  const timeData = Object.entries(data.byTimeOfDay || {})
    .map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600">Total Accidents</p>
            <p className="text-2xl font-bold text-blue-900">{data.total}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600">Verified</p>
            <p className="text-2xl font-bold text-green-900">{data.verified}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-900">{data.pending}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-red-600">Rejected</p>
            <p className="text-2xl font-bold text-red-900">{data.rejected}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Accidents by Location</h2>
          {locationData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No location data available
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Accidents by Time of Day</h2>
          {timeData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No time data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}