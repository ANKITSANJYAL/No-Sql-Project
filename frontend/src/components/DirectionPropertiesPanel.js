import React, { useEffect, useRef } from 'react';
import { getProxiedImageUrl } from '../config/api';
import '../styles/DirectionPropertiesPanel.css';

function DirectionPropertiesPanel({ node, navigationData, viewMode = 'graph' }) {
  const location = node?.fullLocation || {};
  const steps = navigationData?.steps || [];
  const totalDistance = navigationData?.totalDistance || 0;
  const estimatedTime = navigationData?.estimatedTime || '';
  const isGraphView = viewMode === 'graph';
  const directionsListRef = useRef(null);

  // Find next step from current location
  const currentStepIndex = node?.step ? steps.findIndex(s => s.step === node.step) : -1;
  const nextStep = currentStepIndex >= 0 && currentStepIndex < steps.length - 1 ? steps[currentStepIndex + 1] : null;

  // Auto-scroll to active step in step-by-step view
  useEffect(() => {
    if (!isGraphView && node && node.step && directionsListRef.current) {
      const activeStepElement = directionsListRef.current.querySelector(
        `#direction-step-${node.step}`
      );
      if (activeStepElement) {
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(() => {
          activeStepElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        }, 200);
      }
    }
  }, [node?.step, isGraphView, steps.length]);

  const properties = node ? [
    { key: 'name', label: 'Name', value: location.name || node.label },
    { key: 'type', label: 'Type', value: location.type || node.type },
    { key: 'building', label: 'Building', value: location.building },
    { key: 'floor', label: 'Floor', value: location.floor !== undefined ? location.floor : null },
    { key: 'description', label: 'Description', value: location.description }
  ].filter(prop => prop.value !== null && prop.value !== undefined && prop.value !== '') : [];

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const formatDistance = (meters) => {
    if (meters === 0) return '0m';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <div className="direction-properties-panel">
      <div className="direction-properties-header">
        <h3 className="direction-properties-title">Direction Properties</h3>
      </div>

      <div className="direction-properties-content">
        {/* Navigation Summary */}
        {navigationData && steps.length > 0 && (
          <div className="direction-summary">
            <div className="summary-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              <span><strong>Total Distance:</strong> {formatDistance(totalDistance)}</span>
            </div>
            {estimatedTime && (
              <div className="summary-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <span><strong>Total Travel Time:</strong> {estimatedTime}</span>
              </div>
            )}
            <div className="summary-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              <span><strong>Steps:</strong> {steps.length}</span>
            </div>
          </div>
        )}

        {/* Graph View: Show selected location details and next step */}
        {isGraphView && node && (
          <>
            {/* Step Instruction - at the top */}
            {nextStep && (
              <div className="next-step-section">
                <h4 className="next-step-title">Direction</h4>
                {node.step && steps.length > 0 && (
                  <div className="step-number-badge">
                    Step {node.step}/{steps.length}
                  </div>
                )}
                <div className="next-step-card">
                  <div className="next-step-instruction">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                    <span>{nextStep.instruction}</span>
                  </div>
                  {nextStep.location && (
                    <div className="next-step-destination">
                      <strong>To:</strong> {nextStep.location.name}
                      {nextStep.location.building && ` in ${nextStep.location.building}`}
                    </div>
                  )}
                  {nextStep.distance > 0 && (
                    <div className="next-step-distance">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      </svg>
                      <span>Distance: {formatDistance(nextStep.distance)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Image Preview */}
            {location.images && location.images.length > 0 && (
              <div className="node-property-image">
                <img 
                  src={getProxiedImageUrl(location.images[0].url || location.images[0])} 
                  alt={location.name || 'Location'}
                  className="node-property-image-preview"
                />
              </div>
            )}

            {/* Location Properties */}
            <div className="node-properties-list">
              <h4 className="properties-title">Location Details</h4>
              {properties.map((prop, index) => (
                <div key={prop.key || index} className="node-property-item">
                  <div className="node-property-key">{prop.label}</div>
                  <div className="node-property-value-wrapper">
                    <div className="node-property-value">
                      {typeof prop.value === 'string' ? prop.value : String(prop.value)}
                    </div>
                    <button
                      className="node-property-copy"
                      onClick={() => copyToClipboard(String(prop.value))}
                      title="Copy to clipboard"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Step-by-Step View: Show full directions list */}
        {!isGraphView && steps.length > 0 && (
          <div className="directions-section">
            <h4 className="directions-title">Directions</h4>
            <div className="directions-list" ref={directionsListRef}>
              {steps.map((step, index) => {
                const isActive = node && node.step === step.step;
                return (
                  <div 
                    key={step.locationId || index}
                    id={`direction-step-${step.step || index + 1}`}
                    className={`direction-step ${isActive ? 'active-step' : ''}`}
                  >
                    <div className="direction-step-number">{step.step || index + 1}</div>
                    <div className="direction-step-content">
                      <div className="direction-step-instruction">{step.instruction}</div>
                      {step.location && (
                        <div className="direction-step-location">
                          <strong>{step.location.name}</strong>
                          {step.location.building && ` • ${step.location.building}`}
                          {step.distance > 0 && ` • ${formatDistance(step.distance)}`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State for Graph View - when navigation exists but no node selected */}
        {isGraphView && !node && navigationData && (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <p>Click on a location node on the map to see details and next direction</p>
          </div>
        )}
        
        {/* Empty State when no navigation data */}
        {!navigationData && (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <p>{isGraphView ? 'Start navigation and click on a location to see details' : 'Start navigation to see step-by-step directions'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DirectionPropertiesPanel;

