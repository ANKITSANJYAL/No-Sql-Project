// API Configuration for RamsNavigator Frontend

// Base API URL - Update this when your backend is deployed
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// API Endpoints
export const API_ENDPOINTS = {
  // Navigation endpoints
  navigate: `${API_BASE_URL}/navigate`,
  
  // Location endpoints
  locations: `${API_BASE_URL}/locations`,
  locationById: (id) => `${API_BASE_URL}/locations/${id}`,
  searchLocations: `${API_BASE_URL}/locations/search`,
  
  // Chat/RAG endpoints
  chat: `${API_BASE_URL}/chat`,
  
  // Additional endpoints
  buildings: `${API_BASE_URL}/buildings`,
  amenities: `${API_BASE_URL}/amenities`,
};

// Helper function for making API calls
export const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Call Failed:', error);
    throw error;
  }
};

export default API_BASE_URL;




