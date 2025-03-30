import { Accident, EmergencyService, Statistics } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function handleRequest<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('API request error:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export const api = {
  // Accident related endpoints
  accidents: {
    getAll: () => handleRequest<Accident[]>(`${API_URL}/accidents`),
    getById: (id: string) => handleRequest<Accident>(`${API_URL}/accidents/${id}`),
    report: (accidentData: Omit<Accident, 'id' | 'timestamp' | 'status'>) => 
      handleRequest<Accident>(`${API_URL}/addAccident`, {
        method: 'POST',
        body: JSON.stringify(accidentData),
      }),
    updateStatus: (id: string, status: Accident['status']) => 
      handleRequest<Accident>(`${API_URL}/accidents/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  },
  
  // Emergency services endpoints
  emergencyServices: {
    getAll: () => handleRequest<EmergencyService[]>(`${API_URL}/emergency-services`),
    dispatch: (serviceId: string, accidentId: string) => 
      handleRequest<EmergencyService>(`${API_URL}/emergency-services/dispatch`, {
        method: 'POST',
        body: JSON.stringify({ serviceId, accidentId }),
      }),
  },
  
  // Statistics endpoints
  statistics: {
    get: () => handleRequest<Statistics>(`${API_URL}/statistics`),
  },
  
  // ML detection endpoint
  ml: {
    detectAccident: (imageBase64: string) => 
      handleRequest<{ isAccident: boolean; confidence: number }>(`${API_URL}/ml/detect`, {
        method: 'POST',
        body: JSON.stringify({ image: imageBase64 }),
      }),
  },
  
  // Web3 related endpoints
  blockchain: {
    getAccidents: () => handleRequest<any[]>(`${API_URL}/blockchain/accidents`),
    getAccidentById: (id: number) => handleRequest<any>(`${API_URL}/blockchain/accidents/${id}`),
    requestInsurance: (name: string, phone: string, blockNo: number) => 
      handleRequest<any>(`${API_URL}/blockchain/insurance`, {
        method: 'POST',
        body: JSON.stringify({ name, phone, blockNo }),
      }),
  },
}; 