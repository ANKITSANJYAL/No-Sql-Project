import React, { useState, useEffect } from 'react';
import { getProxiedImageUrl } from '../config/api';
import '../styles/NavigationView.css';

function NavigationView({ navigationData, startLocation, endLocation, onStepChange }) {
  const [currentStep, setCurrentStep] = useState(0);

  // Use real navigation data from API
  const steps = navigationData?.steps || [];

  // Get current step data
  const currentStepData = steps[currentStep] || null;

  // Reset to first step when navigation data changes and notify parent
  useEffect(() => {
    if (steps.length > 0) {
      setCurrentStep(0);
    }
  }, [navigationData, steps.length]);

  // Notify parent when step changes
  useEffect(() => {
    if (onStepChange && currentStepData && steps.length > 0) {
      const nodeData = {
        id: currentStepData.locationId,
        label: currentStepData.location?.name || currentStepData.locationId,
        type: currentStepData.location?.type || 'location',
        image: (() => {
          const img = currentStepData.location?.images?.[0];
          const rawUrl = img?.url || (typeof img === 'string' ? img : '');
          return rawUrl ? getProxiedImageUrl(rawUrl) : '';
        })(),
        description: currentStepData.location?.description,
        building: currentStepData.location?.building,
        floor: currentStepData.location?.floor,
        step: currentStepData.step,
        fullLocation: currentStepData.location
      };
      onStepChange(nodeData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // Don't render if no steps available
  if (!currentStepData || steps.length === 0) {
    return (
      <div className="navigation-view">
        <div className="navigation-container">
          <p className="navigation-empty">No navigation data available</p>
        </div>
      </div>
    );
  }

  const handlePrevious = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Previous clicked, currentStep:', currentStep, 'steps.length:', steps.length);
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      console.log('Setting step to:', newStep);
      setCurrentStep(newStep);
    }
  };

  const handleNext = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Next clicked, currentStep:', currentStep, 'steps.length:', steps.length);
    if (currentStep < steps.length - 1) {
      const newStep = currentStep + 1;
      console.log('Setting step to:', newStep);
      setCurrentStep(newStep);
    }
  };

  const rawImage = currentStepData.location?.images?.[0];
  const rawImageUrl = rawImage?.url || (typeof rawImage === 'string' ? rawImage : null);
  const currentImage = rawImageUrl ? getProxiedImageUrl(rawImageUrl) : null;

  return (
    <div className="navigation-view">
      <div className="navigation-container">
        <div className="location-image-container">
          {/* Navigation Buttons at the top */}
          <div className="image-navigation-controls">
            <button 
              type="button"
              className="nav-btn prev-btn"
              onClick={handlePrevious}
              disabled={currentStep === 0 || steps.length === 0}
              aria-label="Previous location"
              style={{ cursor: (currentStep === 0 || steps.length === 0) ? 'not-allowed' : 'pointer' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            
            <div className="step-indicator">
              <span className="step-label">Step</span>
              <span className="step-current">{currentStep + 1}</span>
              <span className="step-separator">/</span>
              <span className="step-total">{steps.length}</span>
            </div>
            
            <button 
              type="button"
              className="nav-btn next-btn"
              onClick={handleNext}
              disabled={currentStep >= steps.length - 1 || steps.length === 0}
              aria-label="Next location"
              style={{ cursor: (currentStep >= steps.length - 1 || steps.length === 0) ? 'not-allowed' : 'pointer' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Location Image */}
          <div className="location-image-wrapper">
            {currentImage ? (
              <img 
                src={currentImage} 
                alt={currentStepData.location?.name || 'Location'}
                className="location-image"
              />
            ) : (
              <div className="location-image-placeholder">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <p className="placeholder-text">
                  {currentStepData.location?.name || 'No image available'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NavigationView;
