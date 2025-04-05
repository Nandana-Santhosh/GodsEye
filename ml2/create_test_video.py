import cv2
import numpy as np
import os
import random
import argparse

def create_test_video(output_file='test_video.mp4', duration=30, fps=30, size=(640, 480)):
    """
    Create a test video for the accident detection system.
    
    Args:
        output_file: Path to save the output video
        duration: Duration of the video in seconds
        fps: Frames per second
        size: Size of the video (width, height)
    """
    # Create output directory if it doesn't exist
    output_dir = os.path.dirname(output_file)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)
    
    # Define codec and create VideoWriter object
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_file, fourcc, fps, size)
    
    # Total frames to generate
    total_frames = duration * fps
    
    # Create images for "normal" and "accident" scenes
    normal_frame = np.zeros((size[1], size[0], 3), dtype=np.uint8)
    # Draw a road with white lines
    cv2.rectangle(normal_frame, (0, 0), (size[0], size[1]), (100, 100, 100), -1)  # Gray background
    cv2.line(normal_frame, (int(size[0]/2), 0), (int(size[0]/2), size[1]), (255, 255, 255), 2)  # Center line
    
    # Create a car
    car_width, car_height = 60, 30
    car_color = (0, 0, 255)  # Red car
    
    # Create accident frame (version of normal frame with "accident" text)
    accident_frame = normal_frame.copy()
    cv2.putText(accident_frame, "ACCIDENT", (size[0]//4, size[1]//2), 
                cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 255), 3)
    
    # Add some smoke/debris effect to accident frame
    for _ in range(100):
        x = random.randint(0, size[0]-1)
        y = random.randint(0, size[1]-1)
        radius = random.randint(5, 15)
        cv2.circle(accident_frame, (x, y), radius, (200, 200, 200), -1)
    
    print(f"Generating {total_frames} frames for test video...")
    
    # Generate video frames
    car_x, car_y = size[0] // 4, size[1] // 2
    car_speed_x = 2
    
    # Determine when the "accident" happens (around 2/3 of the way through)
    accident_start_frame = int(total_frames * 0.6)
    accident_end_frame = int(total_frames * 0.8)
    
    for i in range(total_frames):
        # Choose base frame
        is_accident_frame = (i >= accident_start_frame and i < accident_end_frame)
        frame = accident_frame.copy() if is_accident_frame else normal_frame.copy()
        
        # Add car, unless it's during the accident
        if not is_accident_frame:
            car_x += car_speed_x
            if car_x > size[0] - car_width:
                car_x = 0
            
            # Draw the car
            cv2.rectangle(frame, (car_x, car_y), (car_x + car_width, car_y + car_height), car_color, -1)
        else:
            # Draw a crashed car
            cv2.rectangle(frame, (car_x, car_y), (car_x + car_width, car_y + car_height), car_color, -1)
            cv2.line(frame, (car_x, car_y), (car_x + car_width, car_y + car_height), (0, 0, 0), 2)
            cv2.line(frame, (car_x + car_width, car_y), (car_x, car_y + car_height), (0, 0, 0), 2)
        
        # Add frame number
        cv2.putText(frame, f"Frame: {i}/{total_frames}", (10, 30), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                    
        # Add timestamp
        time_str = f"Time: {i//fps:02d}:{i%fps:02d}"
        cv2.putText(frame, time_str, (10, 60), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        # Write the frame
        out.write(frame)
        
        # Show progress
        if i % fps == 0:
            print(f"Progress: {i}/{total_frames} frames ({i/total_frames*100:.1f}%)")
    
    # Release everything
    out.release()
    print(f"Test video created successfully: {output_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create test video for accident detection")
    parser.add_argument("--output", type=str, default="../videos/test_video.mp4", 
                       help="Output video file path")
    parser.add_argument("--duration", type=int, default=30, 
                       help="Duration of video in seconds")
    parser.add_argument("--fps", type=int, default=30, 
                       help="Frames per second")
    
    args = parser.parse_args()
    
    create_test_video(args.output, args.duration, args.fps)
    print(f"You can now use this video with the accident detection system.") 