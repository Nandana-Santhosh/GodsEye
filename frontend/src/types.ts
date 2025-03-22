export interface Accident {
  id: string;
  timestamp: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  images: string[];
  status: 'pending' | 'verified' | 'rejected';
  source: 'camera' | 'anonymous';
  description?: string;
}

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