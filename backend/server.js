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

/**
 * GET /api/locations/search?q=query
 * Search locations by name or description
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'RamsNavigator API is running',
    timestamp: new Date().toISOString()
  });
});

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

