require('dotenv').config();
const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const { connectDatabases, getMongoDb, neo4jDriver } = require('./config/database');
const { parseNavigationIntent } = require('./services/llmService');
const metricsService = require('./services/metricsService');
const dataValidationService = require('./services/dataValidationService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database connections
let db;
let neo4j;
(async () => {
  try {
    await connectDatabases();
    db = getMongoDb();
    neo4j = neo4jDriver;
    console.log('Server ready with database connections (MongoDB & Neo4j)');
  } catch (error) {
    console.error('Failed to connect to databases:', error);
    process.exit(1);
  }
})();

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * GET /api/locations/search?q=query
 * Search locations by name or description
 * NOTE: Must be defined BEFORE /api/locations/:id and /api/locations to avoid route conflict
 */
app.get('/api/locations/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Search query parameter "q" is required'
      });
    }

    const searchQuery = q.trim();

    // Create text search query - MongoDB text search on name and description
    // Note: This requires a text index. Alternative: regex search for flexibility
    // Using $or to search in both name and description fields
    const searchRegex = new RegExp(searchQuery, 'i'); // Case-insensitive

    const locations = await db.collection('locations')
      .find({
        $or: [
          { name: searchRegex },
          { description: searchRegex }
        ]
      })
      .project({
        _id: 1,
        name: 1,
        description: 1,
        building: 1,
        floor: 1,
        type: 1,
        amenities: 1,
        accessibility: 1,
        images: { $slice: 1 }
      })
      .sort({ name: 1 })
      .limit(50) // Limit results for performance
      .toArray();

    res.status(200).json({
      success: true,
      query: searchQuery,
      count: locations.length,
      data: locations
    });

  } catch (error) {
    console.error('Error searching locations:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to search locations'
    });
  }
});

/**
 * GET /api/locations
 * Get all locations (with optional pagination and filtering)
 * NOTE: Must be defined AFTER /api/locations/search but BEFORE /api/locations/:id
 */
app.get('/api/locations', async (req, res) => {
  try {
    const { building, floor, limit } = req.query;

    // Build query
    const query = {};
    if (building) {
      query.building = building;
    }
    if (floor !== undefined) {
      const floorNum = parseInt(floor, 10);
      query.floor = isNaN(floorNum) ? floor : floorNum;
    }

    // Use projection for optimization
    const locations = await db.collection('locations')
      .find(query)
      .project({
        _id: 1,
        name: 1,
        description: 1,
        building: 1,
        floor: 1,
        type: 1,
        amenities: 1,
        accessibility: 1,
        images: { $slice: 1 }
      })
      .sort({ building: 1, floor: 1, name: 1 })
      .limit(limit ? parseInt(limit, 10) : 1000) // Default limit 1000
      .toArray();

    res.status(200).json({
      success: true,
      count: locations.length,
      data: locations
    });

  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch locations'
    });
  }
});

/**
 * GET /api/locations/:id
 * Get full details for a specific location by ID
 */
