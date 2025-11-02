import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import NavigationView from './components/NavigationView';
import LocationDetails from './components/LocationDetails';
import ChatAssistant from './components/ChatAssistant';
import './styles/App.css';

function App() {
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [navigationData, setNavigationData] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showChat, setShowChat] = useState(false);

  const handleSearch = async (start, end) => {
    setStartLocation(start);
    setEndLocation(end);
    
    // TODO: Replace with actual API call to your backend
    try {
      // const response = await fetch(`http://localhost:3001/api/navigate?start=${start}&end=${end}`);
      // const data = await response.json();
      // setNavigationData(data);
      
      // Mock data for now
      setNavigationData({
        path: ['entrance', 'hallway_1', 'staircase_a', 'room_817'],
        distance: '150m',
        estimatedTime: '3 min'
      });
    } catch (error) {
      console.error('Error fetching navigation:', error);
    }
  };

  return (
    <Router>
      <div className="app">
        <Header />
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={
              <>
                <section className="hero-section">
                  <div className="hero-content">
                    <h1 className="hero-title">Navigate Your Campus with Ease</h1>
                    <p className="hero-subtitle">
                      Turn-by-turn indoor navigation with visual guidance
                    </p>
                    
                    <SearchBar 
                      onSearch={handleSearch}
                      onLocationSelect={setSelectedLocation}
                    />
                  </div>
                </section>

                {navigationData && (
                  <NavigationView 
                    navigationData={navigationData}
                    startLocation={startLocation}
                    endLocation={endLocation}
                  />
                )}

                {selectedLocation && (
                  <LocationDetails 
                    location={selectedLocation}
                    onClose={() => setSelectedLocation(null)}
                  />
                )}
              </>
            } />
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

