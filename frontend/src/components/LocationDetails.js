import React from 'react';
import '../styles/LocationDetails.css';

function LocationDetails({ location, onClose, onNavigate }) {
  // Use actual location data from props
  const locationInfo = {
    name: location.name || "Location",
    type: location.type || "Unknown",
    floor: location.floor || "N/A",
    building: location.building || "N/A",
    description: location.description || "No description available.",
    amenities: location.amenities || [],
    hours: location.hours || "Hours not available",
    images: location.images || []
  };

  return (
    <div className="location-details-overlay" onClick={onClose}>
      <div className="location-details-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="location-image-container">
          {locationInfo.images && locationInfo.images.length > 0 ? (
            <img 
              src={locationInfo.images[0].url || locationInfo.images[0]} 
              alt={locationInfo.name}
              className="location-image"
            />
          ) : (
            <div className="location-image-placeholder">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}
        </div>

        <div className="location-content">
          <div className="location-header">
            <h2 className="location-name">{locationInfo.name}</h2>
            <span className="location-type">{locationInfo.type}</span>
          </div>

          <div className="location-meta">
            <div className="meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              <span>{locationInfo.building}</span>
            </div>
            <div className="meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
              <span>{locationInfo.floor}</span>
            </div>
          </div>

          <div className="location-description">
            <h3>About</h3>
            <p>{locationInfo.description}</p>
          </div>

          {locationInfo.amenities && locationInfo.amenities.length > 0 && (
            <div className="location-amenities">
              <h3>Amenities</h3>
              <div className="amenities-grid">
                {locationInfo.amenities.map((amenity, index) => (
                  <div key={index} className="amenity-tag">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {amenity}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="location-hours">
            <h3>Hours</h3>
            <p>{locationInfo.hours}</p>
          </div>

          <button 
            className="navigate-button"
            onClick={() => {
              // Close the popup
              if (onClose) {
                onClose();
              }
              // If navigate callback provided, set this as start location
              if (onNavigate && location) {
                // Small delay to ensure popup closes first
                setTimeout(() => {
                  onNavigate(location.name, '');
                }, 100);
              }
            }}
          >
            Navigate Here
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default LocationDetails;




