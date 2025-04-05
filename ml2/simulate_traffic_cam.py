import os
import time
import random
import argparse
import threading
import subprocess
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

class CameraSimulator:
    """
    Simulates a traffic camera system by running the accident detection on 
    pre-recorded videos, mimicking real-time traffic camera feeds.
    """
    
    def __init__(self, cameras_config, detector_script='accident_detection.py', 
                 snapshot_dir='AccSnaps', display=True, interval=5):
        """
        Initialize camera simulator
        
        Args:
            cameras_config: List of camera configurations (video files, names, locations)
            detector_script: Path to the accident detection script
            snapshot_dir: Directory to save accident snapshots
            display: Whether to display the video feeds
            interval: Time interval between simulated camera checks (in seconds)
        """
        self.cameras_config = cameras_config
        self.detector_script = detector_script
        self.snapshot_dir = snapshot_dir
        self.display = display
        self.interval = interval
        self.active_processes = []
        self.running = False
        
    def start_camera(self, camera_config):
        """Start a simulated camera feed"""
        video_file = camera_config['video_file']
        camera_name = camera_config['name']
        
        if not os.path.exists(video_file):
            logger.error(f"Video file not found: {video_file}")
            return None
        
        logger.info(f"Starting camera feed: {camera_name}")
        
        # Create a unique snapshot directory for this camera
        camera_snapshot_dir = os.path.join(self.snapshot_dir, camera_name.replace(' ', '_'))
        
        # Build command
        cmd = [
            'python', self.detector_script,
            '--video', video_file, 
            '--snapshot-dir', camera_snapshot_dir
        ]
        
        if not self.display:
            cmd.append('--no-display')
        
        # Start the detector process
        try:
            process = subprocess.Popen(cmd)
            logger.info(f"Started camera feed {camera_name} with PID {process.pid}")
            return process
        except Exception as e:
            logger.error(f"Failed to start camera feed {camera_name}: {str(e)}")
            return None
    
    def start_simulation(self):
        """Start simulation of all camera feeds"""
        logger.info("Starting traffic camera simulation")
        self.running = True
        
        # Create main snapshot directory
        os.makedirs(self.snapshot_dir, exist_ok=True)
        
        try:
            # Start initial camera feed
            if len(self.cameras_config) > 0:
                initial_camera = self.cameras_config[0]
                process = self.start_camera(initial_camera)
                if process:
                    self.active_processes.append({
                        'process': process,
                        'camera': initial_camera
                    })
            
            # Periodically start other cameras to simulate monitoring system
            if len(self.cameras_config) > 1:
                thread = threading.Thread(target=self._camera_scheduler)
                thread.daemon = True
                thread.start()
            
            # Wait for user to stop simulation
            try:
                while self.running:
                    time.sleep(1)
            except KeyboardInterrupt:
                logger.info("Stopping simulation due to user request")
                self.stop_simulation()
        
        except Exception as e:
            logger.error(f"Error in simulation: {str(e)}")
            self.stop_simulation()
    
    def _camera_scheduler(self):
        """Periodically switches between camera feeds to simulate a monitoring system"""
        cameras_index = 1  # Start from second camera as first is already running
        
        while self.running:
            # Wait for the configured interval
            time.sleep(self.interval)
            
            if not self.running:
                break
                
            # Randomly decide whether to switch cameras
            if random.random() < 0.7:  # 70% chance to switch
                # Stop a random running camera if multiple are active
                if len(self.active_processes) > 1:
                    idx_to_stop = random.randint(0, len(self.active_processes) - 1)
                    process_info = self.active_processes.pop(idx_to_stop)
                    camera_name = process_info['camera']['name']
                    logger.info(f"Stopping camera feed: {camera_name}")
                    try:
                        process_info['process'].terminate()
                    except:
                        pass
                
                # Start next camera
                next_camera = self.cameras_config[cameras_index]
                process = self.start_camera(next_camera)
                if process:
                    self.active_processes.append({
                        'process': process,
                        'camera': next_camera
                    })
                
                # Move to next camera for future iteration
                cameras_index = (cameras_index + 1) % len(self.cameras_config)
    
    def stop_simulation(self):
        """Stop all camera simulations"""
        logger.info("Stopping all camera feeds")
        self.running = False
        
        for process_info in self.active_processes:
            try:
                process_info['process'].terminate()
                logger.info(f"Stopped camera feed: {process_info['camera']['name']}")
            except:
                pass
            
        self.active_processes = []
        logger.info("Simulation stopped")

def main():
    """Main function to parse arguments and run the camera simulator"""
    parser = argparse.ArgumentParser(description="Traffic Camera Simulator for Accident Detection")
    parser.add_argument("--detector", type=str, default="accident_detection.py", 
                        help="Path to accident detection script")
    parser.add_argument("--no-display", action="store_true", 
                        help="Disable video display")
    parser.add_argument("--interval", type=int, default=30, 
                        help="Time interval between camera switches (seconds)")
    parser.add_argument("--snapshot-dir", type=str, default="AccSnaps", 
                        help="Directory to save accident snapshots")
    
    args = parser.parse_args()
    
    # Define camera configurations using available video files
    cameras_config = [
        {
            'name': 'Traffic Cam 1',
            'video_file': 'testing1.mp4',
            'location': 'Highway 101, North Entrance'
        },
        {
            'name': 'Traffic Cam 2',
            'video_file': 'testing2.mp4',
            'location': 'Main Street Intersection'
        },
        {
            'name': 'Traffic Cam 3',
            'video_file': 'Accidents.mp4',
            'location': 'Downtown Bridge'
        }
    ]
    
    # Initialize and start the simulator
    simulator = CameraSimulator(
        cameras_config=cameras_config,
        detector_script=args.detector,
        snapshot_dir=args.snapshot_dir,
        display=not args.no_display,
        interval=args.interval
    )
    
    simulator.start_simulation()

if __name__ == "__main__":
    main() 