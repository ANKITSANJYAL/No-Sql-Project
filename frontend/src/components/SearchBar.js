import React, { useState, useEffect, useRef } from 'react';
import '../styles/SearchBar.css';
import { API_ENDPOINTS } from '../config/api';

function SearchBar({ onSearch, onLocationSelect, startValue, endValue, showNaturalInput = true }) {
  const [startInput, setStartInput] = useState(startValue || '');
  const [endInput, setEndInput] = useState(endValue || '');
  const [selectedStartLocation, setSelectedStartLocation] = useState(null);
  const [selectedEndLocation, setSelectedEndLocation] = useState(null);
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [endSuggestions, setEndSuggestions] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nlInput, setNlInput] = useState('');
  const [nlLoading, setNlLoading] = useState(false);
  const [nlMessage, setNlMessage] = useState(null);
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

  // Natural language submit handler - calls chat/navigate
  const handleNLSubmit = async (e) => {
    e?.preventDefault();
    if (!nlInput || nlInput.trim() === '') return;
    setNlLoading(true);
    setNlMessage(null);

    try {
      const resp = await fetch(API_ENDPOINTS.chatNavigate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: nlInput.trim() })
      });

      const text = await resp.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        // Received non-JSON response (HTML/error page)
        setNlMessage({ type: 'error', text: 'Navigation service returned an unexpected response. Please try again later.' });
        setNlLoading(false);
        return;
      }

      // If provider returned a direct navigation
      if (data.success && data.navigation && data.parsedIntent) {
        const p = data.parsedIntent;
        // call onSearch with resolved IDs
        if (p.start?.id && p.end?.id) {
          onSearch(p.start.id, p.end.id, p.start.name || '', p.end.name || '');
          setNlInput('');
          setNlMessage(null);
          setNlLoading(false);
          return;
        }
      }

      // If needsClarification, backend returns parsedIntent
  if (data.needsClarification || data.parsedIntent) {
        const parsed = data.parsedIntent || data.data || {};
        // If start is found, prefill start input
        if (parsed.start?.name) {
          setStartInput(parsed.start.name);
          // try to match to allLocations
          const match = allLocations.find(l => l.name === parsed.start.name || l._id === parsed.start.id || l.id === parsed.start.id);
          if (match) setSelectedStartLocation(match);
        }

        // If end missing, generate candidate suggestions from intent keywords
        const intentText = (parsed.intent || parsed.activityType || nlInput).toLowerCase();
        // Simple mapping to types/amenities
        const activityMap = {
          'borrow books': 'library',
          'library': 'library',
          'book': 'library',
          'coffee': 'cafe',
          'cafe': 'cafe',
          'eat': 'dining',
          'food': 'dining',
          'class': 'classroom',
          'lecture': 'classroom',
          'elevator': 'elevator'
        };

        let candidates = [];
        // look for explicit location names in parsedIntent (if LLM provided any suggestions)
        if (parsed.end?.name) {
          const found = allLocations.find(l => l.name === parsed.end.name || l.id === parsed.end.id || l._id === parsed.end.id);
          if (found) candidates.push(found);
        }

        // try activity map
        for (const [kw, type] of Object.entries(activityMap)) {
          if (intentText.includes(kw)) {
            const matches = allLocations.filter(l => l.type === type || (l.building && l.building.toLowerCase().includes(type)) || (l.name && l.name.toLowerCase().includes(type)));
            candidates = candidates.concat(matches);
          }
        }

        // fallback: fuzzy name match on query
        const words = nlInput.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
        if (candidates.length === 0 && words.length > 0) {
          const fuzzy = allLocations.filter(l => words.some(w => (l.name || '').toLowerCase().includes(w) || (l.building || '').toLowerCase().includes(w)));
          candidates = candidates.concat(fuzzy);
        }

        // Deduplicate and limit
        const unique = [];
        const seen = new Set();
        for (const c of candidates) {
          if (!c) continue;
          const id = c.id || c._id;
          if (!seen.has(id)) { seen.add(id); unique.push(c); }
        }

        if (unique.length > 0) {
          // show suggestions as message with clickable items
          setNlMessage({ type: 'suggestions', items: unique.slice(0, 5) });
        } else {
          setNlMessage({ type: 'info', text: 'I could not determine a clear destination. Please pick from suggestions or type the destination.' });
        }
      } else {
        setNlMessage({ type: 'info', text: data.message || 'Could not parse your request. Try: "I am at the main entrance, take me to room 817"' });
      }

    } catch (err) {
      console.error('NL parse error:', err);
      setNlMessage({ type: 'error', text: 'Failed to contact navigation service' });
    } finally {
      setNlLoading(false);
    }
  };

  const handleNLSuggestionClick = (location) => {
    // set destination and trigger search if start available
    setEndInput(location.name);
    setSelectedEndLocation({ id: location.id || location._id, name: location.name, ...location });
    // if start is selected, submit
    const sId = selectedStartLocation?.id || selectedStartLocation?._id;
    const eId = location.id || location._id;
    if (sId) {
      onSearch(sId, eId, selectedStartLocation.name, location.name);
      setNlInput('');
      setNlMessage(null);
    } else {
      // suggest user pick start
      setNlMessage({ type: 'info', text: 'Please select your starting location (or enter it above) to start navigation.' });
    }
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

      {/* Natural language quick input (optional) */}
      {showNaturalInput && (
        <form className="nl-form" onSubmit={handleNLSubmit} style={{ marginTop: '12px' }}>
          <div className="nl-input-group">
            <input
              type="text"
              className="nl-input"
              placeholder="Type a natural request (e.g. 'I'm at the main gate, take me to the library')"
              value={nlInput}
              onChange={(e) => setNlInput(e.target.value)}
              disabled={nlLoading}
            />
            <button type="submit" className="nl-submit" disabled={nlLoading || !nlInput.trim()}>
              Go
            </button>
          </div>
        </form>
      )}

      {/* NL suggestions / messages */}
      {nlMessage && (
        <div className="nl-message">
          {nlMessage.type === 'suggestions' && (
            <div className="nl-suggestions">
              <div className="nl-suggestions-title">Did you mean:</div>
              {nlMessage.items.map(item => (
                <button key={item.id || item._id} className="nl-suggestion-item" onClick={() => handleNLSuggestionClick(item)}>
                  {item.name} {item.building ? `— ${item.building}` : ''}
                </button>
              ))}
            </div>
          )}
          {nlMessage.type === 'info' && <div className="nl-info">{nlMessage.text}</div>}
          {nlMessage.type === 'error' && <div className="nl-error">{nlMessage.text}</div>}
        </div>
      )}
    </div>
  );
}

export default SearchBar;




