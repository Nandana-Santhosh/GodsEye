import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, Maximize, X } from 'lucide-react';
import { Accident } from '../types';

interface AccidentListProps {
  accidents: Accident[];
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
}

const AccidentList: React.FC<AccidentListProps> = ({ 
  accidents = [], 
  onAcknowledge, 
  onResolve 
}) => {
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  
  const getStatusIcon = (status: Accident['status']) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'acknowledged':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusLabel = (status: Accident['status']) => {
    switch (status) {
      case 'resolved':
        return 'Resolved';
      case 'rejected':
        return 'Rejected';
      case 'acknowledged':
        return 'Acknowledged';
      default:
        return 'Pending';
    }
  };

  const formatDate = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      console.error("Invalid date format:", error);
      return 'Invalid date';
    }
  };
  
  // Function to ensure proper image URL handling
  const getImageUrl = (imagePath: string) => {
    // Check if the image path already contains the server URL
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Handle paths that might start with / or without
    if (imagePath.startsWith('/')) {
      return imagePath;
    } else {
      return `/${imagePath}`;
    }
  };

  if (accidents.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No accidents reported yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg">
      {/* Enlarged image modal */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button 
              className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
              onClick={() => setEnlargedImage(null)}
            >
              <X size={24} />
            </button>
            <img 
              src={enlargedImage} 
              alt="Enlarged accident" 
              className="max-h-[90vh] max-w-full object-contain"
              onError={(e) => {
                const element = e.target as HTMLImageElement;
                element.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
              }}
            />
          </div>
        </div>
      )}
    
      <ul className="divide-y divide-gray-200">
        {accidents.map((accident) => (
          <li key={accident.id} className="px-4 py-4 hover:bg-gray-50 transition duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {getStatusIcon(accident.status)}
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {accident.source === 'camera' ? 'Camera Detection' : 'Manual Report'}
                  </p>
                  <p className="text-sm text-gray-700">
                    {accident.location.address || 'Unknown location'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(accident.timestamp)}
                  </p>
                </div>
              </div>
              
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${accident.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                  ${accident.status === 'acknowledged' ? 'bg-orange-100 text-orange-800' : ''}
                  ${accident.status === 'resolved' ? 'bg-green-100 text-green-800' : ''}
                  ${accident.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                `}>
                  {getStatusLabel(accident.status)}
                </span>
              </div>
              
              <div className="flex space-x-2">
                {/* Show appropriate action buttons based on status */}
                {accident.status === 'pending' && onAcknowledge && (
                  <button 
                    onClick={() => onAcknowledge(accident.id)}
                    className="px-3 py-1 bg-orange-100 text-orange-700 rounded-md text-sm font-medium hover:bg-orange-200"
                  >
                    Acknowledge
                  </button>
                )}
                
                {(accident.status === 'pending' || accident.status === 'acknowledged') && onResolve && (
                  <button 
                    onClick={() => onResolve(accident.id)}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm font-medium hover:bg-green-200"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
            
            {/* Display images in a grid layout if available */}
            {accident.images && accident.images.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {accident.images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={getImageUrl(image)} 
                      alt={`Accident image ${index + 1}`} 
                      className="h-36 w-full object-cover rounded-md cursor-pointer"
                      onClick={() => setEnlargedImage(getImageUrl(image))}
                      onError={(e) => {
                        // Replace with a div containing text instead of an external image
                        const element = e.target as HTMLImageElement;
                        element.style.display = 'none';
                        const parent = element.parentElement;
                        if (parent) {
                          const placeholder = document.createElement('div');
                          placeholder.className = 'h-36 w-full flex items-center justify-center bg-gray-200 rounded-md text-gray-500 text-sm';
                          placeholder.textContent = 'Image not available';
                          parent.appendChild(placeholder);
                        }
                      }}
                    />
                    <button 
                      className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setEnlargedImage(getImageUrl(image))}
                    >
                      <Maximize size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Display description if available */}
            {accident.description && (
              <p className="mt-2 text-sm text-gray-600">
                {accident.description}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AccidentList;