app.get('/api/locations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Location ID is required'
      });
    }

    const location = await db.collection('locations').findOne({ _id: id });

    if (!location) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Location with ID '${id}' not found`
      });
    }

    res.status(200).json({
      success: true,
      data: location
    });

  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch location details'
    });
  }
});

/**
 * GET /api/locations/building/:building
 * Get all locations in a specific building
 */
app.get('/api/locations/building/:building', async (req, res) => {
  try {
    const { building } = req.params;

    if (!building || building.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Building name is required'
      });
    }

    // Use projection to optimize query - only return necessary fields
    const locations = await db.collection('locations')
      .find({ building: building })
      .project({
        _id: 1,
        name: 1,
        description: 1,
        building: 1,
        floor: 1,
        type: 1,
        amenities: 1,
        accessibility: 1,
        // Exclude large fields by default, include only primary image
        images: { $slice: 1 } // Only first image for list view
      })
      .sort({ floor: 1, name: 1 }) // Sort by floor then name
      .toArray();

    res.status(200).json({
      success: true,
      count: locations.length,
      data: locations
    });

  } catch (error) {
    console.error('Error fetching locations by building:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch locations'
    });
  }
});

/**
 * GET /api/locations/floor/:building/:floor
 * Get locations by building and floor
 */
app.get('/api/locations/floor/:building/:floor', async (req, res) => {
  try {
    const { building, floor } = req.params;

    if (!building || building.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Building name is required'
      });
    }

    // Parse floor as integer if possible, otherwise use string comparison
    const floorNum = parseInt(floor, 10);
    const floorQuery = isNaN(floorNum) ? floor : floorNum;

    // Use projection for optimization
    const locations = await db.collection('locations')
      .find({
        building: building,
        floor: floorQuery
      })
      .project({
        _id: 1,
        name: 1,
        description: 1,
        building: 1,
        floor: 1,
        type: 1,
        amenities: 1,
        accessibility: 1,
        images: { $slice: 1 }
      })
      .sort({ name: 1 })
      .toArray();

    res.status(200).json({
      success: true,
      count: locations.length,
      data: locations
    });

  } catch (error) {
    console.error('Error fetching locations by floor:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch locations'
    });
  }
});

/**
 * POST /api/locations/batch
 * Get multiple locations by array of IDs (for path enrichment)
 * Request body: { ids: ["id1", "id2", "id3", ...] }
 */
app.post('/api/locations/batch', async (req, res) => {
  try {
    const { ids } = req.body;

    // Validate input
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Request body must contain an array of location IDs: { "ids": ["id1", "id2", ...] }'
      });
    }

    // Filter out empty or invalid IDs
    const validIds = ids.filter(id => id && typeof id === 'string' && id.trim() !== '');

    if (validIds.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No valid location IDs provided'
      });
    }

    // Use $in operator for efficient batch query with projection
    const locations = await db.collection('locations')
      .find({ _id: { $in: validIds } })
      .project({
        _id: 1,
        name: 1,
        description: 1,
        building: 1,
        floor: 1,
        type: 1,
        amenities: 1,
        accessibility: 1,
        images: 1 // Include all images for path enrichment
      })
      .toArray();

    // Create a map for O(1) lookup
    const locationMap = {};
    locations.forEach(loc => {
      locationMap[loc._id] = loc;
    });

    // Return locations in the same order as requested IDs (if found)
    const orderedLocations = validIds
      .map(id => locationMap[id])
      .filter(loc => loc !== undefined); // Remove not found locations

    res.status(200).json({
      success: true,
      requested: validIds.length,
      found: locations.length,
      data: orderedLocations
    });

  } catch (error) {
    console.error('Error fetching batch locations:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch locations'
    });
  }
});

// ============================================================================
// IMAGE PROXY ENDPOINT (CORS fix for GCP Storage images)
// ============================================================================

/**
 * GET /api/images/proxy?url=<encoded_gcp_url>
 * Proxy images from GCP Storage to avoid CORS issues
 * Example: /api/images/proxy?url=https%3A%2F%2Fstorage.googleapis.com%2Frams-navigator-images%2Flocations%2Fimage.jpg
 */
app.get('/api/images/proxy', (req, res) => {
  console.log('Image proxy endpoint hit:', req.query);
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Image URL parameter is required'
    });
  }

  // Decode the URL
  let imageUrl;
  try {
    imageUrl = decodeURIComponent(url);
  } catch (error) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid URL encoding'
    });
  }

  // Validate that it's a GCP Storage URL (security measure)
  if (!imageUrl.startsWith('https://storage.googleapis.com/')) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Only GCP Storage URLs are allowed'
    });
  }

  // Use the appropriate HTTP module based on URL protocol
  const client = imageUrl.startsWith('https://') ? https : http;

  // Fetch the image from GCP Storage
  client.get(imageUrl, (imageResponse) => {
    // Check if request was successful
    if (imageResponse.statusCode !== 200) {
      console.error(`Failed to fetch image: ${imageUrl}, status: ${imageResponse.statusCode}`);
      return res.status(imageResponse.statusCode || 500).json({
        error: 'Failed to fetch image',
        message: `Failed to fetch image from GCP Storage: ${imageResponse.statusCode}`
      });
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Set content type from the original response or default to image
    const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    
    // Set cache headers (optional, for performance)
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

    // Pipe the image data to the response
    imageResponse.pipe(res);
  }).on('error', (error) => {
    console.error('Error proxying image:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to proxy image from GCP Storage'
      });
    }
  });
});

// ============================================================================
// NAVIGATION/PATHFINDING ENDPOINTS (Neo4j + MongoDB)
// ============================================================================

/**
 * Helper function to find navigation path between two locations
 * Combines Neo4j pathfinding with MongoDB location enrichment
 */
async function findNavigationPath(startId, endId) {
  const session = neo4j.session();
  
  try {
    // Check if locations exist in MongoDB
    const startLocation = await db.collection('locations').findOne({ _id: startId });
    const endLocation = await db.collection('locations').findOne({ _id: endId });

    if (!startLocation) {
      throw { status: 404, message: `Start location with ID '${startId}' not found` };
    }

    if (!endLocation) {
      throw { status: 404, message: `End location with ID '${endId}' not found` };
    }

    // If start and end are the same
    if (startId === endId) {
      const locationDetails = await db.collection('locations').findOne({ _id: startId });
      return {
        start: startId,
        end: endId,
        path: [startId],
        totalDistance: 0,
        estimatedTime: '0 min',
        steps: [
          {
            step: 1,
            locationId: startId,
            location: locationDetails,
            instruction: `You are already at ${locationDetails.name}`,
            distance: 0,
            cumulativeDistance: 0,
            type: 'start'
          }
        ],
        metadata: {
          startLocation: startLocation,
          endLocation: endLocation,
          totalSteps: 1,
          generatedAt: new Date().toISOString()
        }
      };
    }

    // Query Neo4j for shortest weighted path
    // Strategy: Use allShortestPaths (memory efficient) to get paths with minimum hops,
    // then select the one with the lowest total weight
    const pathQuery = `
      MATCH (start:Location {id: $startId}), (end:Location {id: $endId})
      MATCH path = allShortestPaths((start)-[:CONNECTED_TO*..15]-(end))
      WITH path, 
           relationships(path) as pathRels,
           reduce(totalWeight = 0, r in relationships(path) | totalWeight + coalesce(r.weight, 1)) as pathWeight
      ORDER BY pathWeight ASC, length(path) ASC
      LIMIT 1
      WITH path, pathWeight,
           [node in nodes(path) | node.id] as locationIds,
           pathRels
      WHERE size(pathRels) > 0
      WITH locationIds, pathRels, pathWeight,
           [i in range(0, size(pathRels) - 1) | {
             rel: pathRels[i],
             startNodeId: locationIds[i],
             endNodeId: locationIds[i + 1]
           }] as relInfo
      RETURN 
        locationIds, 
        [info in relInfo | info.rel] as rels,
        [info in relInfo | info.startNodeId] as relStartIds,
        [info in relInfo | info.endNodeId] as relEndIds,
        pathWeight as totalWeight
    `;

    const pathResult = await session.run(pathQuery, { startId, endId });

    // Check if path exists
    if (pathResult.records.length === 0) {
      throw { 
        status: 404, 
        message: `No path found between '${startLocation.name}' and '${endLocation.name}'` 
      };
    }

    const record = pathResult.records[0];
    const locationIds = record.get('locationIds');
    const rels = record.get('rels');
    const relStartIds = record.get('relStartIds');
    const relEndIds = record.get('relEndIds');
    
    // Query Neo4j to get relationship properties (distance, weight, instructions) for each relationship
    // When going from A to B: use forwardInstruction from (A)-[:CONNECTED_TO]->(B)
    // When going from B to A: use reverseInstruction from (B)-[:CONNECTED_TO]->(A)
    const relationshipPairs = relStartIds.map((startId, i) => [startId, relEndIds[i]]);
    
    // Query to get relationship properties (distance, weight, instructions) based on traversal direction
    const relationshipQuery = `
      UNWIND $pairs AS pair
      OPTIONAL MATCH (start:Location {id: pair[0]})-[rel:CONNECTED_TO]->(end:Location {id: pair[1]})
      WITH pair, rel.distance as distance, rel.weight as weight, rel.forwardInstruction as instruction
      OPTIONAL MATCH (start2:Location {id: pair[0]})<-[rel2:CONNECTED_TO]-(end2:Location {id: pair[1]})
      RETURN pair[0] as startId, pair[1] as endId, 
             COALESCE(distance, rel2.distance, 0) as distance,
             COALESCE(weight, rel2.weight, 0) as weight,
             COALESCE(instruction, rel2.reverseInstruction) as instruction
    `;
    
    const relationshipResult = await session.run(relationshipQuery, { pairs: relationshipPairs });
    
    // Create maps for relationship properties
    const distanceMap = {};
    const weightMap = {};
    const instructionMap = {};
    
    relationshipResult.records.forEach(rec => {
      const key = `${rec.get('startId')}->${rec.get('endId')}`;
      const distance = rec.get('distance');
      const weight = rec.get('weight');
      const instruction = rec.get('instruction');
      
      if (distance !== null && distance !== undefined) {
        distanceMap[key] = distance;
      }
      if (weight !== null && weight !== undefined) {
        weightMap[key] = weight;
      }
      if (instruction) {
        instructionMap[key] = instruction;
      }
    });
    
    // Extract distances, weights, and instructions based on the maps
    const distances = relStartIds.map((startId, i) => {
      const endId = relEndIds[i];
      const key = `${startId}->${endId}`;
      return distanceMap[key] || weightMap[key] || 0;
    });
    
    const totalDistance = distances.reduce((total, dist) => total + dist, 0);
    
    const instructions = relStartIds.map((startId, i) => {
      const endId = relEndIds[i];
      const key = `${startId}->${endId}`;
      return instructionMap[key] || null;
    });

    // Fetch all location details from MongoDB in batch (reusing same logic as batch endpoint)
    const locationDetails = await db.collection('locations')
      .find({ _id: { $in: locationIds } })
      .project({
        _id: 1,
        name: 1,
        description: 1,
        building: 1,
        floor: 1,
        type: 1,
        images: 1,
        amenities: 1,
        accessibility: 1
      })
      .toArray();

    // Create location map for quick lookup
    const locationMap = {};
    locationDetails.forEach(loc => {
      locationMap[loc._id] = loc;
    });

    // Build enriched path steps
    const steps = [];
    let cumulativeDistance = 0;

    for (let i = 0; i < locationIds.length; i++) {
      const locationId = locationIds[i];
      const location = locationMap[locationId];

      if (i === 0) {
        // First step - starting point
        steps.push({
          step: i + 1,
          locationId: locationId,
          location: location,
          instruction: `Start at ${location.name}`,
          distance: 0,
          cumulativeDistance: 0,
          type: 'start'
        });
      } else {
        // Subsequent steps with navigation instructions
        // Use the instruction from the relationship, or fallback to a generic message
        const instruction = instructions[i - 1] ;
        const stepDistance = distances[i - 1] || 0;
        cumulativeDistance += stepDistance;

        steps.push({
          step: i + 1,
          locationId: locationId,
          location: location,
          instruction: instruction,
          distance: stepDistance,
          cumulativeDistance: cumulativeDistance,
          type: i === locationIds.length - 1 ? 'destination' : 'waypoint'
        });
      }
    }

    // Calculate estimated time based on steps (more realistic for campus navigation)
    // Each step represents a location transition, taking ~40 seconds on average
    // This accounts for walking, orienting, reading signs, and brief pauses
    const secondsPerStep = 40;
    const numTransitions = Math.max(steps.length - 1, 1); // steps - 1 because first step is starting point
    const estimatedTimeSeconds = numTransitions * secondsPerStep;
    const estimatedTimeMinutes = Math.ceil(estimatedTimeSeconds / 60);
    const estimatedTime = estimatedTimeMinutes === 0 ? '< 1 min' : `${estimatedTimeMinutes} min`;

    return {
      start: startId,
      end: endId,
      path: locationIds,
      totalDistance: totalDistance,
      estimatedTime: estimatedTime,
      steps: steps,
      metadata: {
        startLocation: startLocation,
        endLocation: endLocation,
        totalSteps: steps.length,
        generatedAt: new Date().toISOString()
      }
    };
  } finally {
    await session.close();
  }
}

/**
 * GET /api/navigate?start=locationId&end=locationId
 * Find navigation path between two locations using Neo4j and enrich with MongoDB data
 */
app.get('/api/navigate', async (req, res) => {
  try {
    const { start, end } = req.query;

    // Validate input
    if (!start || start.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Start location ID is required (query parameter: start)'
      });
    }

    if (!end || end.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'End location ID is required (query parameter: end)'
      });
    }

    const startId = start.trim();
    const endId = end.trim();

    // Find path using helper function
    const startTime = Date.now();
    const pathData = await findNavigationPath(startId, endId);
    const duration = Date.now() - startTime;
    
    // Record metrics for manual navigation
    metricsService.recordNavigationQuery(startId, endId, true, duration);
    
    res.status(200).json({
      success: true,
      ...pathData
    });

  } catch (error) {
    // Record failed navigation
    const startId = req.query.start?.trim() || 'unknown';
    const endId = req.query.end?.trim() || 'unknown';
    metricsService.recordNavigationQuery(startId, endId, false, null, error.message);
    
    if (error.status) {
      return res.status(error.status).json({
        error: error.status === 404 ? 'Not Found' : 'Bad Request',
        message: error.message
      });
    }
    console.error('Error finding navigation path:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to find navigation path'
    });
  }
});

/**
 * POST /api/navigate
 * Find navigation path between two locations (alternative endpoint with POST body)
 * Request body: { start: "locationId", end: "locationId" }
 */
app.post('/api/navigate', async (req, res) => {
  try {
    const { start, end } = req.body;

    // Validate input
    if (!start || typeof start !== 'string' || start.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Start location ID is required in request body: { "start": "locationId", "end": "locationId" }'
      });
    }

    if (!end || typeof end !== 'string' || end.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'End location ID is required in request body: { "start": "locationId", "end": "locationId" }'
      });
    }

    const startId = start.trim();
    const endId = end.trim();

    // Find path using helper function
    const startTime = Date.now();
    const pathData = await findNavigationPath(startId, endId);
    const duration = Date.now() - startTime;
    
    // Record metrics
    metricsService.recordNavigationQuery(startId, endId, true, duration);
    
    res.status(200).json({
      success: true,
      ...pathData
    });

  } catch (error) {
    // Record failed navigation
    const startId = req.body.start?.trim() || 'unknown';
    const endId = req.body.end?.trim() || 'unknown';
    metricsService.recordNavigationQuery(startId, endId, false, null, error.message);
    
    if (error.status) {
      return res.status(error.status).json({
        error: error.status === 404 ? 'Not Found' : 'Bad Request',
        message: error.message
      });
    }
    console.error('Error finding navigation path:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to find navigation path'
    });
  }
});

/**
 * POST /api/navigate/optimal
 * Find optimal navigation path through multiple waypoints
 * Request body: { start: "locationId", waypoints: ["id1", "id2"], end: "locationId" }
 * This endpoint calculates all possible permutations and finds the shortest total path
 */
app.post('/api/navigate/optimal', async (req, res) => {
  try {
    const { start, waypoints, end } = req.body;

    // Validate input
    if (!start || typeof start !== 'string' || start.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Start location ID is required'
      });
    }

    if (!end || typeof end !== 'string' || end.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'End location ID is required'
      });
    }

    const startId = start.trim();
    const endId = end.trim();
    const waypointIds = Array.isArray(waypoints) ? waypoints.map(w => w.trim()).filter(Boolean) : [];

    // If no waypoints, just use direct path
    if (waypointIds.length === 0) {
      const startTime = Date.now();
      const pathData = await findNavigationPath(startId, endId);
      const duration = Date.now() - startTime;
      metricsService.recordNavigationQuery(startId, endId, true, duration);
      
      return res.status(200).json({
        success: true,
        ...pathData,
        optimization: {
          waypointsProvided: 0,
          optimalOrder: [],
          totalPermutationsChecked: 0
        }
      });
    }

    // Generate all permutations of waypoints to find optimal order
    const permutations = getPermutations(waypointIds);
    let bestPath = null;
    let bestDistance = Infinity;
    let bestOrder = null;

    // Try each permutation
    for (const permutation of permutations) {
      try {
        const fullRoute = [startId, ...permutation, endId];
        let totalDistance = 0;
        let isValidRoute = true;

        // Calculate total distance for this permutation
        for (let i = 0; i < fullRoute.length - 1; i++) {
          const segmentStart = fullRoute[i];
          const segmentEnd = fullRoute[i + 1];
          
          // Get path for this segment
          const segmentPath = await findNavigationPath(segmentStart, segmentEnd);
          totalDistance += segmentPath.totalDistance;
        }

        // Check if this is the best route so far
        if (totalDistance < bestDistance) {
          bestDistance = totalDistance;
          bestOrder = permutation;
        }
      } catch (err) {
        // This permutation failed, skip it
        console.warn(`Permutation ${permutation.join(' -> ')} failed:`, err.message);
        continue;
      }
    }

    // If no valid path found
    if (!bestOrder) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No valid path found through all waypoints'
      });
    }

    // Build the complete optimal path
    const optimalRoute = [startId, ...bestOrder, endId];
    const pathSegments = [];
    let cumulativeDistance = 0;

    for (let i = 0; i < optimalRoute.length - 1; i++) {
      const segmentStart = optimalRoute[i];
      const segmentEnd = optimalRoute[i + 1];
      const segmentPath = await findNavigationPath(segmentStart, segmentEnd);
      
      // Skip the first step of subsequent segments (duplicate location)
      const stepsToAdd = i > 0 ? segmentPath.steps.slice(1) : segmentPath.steps;
      pathSegments.push(...stepsToAdd);
    }

    // Renumber steps and recalculate cumulative distances
    cumulativeDistance = 0;
    pathSegments.forEach((step, index) => {
      step.step = index + 1;
      if (index > 0) {
        cumulativeDistance += step.distance || 0;
      }
      step.cumulativeDistance = cumulativeDistance;
    });

    // Calculate estimated time
    const totalSeconds = Math.ceil(cumulativeDistance / 1.2);
    const totalMinutes = Math.ceil(totalSeconds / 60);
    const estimatedTime = totalMinutes === 0 ? '< 1 min' : `${totalMinutes} min`;

    // Record metrics
    const duration = Date.now();
    metricsService.recordNavigationQuery(startId, endId, true, duration);

    res.status(200).json({
      success: true,
      start: startId,
      end: endId,
      path: pathSegments.map(s => s.locationId),
      totalDistance: cumulativeDistance,
      estimatedTime: estimatedTime,
      steps: pathSegments,
      metadata: {
        startLocation: pathSegments[0]?.location,
        endLocation: pathSegments[pathSegments.length - 1]?.location,
        totalSteps: pathSegments.length,
        generatedAt: new Date().toISOString()
      },
      optimization: {
        waypointsProvided: waypointIds.length,
        optimalOrder: bestOrder,
        totalPermutationsChecked: permutations.length,
        routeSequence: optimalRoute.map(id => {
          const step = pathSegments.find(s => s.locationId === id);
          return { id, name: step?.location?.name || id };
        })
      }
    });

  } catch (error) {
    console.error('Error finding optimal navigation path:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to find optimal navigation path'
    });
  }
});

// Helper function to generate all permutations of an array
function getPermutations(array) {
  if (array.length === 0) return [[]];
  if (array.length === 1) return [array];
  
  const result = [];
  for (let i = 0; i < array.length; i++) {
    const current = array[i];
    const remaining = array.slice(0, i).concat(array.slice(i + 1));
    const remainingPerms = getPermutations(remaining);
    for (const perm of remainingPerms) {
      result.push([current, ...perm]);
    }
  }
  return result;
}

// ============================================================================
// AI CHAT / LLM ENDPOINTS
// ============================================================================

/**
 * POST /api/chat/parse-intent
 * Parse natural language navigation query using LLM
 * Request body: { query: "I am at the main gate, I want to borrow some books" }
 */
app.post('/api/chat/parse-intent', async (req, res) => {
  try {
    const { query } = req.body;

    // Validate input
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Query is required in request body: { "query": "your navigation request" }'
      });
    }

    // Fetch all locations to provide context to LLM
    const locations = await db.collection('locations')
      .find({})
      .project({
        _id: 1,
        name: 1,
        type: 1,
        building: 1,
        floor: 1,
        amenities: 1
      })
      .toArray();

    if (locations.length === 0) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'No locations available in database. Please seed the database first.'
      });
    }

    // Parse intent using LLM
    const parsedIntent = await parseNavigationIntent(query, locations);

    // Enrich with full location details if IDs were found
    if (parsedIntent.start?.id) {
      const startDetails = await db.collection('locations').findOne({ _id: parsedIntent.start.id });
      if (startDetails) {
        parsedIntent.start.details = startDetails;
      }
    }

    if (parsedIntent.end?.id) {
      const endDetails = await db.collection('locations').findOne({ _id: parsedIntent.end.id });
      if (endDetails) {
        parsedIntent.end.details = endDetails;
      }
    }

    res.status(200).json({
      success: true,
      data: parsedIntent
    });

  } catch (error) {
    console.error('Error parsing intent:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to parse navigation intent',
      details: error.message
    });
  }
});

/**
 * POST /api/chat/navigate
 * Complete chat-to-navigation pipeline
 * Parses intent with LLM, then generates navigation path
 * Request body: { query: "I am at the main gate, I want to borrow some books" }
 */
app.post('/api/chat/navigate', async (req, res) => {
  try {
    const { query } = req.body;

    // Validate input
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Query is required in request body: { "query": "your navigation request" }'
      });
    }

    // Step 1: Parse intent using LLM
    const locations = await db.collection('locations')
      .find({})
      .project({
        _id: 1,
        name: 1,
        type: 1,
        building: 1,
        floor: 1,
        amenities: 1
      })
      .toArray();

    const parsedIntent = await parseNavigationIntent(query, locations);
    
    // Record LLM parse attempt
    const usedFallback = parsedIntent.model === 'fallback-parser';
    const isAmbiguous = !parsedIntent.start?.id || !parsedIntent.end?.id;
    metricsService.recordLLMParse(true, usedFallback, isAmbiguous, query);

    // Step 2: Validate that we have both start and end locations
    // If start or end are missing, return needsClarification so frontend can ask follow-ups
    if (isAmbiguous) {
      return res.status(200).json({
        success: false,
        needsClarification: true,
        message: 'Ambiguous request; follow-up required',
        parsedIntent: parsedIntent
      });
    }

    // Step 3: Generate navigation path
    // Check if waypoints are present and valid
    const hasWaypoints = parsedIntent.waypoints && Array.isArray(parsedIntent.waypoints) && parsedIntent.waypoints.length > 0;
    
    if (hasWaypoints) {
      // Use optimal waypoint routing
      const waypointIds = parsedIntent.waypoints.map(w => w.id).filter(Boolean);
      
      if (waypointIds.length > 0) {
        const startTime = Date.now();
        
        try {
          // Generate all permutations to find optimal order
          const permutations = getPermutations(waypointIds);
          let bestDistance = Infinity;
          let bestOrder = null;

          // Try each permutation
          for (const permutation of permutations) {
            try {
              const fullRoute = [parsedIntent.start.id, ...permutation, parsedIntent.end.id];
              let totalDistance = 0;

              // Calculate total distance for this permutation
              for (let i = 0; i < fullRoute.length - 1; i++) {
                const segmentPath = await findNavigationPath(fullRoute[i], fullRoute[i + 1]);
                totalDistance += segmentPath.totalDistance;
              }

              if (totalDistance < bestDistance) {
                bestDistance = totalDistance;
                bestOrder = permutation;
              }
            } catch (err) {
              continue;
            }
          }

          if (bestOrder) {
            // Build the complete optimal path
            const optimalRoute = [parsedIntent.start.id, ...bestOrder, parsedIntent.end.id];
            const pathSegments = [];
            let cumulativeDistance = 0;

            for (let i = 0; i < optimalRoute.length - 1; i++) {
              const segmentPath = await findNavigationPath(optimalRoute[i], optimalRoute[i + 1]);
              const stepsToAdd = i > 0 ? segmentPath.steps.slice(1) : segmentPath.steps;
              pathSegments.push(...stepsToAdd);
            }

            // Renumber steps
            cumulativeDistance = 0;
            pathSegments.forEach((step, index) => {
              step.step = index + 1;
              if (index > 0) {
                cumulativeDistance += step.distance || 0;
              }
              step.cumulativeDistance = cumulativeDistance;
            });

            const totalSeconds = Math.ceil(cumulativeDistance / 1.2);
            const totalMinutes = Math.ceil(totalSeconds / 60);
            const estimatedTime = totalMinutes === 0 ? '< 1 min' : `${totalMinutes} min`;

            const duration = Date.now() - startTime;
            metricsService.recordNavigationQuery(parsedIntent.start.id, parsedIntent.end.id, true, duration);

            return res.status(200).json({
              success: true,
              parsedIntent: parsedIntent,
              navigation: {
                start: parsedIntent.start.id,
                end: parsedIntent.end.id,
                path: pathSegments.map(s => s.locationId),
                totalDistance: cumulativeDistance,
                estimatedTime: estimatedTime,
                steps: pathSegments,
                metadata: {
                  startLocation: pathSegments[0]?.location,
                  endLocation: pathSegments[pathSegments.length - 1]?.location,
                  totalSteps: pathSegments.length,
                  generatedAt: new Date().toISOString()
                }
              },
              optimization: {
                waypointsProvided: waypointIds.length,
                optimalOrder: bestOrder,
                totalPermutationsChecked: permutations.length,
                routeSequence: optimalRoute.map(id => {
                  const step = pathSegments.find(s => s.locationId === id);
                  return { id, name: step?.location?.name || id };
                })
              },
              originalQuery: query,
              waypointsUsed: true
            });
          }
        } catch (err) {
          console.warn('Waypoint optimization failed, falling back to direct path:', err.message);
        }
      }
    }
    
    // No waypoints or waypoint routing failed - use direct path
    const startTime = Date.now();
    const pathData = await findNavigationPath(parsedIntent.start.id, parsedIntent.end.id);
    const duration = Date.now() - startTime;
    
    // Record successful navigation
    metricsService.recordNavigationQuery(parsedIntent.start.id, parsedIntent.end.id, true, duration);

    res.status(200).json({
      success: true,
      parsedIntent: parsedIntent,
      navigation: pathData,
      originalQuery: query,
      waypointsUsed: false
    });

  } catch (error) {
    // Record failed LLM parse
    metricsService.recordLLMParse(false, false, false, req.body.query || '', error.message);
    
    // Check if it's a rate limiting error
    if (error.message && (error.message.includes('rate-limited') || error.message.includes('429'))) {
      return res.status(503).json({
        success: false,
        error: 'Service Temporarily Unavailable',
        message: 'The AI navigation assistant is temporarily unavailable due to rate limiting. Please use the Manual Entry page or try again in a few moments.',
        suggestion: 'Use Manual Entry for immediate navigation',
        needsClarification: true
      });
    }
    
    if (error.status) {
      return res.status(error.status).json({
        error: error.status === 404 ? 'Not Found' : 'Bad Request',
        message: error.message
      });
    }
    console.error('Error in chat navigation:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process navigation request',
      details: error.message
    });
  }
});

// ============================================================================
// EVALUATION & ADMIN ENDPOINTS
// ============================================================================

/**
 * GET /api/metrics
 * Get current system metrics
 */
app.get('/api/metrics', (req, res) => {
  try {
    const metrics = metricsService.getMetrics();
    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve metrics'
    });
  }
});

/**
 * GET /api/metrics/export
 * Export full metrics data (including raw data)
 */
app.get('/api/metrics/export', (req, res) => {
  try {
    const metricsExport = metricsService.exportMetrics();
    res.status(200).json({
      success: true,
      data: metricsExport
    });
  } catch (error) {
    console.error('Error exporting metrics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to export metrics'
    });
  }
});

/**
 * POST /api/metrics/reset
 * Reset all metrics (useful for testing)
 */
app.post('/api/metrics/reset', (req, res) => {
  try {
    metricsService.reset();
    res.status(200).json({
      success: true,
      message: 'Metrics have been reset'
    });
  } catch (error) {
    console.error('Error resetting metrics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reset metrics'
    });
  }
});

/**
 * GET /api/admin/validate
 * Validate data synchronization between Neo4j and MongoDB
 */
app.get('/api/admin/validate', async (req, res) => {
  try {
    const validation = await dataValidationService.validateDataSync();
    res.status(200).json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error validating data:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to validate data synchronization',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/graph-stats
 * Get statistics about the navigation graph
 */
app.get('/api/admin/graph-stats', async (req, res) => {
  try {
    const stats = await dataValidationService.getGraphStatistics();
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting graph statistics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve graph statistics',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/test-navigation
 * Test navigation accuracy with predefined test cases
 */
app.get('/api/admin/test-navigation', async (req, res) => {
  try {
    const testResults = await dataValidationService.testNavigationAccuracy();
    res.status(200).json({
      success: true,
      data: testResults
    });
  } catch (error) {
    console.error('Error testing navigation:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to test navigation accuracy',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'RamsNavigator API is running',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to list all registered routes (development only)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug/routes', (req, res) => {
    const routes = [];
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase()).join(', ');
        routes.push(`${methods} ${middleware.route.path}`);
      } else if (middleware.name === 'router') {
        middleware.handle.stack.forEach((handler) => {
          if (handler.route) {
            const methods = Object.keys(handler.route.methods).map(m => m.toUpperCase()).join(', ');
            routes.push(`${methods} ${handler.route.path}`);
          }
        });
      }
    });
    res.json({
      routes: routes.sort(),
      total: routes.length
    });
  });
}

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`RamsNavigator API server running on http://localhost:${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
});

module.exports = app;

