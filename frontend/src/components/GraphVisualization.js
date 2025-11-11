import React, { useState, useRef, useEffect } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { getProxiedImageUrl } from '../config/api';
import '../styles/GraphVisualization.css';

function GraphVisualization({ navigationData, startLocation, endLocation, onNodeSelect }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const cyRef = useRef(null);
  const hasInitialZoomed = useRef(false);

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

        // Extract image URL the same way as DirectionPropertiesPanel
        const locationImages = step.location?.images || [];
        let imageUrl = '';
        if (locationImages.length > 0) {
          const firstImage = locationImages[0];
          // Handle both object with url property and direct string
          if (typeof firstImage === 'object' && firstImage !== null) {
            imageUrl = firstImage.url || '';
          } else if (typeof firstImage === 'string') {
            imageUrl = firstImage;
          }
        }
        
        // Convert GCP Storage URLs to proxy URLs to avoid CORS issues
        if (imageUrl) {
          imageUrl = getProxiedImageUrl(imageUrl);
        }
        
        const hasImage = !!imageUrl && imageUrl.trim() !== '';
        
        elements.push({
          data: {
            id: nodeId,
            label: step.location?.name || nodeId,
            type: step.location?.type || 'location',
            image: imageUrl || undefined, // Use undefined instead of empty string
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
      const isActive = true; // Always show all edges as active/visible
      const isPast = i < currentStepIndex; // Track if this step is already completed

      elements.push({
        data: {
          id: `edge-${sourceId}-${targetId}`,
          source: sourceId,
          target: targetId,
          label: instruction,
          distance: distance,
          direction: direction,
          isActive,
          isPast
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
        'background-image': 'data(image)',
        'background-color': 'transparent !important',
        'background-opacity': 1,
        'background-fit': 'cover',
        'background-width': '100%',
        'background-height': '100%',
        'background-position-x': '50%',
        'background-position-y': '50%',
        'background-clip': 'node',
        'background-repeat': 'no-repeat'
      }
    },
    {
      selector: 'node.no-image',
      style: {
        'background-color': '#f5f5f5',
        'background-opacity': 1,
        'background-image': 'none'
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
        'text-rotation': 'none',
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
        'text-max-width': '200px', // Increased from 120px to 200px to prevent overlap
        'edge-text-rotation': 'none'
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
        'z-index': 1,
        'label': '', // Hide label on inactive edges to reduce clutter
        'text-opacity': 0 // Make text invisible on inactive edges
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
    fit: false, // Don't auto-fit, we'll handle zoom manually
    padding: 50 // Padding around the graph
  };

  // Handle node click
  const handleNodeTap = (event) => {
    const node = event.target;
    const nodeData = node.data();
    if (onNodeSelect) {
      onNodeSelect(nodeData);
    }
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
      
      // Zoom into first 2 nodes only once on initial load
      if (!hasInitialZoomed.current && steps.length > 0) {
        hasInitialZoomed.current = true;
        setTimeout(() => {
          // Get first 2 nodes only
          const nodesToShow = Math.min(2, steps.length);
          const nodeIds = steps.slice(0, nodesToShow).map(s => s.locationId);
          
          // Select nodes by their data id
          const nodeSelector = nodeIds.map(id => `node[id = "${id}"]`).join(', ');
          const nodes = cyRef.current.$(nodeSelector);
          
          if (nodes.length > 0) {
            // Get bounding box of selected nodes
            const bbox = nodes.boundingBox();
            
            // Center and zoom to show these nodes with padding
            const centerX = (bbox.x1 + bbox.x2) / 2;
            const centerY = (bbox.y1 + bbox.y2) / 2;
            const width = bbox.x2 - bbox.x1;
            const height = bbox.y2 - bbox.y1;
            const maxDim = Math.max(width, height, 200); // Minimum dimension
            
            // Calculate zoom level to show nodes with padding
            const containerWidth = cyRef.current.width();
            const containerHeight = cyRef.current.height();
            const targetSize = Math.min(containerWidth, containerHeight) * 0.5; // Use 50% of container
            const zoom = Math.max(0.8, Math.min(targetSize / (maxDim + 150), 2)); // Add padding, cap at 2x, min 0.8x
            
            // Set zoom immediately without animation to prevent multiple zooms
            cyRef.current.center({ x: centerX, y: centerY });
            cyRef.current.zoom(zoom);
          }
        }, 300);
      }
      
      // Debug: Check node image data after graph is rendered
      setTimeout(() => {
        if (cyRef.current) {
          const allNodes = cyRef.current.nodes();
          allNodes.forEach(node => {
            const nodeData = node.data();
            const hasImageClass = node.hasClass('has-image');
            if (nodeData.image) {
              console.log(`Cytoscape Node ${nodeData.id}:`, {
                image: nodeData.image,
                hasImageClass,
                classes: node.classes()
              });
            }
          });
        }
      }, 500);
    }
  }, [elements]);

  // Reset zoom flag when navigation data changes
  useEffect(() => {
    hasInitialZoomed.current = false;
  }, [navigationData]);

  // Auto-select first node when navigation data loads
  useEffect(() => {
    if (steps.length > 0 && onNodeSelect && currentStepIndex === 0) {
      const step = steps[0];
      const nodeData = {
        id: step.locationId,
        label: step.location?.name || step.locationId,
        type: step.location?.type || 'location',
        image: (() => {
          const locationImages = step.location?.images || [];
          const rawUrl = locationImages.length > 0 
            ? (locationImages[0].url || locationImages[0])
            : '';
          return rawUrl ? getProxiedImageUrl(rawUrl) : '';
        })(),
        description: step.location?.description,
        building: step.location?.building,
        floor: step.location?.floor,
        step: step.step,
        fullLocation: step.location
      };
      onNodeSelect(nodeData);
    }
  }, [navigationData, steps.length]); // Only when navigation data first loads

  // Focus on current node when step changes (via Next/Previous buttons)
  useEffect(() => {
    if (cyRef.current && elements.length > 0 && hasInitialZoomed.current) {
      // Only focus if initial zoom has already happened (prevents interference)
      const currentNode = cyRef.current.$(`node[step = ${currentStepIndex + 1}]`);
      if (currentNode.length > 0) {
        // Fit the current node in view (keeps it visible without necessarily centering)
        cyRef.current.animate({
          fit: {
            eles: currentNode,
            padding: 100
          }
        }, { 
          duration: 600,
          easing: 'ease-out'
        });
      }
    }
  }, [currentStepIndex, elements]);

  // Auto-animate through steps
  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      const newIndex = currentStepIndex + 1;
      setCurrentStepIndex(newIndex);
      // Update selected node in parent component
      if (onNodeSelect && steps[newIndex]) {
        const step = steps[newIndex];
        const nodeData = {
          id: step.locationId,
          label: step.location?.name || step.locationId,
          type: step.location?.type || 'location',
          image: (() => {
          const locationImages = step.location?.images || [];
          const rawUrl = locationImages.length > 0 
            ? (locationImages[0].url || locationImages[0])
            : '';
          return rawUrl ? getProxiedImageUrl(rawUrl) : '';
        })(),
          description: step.location?.description,
          building: step.location?.building,
          floor: step.location?.floor,
          step: step.step,
          fullLocation: step.location
        };
        onNodeSelect(nodeData);
      }
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      const newIndex = currentStepIndex - 1;
      setCurrentStepIndex(newIndex);
      // Update selected node in parent component
      if (onNodeSelect && steps[newIndex]) {
        const step = steps[newIndex];
        const nodeData = {
          id: step.locationId,
          label: step.location?.name || step.locationId,
          type: step.location?.type || 'location',
          image: (() => {
          const locationImages = step.location?.images || [];
          const rawUrl = locationImages.length > 0 
            ? (locationImages[0].url || locationImages[0])
            : '';
          return rawUrl ? getProxiedImageUrl(rawUrl) : '';
        })(),
          description: step.location?.description,
          building: step.location?.building,
          floor: step.location?.floor,
          step: step.step,
          fullLocation: step.location
        };
        onNodeSelect(nodeData);
      }
    }
  };

  const resetAnimation = () => {
    setCurrentStepIndex(0);
    // Update selected node to first step
    if (onNodeSelect && steps.length > 0) {
      const step = steps[0];
      const nodeData = {
        id: step.locationId,
        label: step.location?.name || step.locationId,
        type: step.location?.type || 'location',
        image: (() => {
          const locationImages = step.location?.images || [];
          const rawUrl = locationImages.length > 0 
            ? (locationImages[0].url || locationImages[0])
            : '';
          return rawUrl ? getProxiedImageUrl(rawUrl) : '';
        })(),
        description: step.location?.description,
        building: step.location?.building,
        floor: step.location?.floor,
        step: step.step,
        fullLocation: step.location
      };
      onNodeSelect(nodeData);
    }
    // Zoom back to first 2 nodes when reset
    if (cyRef.current && steps.length > 0) {
      setTimeout(() => {
        const nodesToShow = Math.min(2, steps.length);
        const nodeIds = steps.slice(0, nodesToShow).map(s => s.locationId);
        const nodeSelector = nodeIds.map(id => `node[id = "${id}"]`).join(', ');
        const nodes = cyRef.current.$(nodeSelector);
        
        if (nodes.length > 0) {
          const bbox = nodes.boundingBox();
          const centerX = (bbox.x1 + bbox.x2) / 2;
          const centerY = (bbox.y1 + bbox.y2) / 2;
          const width = bbox.x2 - bbox.x1;
          const height = bbox.y2 - bbox.y1;
          const maxDim = Math.max(width, height, 200);
          const containerWidth = cyRef.current.width();
          const containerHeight = cyRef.current.height();
          const targetSize = Math.min(containerWidth, containerHeight) * 0.5;
          const zoom = Math.max(0.8, Math.min(targetSize / (maxDim + 150), 2));
          
          cyRef.current.animate({
            center: { x: centerX, y: centerY },
            zoom: zoom
          }, { duration: 600, easing: 'ease-out' });
        }
      }, 100);
    }
  };

  if (!navigationData || steps.length === 0) {
    return <div className="graph-placeholder">No navigation data available</div>;
  }

  const currentStep = steps[currentStepIndex];

  return (
    <div className="graph-visualization">
      <div className="graph-header">
        <div className="header-left">
          <h3>Path Visualization</h3>
          <p className="header-subtitle">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display: 'inline', verticalAlign: 'middle', marginRight: '4px'}}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Click nodes or use Next/Previous to navigate
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
    </div>
  );
}

export default GraphVisualization;
