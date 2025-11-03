import React, { useState, useEffect, useRef } from 'react';
import '../styles/SearchBar.css';
import { API_ENDPOINTS } from '../config/api';

function SearchBar({ onSearch, onLocationSelect, startValue, endValue }) {
  const [startInput, setStartInput] = useState(startValue || '');
  const [endInput, setEndInput] = useState(endValue || '');
  const [selectedStartLocation, setSelectedStartLocation] = useState(null);
  const [selectedEndLocation, setSelectedEndLocation] = useState(null);
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [endSuggestions, setEndSuggestions] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [startInputFocused, setStartInputFocused] = useState(false);
  const [endInputFocused, setEndInputFocused] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Update inputs when props change
  useEffect(() => {
    if (startValue !== undefined) {
      setStartInput(startValue);
      // If startValue is set and matches a location, set it as selected
      if (startValue && allLocations.length > 0) {
        const matchingLocation = allLocations.find(loc => loc.name === startValue);
        if (matchingLocation) {
          setSelectedStartLocation(matchingLocation);
        }
      } else if (!startValue) {
        // If cleared, also clear selected start location
        setSelectedStartLocation(null);
      }
    }
  }, [startValue, allLocations]);

  useEffect(() => {
    if (endValue !== undefined) {
      setEndInput(endValue);
      // If endValue is set and matches a location, set it as selected
      if (endValue && allLocations.length > 0) {
        const matchingLocation = allLocations.find(loc => loc.name === endValue);
        if (matchingLocation) {
          setSelectedEndLocation(matchingLocation);
        }
      } else if (!endValue) {
        // If cleared, also clear selected end location
        setSelectedEndLocation(null);
      }
    }
  }, [endValue, allLocations]);

  // Fetch all locations on component mount
  useEffect(() => {
    const fetchAllLocations = async () => {
      try {
        setIsLoading(true);
        // Fetch all locations from the new API endpoint
        const response = await fetch(API_ENDPOINTS.allLocations);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setAllLocations(data.data.map(loc => ({
              id: loc._id,
              name: loc.name,
              type: loc.type,
              building: loc.building,
              floor: loc.floor
            })));
          }
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
        // Fallback to building-specific endpoint
        try {
          const fallbackResponse = await fetch(`${API_ENDPOINTS.locations}/building/Lowenstein%20Center`);
          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json();
            if (data.success && data.data) {
              setAllLocations(data.data.map(loc => ({
                id: loc._id,
                name: loc.name,
                type: loc.type,
                building: loc.building,
                floor: loc.floor
              })));
            }
          }
        } catch (fallbackError) {
          console.error('Error fetching locations from fallback:', fallbackError);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllLocations();
  }, []);

  // Debounced search function for API calls
  // excludeLocationId: ID of location to exclude from results (for destination suggestions)
  const searchLocations = async (query, setSuggestions, excludeLocationId = null) => {
    if (!query || query.trim().length === 0) {
      // If no query, show all locations (excluding the start location)
      const filtered = excludeLocationId 
        ? allLocations.filter(loc => loc.id !== excludeLocationId)
        : allLocations;
      setSuggestions(filtered.slice(0, 10));
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // First, filter from local cache for instant results
    let localFiltered = allLocations.filter(loc => 
      loc.name.toLowerCase().includes(query.toLowerCase()) ||
      (loc.building && loc.building.toLowerCase().includes(query.toLowerCase()))
    );
    
    // Exclude the start location if provided
    if (excludeLocationId) {
      localFiltered = localFiltered.filter(loc => loc.id !== excludeLocationId);
    }
    
    if (localFiltered.length > 0) {
      setSuggestions(localFiltered.slice(0, 10)); // Show first 10 from local cache
    }

    // Then do API search for more comprehensive results
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`${API_ENDPOINTS.searchLocations}?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            let apiResults = data.data.map(loc => ({
              id: loc._id,
              name: loc.name,
              type: loc.type,
              building: loc.building,
              floor: loc.floor
            }));
            
            // Exclude the start location if provided
            if (excludeLocationId) {
              apiResults = apiResults.filter(loc => loc.id !== excludeLocationId);
            }
            
            // Combine and deduplicate results
            const combined = [...localFiltered, ...apiResults];
            const unique = combined.filter((loc, index, self) => 
              index === self.findIndex(l => l.id === loc.id)
            );
            setSuggestions(unique.slice(0, 10));
          }
        }
      } catch (error) {
        console.error('Error searching locations:', error);
        // Fall back to local filtered results
        setSuggestions(localFiltered.slice(0, 10));
      }
    }, 300); // 300ms debounce
  };

  const handleStartInputChange = (e) => {
    const value = e.target.value;
    setStartInput(value);
    // If start input is cleared, clear the selected start location
    if (!value) {
      setSelectedStartLocation(null);
    }
    searchLocations(value, setStartSuggestions);
  };

  const handleEndInputChange = (e) => {
    const value = e.target.value;
    setEndInput(value);
    // Exclude the selected start location from destination suggestions
    searchLocations(value, setEndSuggestions, selectedStartLocation?.id);
  };

  // Show suggestions when input is focused
  const handleStartFocus = () => {
    setStartInputFocused(true);
    // Show suggestions when focused - either all locations if empty, or search results if there's text
    if (startInput === '' && allLocations.length > 0) {
      setStartSuggestions(allLocations.slice(0, 10));
    } else if (startInput.length > 0) {
      // If there's text, filter and show suggestions
      const filtered = allLocations.filter(loc => 
        loc.name.toLowerCase().includes(startInput.toLowerCase()) ||
        (loc.building && loc.building.toLowerCase().includes(startInput.toLowerCase()))
      );
      setStartSuggestions(filtered.slice(0, 10));
      // Also trigger API search
      searchLocations(startInput, setStartSuggestions);
    }
  };

  const handleEndFocus = () => {
    setEndInputFocused(true);
    // Show suggestions when focused - exclude start location if selected
    if (endInput === '' && allLocations.length > 0) {
      const filtered = selectedStartLocation 
        ? allLocations.filter(loc => loc.id !== selectedStartLocation.id)
        : allLocations;
      setEndSuggestions(filtered.slice(0, 10));
    } else if (endInput.length > 0) {
      // If there's text, filter and show suggestions (excluding start location)
      const filtered = allLocations.filter(loc => {
        if (selectedStartLocation && loc.id === selectedStartLocation.id) {
          return false; // Exclude start location
        }
        return loc.name.toLowerCase().includes(endInput.toLowerCase()) ||
               (loc.building && loc.building.toLowerCase().includes(endInput.toLowerCase()));
      });
      setEndSuggestions(filtered.slice(0, 10));
      // Also trigger API search with exclusion
      searchLocations(endInput, setEndSuggestions, selectedStartLocation?.id);
    }
  };

  const handleStartBlur = (e) => {
    // Only blur if we're not clicking on a suggestion item
    // Check if the related target (clicked element) is inside the suggestions dropdown
    const suggestionsDropdown = e.currentTarget.closest('.input-wrapper')?.querySelector('.suggestions-dropdown');
    if (!suggestionsDropdown?.contains(e.relatedTarget)) {
      setStartInputFocused(false);
      // Small delay to allow click events to fire first
      setTimeout(() => {
        if (!startInputFocused) {
          setStartSuggestions([]);
        }
      }, 200);
    }
  };

  const handleEndBlur = (e) => {
    // Only blur if we're not clicking on a suggestion item
    const suggestionsDropdown = e.currentTarget.closest('.input-wrapper')?.querySelector('.suggestions-dropdown');
    if (!suggestionsDropdown?.contains(e.relatedTarget)) {
      setEndInputFocused(false);
      setTimeout(() => {
        if (!endInputFocused) {
          setEndSuggestions([]);
        }
      }, 200);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (startInput && endInput && selectedStartLocation && selectedEndLocation) {
      // Call onSearch with location IDs for API call
      onSearch(selectedStartLocation.id, selectedEndLocation.id, selectedStartLocation.name, selectedEndLocation.name);
      setStartSuggestions([]);
      setEndSuggestions([]);
      setStartInputFocused(false);
      setEndInputFocused(false);
    } else {
      // If locations are not selected from suggestions, try to find them
      const startLoc = allLocations.find(loc => loc.name === startInput);
      const endLoc = allLocations.find(loc => loc.name === endInput);
      
      if (startLoc && endLoc) {
        setSelectedStartLocation(startLoc);
        setSelectedEndLocation(endLoc);
        onSearch(startLoc.id, endLoc.id, startLoc.name, endLoc.name);
        setStartSuggestions([]);
        setEndSuggestions([]);
        setStartInputFocused(false);
        setEndInputFocused(false);
      } else {
        alert('Please select locations from the suggestions');
      }
    }
  };

  const handleStartSuggestionClick = (location) => {
    setStartInput(location.name);
    setSelectedStartLocation(location); // Store selected start location
    setStartSuggestions([]);
    setStartInputFocused(false);
    // Trigger location select callback but don't auto-focus destination
    // Let user click "Navigate Here" button in popup first
    if (onLocationSelect) {
      onLocationSelect(location);
    }
  };

  const handleEndSuggestionClick = (location) => {
    // Make sure we're setting the end input, not start
    setEndInput(location.name);
    setSelectedEndLocation(location); // Store selected end location
    setEndSuggestions([]);
    setEndInputFocused(false);
    // Don't trigger onLocationSelect for destination - it's for showing details popup
    // Just set the value and let user submit
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
              placeholder={isLoading ? "Loading locations..." : "Starting location..."}
              value={startInput}
              onChange={handleStartInputChange}
              onFocus={handleStartFocus}
              onBlur={handleStartBlur}
            />
            {startSuggestions.length > 0 && startInputFocused && (
              <div className="suggestions-dropdown">
                {startSuggestions.map(loc => (
                  <div 
                    key={loc.id} 
                    className="suggestion-item"
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input blur
                      handleStartSuggestionClick(loc);
                    }}
                  >
                    <div>
                      <span className="suggestion-name">{loc.name}</span>
                      <span className="suggestion-type">{loc.type}</span>
                    </div>
                    {loc.building && (
                      <span className="suggestion-building">{loc.building}</span>
                    )}
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
              placeholder={isLoading ? "Loading locations..." : "Destination..."}
              value={endInput}
              onChange={handleEndInputChange}
              onFocus={handleEndFocus}
              onBlur={handleEndBlur}
            />
            {endSuggestions.length > 0 && endInputFocused && (
              <div className="suggestions-dropdown">
                {endSuggestions.map(loc => (
                  <div 
                    key={loc.id} 
                    className="suggestion-item"
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input blur
                      handleEndSuggestionClick(loc);
                    }}
                  >
                    <div>
                      <span className="suggestion-name">{loc.name}</span>
                      <span className="suggestion-type">{loc.type}</span>
                    </div>
                    {loc.building && (
                      <span className="suggestion-building">{loc.building}</span>
                    )}
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

