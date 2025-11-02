import React, { useState } from 'react';
import '../styles/NavigationView.css';

function NavigationView({ navigationData, startLocation, endLocation }) {
  const [currentStep, setCurrentStep] = useState(0);

  // Mock detailed directions - replace with actual API data
  const directions = [
    {
      step: 1,
      instruction: "Start at Lowenstein Building Main Entrance",
      distance: "0m",
      image: "/images/locations/entrance.jpg", // Placeholder
      type: "start"
    },
    {
      step: 2,
      instruction: "Walk straight down the main hallway for 30 meters",
      distance: "30m",
      image: "/images/locations/hallway.jpg",
      type: "straight"
    },
    {
      step: 3,
      instruction: "Turn left at the water fountain",
      distance: "50m",
      image: "/images/locations/fountain.jpg",
      type: "left"
    },
    {
      step: 4,
      instruction: "Take the stairs down to Lower Level",
      distance: "70m",
      image: "/images/locations/stairs.jpg",
      type: "stairs"
    },
    {
      step: 5,
      instruction: "Room LL817 will be on your right",
      distance: "150m",
      image: "/images/locations/room817.jpg",
      type: "destination"
    }
  ];

  return (
    <div className="navigation-view">
      <div className="navigation-container">
        <div className="navigation-header">
          <h2 className="navigation-title">Your Route</h2>
          <div className="route-info">
            <div className="info-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              <span>{navigationData.distance}</span>
            </div>
            <div className="info-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <span>{navigationData.estimatedTime}</span>
            </div>
          </div>
        </div>

        <div className="navigation-content">
          {/* Visual Step Display */}
          <div className="current-step-visual">
            <div className="step-image-container">
              <div className="step-image-placeholder">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <p className="image-placeholder-text">Location photo will appear here</p>
              </div>
            </div>
            
            <div className="step-instruction">
              <div className="step-number">Step {directions[currentStep].step} of {directions.length}</div>
              <h3 className="instruction-text">{directions[currentStep].instruction}</h3>
              <div className="step-distance">{directions[currentStep].distance} from start</div>
            </div>
          </div>

          {/* Step Navigation Controls */}
          <div className="step-controls">
            <button 
              className="step-btn prev-btn"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Previous
            </button>
            
            <button 
              className="step-btn next-btn"
              onClick={() => setCurrentStep(Math.min(directions.length - 1, currentStep + 1))}
              disabled={currentStep === directions.length - 1}
            >
              Next
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* All Steps Overview */}
          <div className="all-steps">
            <h4 className="steps-title">All Directions</h4>
            <div className="steps-list">
              {directions.map((direction, index) => (
                <div 
                  key={index} 
                  className={`step-item ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                  onClick={() => setCurrentStep(index)}
                >
                  <div className="step-marker">
                    {index < currentStep ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : (
                      <span>{direction.step}</span>
                    )}
                  </div>
                  <div className="step-content">
                    <p className="step-text">{direction.instruction}</p>
                    <span className="step-meta">{direction.distance}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NavigationView;

