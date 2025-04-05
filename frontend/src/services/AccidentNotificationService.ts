import { io, Socket } from 'socket.io-client';
import { Accident } from '../types';

// Event types for type safety
type AccidentEvents = {
  'new-accident': (accident: Accident) => void;
  'accident-history': (accidents: Accident[]) => void;
  'accident-updated': (accident: Accident) => void;
  'camera-status-update': (data: any) => void;
};

class AccidentNotificationService {
  private socket: Socket | null = null;
  private listeners: Map<string, Array<(...args: any[]) => void>> = new Map();
  private serverUrl: string;
  private connectionAttempts: number = 0;
  private maxRetries: number = 5;
  private retryInterval: number = 5000; // 5 seconds

  constructor(serverUrl: string = '') {
    // Always use port 5000 for backend API and Socket.IO
    this.serverUrl = 'http://127.0.0.1:5000';
    console.log(`Notification service initialized with server URL: ${this.serverUrl}`);
  }

  // Connect to the notification server
  connect(): void {
    if (this.socket && this.socket.connected) {
      console.log('Already connected to notification server');
      return;
    }

    try {
      console.log(`Connecting to socket.io server at ${this.serverUrl}`);
      
      // Close any existing connection
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
      
      // Create new connection with more reliable configuration
      this.socket = io(this.serverUrl, {
        reconnectionAttempts: this.maxRetries,
        reconnectionDelay: this.retryInterval,
        timeout: 10000, // Increase timeout to 10 seconds
        transports: ['polling', 'websocket'], // Prefer polling first, then try websocket
        path: '/socket.io',
        forceNew: true,
        autoConnect: true
      });
      
      this.socket.on('connect', () => {
        console.log('Connected to accident notification server', this.socket?.id);
        this.connectionAttempts = 0;
      });
      
      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from accident notification server:', reason);
        // If disconnected due to transport close, immediately try HTTP polling
        if (reason === 'transport close') {
          console.log('Transport closed, switching to HTTP polling');
          this.fallbackToHttpPolling();
        }
      });
      
      this.socket.on('connect_error', (err) => {
        console.error('Connection error:', err.message);
        this.connectionAttempts++;
        
        if (this.connectionAttempts >= this.maxRetries) {
          console.error(`Failed to connect after ${this.maxRetries} attempts. Switching to HTTP polling.`);
          this.fallbackToHttpPolling();
        }
      });
      
      // Set up listeners for accident events
      this.socket.on('new-accident', (accident: Accident) => {
        console.log('New accident received via socket.io:', accident);
        this.notifyListeners('new-accident', accident);
      });
      
      this.socket.on('accident-history', (accidents: Accident[]) => {
        console.log('Accident history received via socket.io:', accidents);
        this.notifyListeners('accident-history', accidents);
      });
      
      this.socket.on('camera-status-update', (data: any) => {
        console.log('Camera status update received via socket.io:', data);
        this.notifyListeners('camera-status-update', data);
      });
    } catch (error) {
      console.error('Failed to connect to notification server:', error);
      this.fallbackToHttpPolling();
    }
  }

  // Fallback to HTTP polling if Socket.IO fails
  private fallbackToHttpPolling(): void {
    console.log('Falling back to HTTP polling for accident updates');
    
    // Clear existing polling interval if it exists
    if ((this as any).pollInterval) {
      clearInterval((this as any).pollInterval);
    }
    
    // Set up polling interval for accidents
    const pollInterval = setInterval(async () => {
      try {
        // Poll for accidents
        const accidentResponse = await fetch('http://127.0.0.1:5000/api/accidents');
        if (accidentResponse.ok) {
          const accidents = await accidentResponse.json();
          console.log('Accidents fetched via HTTP polling:', accidents);
          this.notifyListeners('accident-history', accidents);
        }
        
        // Also poll for active cameras
        const camerasResponse = await fetch('http://127.0.0.1:5000/api/cameras/active');
        if (camerasResponse.ok) {
          const data = await camerasResponse.json();
          if (data.success && data.activeCameras) {
            console.log('Active cameras fetched via HTTP polling:', data.activeCameras);
            data.activeCameras.forEach((camera: any) => {
              this.notifyListeners('camera-status-update', {
                cameraId: camera.cameraId,
                cameraName: camera.cameraName,
                status: 'active',
                videoPath: camera.videoPath
              });
            });
          }
        }
      } catch (error) {
        console.error('Error polling for updates:', error);
      }
    }, 5000); // Poll every 5 seconds
    
    // Store the interval ID for cleanup
    (this as any).pollInterval = pollInterval;
  }

  // Disconnect from the server
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Clear polling interval if it exists
    if ((this as any).pollInterval) {
      clearInterval((this as any).pollInterval);
      (this as any).pollInterval = null;
    }
  }

  // Register event listeners
  on<T extends keyof AccidentEvents>(
    event: T, 
    callback: AccidentEvents[T]
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event)?.push(callback as any);
  }

  // Remove event listeners
  off<T extends keyof AccidentEvents>(
    event: T, 
    callback?: AccidentEvents[T]
  ): void {
    if (!callback) {
      // Remove all listeners for this event
      this.listeners.delete(event);
      return;
    }
    
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback as any);
      if (index !== -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  // Notify all listeners of an event
  private notifyListeners(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }
}

// Create a singleton instance
const notificationService = new AccidentNotificationService();

export default notificationService; 