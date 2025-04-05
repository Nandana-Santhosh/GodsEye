import os
import json
import time
import base64
import threading
import logging
import requests
from datetime import datetime
from flask import Flask, jsonify, request, Response
from flask_cors import CORS

# Import our accident detection system
from accident_detection import AccidentDetectionSystem

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Frontend server URL (configurable)
FRONTEND_SERVER_URL = os.environ.get('FRONTEND_SERVER_URL', 'http://localhost:5000/api/accidents')

# Global data store for simulation purposes
# In a real implementation, this would be a proper database
accident_events = []
active_cameras = []

# Keep track of the latest snapshots for each camera
latest_snapshots = {}

# Initialize the detection system
detector = AccidentDetectionSystem(model_path='best.pt', confidence_threshold=0.5)

def get_camera_info(camera_id):
    """Return mock camera information based on ID"""
    camera_locations = {
        'cam1': {'name': 'Highway 101 North', 'location': '37.7749,-122.4194'},
        'cam2': {'name': 'Main Street Intersection', 'location': '37.7833,-122.4167'},
        'cam3': {'name': 'Downtown Bridge', 'location': '37.8044,-122.2711'}
    }
    return camera_locations.get(camera_id, {'name': f'Camera {camera_id}', 'location': 'Unknown'})

