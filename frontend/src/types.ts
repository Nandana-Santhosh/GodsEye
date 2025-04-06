export type Accident = {
  id: string;
  timestamp: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  images: string[];
  status: 'pending' | 'acknowledged' | 'resolved' | 'rejected';
  description?: string;
  source: 'camera' | 'manual' | 'anonymous';
  ipfs_hashes?: string[];
  pinata_hash?: string;
  isAnonymous?: boolean;
};

export interface EmergencyService {
  id: string;
  name: string;
  type: 'ambulance' | 'fireforce' | 'police';
  location: {
    lat: number;
    lng: number;
  };
  status: 'available' | 'dispatched';
}

export interface Statistics {
  total: number;
  verified: number;
  pending: number;
  rejected: number;
  byLocation: Record<string, number>;
  byTimeOfDay: Record<string, number>;
}

export interface Camera {
  id: string;
  name: string;
  location: string;
  type: 'webcam' | 'video' | 'rtsp';
  status: 'active' | 'inactive';
  streamUrl?: string;
  videoPath?: string;
}