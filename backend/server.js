require('dotenv').config();
const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const { connectDatabases, getMongoDb, neo4jDriver } = require('./config/database');
const { parseNavigationIntent } = require('./services/llmService');

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

    // Query Neo4j for shortest path using GDS Dijkstra's algorithm with weight-based pathfinding
    // Create a temporary named graph, run Dijkstra, then clean up
    const graphName = `temp_graph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let dijkstraResult;
    
    try {
      // Create temporary graph projection with weight property
      const createGraphQuery = `
        CALL gds.graph.project(
          $graphName,
          'Location',
          {
            CONNECTED_TO: {
              type: 'CONNECTED_TO',
              properties: {
                weight: {
                  property: 'weight',
                  defaultValue: 999999
                }
              }
            }
          }
        )
        YIELD graphName, nodeCount, relationshipCount
      `;
      
      await session.run(createGraphQuery, { graphName });
      
      // Run Dijkstra's algorithm on the projected graph
      const dijkstraQuery = `
        MATCH (start:Location {id: $startId}), (end:Location {id: $endId})
        CALL gds.shortestPath.dijkstra.stream($graphName, {
          sourceNode: id(start),
          targetNode: id(end),
          relationshipWeightProperty: 'weight'
        })
        YIELD path, totalCost
        WITH path, totalCost,
             [node in nodes(path) | node.id] as nodeIds,
             relationships(path) as pathRels
        WHERE size(pathRels) > 0
        WITH nodeIds, pathRels, totalCost,
             [i in range(0, size(pathRels) - 1) | {
               rel: pathRels[i],
               startNodeId: nodeIds[i],
               endNodeId: nodeIds[i + 1]
             }] as relInfo
        RETURN 
          nodeIds as locationIds, 
          [info in relInfo | info.rel] as rels,
          [info in relInfo | info.startNodeId] as relStartIds,
          [info in relInfo | info.endNodeId] as relEndIds,
          totalCost as totalWeight
        ORDER BY totalCost ASC
        LIMIT 1
      `;

      dijkstraResult = await session.run(dijkstraQuery, { startId, endId, graphName });
    } finally {
      // Always clean up: drop the temporary graph
      try {
        await session.run(`CALL gds.graph.drop($graphName, false) YIELD graphName`, { graphName });
      } catch (dropError) {
        // Ignore errors when dropping graph (it might not exist or already dropped)
        console.warn('Warning: Could not drop temporary graph:', dropError.message);
      }
    }

    // Check if path exists
    if (dijkstraResult.records.length === 0) {
      throw { 
        status: 404, 
        message: `No path found between '${startLocation.name}' and '${endLocation.name}'` 
      };
    }

    const record = dijkstraResult.records[0];
    const locationIds = record.get('locationIds');
    const rels = record.get('rels');
    const relStartIds = record.get('relStartIds');
    const relEndIds = record.get('relEndIds');
    const totalWeight = record.get('totalWeight') || 0;
    
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
    const pathData = await findNavigationPath(startId, endId);
    
    res.status(200).json({
      success: true,
      ...pathData
    });

  } catch (error) {
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
    const pathData = await findNavigationPath(startId, endId);
    
    res.status(200).json({
      success: true,
      ...pathData
    });

  } catch (error) {
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

    // Step 2: Validate that we have both start and end locations
    // If start or end are missing, return needsClarification so frontend can ask follow-ups
    if (!parsedIntent.start?.id || !parsedIntent.end?.id) {
      return res.status(200).json({
        success: false,
        needsClarification: true,
        message: 'Ambiguous request; follow-up required',
        parsedIntent: parsedIntent
      });
    }

    // Step 3: Generate navigation path
    const pathData = await findNavigationPath(parsedIntent.start.id, parsedIntent.end.id);

    res.status(200).json({
      success: true,
      parsedIntent: parsedIntent,
      navigation: pathData,
      originalQuery: query
    });

  } catch (error) {
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

