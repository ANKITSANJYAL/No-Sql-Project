import React, { useState, useRef, useEffect } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import '../styles/GraphVisualization.css';

function GraphVisualization({ navigationData, startLocation, endLocation }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const cyRef = useRef(null);

  // Extract path data
  const steps = navigationData?.steps || [];

  // Extract direction from instruction text
  const extractDirection = (instruction) => {
    if (!instruction) return 'straight';
    
    const text = instruction.toLowerCase();
    
    // Check for vertical movement (floors/levels)
    if (text.includes('elevator') || text.includes('stairs') || 
        text.includes('floor') || text.includes('level')) {
      return 'vertical';
    }
    
    // Check for directional keywords
    if (text.includes('turn right') || text.includes('right') || text.includes('to the right')) {
      return 'right';
    }
    if (text.includes('turn left') || text.includes('left') || text.includes('to the left') || text.includes('on your left')) {
      return 'left';
    }
    if (text.includes('behind') || text.includes('back') || text.includes('return')) {
      return 'back';
    }
    
    // Default to straight
    return 'straight';
  };

  // Calculate spatial positions for nodes
  const calculateSpatialPositions = () => {
    if (!steps || steps.length === 0) return {};
    
    const STEP_DISTANCE = 200; // Base distance between nodes
    const VERTICAL_OFFSET = 180; // Special offset for vertical movement
    
    const positions = {};
    // Start at bottom center - y increases downward in screen coordinates
    // Start with a positive y value so path flows upward (decreasing y)
    // Calculate starting Y based on number of steps to ensure enough room
    const estimatedPathHeight = steps.length * STEP_DISTANCE * 0.8;
    let currentX = 0; // Center horizontally
    let currentY = Math.max(300, estimatedPathHeight); // Start at bottom with enough room
    // Angle system: 0° = up (north), 90° = right (east), 180° = down (south), 270° = left (west)
    // Start facing upward (north)
    let currentAngle = 0; // 0 = up (north)
    
    // First node at bottom
    positions[steps[0].locationId] = { x: currentX, y: currentY };
    
    // Calculate positions based on directions
    for (let i = 1; i < steps.length; i++) {
      const instruction = steps[i].instruction;
      const direction = extractDirection(instruction);
      const distance = steps[i].distance || STEP_DISTANCE;
      
      // Normalize distance to pixels (assuming distance in meters)
      const pixelDistance = Math.max(STEP_DISTANCE, Math.min(distance * 2, STEP_DISTANCE * 2));
      
      if (direction === 'vertical') {
        // For elevators/stairs, move upward (decrease y)
        currentY -= VERTICAL_OFFSET;
        // Slight horizontal offset to show vertical change
        currentX += 30;
      } else if (direction === 'right') {
        // Turn right (clockwise from current direction)
        // In navigation: right turn means rotate clockwise
        currentAngle = (currentAngle + 90) % 360;
      } else if (direction === 'left') {
        // Turn left (counter-clockwise from current direction)
        currentAngle = (currentAngle - 90 + 360) % 360;
      } else if (direction === 'back') {
        // Turn around (180 degrees)
        currentAngle = (currentAngle + 180) % 360;
      }
      // 'straight' doesn't change angle - continues in current direction
      
      // Calculate new position based on current angle
      // Convert angle to radians and adjust for screen coordinates
      // In screen coords: y increases downward, so up = -sin, down = +sin
      const radians = (currentAngle * Math.PI) / 180;
      // For screen coordinates: 0° (up) = -y, 90° (right) = +x, 180° (down) = +y, 270° (left) = -x
      currentX += Math.sin(radians) * pixelDistance; // sin(0°)=0, sin(90°)=1 (right), sin(180°)=0, sin(270°)=-1 (left)
      currentY -= Math.cos(radians) * pixelDistance; // cos(0°)=1 (up), cos(90°)=0, cos(180°)=-1 (down), cos(270°)=0
      
      positions[steps[i].locationId] = { x: currentX, y: currentY };
    }
    
    return positions;
  };

  // Build graph elements from navigation data with spatial positions
  const buildGraphElements = () => {
    if (!steps || steps.length === 0) return [];

    const elements = [];
    const nodeMap = new Set();
    const spatialPositions = calculateSpatialPositions();

    // Add nodes from the path with calculated positions
    steps.forEach((step, index) => {
      const nodeId = step.locationId;
      
      if (!nodeMap.has(nodeId)) {
        nodeMap.add(nodeId);
        
        const isStart = index === 0;
        const isEnd = index === steps.length - 1;
        const isActive = index <= currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const position = spatialPositions[nodeId] || { x: 0, y: 0 };

        // Extract image URL properly
        const imageUrl = step.location?.images?.[0]?.url || 
                        (typeof step.location?.images?.[0] === 'string' ? step.location.images[0] : null);
        const hasImage = !!imageUrl;
        
        elements.push({
          data: {
            id: nodeId,
            label: step.location?.name || nodeId,
            type: step.location?.type || 'location',
            image: imageUrl || '',
            description: step.location?.description,
            building: step.location?.building,
            floor: step.location?.floor,
            isStart,
            isEnd,
            isActive,
            isCurrent,
            step: step.step,
            fullLocation: step.location
          },
          position: position, // Set spatial position
          classes: [
            isStart ? 'start-node' : '',
            isEnd ? 'end-node' : '',
            isCurrent ? 'current-node' : '',
            isActive ? 'active-node' : 'inactive-node',
            hasImage ? 'has-image' : 'no-image'
          ].filter(Boolean).join(' ')
        });
      }
    });

    // Add edges between consecutive nodes in the path
    for (let i = 0; i < steps.length - 1; i++) {
      const sourceId = steps[i].locationId;
      const targetId = steps[i + 1].locationId;
      const instruction = steps[i + 1].instruction;
      const distance = steps[i + 1].distance;
      const direction = extractDirection(instruction);
      const isActive = i < currentStepIndex;

      elements.push({
        data: {
          id: `edge-${sourceId}-${targetId}`,
          source: sourceId,
          target: targetId,
          label: instruction,
          distance: distance,
          direction: direction,
          isActive
        },
        classes: isActive ? 'active-edge' : 'inactive-edge'
      });
    }

    return elements;
  };

  const elements = buildGraphElements();

  // Cytoscape stylesheet
  const stylesheet = [
    {
      selector: 'node',
      style: {
        'background-color': '#e0e0e0',
        'border-width': 1,
        'border-color': '#999',
        'label': 'data(label)',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'font-size': '10px',
        'color': '#333',
        'text-wrap': 'wrap',
        'text-max-width': '80px',
        'text-margin-y': 5,
        'width': 45,
        'height': 45,
        'background-image': 'data(image)',
        'background-fit': 'cover',
        'background-width': '100%',
        'background-height': '100%',
        'background-position-x': '50%',
        'background-position-y': '50%',
        'background-opacity': 1,
        'shape': 'ellipse'
      }
    },
    {
      selector: 'node.start-node',
      style: {
        'border-color': '#2E7D32',
        'border-width': 1.5,
        'width': 50,
        'height': 50,
        'border-style': 'solid'
      }
    },
    {
      selector: 'node.end-node',
      style: {
        'border-color': '#C62828',
        'border-width': 1.5,
        'width': 50,
        'height': 50,
        'border-style': 'solid'
      }
    },
    {
      selector: 'node.current-node',
      style: {
        'border-color': '#1565C0',
        'border-width': 2,
        'width': 55,
        'height': 55,
        'box-shadow': '0 0 20px #2196F3'
      }
    },
    {
      selector: 'node.active-node',
      style: {
        'opacity': 1
      }
    },
    {
      selector: 'node.inactive-node',
      style: {
        'opacity': 0.4
      }
    },
    {
      selector: 'node:active',
      style: {
        'overlay-color': '#8B2332',
        'overlay-padding': 8,
        'overlay-opacity': 0.2
      }
    },
    {
      selector: 'node.has-image',
      style: {
        'background-opacity': 1,
        'background-fit': 'cover',
        'background-width': '100%',
        'background-height': '100%',
        'background-position-x': '50%',
        'background-position-y': '50%'
      }
    },
    {
      selector: 'node.no-image',
      style: {
        'background-color': '#f5f5f5',
        'background-opacity': 1
      }
    },
    {
      selector: 'node.no-image.start-node',
      style: {
        'background-color': '#E8F5E9'
      }
    },
    {
      selector: 'node.no-image.end-node',
      style: {
        'background-color': '#FFEBEE'
      }
    },
    {
      selector: 'node.no-image.current-node',
      style: {
        'background-color': '#E3F2FD'
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 2.5,
        'line-color': '#ccc',
        'target-arrow-color': '#ccc',
        'target-arrow-shape': 'triangle',
        'curve-style': 'straight', // Use straight lines for spatial accuracy
        'label': 'data(label)',
        'font-size': '11px',
        'font-weight': 'bold',
        'text-rotation': 'autorotate',
        'text-background-color': '#ffffff',
        'text-background-opacity': 0.95,
        'text-background-padding': '5px',
        'text-background-shape': 'roundrectangle',
        'text-border-color': '#e0e0e0',
        'text-border-width': 1.5,
        'text-border-opacity': 0.8,
        'color': '#333',
        'arrow-scale': 1.3,
        'text-wrap': 'wrap',
        'text-max-width': '120px',
        'edge-text-rotation': 'autorotate'
      }
    },
    {
      selector: 'edge.active-edge',
      style: {
        'line-color': '#8B2332',
        'target-arrow-color': '#8B2332',
        'width': 4,
        'opacity': 1,
        'z-index': 10,
        'color': '#8B2332',
        'font-weight': 'bold'
      }
    },
    {
      selector: 'edge.inactive-edge',
      style: {
        'opacity': 0.3,
        'z-index': 1
      }
    },
    {
      selector: 'edge[direction = "vertical"]',
      style: {
        'line-style': 'dashed',
        'line-dash-pattern': [6, 3]
      }
    }
  ];

  // Layout configuration - use preset positions with spatial info
  const layout = {
    name: 'preset', // Use preset positions from our spatial calculations
    animate: true,
    animationDuration: 500,
    fit: true, // Fit the graph to viewport
    padding: 50 // Padding around the graph
  };

  // Handle node click
  const handleNodeTap = (event) => {
    const node = event.target;
    const nodeData = node.data();
    setSelectedNode(nodeData);
  };

  // Initialize Cytoscape instance
  useEffect(() => {
    if (cyRef.current && elements.length > 0) {
      cyRef.current.on('tap', 'node', handleNodeTap);
      
      // Add hover effects for better interactivity
      cyRef.current.on('mouseover', 'node', (event) => {
        event.target.style('cursor', 'pointer');
        const currentWidth = parseFloat(event.target.style('border-width')) || 1;
        event.target.style('border-width', currentWidth + 0.5);
      });
      
      cyRef.current.on('mouseout', 'node', (event) => {
        const baseWidth = event.target.hasClass('current-node') ? 2 : 
                         event.target.hasClass('start-node') || event.target.hasClass('end-node') ? 1.5 : 1;
        event.target.style('border-width', baseWidth);
      });
      
      // Fit to view with padding
      setTimeout(() => {
        cyRef.current.fit(null, 40);
        cyRef.current.center();
      }, 100);
    }
  }, [elements]);

  // Re-fit graph when current step changes
  useEffect(() => {
    if (cyRef.current && elements.length > 0) {
      const currentNode = cyRef.current.$(`node[step = ${currentStepIndex + 1}]`);
      if (currentNode.length > 0) {
        // Optionally center on current node (commented out to keep full view)
        // cyRef.current.animate({
        //   center: { eles: currentNode },
        //   zoom: 1.5
        // }, { duration: 500 });
      }
    }
  }, [currentStepIndex, elements]);

  // Auto-animate through steps
  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const resetAnimation = () => {
    setCurrentStepIndex(0);
  };

  if (!navigationData || steps.length === 0) {
    return <div className="graph-placeholder">No navigation data available</div>;
  }

  const currentStep = steps[currentStepIndex];

  return (
    <div className="graph-visualization">
      <div className="graph-header">
        <div className="header-left">
          <h3>Spatial Path Visualization</h3>
          <p className="header-subtitle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display: 'inline', verticalAlign: 'middle', marginRight: '4px'}}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Click on any location node to view full details and images
          </p>
        </div>
        <div className="graph-legend">
          <span className="legend-item start">Start</span>
          <span className="legend-item current">Current</span>
          <span className="legend-item end">End</span>
          <span className="legend-item vertical">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="5 12 12 19 19 12" />
            </svg>
            Elevator/Stairs
          </span>
        </div>
      </div>

      <div className="graph-container">
        <CytoscapeComponent
          elements={elements}
          style={{ width: '100%', height: '100%' }}
          stylesheet={stylesheet}
          layout={layout}
          cy={(cy) => { cyRef.current = cy; }}
          boxSelectionEnabled={false}
          userPanningEnabled={true}
          userZoomingEnabled={true}
          autoungrabify={false}
        />
        
        {/* Zoom controls */}
        <div className="zoom-controls">
          <button 
            className="zoom-btn" 
            onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.2)}
            title="Zoom in"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
            </svg>
          </button>
          <button 
            className="zoom-btn" 
            onClick={() => cyRef.current?.zoom(cyRef.current.zoom() / 1.2)}
            title="Zoom out"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35M8 11h6" />
            </svg>
          </button>
          <button 
            className="zoom-btn" 
            onClick={() => cyRef.current?.fit(null, 40)}
            title="Fit to view"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        </div>
      </div>

      <div className="graph-controls">
        <button 
          className="control-btn" 
          onClick={resetAnimation}
          title="Reset to start"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          </svg>
          Reset
        </button>
        <button 
          className="control-btn" 
          onClick={prevStep}
          disabled={currentStepIndex === 0}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Previous
        </button>
        <span className="step-indicator">
          Step {currentStepIndex + 1} of {steps.length}
        </span>
        <button 
          className="control-btn" 
          onClick={nextStep}
          disabled={currentStepIndex === steps.length - 1}
        >
          Next
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="current-step-info">
        <div className="step-header-row">
          <div className="step-badge">Step {currentStep.step}</div>
          {currentStepIndex < steps.length - 1 && (
            <div className={`direction-indicator ${extractDirection(steps[currentStepIndex + 1].instruction)}`}>
              {extractDirection(steps[currentStepIndex + 1].instruction) === 'right' && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              )}
              {extractDirection(steps[currentStepIndex + 1].instruction) === 'left' && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              )}
              {extractDirection(steps[currentStepIndex + 1].instruction) === 'straight' && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12l7-7 7 7" />
                </svg>
              )}
              {extractDirection(steps[currentStepIndex + 1].instruction) === 'vertical' && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 8v8M12 8v8M15 8v8" />
                </svg>
              )}
              <span className="direction-text">
                {extractDirection(steps[currentStepIndex + 1].instruction).replace('_', ' ')}
              </span>
            </div>
          )}
        </div>
        <p className="step-instruction">{currentStep.instruction}</p>
        <p className="step-meta">
          {currentStep.location?.building && `${currentStep.location.building} • `}
          {currentStep.distance > 0 && `${Math.round(currentStep.distance)}m`}
        </p>
      </div>

      {/* Image Modal */}
      {selectedNode && (
        <div className="image-modal-overlay" onClick={() => setSelectedNode(null)}>
          <div className="image-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedNode(null)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            
            <div className="modal-content">
              {selectedNode.image ? (
                <img src={selectedNode.image} alt={selectedNode.label} className="modal-image" />
              ) : (
                <div className="modal-no-image">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  <p>No image available</p>
                </div>
              )}
              
              <div className="modal-info">
                <div className="modal-header">
                  <h3>{selectedNode.label}</h3>
                  {selectedNode.step && (
                    <span className="modal-step-badge">Step {selectedNode.step}</span>
                  )}
                </div>
                {selectedNode.description && <p className="modal-description">{selectedNode.description}</p>}
                <div className="modal-details">
                  {selectedNode.building && (
                    <p className="modal-meta">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      </svg>
                      <strong>Building:</strong> {selectedNode.building}
                      {selectedNode.floor !== undefined && ` • Floor: ${selectedNode.floor}`}
                    </p>
                  )}
                  {selectedNode.type && (
                    <p className="modal-meta">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      </svg>
                      <strong>Type:</strong> {selectedNode.type}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GraphVisualization;
