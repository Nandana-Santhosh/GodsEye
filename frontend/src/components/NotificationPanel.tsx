import React, { useState, useEffect } from 'react';
import { BiBell } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';
import { Accident } from '../types';
import notificationService from '../services/AccidentNotificationService';

const NotificationPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Accident[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Connect to the notification service
    notificationService.connect();

    // Listen for new accident notifications
    notificationService.on('new-accident', (accident: Accident) => {
      setNotifications(prev => [accident, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Play notification sound
      const audio = new Audio('/notification.mp3');
      audio.play().catch(e => console.log('Audio play error:', e));
    });

    // Listen for accident history
    notificationService.on('accident-history', (accidents: Accident[]) => {
      setNotifications(accidents);
      setUnreadCount(accidents.length);
    });

    return () => {
      // Clean up listeners when component unmounts
      notificationService.off('new-accident');
      notificationService.off('accident-history');
      notificationService.disconnect();
    };
  }, []);

  const togglePanel = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0); // Mark as read when opening
    }
  };

  const handleNotificationClick = (accident: Accident) => {
    navigate(`/admin/accidents/${accident.id}`);
    setIsOpen(false);
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const accidentTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - accidentTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className="fixed top-16 right-4 z-50">
      <button 
        onClick={togglePanel}
        className="relative bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg"
      >
        <BiBell size={24} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-xl border border-gray-200 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-700">Notifications</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
          </div>
          
          <div className="overflow-hidden">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No notifications</div>
            ) : (
              notifications.map((notification, index) => (
                <div 
                  key={`${notification.id}-${index}`}
                  onClick={() => handleNotificationClick(notification)}
                  className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition duration-150"
                >
                  <div className="flex items-start">
                    <div className="bg-red-100 rounded-full p-2 mr-3">
                      <BiBell className="text-red-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {notification.source === 'camera' 
                          ? 'New accident detected' 
                          : 'New accident report'}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {notification.description || notification.location.address}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimeAgo(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;