def send_to_frontend(event):
    """Send accident event to the frontend server"""
    try:
        # Prepare the payload
        payload = {
            'camera_name': event['camera_name'],
            'location': event['location'],
            'timestamp': event['timestamp'],
            'confidence': event['confidence'],
            'snapshot_path': latest_snapshots.get(event['camera_id'], '')
        }
        
        # Send to frontend server
        response = requests.post(FRONTEND_SERVER_URL, json=payload)
        
        if response.status_code == 200:
            logger.info(f"Successfully sent accident notification to frontend: {event['id']}")
        else:
            logger.error(f"Failed to send notification to frontend. Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        logger.error(f"Error sending notification to frontend: {str(e)}")

def add_accident_event(camera_id, snapshot_path, confidence):
    """Add an accident event to our event store"""
    camera_info = get_camera_info(camera_id)
    
    # Read the snapshot image and convert to base64 for API response
    image_data = None
    if snapshot_path and os.path.exists(snapshot_path):
        with open(snapshot_path, 'rb') as img_file:
            image_data = base64.b64encode(img_file.read()).decode('utf-8')
    
    # Create event object
    event = {
        'id': len(accident_events) + 1,
        'timestamp': datetime.now().isoformat(),
        'camera_id': camera_id,
        'camera_name': camera_info['name'],
        'location': camera_info['location'],
        'confidence': confidence,
        'snapshot': image_data,
        'status': 'pending'  # pending, acknowledged, resolved
    }
    
    accident_events.append(event)
    
    # Update latest snapshot for this camera
    latest_snapshots[camera_id] = snapshot_path
    
    # Send notification to frontend
    send_to_frontend(event)
    
    return event

def simulate_accident_feed():
    """Simulate accident detections for presentation purposes"""
    
    # This function simulates getting accident data from the detector
    # In a real implementation, this would be connected to actual cameras
    
    while True:
        # Simulate detection from random cameras
        for camera_id in ['cam1', 'cam2', 'cam3']:
            # Skip if this camera is not active (simulating camera coming online/offline)
            if camera_id not in active_cameras:
                continue
                
            # 20% chance of detecting an accident on this cycle for this camera
            if not os.path.exists('AccSnaps'):
                os.makedirs('AccSnaps', exist_ok=True)
                
            # Pretend we already have some snapshots (in a real system these would
            # come from the detection system)
            snapshot_files = []
            for file in os.listdir('AccSnaps'):
                if file.endswith('.jpg'):
                    snapshot_files.append(os.path.join('AccSnaps', file))
            
            if snapshot_files and (len(accident_events) < 10):  # Limit for demo purposes
                # Pick a random snapshot file to simulate a new detection
                snapshot_path = snapshot_files[len(accident_events) % len(snapshot_files)]
                confidence = 0.7 + (len(accident_events) * 0.02)  # Vary confidence for demo
                
                # Add event
                add_accident_event(camera_id, snapshot_path, confidence)
                logger.info(f"Simulated accident detection from {camera_id}")
                
                # Only one detection per cycle to make demo more realistic
                break
                
        # Sleep between simulation cycles
        time.sleep(15)  # Check every 15 seconds

@app.route('/api/cameras', methods=['GET'])
def get_cameras():
    """API endpoint to get the list of traffic cameras"""
    cameras = [
        {'id': 'cam1', 'name': 'Highway 101 North', 'status': 'online' if 'cam1' in active_cameras else 'offline'},
        {'id': 'cam2', 'name': 'Main Street Intersection', 'status': 'online' if 'cam2' in active_cameras else 'offline'},
        {'id': 'cam3', 'name': 'Downtown Bridge', 'status': 'online' if 'cam3' in active_cameras else 'offline'}
    ]
    return jsonify(cameras)

@app.route('/api/cameras/<camera_id>/toggle', methods=['POST'])
def toggle_camera(camera_id):
    """API endpoint to toggle a camera on/off (for simulation)"""
    if camera_id in active_cameras:
        active_cameras.remove(camera_id)
        status = 'offline'
    else:
        active_cameras.append(camera_id)
        status = 'online'
    
    logger.info(f"Camera {camera_id} set to {status}")
    return jsonify({'id': camera_id, 'status': status})

@app.route('/api/accidents', methods=['GET'])
def get_accidents():
    """API endpoint to get all accident events"""
    # Filter by status if provided
    status = request.args.get('status')
    if status:
        filtered_events = [e for e in accident_events if e['status'] == status]
        return jsonify(filtered_events)
    return jsonify(accident_events)

@app.route('/api/frontend-config', methods=['POST'])
def update_frontend_config():
    """API endpoint to update the frontend server URL"""
    data = request.json
    if not data or 'url' not in data:
        return jsonify({'error': 'URL field is required'}), 400
        
    global FRONTEND_SERVER_URL
    FRONTEND_SERVER_URL = data['url']
    logger.info(f"Frontend server URL updated to: {FRONTEND_SERVER_URL}")
    
    return jsonify({'success': True, 'frontend_url': FRONTEND_SERVER_URL})

@app.route('/api/accidents/<accident_id>', methods=['GET'])
def get_accident(accident_id):
    """API endpoint to get a specific accident event"""
    try:
        accident_id = int(accident_id)
        for event in accident_events:
            if event['id'] == accident_id:
                return jsonify(event)
        return jsonify({'error': 'Accident not found'}), 404
    except ValueError:
        return jsonify({'error': 'Invalid accident ID'}), 400

@app.route('/api/accidents/<accident_id>/status', methods=['PUT'])
def update_accident_status(accident_id):
    """API endpoint to update an accident status (acknowledged, resolved)"""
    try:
        accident_id = int(accident_id)
        data = request.json
        
        if not data or 'status' not in data:
            return jsonify({'error': 'Status field is required'}), 400
            
        status = data['status']
        if status not in ['pending', 'acknowledged', 'resolved']:
            return jsonify({'error': 'Invalid status value'}), 400
            
        for event in accident_events:
            if event['id'] == accident_id:
                event['status'] = status
                return jsonify(event)
                
        return jsonify({'error': 'Accident not found'}), 404
    except ValueError:
        return jsonify({'error': 'Invalid accident ID'}), 400

@app.route('/api/test', methods=['GET'])
def test_endpoint():
    """Simple test endpoint to check if API is running"""
    return jsonify({'status': 'API is running'})

def main():
    """Main function to start the API server and simulation"""
    # Start the simulation in a background thread
    logger.info("Starting accident detection API server")
    
    # Activate all cameras initially for demo
    global active_cameras
    active_cameras = ['cam1', 'cam2', 'cam3']
    
    # Start the simulation thread
    sim_thread = threading.Thread(target=simulate_accident_feed)
    sim_thread.daemon = True
    sim_thread.start()
    
    # Start the Flask app
    app.run(host='0.0.0.0', port=5001, debug=False)

if __name__ == '__main__':
    main() 