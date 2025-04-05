import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, Maximize, X, Ambulance, Flame } from 'lucide-react';
import { Accident } from '../types';
import { toast } from 'react-hot-toast';


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
  const [dispatchingAmbulance, setDispatchingAmbulance] = useState<string | null>(null);
  const [dispatchingFireforce, setDispatchingFireforce] = useState<string | null>(null);
  
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
    
    // Use the backend server URL for images
    const backendUrl = 'http://127.0.0.1:5000';
    
    // Handle paths that might start with / or without
    if (imagePath.startsWith('/')) {
      return `${backendUrl}${imagePath}`;
    } else {
      return `${backendUrl}/${imagePath}`;
    }
  };

  // Function to dispatch ambulance using Twilio
  const dispatchAmbulance = async (accident: Accident) => {
    setDispatchingAmbulance(accident.id);
    try {
      // Configuration flag - set to false to use simulation, true to use real Twilio API
      const USE_REAL_TWILIO = true; // Toggle this when ready to use real API
      
      if (USE_REAL_TWILIO) {
        // Real Twilio API integration
        const response = await fetch('http://127.0.0.1:5000/api/dispatch/ambulance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accidentId: accident.id,
            location: accident.location,
            timestamp: accident.timestamp,
            message: `EMERGENCY: Accident reported at ${accident.location.address}. Ambulance required urgently. Coordinates: ${accident.location.lat},${accident.location.lng}`,
            // You can add more fields as needed for your Twilio configuration
            // recipientPhone: "+1234567890" // Uncomment and set when using real API
          })
        });
        
        const data = await response.json();
        if (data.success) {
          toast.success(`Ambulance dispatched to ${accident.location.address}`);
        } else {
          throw new Error(data.message || 'Failed to dispatch ambulance');
        }
      } else {
        // Simulation mode
        console.log('SIMULATION MODE: Dispatching ambulance to:', accident.location);
        console.log('Would send SMS with Twilio to emergency services with message:');
        console.log(`EMERGENCY: Accident reported at ${accident.location.address}. Ambulance required urgently. Coordinates: ${accident.location.lat},${accident.location.lng}`);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        toast.success(`Ambulance dispatched to ${accident.location.address}`);
      }
    } catch (error) {
      console.error('Error dispatching ambulance:', error);
      toast.error('Failed to dispatch ambulance. Please try again.');
    } finally {
      setDispatchingAmbulance(null);
    }
  };

  // Function to dispatch fire force using Twilio
  const dispatchFireforce = async (accident: Accident) => {
    setDispatchingFireforce(accident.id);
    try {
      // Configuration flag - set to false to use simulation, true to use real Twilio API
      const USE_REAL_TWILIO = true; // Toggle this when ready to use real API
      
      if (USE_REAL_TWILIO) {
        // Real Twilio API integration
        const response = await fetch('http://127.0.0.1:5000/api/dispatch/fireforce', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accidentId: accident.id,
            location: accident.location,
            timestamp: accident.timestamp,
            message: `EMERGENCY: Fire hazard/accident reported at ${accident.location.address}. Fire response team required urgently. Coordinates: ${accident.location.lat},${accident.location.lng}`,
            // You can add more fields as needed for your Twilio configuration
            // recipientPhone: "+1234567890" // Uncomment and set when using real API
          })
        });
        
        const data = await response.json();
        if (data.success) {
          toast.success(`Fire force dispatched to ${accident.location.address}`);
        } else {
          throw new Error(data.message || 'Failed to dispatch fire force');
        }
      } else {
        // Simulation mode
        console.log('SIMULATION MODE: Dispatching fire force to:', accident.location);
        console.log('Would send SMS with Twilio to emergency services with message:');
        console.log(`EMERGENCY: Fire hazard/accident reported at ${accident.location.address}. Fire response team required urgently. Coordinates: ${accident.location.lat},${accident.location.lng}`);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        toast.success(`Fire force dispatched to ${accident.location.address}`);
      }
    } catch (error) {
      console.error('Error dispatching fire force:', error);
      toast.error('Failed to dispatch fire force. Please try again.');
    } finally {
      setDispatchingFireforce(null);
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
                {/* Emergency dispatch buttons */}
                <button 
                  onClick={() => dispatchAmbulance(accident)}
                  disabled={dispatchingAmbulance === accident.id}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-200 flex items-center"
                >
                  {dispatchingAmbulance === accident.id ? (
                    <span className="flex items-center">
                      <span className="animate-spin h-3 w-3 border-2 border-blue-700 rounded-full border-t-transparent mr-1"></span>
                      Dispatching...
                    </span>
                  ) : (
                    <>
                      <Ambulance size={14} className="mr-1" />
                      Ambulance
                    </>
                  )}
                </button>
                
                <button 
                  onClick={() => dispatchFireforce(accident)}
                  disabled={dispatchingFireforce === accident.id}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200 flex items-center"
                >
                  {dispatchingFireforce === accident.id ? (
                    <span className="flex items-center">
                      <span className="animate-spin h-3 w-3 border-2 border-red-700 rounded-full border-t-transparent mr-1"></span>
                      Dispatching...
                    </span>
                  ) : (
                    <>
                      <Flame size={14} className="mr-1" />
                      Fire Force
                    </>
                  )}
                </button>
                
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