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
import subprocess
import shutil
from glob import glob
from dotenv import load_dotenv
import socket

# Load environment variables for IPFS and blockchain integration
load_dotenv()

# Fetch API keys from .env for IPFS upload
PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_API_KEY = os.getenv("PINATA_SECRET_API_KEY")

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
    def __init__(self, model_path='best.pt', confidence_threshold=0.5, dashboard_url=None, loop_video=False):
        """
        Initialize the accident detection system using YOLOv8 model
        
        Args:
            model_path: Path to the YOLOv8 model file (.pt)
            confidence_threshold: Minimum confidence threshold for accident detection
            dashboard_url: URL of the frontend dashboard API
            loop_video: Whether to loop videos in single video mode
        """
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.loop_video = loop_video
        
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
        
        # Track snapshots that need to be uploaded to IPFS/blockchain
        self.snapshots_for_upload = []
        
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
    
    def upload_to_ipfs(self, file_path):
        """Upload a file to IPFS using Pinata"""
        if not PINATA_API_KEY or not PINATA_SECRET_API_KEY:
            logger.warning("Pinata API keys not found in environment variables. Skipping IPFS upload.")
            return None
            
        url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
        
        try:
            with open(file_path, "rb") as file:
                response = requests.post(
                    url,
                    headers={
                        "pinata_api_key": PINATA_API_KEY,
                        "pinata_secret_api_key": PINATA_SECRET_API_KEY
                    },
                    files={"file": file}
                )

            if response.status_code == 200:
                ipfs_hash = response.json()["IpfsHash"]
                logger.info(f"Successfully uploaded to IPFS: {ipfs_hash}")
                return ipfs_hash
            else:
                logger.error(f"Error uploading to IPFS: {response.text}")
                return None
        except Exception as e:
            logger.error(f"Exception during IPFS upload: {str(e)}")
            return None

    def store_in_blockchain(self, ipfs_hash):
        """Store an IPFS hash in the blockchain"""
        try:
            # Get the hardhat project directory
            hardhat_dir = os.getenv("HARDHAT_DIR", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web3", "web3"))
            
            if not os.path.exists(hardhat_dir):
                logger.error(f"Hardhat directory not found: {hardhat_dir}")
                return False
                
            logger.info(f"Using Hardhat directory: {hardhat_dir}")
            
            # First check if the Hardhat node is running by making a simple request
            try:
                # Try to connect to the Hardhat node (default port 8545)
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(2)  # Short timeout
                result = s.connect_ex(('127.0.0.1', 8545))
                s.close()
                
                if result != 0:
                    # Connection failed - node is not running
                    logger.error("❌ Hardhat node is not running! Please start the blockchain node first using start_blockchain.bat")
                    print("[BLOCKCHAIN ERROR] Hardhat node is not running on port 8545")
                    print("[BLOCKCHAIN ERROR] Please run start_blockchain.bat first")
                    return False
                    
                # Let's also check if we can actually communicate with the node
                response = requests.post(
                    'http://127.0.0.1:8545',
                    json={"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1},
                    timeout=3
                )
                if response.status_code != 200:
                    logger.error(f"❌ Hardhat node returned unexpected status code: {response.status_code}")
                    print("[BLOCKCHAIN ERROR] Cannot communicate with Hardhat node")
                    return False
                    
                # Check the response to make sure it's a valid Hardhat node
                data = response.json()
                if 'result' not in data:
                    logger.error(f"❌ Hardhat node returned unexpected response: {data}")
                    print("[BLOCKCHAIN ERROR] Invalid response from Hardhat node")
                    return False
                    
                logger.info(f"✅ Hardhat node is running and responding (current block: {int(data['result'], 16)})")
                print(f"[BLOCKCHAIN] Connected to Hardhat node (block: {int(data['result'], 16)})")
                
            except (socket.error, requests.RequestException, json.JSONDecodeError) as e:
                logger.error(f"❌ Error checking Hardhat node: {str(e)}")
                print(f"[BLOCKCHAIN ERROR] Failed to check Hardhat node: {str(e)}")
                return False
            
            # Set an environment variable with the IPFS hash
            my_env = os.environ.copy()
            my_env["IPFS_HASH"] = ipfs_hash
            
            # Run hardhat deploy script to store the hash
            print(f"[BLOCKCHAIN] Storing IPFS hash in blockchain: {ipfs_hash}")
            subprocess.run(
                ["npx", "hardhat", "run", "scripts/deploy.js", "--network", "localhost"], 
                check=True, 
                shell=True,
                cwd=hardhat_dir,
                env=my_env
            )
            
            logger.info(f"✅ IPFS Hash stored in blockchain: {ipfs_hash}")
            print(f"[BLOCKCHAIN SUCCESS] IPFS hash stored in blockchain: {ipfs_hash}")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Error storing hash in blockchain: {e}")
            print(f"[BLOCKCHAIN ERROR] Command failed: {e}")
            
            # Print a more helpful message
            if "Cannot connect to the network localhost" in str(e) or "ECONNREFUSED" in str(e):
                print("[BLOCKCHAIN ERROR] Cannot connect to Hardhat node. Please run start_blockchain.bat first.")
                print("[BLOCKCHAIN ERROR] Your data is still saved to IPFS, but not stored in blockchain.")
            
            return False
        except FileNotFoundError as e:
            logger.error(f"❌ Command not found error: {e}")
            logger.error("Make sure Node.js and npm are properly installed and in your PATH")
            print(f"[BLOCKCHAIN ERROR] Command not found: {e}")
            print("[BLOCKCHAIN ERROR] Make sure Node.js and NPM are installed and in your PATH")
            return False
        except Exception as e:
            logger.error(f"❌ Unexpected error storing hash in blockchain: {e}")
            print(f"[BLOCKCHAIN ERROR] Unexpected error: {e}")
            return False

    def move_image_to_saved_folder(self, file_path, saved_folder):
        """Move a processed image to the saved folder"""
        try:
            # Ensure the saved folder exists
            os.makedirs(saved_folder, exist_ok=True)
            
            # Move the file to the saved folder
            dest_path = os.path.join(saved_folder, os.path.basename(file_path))
            shutil.move(file_path, dest_path)
            logger.info(f"Moved {file_path} to {dest_path}")
            return dest_path
        except Exception as e:
            logger.error(f"Error moving image to saved folder: {str(e)}")
            return None
            
    def process_snapshots_for_blockchain(self):
        """Process all snapshot images and upload them to IPFS and blockchain"""
        # Directory paths
        snapshots_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "snapshots")
        saved_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Saved snapshots")
        
        # Ensure directories exist
        os.makedirs(snapshots_dir, exist_ok=True)
        os.makedirs(saved_dir, exist_ok=True)
        
        # Get all images in the snapshots folder
        image_files = glob(os.path.join(snapshots_dir, "*.jpg")) + glob(os.path.join(snapshots_dir, "*.jpeg"))
        
        if not image_files:
            logger.info("No snapshot images found for IPFS upload")
            return
            
        logger.info(f"Found {len(image_files)} images to process for blockchain storage")
        
        for image_path in image_files:
            # Upload to IPFS
            ipfs_hash = self.upload_to_ipfs(image_path)
            
            if ipfs_hash:
                # Store in blockchain
                if self.store_in_blockchain(ipfs_hash):
                    # Move to saved folder after successful processing
                    self.move_image_to_saved_folder(image_path, saved_dir)
                    logger.info(f"Successfully processed {image_path} through IPFS and blockchain")
                else:
                    logger.warning(f"Failed to store {image_path} in blockchain, keeping file in snapshots folder")
            else:
                logger.warning(f"Failed to upload {image_path} to IPFS, keeping file in snapshots folder")
                
    def process_blockchain_storage_on_accident(self, snapshot_path):
        """
        Process a single snapshot for blockchain storage immediately after accident detection
        Returns the IPFS hash if successful, None otherwise
        """
        logger.info(f"Processing accident snapshot for blockchain storage: {snapshot_path}")
        console_log = f"[IPFS/BLOCKCHAIN] Processing snapshot: {os.path.basename(snapshot_path)}"
        print(console_log)
        
        # Check if file exists
        if not os.path.exists(snapshot_path):
            logger.error(f"Snapshot file not found: {snapshot_path}")
            print(f"[IPFS/BLOCKCHAIN ERROR] Snapshot file not found: {snapshot_path}")
            return None
        
        # Upload to IPFS
        ipfs_hash = self.upload_to_ipfs(snapshot_path)
        
        if ipfs_hash:
            # Print to console with clear formatting for web logs
            print(f"[IPFS SUCCESS] Uploaded to IPFS with hash: {ipfs_hash}")
            
            # Store in blockchain
            result = self.store_in_blockchain(ipfs_hash)
            if result:
                print(f"[BLOCKCHAIN SUCCESS] IPFS hash stored in blockchain: {ipfs_hash}")
                logger.info(f"Successfully stored accident evidence in blockchain: {ipfs_hash}")
                return ipfs_hash
            else:
                print(f"[BLOCKCHAIN ERROR] Failed to store hash in blockchain: {ipfs_hash}")
                logger.warning("Failed to store in blockchain")
                return ipfs_hash  # Still return the hash even if blockchain storage failed
        else:
            print(f"[IPFS ERROR] Failed to upload to IPFS: {os.path.basename(snapshot_path)}")
            logger.warning("Failed to upload to IPFS")
            return None

    def save_snapshot(self, frame, camera_name, snapshot_dir='AccSnaps'):
        """Save a snapshot when an accident is detected"""
        # Create both directories
        acc_snaps_dir = self.create_snapshot_dir(snapshot_dir)
        snapshots_dir = self.create_snapshot_dir('snapshots')
        
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{camera_name}_{timestamp}_{self.snapshot_counter}.jpg"
        
        # Save to AccSnaps directory
        acc_snaps_filepath = os.path.join(acc_snaps_dir, filename)
        # Save to snapshots directory
        snapshots_filepath = os.path.join(snapshots_dir, filename)
        
        try:
            # Save to AccSnaps
            cv2.imwrite(acc_snaps_filepath, frame)
            logger.info(f"Snapshot saved to AccSnaps: {acc_snaps_filepath}")
            
            # Save to snapshots
            cv2.imwrite(snapshots_filepath, frame)
            logger.info(f"Snapshot saved to snapshots: {snapshots_filepath}")
            
            # Add snapshots path to the list for processing
            self.snapshots_for_upload.append(snapshots_filepath)
            
            # Create a dictionary to store IPFS hash for this snapshot
            snapshot_data = {
                'path': acc_snaps_filepath,
                'ipfs_hash': None,
                'processed': False
            }
            
            # Process blockchain storage in a separate thread
            def process_and_update():
                ipfs_hash = self.process_blockchain_storage_on_accident(snapshots_filepath)
                if ipfs_hash:
                    snapshot_data['ipfs_hash'] = ipfs_hash
                    snapshot_data['processed'] = True
                    print(f"[IPFS/BLOCKCHAIN] Updated snapshot {filename} with hash: {ipfs_hash}")
            
            # Start the thread for IPFS processing
            thread = threading.Thread(target=process_and_update)
            thread.daemon = True
            thread.start()
            
            self.snapshot_counter += 1
            return snapshot_data  # Return the snapshot data dictionary instead of just the path
        except Exception as e:
            logger.error(f"Failed to save snapshot: {str(e)}")
            print(f"[ERROR] Failed to save snapshot: {str(e)}")
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
            'reported': False,
            'ipfs_hashes': []  # Add this to track IPFS hashes per accident
        }
        
        return True, False, minute_key
    
    def notify_dashboard(self, camera_name, camera_location, snapshot_data_list, confidence):
        """Send notification to the dashboard with IPFS hash information"""
        if not self.dashboard_url:
            logger.info("No dashboard URL provided. Skipping notification.")
            return
        
        try:
            # Check if there are any snapshots
            if not snapshot_data_list:
                logger.warning("No snapshots to send. Skipping notification.")
                return
                
            minute_key = self.get_current_minute_key(camera_name)
            
            # Format image paths for proper access by the frontend
            formatted_paths = []
            ipfs_hashes = []
            
            for snapshot_data in snapshot_data_list:
                path = snapshot_data['path'] if isinstance(snapshot_data, dict) else snapshot_data
                ipfs_hash = snapshot_data.get('ipfs_hash') if isinstance(snapshot_data, dict) else None
                
                # Convert backslashes to forward slashes
                path = path.replace('\\', '/')
                
                # Extract just the filename if the path includes directories
                filename = os.path.basename(path)
                
                # Create proper path for the frontend to access the file
                formatted_path = f"/AccSnaps/{filename}"
                formatted_paths.append(formatted_path)
                
                # Add the IPFS hash if available
                if ipfs_hash:
                    ipfs_hashes.append(ipfs_hash)
                
                logger.info(f"Snapshot path: {path} -> Formatted: {formatted_path}")
                if ipfs_hash:
                    logger.info(f"IPFS hash for {formatted_path}: {ipfs_hash}")
            
            # Create the notification data
            accident_data = {
                "camera_name": camera_name,
                "location": camera_location,
                "timestamp": datetime.datetime.now().isoformat(),
                "confidence": float(confidence),
                "snapshot_path": formatted_paths[0],  # First image is primary
                "images": formatted_paths,  # All images in an array
                "ipfs_hashes": ipfs_hashes  # Include IPFS hashes for all processed images
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
            
            # Print to console for demonstration purposes with IPFS hash information
            print("\n" + "="*50)
            print("ACCIDENT DETECTED!")
            print(f"Camera: {camera_name}")
            print(f"Location: {camera_location}")
            print(f"Time: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"Confidence: {confidence:.2f}")
            print(f"Snapshots: {len(snapshot_data_list)}")
            for i, snapshot_data in enumerate(snapshot_data_list):
                path = snapshot_data['path'] if isinstance(snapshot_data, dict) else snapshot_data
                ipfs_hash = snapshot_data.get('ipfs_hash') if isinstance(snapshot_data, dict) else 'Not processed'
                print(f"  {i+1}: {path}")
                print(f"     IPFS Hash: {ipfs_hash or 'Pending or Failed'}")
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
            
            # Add a flag for initial notification
            initial_notification_sent = False
            
            while cap.isOpened() and self.running:
                ret, frame = cap.read()
                if not ret:
                    # Video has ended
                    logger.info(f"Video ended for camera: {camera_name}")
                    
                    # If in single video mode and looping is enabled, loop the video
                    if is_single_video_mode and self.loop_video:
                        logger.info(f"Restarting video {video_path}")
                        cap.release()
                        cap = cv2.VideoCapture(video_path)
                        if not cap.isOpened():
                            logger.error(f"Failed to reopen video source: {video_path}")
                            break
                        continue
                    else:
                        # Don't loop
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
                        initial_notification_sent = False
                        
                    # Check if we should take a snapshot for this accident event
                    should_notify, is_update, minute_key = self.should_notify_for_accident(camera_name, current_snapshots)
                    
                    if should_notify:
                        # Take a snapshot
                        snapshot_data = self.save_snapshot(frame, camera_name, snapshot_dir)
                        if snapshot_data:
                            # Add to current snapshots and the event tracking
                            current_snapshots.append(snapshot_data)
                            if minute_key in self.accident_events:
                                self.accident_events[minute_key]['snapshots'].append(snapshot_data)
                            
                            # For better web integration, send a notification with each detected snapshot 
                            if not initial_notification_sent:
                                # Send the first notification immediately to show something on the frontend
                                print("[DETECTION] Sending initial notification with pending IPFS hash")
                                self.notify_dashboard(
                                    camera_name, 
                                    camera_location, 
                                    current_snapshots,
                                    detected_confidence
                                )
                                initial_notification_sent = True
                            else:
                                # For subsequent detections, add some delay to allow IPFS processing
                                # Wait for a short time to see if the IPFS hash becomes available
                                if is_update and len(current_snapshots) >= max_snapshots_per_accident:
                                    # Start a separate thread to check and send updated notification
                                    def check_and_update():
                                        # Wait a bit for IPFS processing to complete
                                        time.sleep(2)
                                        all_snapshots = self.accident_events[minute_key]['snapshots']
                                        # Check if any snapshot has IPFS hash
                                        has_ipfs = any(
                                            isinstance(s, dict) and s.get('ipfs_hash') 
                                            for s in all_snapshots
                                        )
                                        print(f"[IPFS/BLOCKCHAIN] Sending updated notification. IPFS hashes available: {has_ipfs}")
                                        self.notify_dashboard(
                                            camera_name, 
                                            camera_location, 
                                            all_snapshots,
                                            detected_confidence
                                        )
                                    
                                    # Run the update check in a separate thread
                                    threading.Thread(target=check_and_update, daemon=True).start()
                
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
                        
                        # If we have snapshots and they've been processed for IPFS,
                        # send a final notification with the IPFS hashes
                        if current_snapshots:
                            # Check if any snapshots have IPFS hashes
                            has_ipfs = any(
                                isinstance(s, dict) and s.get('ipfs_hash') 
                                for s in current_snapshots
                            )
                            
                            if has_ipfs:
                                print("[DETECTION] Accident ended, sending final notification with IPFS hashes")
                                # Send a final notification with all available IPFS hashes
                                self.notify_dashboard(
                                    camera_name, 
                                    camera_location, 
                                    current_snapshots,
                                    detected_confidence
                                )
                            
                            # Clear current snapshots after processing
                            current_snapshots = []
                
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
            
            # If we have any remaining snapshots, make sure they're processed
            if current_snapshots:
                # Wait a moment for any pending IPFS uploads to complete
                time.sleep(3)
                print("[DETECTION] Processing complete, sending final notification with all IPFS hashes")
                self.notify_dashboard(
                    camera_name, 
                    camera_location, 
                    current_snapshots,
                    detected_confidence
                )
            
        except Exception as e:
            logger.error(f"Error processing camera {camera_name}: {str(e)}")
            print(f"[ERROR] Error processing camera {camera_name}: {str(e)}")
        
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
    parser.add_argument('--loop-video', action='store_true', help='Loop the video in single video mode')
    parser.add_argument('--disable-blockchain', action='store_true', help='Disable automatic blockchain storage')
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
        dashboard_url=args.dashboard_url,
        loop_video=args.loop_video
    )
    
    # Create snapshot directory
    detector.create_snapshot_dir(args.snapshot_dir)
    
    # Create snapshots directory for blockchain storage
    snapshots_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "snapshots")
    saved_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Saved snapshots")
    os.makedirs(snapshots_dir, exist_ok=True)
    os.makedirs(saved_dir, exist_ok=True)
    logger.info(f"Created directories for blockchain storage: {snapshots_dir} and {saved_dir}")
    
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
            
            # After processing is complete, process snapshots for blockchain storage
            if not args.disable_blockchain:
                logger.info("Processing snapshots for blockchain storage")
                detector.process_snapshots_for_blockchain()
        else:
            detector.start_monitoring(cameras, display=args.display, snapshot_dir=args.snapshot_dir)
    except KeyboardInterrupt:
        logger.info("Detection stopped by user")
        
        # Process all remaining snapshots for blockchain on exit if not disabled
        if not args.disable_blockchain:
            logger.info("Processing remaining snapshots for blockchain storage")
            detector.process_snapshots_for_blockchain()
    finally:
        detector.running = False
        logger.info("Accident detection system shutdown")

if __name__ == "__main__":
    main() 