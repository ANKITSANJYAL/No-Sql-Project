// API Configuration for RamsNavigator Frontend

// Base API URL - Update this when your backend is deployed
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// API Endpoints
export const API_ENDPOINTS = {
  // Navigation endpoints
  navigate: `${API_BASE_URL}/navigate`,
  
  // Location endpoints
  locations: `${API_BASE_URL}/locations`,
  allLocations: `${API_BASE_URL}/locations`, // Get all locations
  locationById: (id) => `${API_BASE_URL}/locations/${id}`,
  searchLocations: `${API_BASE_URL}/locations/search`,
  
  // Chat/RAG endpoints
  chat: `${API_BASE_URL}/chat`,
  chatParseIntent: `${API_BASE_URL}/chat/parse-intent`,
  chatNavigate: `${API_BASE_URL}/chat/navigate`,
  
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

/**
 * Convert GCP Storage image URL to proxy URL to avoid CORS issues
 * @param {string} imageUrl - The original GCP Storage URL
 * @returns {string} - The proxied URL or original URL if not a GCP Storage URL
 */
export const getProxiedImageUrl = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return imageUrl;
  }

  // Only proxy GCP Storage URLs
  if (imageUrl.startsWith('https://storage.googleapis.com/')) {
    const encodedUrl = encodeURIComponent(imageUrl);
    return `${API_BASE_URL}/images/proxy?url=${encodedUrl}`;
  }

  // Return original URL if not a GCP Storage URL
  return imageUrl;
};

export default API_BASE_URL;




