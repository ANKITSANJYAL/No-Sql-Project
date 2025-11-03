require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDatabases, getMongoDb, neo4jDriver } = require('./config/database');

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
    console.log('✅ Server ready with database connections (MongoDB & Neo4j)');
  } catch (error) {
    console.error('❌ Failed to connect to databases:', error);
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

    // Query Neo4j for shortest path
    const pathQuery = `
      MATCH path = shortestPath(
        (start:Location {id: $startId})-[:CONNECTED_TO*]-(end:Location {id: $endId})
      )
      RETURN 
        [node in nodes(path) | node.id] as locationIds,
        [rel in relationships(path) | rel.instructions] as instructions,
        [rel in relationships(path) | rel.distance] as distances,
        reduce(total = 0, rel in relationships(path) | total + rel.distance) as totalDistance
    `;

    const pathResult = await session.run(pathQuery, { startId, endId });

    // Check if path exists
    if (pathResult.records.length === 0 || pathResult.records[0].get('locationIds').length === 0) {
      throw { 
        status: 404, 
        message: `No path found between '${startLocation.name}' and '${endLocation.name}'` 
      };
    }

    const locationIds = pathResult.records[0].get('locationIds');
    const instructions = pathResult.records[0].get('instructions');
    const distances = pathResult.records[0].get('distances');
    const totalDistance = pathResult.records[0].get('totalDistance') || 0;

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
        const instruction = instructions[i - 1] || `Continue to ${location.name}`;
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

    // Calculate estimated time (assuming average walking speed of 1.2 m/s)
    const estimatedTimeSeconds = Math.ceil(totalDistance / 1.2);
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
  console.log(`🚀 RamsNavigator API server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
});

module.exports = app;

