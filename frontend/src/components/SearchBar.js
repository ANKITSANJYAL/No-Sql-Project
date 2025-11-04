import React, { useState } from 'react';
import '../styles/SearchBar.css';

function SearchBar({ onSearch, onLocationSelect }) {
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [endSuggestions, setEndSuggestions] = useState([]);

  // Mock location data - replace with API call
  const mockLocations = [
    { id: 'lowenstein_entrance', name: 'Lowenstein Building Entrance', type: 'entrance' },
    { id: 'lowenstein_ll817', name: 'Room LL817', type: 'classroom' },
    { id: 'quinn_library', name: 'Quinn Library', type: 'library' },
    { id: 'cafeteria_main', name: 'Main Cafeteria', type: 'dining' },
    { id: 'gym_entrance', name: 'Fitness Center', type: 'recreation' },
  ];

  const handleStartInputChange = (e) => {
    const value = e.target.value;
    setStartInput(value);
    
    if (value.length > 0) {
      const filtered = mockLocations.filter(loc => 
        loc.name.toLowerCase().includes(value.toLowerCase())
      );
      setStartSuggestions(filtered);
    } else {
      setStartSuggestions([]);
    }
  };

  const handleEndInputChange = (e) => {
    const value = e.target.value;
    setEndInput(value);
    
    if (value.length > 0) {
      const filtered = mockLocations.filter(loc => 
        loc.name.toLowerCase().includes(value.toLowerCase())
      );
      setEndSuggestions(filtered);
    } else {
      setEndSuggestions([]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (startInput && endInput) {
      onSearch(startInput, endInput);
      setStartSuggestions([]);
      setEndSuggestions([]);
    }
  };

  const handleStartSuggestionClick = (location) => {
    setStartInput(location.name);
    setStartSuggestions([]);
  };

  const handleEndSuggestionClick = (location) => {
    setEndInput(location.name);
    setEndSuggestions([]);
  };

  return (
    <div className="search-bar-container">
      <form className="search-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <div className="input-wrapper">
            <div className="input-icon start-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
            </div>
            <input
              type="text"
              className="search-input"
              placeholder="Starting location..."
              value={startInput}
              onChange={handleStartInputChange}
            />
            {startSuggestions.length > 0 && (
              <div className="suggestions-dropdown">
                {startSuggestions.map(loc => (
                  <div 
                    key={loc.id} 
                    className="suggestion-item"
                    onClick={() => handleStartSuggestionClick(loc)}
                  >
                    <span className="suggestion-name">{loc.name}</span>
                    <span className="suggestion-type">{loc.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="input-wrapper">
            <div className="input-icon end-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <input
              type="text"
              className="search-input"
              placeholder="Destination..."
              value={endInput}
              onChange={handleEndInputChange}
            />
            {endSuggestions.length > 0 && (
              <div className="suggestions-dropdown">
                {endSuggestions.map(loc => (
                  <div 
                    key={loc.id} 
                    className="suggestion-item"
                    onClick={() => handleEndSuggestionClick(loc)}
                  >
                    <span className="suggestion-name">{loc.name}</span>
                    <span className="suggestion-type">{loc.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button type="submit" className="search-button">
          Get Directions
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </form>
    </div>
  );
}

export default SearchBar;




