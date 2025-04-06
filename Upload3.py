import requests
import subprocess
import os
from dotenv import load_dotenv
from glob import glob
import shutil

# Load environment variables
load_dotenv()

# Fetch API keys from .env
PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_API_KEY = os.getenv("PINATA_SECRET_API_KEY")

def upload_to_ipfs(file_path):
    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
    
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
        return ipfs_hash  
        
    else:
        print("Error uploading to IPFS:", response.text)
        return None

def store_in_blockchain(ipfs_hash):
    try:
        # Set the correct path to your Hardhat project directory
        hardhat_dir = "D:\\GodsEye\\web3\\web3"
        
        # Set an environment variable with the IPFS hash instead of a positional argument
        my_env = os.environ.copy()
        my_env["IPFS_HASH"] = ipfs_hash
        
        # Run without passing the IPFS hash as a positional argument
        subprocess.run(["npx", "hardhat", "run", "scripts/deploy.js", "--network", "localhost"], 
                      check=True, 
                      shell=True,
                      cwd=hardhat_dir,
                      env=my_env)
        
        print("✅ IPFS Hash stored in blockchain:", ipfs_hash)
    except subprocess.CalledProcessError as e:
        print("❌ Error storing hash in blockchain:", e)
    except FileNotFoundError as e:
        print("❌ Command not found error:", e)
        print("Make sure Node.js and npm are properly installed and in your PATH")

def get_images(folder_path):
    # Get all image files in the folder with .jpg and .jpeg extensions
    image_files = glob(os.path.join(folder_path, "*.jpg")) + glob(os.path.join(folder_path, "*.jpeg"))
    return image_files

def move_image_to_saved_folder(file_path, saved_folder):
    # Ensure the saved folder exists
    os.makedirs(saved_folder, exist_ok=True)
    # Move the file to the saved folder
    shutil.move(file_path, os.path.join(saved_folder, os.path.basename(file_path)))

# Example Usage
snapshots_folder = "D:\\GodsEye\\ml2\\snapshots"
saved_snapshots_folder = "D:\\GodsEye\\ml2\\Saved snapshots"

# Get all images in the snapshots folder
images = get_images(snapshots_folder)

if images:
    for image_path in images:
        ipfs_hash = upload_to_ipfs(image_path)
        if ipfs_hash:
            store_in_blockchain(ipfs_hash)
            # Move the image to the "Saved snapshots" folder
            move_image_to_saved_folder(image_path, saved_snapshots_folder)
else:
    print("No images found in the snapshots folder.")