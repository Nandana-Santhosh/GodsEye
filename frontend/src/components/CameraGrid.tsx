import React, { useState, useEffect, useRef } from 'react';
import { Camera } from '../types';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Video, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import notificationService from '../services/AccidentNotificationService';

interface CameraGridProps {
  gridSize?: number;
}

const CameraGrid: React.FC<CameraGridProps> = ({ gridSize = 4 }) => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [activeCameras, setActiveCameras] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingCameras, setProcessingCameras] = useState<string[]>([]);
  const navigate = useNavigate();
  
  // Reference for webcam stream
  const webcamRef = useRef<HTMLVideoElement | null>(null);
  
  // Fetch available cameras
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        // In a real implementation, this would be an API call
        // For now, we'll use mock data
        const mockCameras: Camera[] = [
          {
            id: 'webcam-1',
            name: 'Webcam',
            location: 'Live Feed',
            type: 'webcam',
            status: 'inactive',
          },
          {
            id: 'video-1',
            name: 'Highway 101',
            location: '37.7749,-122.4194',
            type: 'video',
            status: 'inactive',
            videoPath: '/videos/testing1.mp4'
          },
          {
            id: 'video-2',
            name: 'Downtown Intersection',
            location: '37.7833,-122.4167',
            type: 'video',
            status: 'inactive',
            videoPath: '/videos/testing2.mp4'
          },
          {
            id: 'empty-1',
            name: 'Camera 3',
            location: 'Not Connected',
            type: 'video',
            status: 'inactive'
          },
          {
            id: 'empty-2',
            name: 'Camera 4',
            location: 'Not Connected',
            type: 'video',
            status: 'inactive'
          }
        ];
        
        setCameras(mockCameras);
        
        // Load initial camera status
        await fetchActiveCameras(mockCameras);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching cameras:', err);
        setError('Failed to load cameras. Please try again later.');
        setLoading(false);
      }
    };
    
    // Function to fetch active cameras status from the backend
    const fetchActiveCameras = async (cameraList: Camera[]) => {
      try {
        // First try direct connection
        console.log('Fetching active cameras...');
        try {
          const response = await fetch('http://127.0.0.1:5000/api/cameras/active');
          await handleActiveResponse(response, cameraList);
        } catch (error) {
          console.error('Direct API call failed, trying proxy:', error);
          try {
            // Try using the proxy configuration
            const response = await fetch('/api/cameras/active');
            await handleActiveResponse(response, cameraList);
          } catch (proxyError) {
            console.error('Proxy connection also failed:', proxyError);
          }
        }
      } catch (error) {
        console.error('Error fetching active cameras:', error);
      }
    };
    
    // Handle response from active cameras API
    const handleActiveResponse = async (response: Response, cameraList: Camera[]) => {
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.activeCameras && data.activeCameras.length > 0) {
          // Mark cameras as active and processing
          const activeIds: string[] = [];
          const processingIds: string[] = [];
          
          data.activeCameras.forEach((activeCam: any) => {
            // Find the matching camera in our list
            const matchingCamera = cameraList.find(cam => cam.id === activeCam.cameraId);
            if (matchingCamera) {
              activeIds.push(activeCam.cameraId);
              processingIds.push(activeCam.cameraId);
            }
          });
          
          setActiveCameras(activeIds);
          setProcessingCameras(processingIds);
        }
      }
    };
    
    fetchCameras();
    
    // Set up polling for active camera status
    const pollInterval = setInterval(() => {
      if (cameras.length > 0) {
        fetchActiveCameras(cameras);
      }
    }, 10000); // Poll every 10 seconds
    
    // Listen for Socket.IO updates on camera status
    const setupSocketListeners = () => {
      // Use the existing notification service instead of creating a new socket
      notificationService.on('camera-status-update', (data: any) => {
        console.log('Camera status update received:', data);
        
        if (data.status === 'active') {
          setProcessingCameras(prev => [...prev, data.cameraId]);
          toast.success(`Started processing ${data.cameraName}`);
        } else {
          setProcessingCameras(prev => prev.filter(id => id !== data.cameraId));
          toast.success(`Stopped processing ${data.cameraName}`);
        }
      });
      
      return () => {
        notificationService.off('camera-status-update');
      };
    };
    
    const cleanup = setupSocketListeners();
    
    return () => {
      if (cleanup) cleanup();
      clearInterval(pollInterval);
    };
  }, []);
  
  // Start ML processing for a camera
  const startProcessing = async (camera: Camera) => {
    if (!camera.videoPath && camera.type !== 'webcam') {
      console.error('Cannot process camera without videoPath');
      return;
    }
    
    try {
      // First try direct connection
      console.log('Trying direct backend connection for camera start...');
      try {
        const response = await fetch('http://127.0.0.1:5000/api/cameras/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cameraId: camera.id,
            cameraName: camera.name,
            videoPath: camera.videoPath,
            location: camera.location
          }),
        });
        
        await handleProcessingResponse(response, camera, 'start');
      } catch (error) {
        console.error('Direct start request failed, trying proxy:', error);
        
        // Try proxy connection
        const response = await fetch('/api/cameras/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cameraId: camera.id,
            cameraName: camera.name,
            videoPath: camera.videoPath,
            location: camera.location
          }),
        });
        
        await handleProcessingResponse(response, camera, 'start');
      }
    } catch (err) {
      console.error('Error starting camera processing:', err);
      toast.error('Error starting camera processing. See console for details.');
    }
  };
  
  // Handle response from camera processing API
  const handleProcessingResponse = async (response: Response, camera: Camera, action: 'start' | 'stop') => {
    const data = await response.json();
    
    if (data.success) {
      if (action === 'start') {
        setProcessingCameras(prev => [...prev, camera.id]);
        console.log(`Started processing camera ${camera.name}`);
      } else {
        setProcessingCameras(prev => prev.filter(id => id !== camera.id));
        console.log(`Stopped processing camera ${camera.name}`);
      }
    } else {
      console.error(`Failed to ${action} processing:`, data.message);
      toast.error(`Failed to ${action} processing: ${data.message}`);
    }
  };
  
  // Stop ML processing for a camera
  const stopProcessing = async (camera: Camera) => {
    try {
      // First try direct connection
      console.log('Trying direct backend connection for camera stop...');
      try {
        const response = await fetch('http://127.0.0.1:5000/api/cameras/stop', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cameraId: camera.id
          }),
        });
        
        await handleProcessingResponse(response, camera, 'stop');
      } catch (error) {
        console.error('Direct stop request failed, trying proxy:', error);
        
        // Try proxy connection
        const response = await fetch('/api/cameras/stop', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cameraId: camera.id
          }),
        });
        
        await handleProcessingResponse(response, camera, 'stop');
      }
    } catch (err) {
      console.error('Error stopping camera processing:', err);
      toast.error('Error stopping camera processing. See console for details.');
    }
  };
  
  // Handle starting webcam stream
  const startWebcam = async (cameraId: string) => {
    try {
      if (!webcamRef.current) return;
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      webcamRef.current.srcObject = stream;
      
      // Update active cameras
      setActiveCameras(prev => [...prev, cameraId]);
      
      // Update camera status
      setCameras(prev => 
        prev.map(cam => 
          cam.id === cameraId ? { ...cam, status: 'active' } : cam
        )
      );
      
      // Toast notification
      toast.success('Webcam activated successfully');
    } catch (err) {
      console.error('Error starting webcam:', err);
      setError('Failed to access webcam. Please check permissions.');
      toast.error('Failed to access webcam. Please check permissions.');
    }
  };
  
  // Handle stopping webcam stream
  const stopWebcam = (cameraId: string) => {
    if (webcamRef.current && webcamRef.current.srcObject) {
      const stream = webcamRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      
      tracks.forEach(track => track.stop());
      webcamRef.current.srcObject = null;
      
      // Update active cameras
      setActiveCameras(prev => prev.filter(id => id !== cameraId));
      
      // Update camera status
      setCameras(prev => 
        prev.map(cam => 
          cam.id === cameraId ? { ...cam, status: 'inactive' } : cam
        )
      );
      
      // Stop ML processing if running
      if (processingCameras.includes(cameraId)) {
        const camera = cameras.find(c => c.id === cameraId);
        if (camera) {
          stopProcessing(camera);
        }
      }
    }
  };
  
  // Handle toggling video feed
  const toggleVideo = (camera: Camera) => {
    if (activeCameras.includes(camera.id)) {
      // Stop the video
      if (camera.type === 'webcam') {
        stopWebcam(camera.id);
      } else {
        setActiveCameras(prev => prev.filter(id => id !== camera.id));
        setCameras(prev => 
          prev.map(cam => 
            cam.id === camera.id ? { ...cam, status: 'inactive' } : cam
          )
        );
        
        // Stop ML processing if running
        if (processingCameras.includes(camera.id)) {
          stopProcessing(camera);
        }
      }
    } else {
      // Start the video
      if (camera.type === 'webcam') {
        startWebcam(camera.id);
        
        // For now, we don't start ML processing on webcam
        // as it requires different handling
      } else if (camera.type === 'video' && camera.videoPath) {
        setActiveCameras(prev => [...prev, camera.id]);
        setCameras(prev => 
          prev.map(cam => 
            cam.id === camera.id ? { ...cam, status: 'active' } : cam
          )
        );
        
        // Start ML processing
        startProcessing(camera);
      }
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading cameras...</p>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        <AlertTriangle className="mx-auto mb-4 h-12 w-12" />
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">
        <Video className="inline-block mr-2" size={20} />
        Camera Monitoring
      </h2>
      
      <div className={`grid grid-cols-2 md:grid-cols-${Math.min(gridSize, 4)} gap-4`}>
        {cameras.slice(0, gridSize).map((camera) => (
          <div 
            key={camera.id}
            className="bg-gray-100 rounded-lg overflow-hidden relative"
            style={{ aspectRatio: '4/3' }}
          >
            {/* Camera Feed */}
            <div className="w-full h-full flex items-center justify-center relative">
              {camera.type === 'webcam' && (
                <video
                  ref={camera.id === 'webcam-1' ? webcamRef : null}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${camera.status === 'active' ? '' : 'hidden'}`}
                ></video>
              )}
              
              {camera.type === 'video' && camera.videoPath && camera.status === 'active' && (
                <video
                  src={`http://127.0.0.1:5000${camera.videoPath}`}
                  autoPlay
                  muted
                  loop={false}
                  playsInline
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error(`Error loading video for ${camera.name}:`, e);
                    toast.error(`Could not load video for ${camera.name}. Check console for details.`);
                  }}
                  onEnded={() => {
                    console.log(`Video ended for camera ${camera.name}`);
                    // Stop ML processing when video ends
                    if (processingCameras.includes(camera.id)) {
                      stopProcessing(camera);
                    }
                    // Update UI state
                    setActiveCameras(prev => prev.filter(id => id !== camera.id));
                    setCameras(prev => 
                      prev.map(cam => 
                        cam.id === camera.id ? { ...cam, status: 'inactive' } : cam
                      )
                    );
                  }}
                ></video>
              )}
              
              {/* Inactive or empty camera placeholder */}
              {camera.status !== 'active' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-200">
                  <Video className="h-12 w-12 text-gray-400 mb-2" />
                  <span className="text-gray-500 font-medium">{camera.name}</span>
                  <span className="text-gray-400 text-sm">{camera.location}</span>
                </div>
              )}
              
              {/* Processing indicator */}
              {processingCameras.includes(camera.id) && (
                <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full flex items-center">
                  <div className="animate-pulse mr-1 h-2 w-2 rounded-full bg-white"></div>
                  Processing
                </div>
              )}
              
              {/* Camera info overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white p-2 text-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{camera.name}</div>
                    <div className="text-xs opacity-80">{camera.location}</div>
                  </div>
                  
                  {/* Only show button if camera has a videoPath or is webcam */}
                  {(camera.videoPath || camera.type === 'webcam') && (
                    <button
                      onClick={() => toggleVideo(camera)}
                      className={`p-2 rounded-full ${
                        camera.status === 'active' 
                          ? 'bg-red-600 hover:bg-red-700' 
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                      title={camera.status === 'active' ? 'Stop' : 'Start'}
                    >
                      {camera.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-gray-600 text-sm">
        <p><strong>Note:</strong> Click the play button to start a camera feed. When a video is playing, the ML model automatically analyzes it for accidents.</p>
        <p>When using webcam, ensure camera permissions are enabled.</p>
      </div>
    </div>
  );
};

export default CameraGrid; 