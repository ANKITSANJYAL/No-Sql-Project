import React, { useState } from 'react';
import SearchBar from '../components/SearchBar';
import { API_ENDPOINTS } from '../config/api';
import NavigationView from '../components/NavigationView';
import GraphVisualization from '../components/GraphVisualization';
import DirectionPropertiesPanel from '../components/DirectionPropertiesPanel';
import '../styles/ManualPage.css';

export default function ManualPage() {
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [navigationData, setNavigationData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isLoadingNavigation, setIsLoadingNavigation] = useState(false);
  const [navigationError, setNavigationError] = useState(null);
  const [viewMode, setViewMode] = useState('graph'); // 'graph' or 'steps'

  const handleNodeSelect = (nodeData) => {
    setSelectedNode(nodeData);
  };

  const handleSearch = async (startId, endId, startName, endName, waypoints = []) => {
    setStartLocation(startName);
    setEndLocation(endName);
    setNavigationData(null);
    setNavigationError(null);
    setIsLoadingNavigation(true);

    try {
      // If no waypoints, use simple navigation
      if (waypoints.length === 0) {
        const response = await fetch(`${API_ENDPOINTS.navigate}?start=${encodeURIComponent(startId)}&end=${encodeURIComponent(endId)}`);
        const text = await response.text();
        let data = null;
        try {
          data = JSON.parse(text);
        } catch (parseErr) {
          throw new Error(`Navigation service returned unexpected response: ${text.slice(0, 200)}`);
        }

        if (data.success) setNavigationData(data);
        else setNavigationError(data.message || 'Navigation failed');
      } else {
        // Chain navigation through waypoints
        const allWaypoints = [...waypoints.map(wp => wp.id), endId];
        const allNames = [...waypoints.map(wp => wp.name), endName];
        const pathSegments = [];
        let currentStart = startId;

        // Navigate from start to first waypoint, then through each waypoint to destination
        for (let i = 0; i < allWaypoints.length; i++) {
          const currentEnd = allWaypoints[i];
          const response = await fetch(`${API_ENDPOINTS.navigate}?start=${encodeURIComponent(currentStart)}&end=${encodeURIComponent(currentEnd)}`);
          const text = await response.text();
          let segmentData = null;
          try {
            segmentData = JSON.parse(text);
          } catch (parseErr) {
            throw new Error(`Navigation service returned unexpected response: ${text.slice(0, 200)}`);
          }

          if (!segmentData.success) {
            throw new Error(segmentData.message || `Navigation failed from ${i === 0 ? startName : allNames[i - 1]} to ${allNames[i]}`);
          }

          // Skip the first step of subsequent segments (it's the same as the last step of previous segment)
          const stepsToAdd = i > 0 ? segmentData.steps.slice(1) : segmentData.steps;
          pathSegments.push(...stepsToAdd);
          currentStart = currentEnd;
        }

        // Renumber all steps sequentially and recalculate cumulative distances
        let cumulativeDistance = 0;
        pathSegments.forEach((step, index) => {
          step.step = index + 1;
          if (index > 0) {
            cumulativeDistance += step.distance || 0;
          }
          step.cumulativeDistance = cumulativeDistance;
        });

        // Combine all segments into a single navigation result
        const combinedData = {
          success: true,
          start: startId,
          end: endId,
          path: pathSegments.map(s => s.locationId),
          totalDistance: pathSegments.reduce((sum, step) => sum + (step.distance || 0), 0),
          estimatedTime: (() => {
            const totalSeconds = Math.ceil(pathSegments.reduce((sum, step) => sum + (step.distance || 0), 0) / 1.2);
            const totalMinutes = Math.ceil(totalSeconds / 60);
            return totalMinutes === 0 ? '< 1 min' : `${totalMinutes} min`;
          })(),
          steps: pathSegments,
          metadata: {
            startLocation: pathSegments[0]?.location,
            endLocation: pathSegments[pathSegments.length - 1]?.location,
            totalSteps: pathSegments.length,
            generatedAt: new Date().toISOString(),
            waypoints: waypoints.map(wp => ({ id: wp.id, name: wp.name }))
          }
        };

        setNavigationData(combinedData);
      }
    } catch (err) {
      setNavigationError(err.message || 'Navigation failed');
    } finally {
      setIsLoadingNavigation(false);
    }
  };

  return (
    <div className="manual-page">
      <div className="manual-layout">
        <div className="manual-left">
          <header className="manual-header-left">
            <h2>Manual Entry</h2>
            <p>Use the form below to select start and destination.</p>
          </header>

          <div className="manual-left-content">
            <SearchBar onSearch={handleSearch} startValue={startLocation} endValue={endLocation} showNaturalInput={false} />

            {isLoadingNavigation && <p>Loading directions...</p>}
            {navigationError && <p className="error">{navigationError}</p>}
          </div>
        </div>

        <div className="manual-right-panel">
          <div className="manual-graph-container">
            {navigationData ? (
              <>
                <div className="view-toggle">
                  <button 
                    className={`toggle-btn ${viewMode === 'graph' ? 'active' : ''}`}
                    onClick={() => setViewMode('graph')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="3" fill="currentColor" />
                      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                    </svg>
                    Graph View
                  </button>
                  <button 
                    className={`toggle-btn ${viewMode === 'steps' ? 'active' : ''}`}
                    onClick={() => setViewMode('steps')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
                    </svg>
                    Step by Step
                  </button>
                </div>
                
                {viewMode === 'graph' ? (
                  <GraphVisualization 
                    navigationData={navigationData} 
                    startLocation={startLocation} 
                    endLocation={endLocation}
                    onNodeSelect={handleNodeSelect}
                  />
                ) : (
                  <NavigationView 
                    navigationData={navigationData} 
                    startLocation={startLocation} 
                    endLocation={endLocation}
                    onStepChange={handleNodeSelect}
                  />
                )}
              </>
            ) : (
              <div className="manual-output-placeholder">Navigation output will appear here after you click Get Directions.</div>
            )}
          </div>
          
          {/* Direction Properties Panel - always visible on the right */}
          <DirectionPropertiesPanel 
            node={selectedNode}
            navigationData={navigationData || null}
            viewMode={viewMode}
          />
        </div>
      </div>
    </div>
  );
}
