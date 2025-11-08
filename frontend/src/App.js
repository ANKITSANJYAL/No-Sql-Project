import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import NavigationView from './components/NavigationView';
import LocationDetails from './components/LocationDetails';
import ChatAssistant from './components/ChatAssistant';
import LandingPage from './pages/LandingPage';
import ManualPage from './pages/ManualPage';
import ChatPage from './pages/ChatPage';
import { API_ENDPOINTS } from './config/api';
import './styles/App.css';

function App() {
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [navigationData, setNavigationData] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [isLoadingNavigation, setIsLoadingNavigation] = useState(false);
  const [navigationError, setNavigationError] = useState(null);

  const handleSearch = async (startId, endId, startName, endName) => {
    setStartLocation(startName);
    setEndLocation(endName);
    setNavigationData(null);
    setNavigationError(null);
    setIsLoadingNavigation(true);
    
    try {
      const response = await fetch(`${API_ENDPOINTS.navigate}?start=${encodeURIComponent(startId)}&end=${encodeURIComponent(endId)}`);

      const text = await response.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        throw new Error(`Navigation service returned unexpected response: ${text.slice(0,200)}`);
      }
      
  if (data.success) {
        // The API response spreads pathData directly, so all navigation data is at the top level
        setNavigationData(data);
      } else {
        throw new Error(data.message || 'Invalid response from navigation API');
      }
    } catch (error) {
      console.error('Error fetching navigation:', error);
      setNavigationError(error.message || 'Failed to get navigation directions. Please try again.');
    } finally {
      setIsLoadingNavigation(false);
    }
  };

  return (
    <Router>
      <div className="app">
        <Header />
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/manual" element={<ManualPage />} />
            <Route path="/chat" element={<ChatPage />} />
          </Routes>
        </main>

        {/* Floating Chat Button */}
        <button 
          className="chat-toggle-btn"
          onClick={() => setShowChat(!showChat)}
          aria-label="Toggle AI Assistant"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        {showChat && (
          <ChatAssistant 
            onClose={() => setShowChat(false)}
            onNavigate={handleSearch}
          />
        )}
      </div>
    </Router>
  );
}

export default App;




