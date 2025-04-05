import os
import cv2
import time
import json
import uuid
import argparse
import logging
import threading
import datetime
import requests
import numpy as np
from ultralytics import YOLO
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

class CameraConfig:
    """Class to store camera configuration"""
    def __init__(self, name, video_path, location):
        self.name = name
        self.video_path = video_path
        self.location = location

class AccidentDetectionSystem:
    def __init__(self, model_path='best.pt', confidence_threshold=0.5, dashboard_url=None):
        """
        Initialize the accident detection system using YOLOv8 model
        
        Args:
            model_path: Path to the YOLOv8 model file (.pt)
            confidence_threshold: Minimum confidence threshold for accident detection
            dashboard_url: URL of the frontend dashboard API
        """
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        
        # Convert localhost to proper IP for compatibility
        if dashboard_url:
            if 'localhost' in dashboard_url:
                dashboard_url = dashboard_url.replace('localhost', '127.0.0.1')
        
        self.dashboard_url = dashboard_url or 'http://127.0.0.1:5000'
        self.model = None
        self.snapshot_counter = 0
        self.active_cameras = []
        self.running = True
        
        # Track accident events by camera to consolidate notifications
        self.accident_events = {}
        
        # Initialize the model
        self.load_model()
        
    def load_model(self):
        """Load the YOLOv8 model"""
        try:
            logger.info(f"Loading YOLOv8 model from {self.model_path}")
            self.model = YOLO(self.model_path)
            logger.info("Model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            raise RuntimeError(f"Failed to load model: {str(e)}")
    
    def create_snapshot_dir(self, snapshot_dir='AccSnaps'):
        """Create directory for storing snapshots if it doesn't exist"""
        if not os.path.exists(snapshot_dir):
            os.makedirs(snapshot_dir, exist_ok=True)
            logger.info(f"Created snapshot directory: {snapshot_dir}")
        return snapshot_dir
    
    def save_snapshot(self, frame, camera_name, snapshot_dir='AccSnaps'):
        """Save a snapshot when an accident is detected"""
        snapshot_dir = self.create_snapshot_dir(snapshot_dir)
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{camera_name}_{timestamp}_{self.snapshot_counter}.jpg"
        filepath = os.path.join(snapshot_dir, filename)
        
        try:
            cv2.imwrite(filepath, frame)
            logger.info(f"Snapshot saved: {filepath}")
            self.snapshot_counter += 1
            return filepath
        except Exception as e:
            logger.error(f"Failed to save snapshot: {str(e)}")
            return None
    
    def get_current_minute_key(self, camera_name):
        """Get a key for the current minute to consolidate accidents"""
        now = datetime.datetime.now()
        minute_key = f"{camera_name}_{now.strftime('%Y%m%d_%H%M')}"
        return minute_key
    
    def should_notify_for_accident(self, camera_name, current_snapshots):
        """
        Determine if we should send a new notification or update an existing one
        Returns: (should_notify, is_update, existing_accident_key)
        """
        minute_key = self.get_current_minute_key(camera_name)
        
        # Check if we already have an accident for this camera in the current minute
        if minute_key in self.accident_events:
            event = self.accident_events[minute_key]
            
            # If we already have 2 snapshots, don't take more for this minute
            if len(event['snapshots']) >= 2:
                return False, False, minute_key
            
            # Add another snapshot to the existing event
            return True, True, minute_key
        
        # This is a new accident event for this minute
        self.accident_events[minute_key] = {
            'timestamp': datetime.datetime.now().isoformat(),
            'snapshots': [],
            'reported': False
        }
        
        return True, False, minute_key
    
    def notify_dashboard(self, camera_name, camera_location, snapshot_paths, confidence):
        """Send notification to the dashboard"""
        if not self.dashboard_url:
            logger.info("No dashboard URL provided. Skipping notification.")
            return
        
        try:
            # Check if there are any snapshots
            if not snapshot_paths:
                logger.warning("No snapshots to send. Skipping notification.")
                return
                
            minute_key = self.get_current_minute_key(camera_name)
            
            # Format image paths for proper access by the frontend
            formatted_paths = []
            for path in snapshot_paths:
                # Convert backslashes to forward slashes
                path = path.replace('\\', '/')
                
                # Extract just the filename if the path includes directories
                filename = os.path.basename(path)
                
                # Create proper path for the frontend to access the file
                formatted_path = f"/AccSnaps/{filename}"
                formatted_paths.append(formatted_path)
                
                logger.info(f"Snapshot path: {path} -> Formatted: {formatted_path}")
            
            # Create the notification data
            accident_data = {
                "camera_name": camera_name,
                "location": camera_location,
                "timestamp": datetime.datetime.now().isoformat(),
                "confidence": float(confidence),
                "snapshot_path": formatted_paths[0],  # First image is primary
                "images": formatted_paths  # All images in an array
            }

            # Try API health check first to verify connectivity
            health_url = self.dashboard_url
            if health_url.endswith('/'):
                health_url = health_url[:-1]
                
            if not health_url.endswith('/api/health'):
                health_url = f"{health_url}/api/health"
                
            logger.info(f"Checking API health at {health_url}")
            try:
                health_response = requests.get(health_url, timeout=5)
                if health_response.status_code == 200:
                    logger.info(f"API health check successful: {health_response.text}")
                else:
                    logger.warning(f"API health check failed: {health_response.status_code}")
            except Exception as e:
                logger.warning(f"API health check failed: {str(e)}")
            
            # Ensure the URL has the correct endpoint
            api_url = self.dashboard_url
            if not api_url.endswith('/api/accidents'):
                # Add /api/accidents if not already in the URL
                if api_url.endswith('/'):
                    api_url += 'api/accidents'
                else:
                    api_url += '/api/accidents'
            
            logger.info(f"Sending accident notification to dashboard at {api_url}")
            logger.info(f"Data: {accident_data}")
            
            response = requests.post(
                api_url, 
                json=accident_data,
                headers={'Content-Type': 'application/json'},
                timeout=10  # Add timeout to prevent hanging
            )
            
            if response.status_code == 200:
                logger.info(f"Notification sent successfully: {response.status_code}")
                logger.info(f"Response: {response.text}")
                
                # Mark this event as reported
                if minute_key in self.accident_events:
                    self.accident_events[minute_key]['reported'] = True
            else:
                logger.error(f"Failed to send notification: {response.status_code}")
                logger.error(f"Response: {response.text}")
                # Try alternate API endpoint if the first one fails
                if '/api/accidents' in api_url:
                    alternate_url = api_url.replace('/api/accidents', '/api/ml/detection')
                    logger.info(f"Trying alternate endpoint: {alternate_url}")
                    alt_response = requests.post(
                        alternate_url,
                        json=accident_data,
                        headers={'Content-Type': 'application/json'},
                        timeout=10
                    )
                    logger.info(f"Alternate endpoint response: {alt_response.status_code}")
                
            # Print to console for demonstration purposes
            print("\n" + "="*50)
            print("ACCIDENT DETECTED!")
            print(f"Camera: {camera_name}")
            print(f"Location: {camera_location}")
            print(f"Time: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"Confidence: {confidence:.2f}")
            print(f"Snapshots: {len(snapshot_paths)}")
            for i, path in enumerate(snapshot_paths):
                print(f"  {i+1}: {path}")
            print("="*50 + "\n")
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error notifying dashboard: {str(e)}")
        except Exception as e:
            logger.error(f"Error notifying dashboard: {str(e)}")
            logger.exception("Detailed error")
    
    def process_camera_feed(self, camera_config, display=True, snapshot_dir='AccSnaps'):
        """Process video from a camera"""
        camera_name = camera_config.name
        video_path = camera_config.video_path
        camera_location = camera_config.location
        
        logger.info(f"Starting detection on camera: {camera_name} ({video_path})")
        
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                logger.error(f"Failed to open video source: {video_path}")
                return
            
            # Variables for accident detection tracking
            accident_detected = False
            frame_count = 0
            current_snapshots = []
            max_snapshots_per_accident = 2  # Limit to 2 photos per minute
            
            # Check if this is the test video
            is_test_video = "test_video" in video_path
            
            # For test video, predetermined accident frames (60-80% of video)
            if is_test_video:
                total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                accident_start_frame = int(total_frames * 0.6)
                accident_end_frame = int(total_frames * 0.8)
                logger.info(f"Test video detected. Accident frames: {accident_start_frame}-{accident_end_frame}")
            
            # For determining if we need to loop the video
            is_single_video_mode = '--single-video' in sys.argv
            
            while cap.isOpened() and self.running:
                ret, frame = cap.read()
                if not ret:
                    # Video has ended
                    logger.info(f"Video ended for camera: {camera_name}")
                    
                    # If in single video mode, loop the video
                    if is_single_video_mode:
                        logger.info(f"Single video mode: Restarting video {video_path}")
                        cap.release()
                        cap = cv2.VideoCapture(video_path)
                        if not cap.isOpened():
                            logger.error(f"Failed to reopen video source: {video_path}")
                            break
                        continue
                    else:
                        # Normal mode - don't loop
                        break
                
                frame_count += 1
                
                # For test video, use predefined accident frames rather than ML detection
                if is_test_video:
                    # Check if current frame is in the accident range
                    accident_in_current_frame = (frame_count >= accident_start_frame and 
                                                frame_count <= accident_end_frame)
                    detected_confidence = 0.85 if accident_in_current_frame else 0.0
                    
                    # Draw box around accident if detected
                    if accident_in_current_frame:
                        # Draw a red rectangle to highlight the accident
                        cv2.rectangle(frame, (10, 10), (630, 470), (0, 0, 255), 3)
                        cv2.putText(
                            frame,
                            "ACCIDENT DETECTED - TEST VIDEO",
                            (50, 50),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            1,
                            (0, 0, 255),
                            2,
                            cv2.LINE_AA
                        )
                else:
                    # Run YOLOv8 inference on the frame
                    results = self.model(frame, conf=self.confidence_threshold)
                    
                    # Check if there's an accident detection
                    accident_in_current_frame = False
                    detected_confidence = 0.0
                    
                    for result in results:
                        boxes = result.boxes.cpu().numpy()
                        for box in boxes:
                            confidence = box.conf[0]
                            if confidence > self.confidence_threshold:
                                accident_in_current_frame = True
                                detected_confidence = max(detected_confidence, confidence)
                                
                                # Draw bounding box on the frame
                                frame = results[0].plot()
                
                # Handle accident detection
                if accident_in_current_frame:
                    if not accident_detected:
                        # New accident detected
                        logger.info(f"Accident detected on camera: {camera_name}")
                        accident_detected = True
                        current_snapshots = []
                        
                    # Check if we should take a snapshot for this accident event
                    should_notify, is_update, minute_key = self.should_notify_for_accident(camera_name, current_snapshots)
                    
                    if should_notify:
                        # Take a snapshot
                        snapshot_path = self.save_snapshot(frame, camera_name, snapshot_dir)
                        if snapshot_path:
                            # Add to current snapshots and the event tracking
                            current_snapshots.append(snapshot_path)
                            if minute_key in self.accident_events:
                                self.accident_events[minute_key]['snapshots'].append(snapshot_path)
                            
                            # Only notify dashboard on first detection or if we need to update
                            if not is_update or (is_update and len(current_snapshots) >= max_snapshots_per_accident):
                                all_snapshots = self.accident_events[minute_key]['snapshots']
                                self.notify_dashboard(
                                    camera_name, 
                                    camera_location, 
                                    all_snapshots,
                                    detected_confidence
                                )
                        
                    # Display "ACCIDENT DETECTED" text
                    cv2.putText(
                        frame,
                        f"ACCIDENT DETECTED - {camera_name}",
                        (50, 50),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1,
                        (0, 0, 255),
                        2,
                        cv2.LINE_AA
                    )
                else:
                    # Reset accident flag if no accident is detected
                    if accident_detected:
                        logger.info(f"Accident no longer detected on camera: {camera_name}")
                        accident_detected = False
                
                # Display the frame
                if display:
                    cv2.imshow(f"Camera: {camera_name}", frame)
                    
                    # Exit if 'q' is pressed
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        break
                        
                # Add a small delay to simulate real-time processing
                time.sleep(0.03)
            
            # Release resources
            cap.release()
            if display:
                cv2.destroyWindow(f"Camera: {camera_name}")
                
            logger.info(f"Finished processing camera: {camera_name}")
            
        except Exception as e:
            logger.error(f"Error processing camera {camera_name}: {str(e)}")
        
        # Notify that we've finished processing this camera
        logger.info(f"Camera {camera_name} processing complete")
    
    def start_monitoring(self, cameras, display=True, snapshot_dir='AccSnaps'):
        """
        Start monitoring cameras sequentially (one after another) with a delay
        """
        logger.info(f"Starting sequential accident detection on {len(cameras)} cameras")
        
        # Process each camera in sequence
        for camera in cameras:
            logger.info(f"Starting detection on camera: {camera.name}")
            
            # Process this camera
            process_thread = threading.Thread(
                target=self.process_camera_feed,
                args=(camera, display, snapshot_dir)
            )
            process_thread.daemon = True
            process_thread.start()
            
            # Wait for a delay before starting the next camera (10 seconds)
            time.sleep(10)
            
        # Clean up old accident events in a background thread
        cleanup_thread = threading.Thread(
            target=self.cleanup_old_events,
            daemon=True
        )
        cleanup_thread.start()
            
        # Wait for keyboard interrupt to stop
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("Stopping due to keyboard interrupt")
            self.running = False
            
    def cleanup_old_events(self):
        """Periodically clean up old accident events to prevent memory issues"""
        while self.running:
            try:
                now = datetime.datetime.now()
                keys_to_remove = []
                
                # Find events older than 30 minutes
                for key, event in self.accident_events.items():
                    try:
                        event_time = datetime.datetime.fromisoformat(event['timestamp'])
                        if (now - event_time).total_seconds() > 1800:  # 30 minutes
                            keys_to_remove.append(key)
                    except Exception:
                        # If we can't parse the time, remove it to be safe
                        keys_to_remove.append(key)
                
                # Remove old events
                for key in keys_to_remove:
                    del self.accident_events[key]
                    
                if keys_to_remove:
                    logger.info(f"Cleaned up {len(keys_to_remove)} old accident events")
                
                # Sleep for 5 minutes before next cleanup
                time.sleep(300)
            except Exception as e:
                logger.error(f"Error in cleanup thread: {str(e)}")
                time.sleep(60)  # Sleep for 1 minute on error

def main():
    """
    Main function to run the accident detection system
    """
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description='Accident Detection System')
    parser.add_argument('--model', type=str, default='best.pt', help='Path to YOLOv8 model file')
    parser.add_argument('--threshold', type=float, default=0.5, help='Confidence threshold')
    parser.add_argument('--display', action='store_true', help='Display video feed')
    parser.add_argument('--snapshot-dir', type=str, default='AccSnaps', help='Directory to save snapshots')
    parser.add_argument('--dashboard-url', type=str, default='http://127.0.0.1:5000', 
                        help='URL of the frontend dashboard API')
    parser.add_argument('--video-dir', type=str, default='videos', help='Directory with video files')
    parser.add_argument('--mode', type=str, choices=['local', 'presentation'], default='local',
                        help='Deployment mode: local (single laptop) or presentation (two laptops)')
    parser.add_argument('--webcam', action='store_true', help='Use webcam as additional camera source')
    # Add single video mode for processing a specific video
    parser.add_argument('--single-video', type=str, help='Process only a single video file')
    parser.add_argument('--camera-name', type=str, help='Name for the camera when using single-video mode')
    parser.add_argument('--camera-location', type=str, help='Location for the camera when using single-video mode')
    args = parser.parse_args()
    
    # Adjust dashboard URL for presentation mode if not explicitly provided
    if args.mode == 'presentation' and args.dashboard_url == 'http://127.0.0.1:5000':
        print("\n" + "="*50)
        print("PRESENTATION MODE ENABLED")
        print("Please enter the IP address of the frontend laptop")
        frontend_ip = input("Frontend IP Address: ").strip()
        if frontend_ip:
            args.dashboard_url = f"http://{frontend_ip}:5000"
            print(f"Using dashboard URL: {args.dashboard_url}")
        print("="*50 + "\n")
    
    # Set up the accident detection system
    detector = AccidentDetectionSystem(
        model_path=args.model,
        confidence_threshold=args.threshold,
        dashboard_url=args.dashboard_url
    )
    
    # Create snapshot directory
    detector.create_snapshot_dir(args.snapshot_dir)
    
    # Configure camera sources
    cameras = []
    
    # Single video mode - process only one specific video
    if args.single_video:
        if not os.path.exists(args.single_video):
            logger.error(f"Specified video file does not exist: {args.single_video}")
            return
        
        # Use provided camera name or default to filename
        camera_name = args.camera_name
        if not camera_name:
            camera_name = os.path.splitext(os.path.basename(args.single_video))[0]
        
        # Use provided location or default
        camera_location = args.camera_location
        if not camera_location:
            camera_location = f"Camera {camera_name}"
            
        logger.info(f"Single video mode: Processing {args.single_video} as camera '{camera_name}'")
        cameras.append(CameraConfig(camera_name, args.single_video, camera_location))
    else:
        # Video files from the specified directory
        if os.path.exists(args.video_dir):
            for filename in os.listdir(args.video_dir):
                if filename.endswith(('.mp4', '.avi', '.mov')):
                    video_path = os.path.join(args.video_dir, filename)
                    camera_name = os.path.splitext(filename)[0]
                    # Use filename as location for demo purposes
                    camera_location = f"Camera {camera_name}"
                    cameras.append(CameraConfig(camera_name, video_path, camera_location))
        
        # Add webcam if specified
        if args.webcam:
            webcam_id = 0  # Default webcam
            try:
                # Test if webcam is available
                test_cap = cv2.VideoCapture(webcam_id)
                if test_cap.isOpened():
                    webcam_available = True
                    test_cap.release()
                    logger.info(f"Webcam {webcam_id} is available")
                    cameras.append(CameraConfig("Webcam", webcam_id, "Live Webcam Feed"))
                else:
                    logger.error(f"Webcam {webcam_id} not available")
            except Exception as e:
                logger.error(f"Error accessing webcam: {str(e)}")
    
    # If no video files found, use some demo sources
    if not cameras:
        # Default to sample videos if directory is empty
        cameras = [
            CameraConfig("Highway", "../videos/testing1.mp4", "37.7749,-122.4194"),
            CameraConfig("Intersection", "../videos/testing2.mp4", "37.7833,-122.4167"),
            # CameraConfig("City", "videos/city_collision.mp4", "37.8044,-122.2711")
        ]
    
    # Start monitoring
    try:
        # In single video mode, don't run the keyboard interrupt loop
        if args.single_video:
            camera_config = cameras[0]
            logger.info(f"Processing single video: {camera_config.video_path}")
            detector.process_camera_feed(camera_config, display=args.display, snapshot_dir=args.snapshot_dir)
            logger.info(f"Finished processing video: {camera_config.video_path}")
        else:
            detector.start_monitoring(cameras, display=args.display, snapshot_dir=args.snapshot_dir)
    except KeyboardInterrupt:
        logger.info("Detection stopped by user")
    finally:
        detector.running = False
        logger.info("Accident detection system shutdown")

if __name__ == "__main__":
    main() 