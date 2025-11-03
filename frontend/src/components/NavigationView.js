import React, { useState, useEffect } from 'react';
import '../styles/NavigationView.css';

function NavigationView({ navigationData, startLocation, endLocation }) {
  const [currentStep, setCurrentStep] = useState(0);

  // Use real navigation data from API
  const steps = navigationData?.steps || [];
  const totalDistance = navigationData?.totalDistance || 0;
  const estimatedTime = navigationData?.estimatedTime || '0 min';

  // Format distance for display
  const formatDistance = (meters) => {
    if (meters === 0) return '0m';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // Get current step data
  const currentStepData = steps[currentStep] || null;

  // Reset to first step when navigation data changes
  useEffect(() => {
    setCurrentStep(0);
  }, [navigationData]);

  // Don't render if no steps available
  if (!currentStepData || steps.length === 0) {
    return (
      <div className="navigation-view">
        <div className="navigation-container">
          <p>No navigation data available</p>
        </div>
      </div>
    );
  }

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
              <span>{formatDistance(totalDistance)}</span>
            </div>
            <div className="info-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <span>{estimatedTime}</span>
            </div>
          </div>
        </div>

        <div className="navigation-content">
          {/* Visual Step Display */}
          <div className="current-step-visual">
            <div className="step-image-container">
              {currentStepData.location?.images && currentStepData.location.images.length > 0 ? (
                <img 
                  src={currentStepData.location.images[0]} 
                  alt={currentStepData.location.name}
                  className="step-image"
                />
              ) : (
                <div className="step-image-placeholder">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  <p className="image-placeholder-text">
                    {currentStepData.location?.name || 'Location photo will appear here'}
                  </p>
                </div>
              )}
            </div>
            
            <div className="step-instruction">
              <div className="step-number">Step {currentStepData.step} of {steps.length}</div>
              <h3 className="instruction-text">{currentStepData.instruction}</h3>
              <div className="step-distance">
                {formatDistance(currentStepData.cumulativeDistance)} from start
                {currentStepData.distance > 0 && ` (+${formatDistance(currentStepData.distance)})`}
              </div>
              {currentStepData.location && (
                <div className="step-location-info">
                  <span className="location-name">{currentStepData.location.name}</span>
                  {currentStepData.location.building && (
                    <span className="location-building">{currentStepData.location.building}</span>
                  )}
                </div>
              )}
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
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
              disabled={currentStep === steps.length - 1}
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
              {steps.map((step, index) => (
                <div 
                  key={step.locationId || index} 
                  className={`step-item ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                  onClick={() => setCurrentStep(index)}
                >
                  <div className="step-marker">
                    {index < currentStep ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : (
                      <span>{step.step}</span>
                    )}
                  </div>
                  <div className="step-content">
                    <p className="step-text">{step.instruction}</p>
                    <span className="step-meta">{formatDistance(step.cumulativeDistance)}</span>
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

