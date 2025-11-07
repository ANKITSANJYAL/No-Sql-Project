# RamsNavigator API Documentation

Complete API reference and testing guide for all endpoints in the RamsNavigator system.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Base URL & Authentication](#base-url--authentication)
3. [Location Endpoints](#location-endpoints)
4. [Navigation Endpoints](#navigation-endpoints)
5. [Utility Endpoints](#utility-endpoints)
6. [Testing Guide](#testing-guide)
7. [Error Handling](#error-handling)

---

## Quick Start

### Prerequisites

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Environment Setup**
   Create a `.env` file with:
   ```env
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DATABASE=rams_navigator
   NEO4J_URI=neo4j://localhost:7687
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=your_password
   PORT=3001
   ```

3. **Seed Databases**
   ```bash
   # Seed MongoDB with location data
   node data/seed-mongodb.js
   
   # Seed Neo4j with navigation graph
   node data/seed-neo4j.js
   ```

4. **Start Server**
   ```bash
   npm start
   ```
   Server runs on `http://localhost:3001`

---

## Base URL & Authentication

**Base URL:** `http://localhost:3001/api`

**Authentication:** Currently none (add if needed for production)

**Content-Type:** `application/json` for POST requests

---

## Location Endpoints

### 1. Get All Locations

Get all locations from the database with optional filtering by building and floor.

**Endpoint:** `GET /api/locations`

**Query Parameters:**
- `building` (optional) - Filter by building name
- `floor` (optional) - Filter by floor number
- `limit` (optional) - Limit number of results (default: 1000)

**Example Request:**
```bash
# Get all locations
curl -X GET http://localhost:3001/api/locations

# Get all locations in a specific building
curl -X GET "http://localhost:3001/api/locations?building=Lowenstein%20Center"

# Get all locations with limit
curl -X GET "http://localhost:3001/api/locations?limit=50"

# Get all locations on a specific floor of a building
curl -X GET "http://localhost:3001/api/locations?building=Lowenstein%20Center&floor=8"
```

**Example Response (200 OK):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "lowenstein_entrance",
      "name": "Lowenstein Center Main Entrance",
      "description": "Main entrance to Lowenstein Center",
      "building": "Lowenstein Center",
      "floor": 1,
      "type": "entrance",
      "amenities": ["security_desk", "automatic_doors"],
      "accessibility": {
        "wheelchair_accessible": true,
        "automatic_doors": true,
        "elevator_nearby": true
      },
      "images": [...]
    }
    // ... more locations
  ]
}
```

**Features:**
- Returns all locations by default
- Supports optional filtering by building and/or floor
- Results sorted by building, floor, then name
- Uses projections for optimal performance
- Default limit of 1000 locations

**Use Cases:**
- Populating location dropdowns in frontend
- Getting initial location list for autocomplete
- Filtering locations by building or floor

---

### 2. Get Location by ID

Get full details for a specific location.

**Endpoint:** `GET /api/locations/:id`

**Parameters:**
- `id` (path parameter) - Location ID (e.g., `lowenstein_ll817`)

**Example Request:**
```bash
curl -X GET http://localhost:3001/api/locations/lowenstein_ll817
```

**Example Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "lowenstein_ll817",
    "name": "Classroom LL-817",
    "description": "Large lecture classroom with 50 seats",
    "building": "Lowenstein Center",
    "floor": 8,
    "type": "classroom",
    "images": [
      {
        "url": "/images/ll817_entrance.jpg",
        "alt_text": "Classroom entrance door",
        "orientation": "west",
        "is_primary": true
      }
    ],
    "amenities": ["projector", "whiteboard", "computer"],
    "accessibility": {
      "wheelchair_accessible": true
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing or empty ID
- `404 Not Found` - Location doesn't exist

---

### 3. Get Locations by Building

Get all locations in a specific building.

**Endpoint:** `GET /api/locations/building/:building`

**Parameters:**
- `building` (path parameter) - Building name (URL encoded if spaces, e.g., `Lowenstein%20Center`)

**Example Request:**
```bash
curl -X GET "http://localhost:3001/api/locations/building/Lowenstein%20Center"
```

**Example Response (200 OK):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "lowenstein_entrance",
      "name": "Lowenstein Center Main Entrance",
      "description": "Main entrance to Lowenstein Center",
      "building": "Lowenstein Center",
      "floor": 1,
      "type": "entrance",
      "amenities": ["security_desk", "automatic_doors"],
      "accessibility": {
        "wheelchair_accessible": true,
        "automatic_doors": true,
        "elevator_nearby": true
      },
      "images": [...]
    }
    // ... more locations
  ]
}
```

**Features:**
- Results sorted by floor (ascending), then name
- Only primary image included (optimized for list view)
- Returns count of locations found

---

### 4. Get Locations by Building and Floor

Get all locations on a specific floor of a building.

**Endpoint:** `GET /api/locations/floor/:building/:floor`

**Parameters:**
- `building` (path parameter) - Building name
- `floor` (path parameter) - Floor number (numeric or string)

**Example Request:**
```bash
curl -X GET "http://localhost:3001/api/locations/floor/Lowenstein%20Center/8"
```

**Example Response (200 OK):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "lowenstein_floor8_lobby",
      "name": "Lowenstein 8th Floor Lobby",
      "description": "8th floor landing area near elevators",
      "building": "Lowenstein Center",
      "floor": 8,
      "type": "lobby",
      "amenities": ["seating", "water_fountain"],
      "accessibility": {...},
      "images": [...]
    },
    {
      "_id": "lowenstein_ll817",
      "name": "Classroom LL-817",
      ...
    }
  ]
}
```

---

### 5. Batch Get Locations

Get multiple locations by providing an array of IDs. Useful for enriching path data or fetching custom location lists.

**Endpoint:** `POST /api/locations/batch`

**Request Body:**
```json
{
  "ids": ["lowenstein_entrance", "lowenstein_lobby_1", "lowenstein_elevator_bank_a"]
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3001/api/locations/batch \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["lowenstein_entrance", "lowenstein_lobby_1", "lowenstein_elevator_bank_a"]
  }'
```

**Example Response (200 OK):**
```json
{
  "success": true,
  "requested": 3,
  "found": 3,
  "data": [
    {
      "_id": "lowenstein_entrance",
      "name": "Lowenstein Center Main Entrance",
      "description": "Main entrance to Lowenstein Center",
      "building": "Lowenstein Center",
      "floor": 1,
      "type": "entrance",
      "amenities": [...],
      "accessibility": {...},
      "images": [...]
    }
    // ... more locations in same order as requested IDs
  ]
}
```

**Features:**
- Returns locations in the same order as requested IDs
- Includes all images (not just primary)
- Reports requested vs found counts

---

### 6. Search Locations

Search locations by name or description using case-insensitive regex matching.

**Endpoint:** `GET /api/locations/search?q=query`

**Parameters:**
- `q` (query parameter) - Search query string

**Example Request:**
```bash
curl -X GET "http://localhost:3001/api/locations/search?q=classroom"
```

**Example Response (200 OK):**
```json
{
  "success": true,
  "query": "classroom",
  "count": 1,
  "data": [
    {
      "_id": "lowenstein_ll817",
      "name": "Classroom LL-817",
      "description": "Large lecture classroom with 50 seats",
      "building": "Lowenstein Center",
      "floor": 8,
      "type": "classroom",
      "amenities": [...],
      "accessibility": {...},
      "images": [...]
    }
  ]
}
```

**Features:**
- Searches both `name` and `description` fields
- Case-insensitive matching
- Results limited to 50 for performance
- Sorted alphabetically by name

**Important:** This endpoint must be defined before `/api/locations/:id` in the route configuration to avoid conflicts (where "search" would be treated as a location ID).

**Example Searches:**
```bash
# Search for "lobby"
curl "http://localhost:3001/api/locations/search?q=lobby"

# Search for "elevator"
curl "http://localhost:3001/api/locations/search?q=elevator"

# Search for "Lowenstein"
curl "http://localhost:3001/api/locations/search?q=Lowenstein"
```

---

## Navigation Endpoints

### 7. Get Navigation Path (GET)

Find the shortest navigation path between two locations using Neo4j pathfinding and enrich with MongoDB location details.

**Endpoint:** `GET /api/navigate?start=locationId&end=locationId`

**Parameters:**
- `start` (query parameter) - Start location ID
- `end` (query parameter) - End location ID

**Example Request:**
```bash
curl -X GET "http://localhost:3001/api/navigate?start=lowenstein_entrance&end=lowenstein_ll817"
```

**Example Response (200 OK):**
```json
{
  "success": true,
  "start": "lowenstein_entrance",
  "end": "lowenstein_ll817",
  "path": [
    "lowenstein_entrance",
    "lowenstein_lobby_1",
    "lowenstein_elevator_bank_a",
    "lowenstein_floor8_lobby",
    "lowenstein_ll817"
  ],
  "totalDistance": 75,
  "estimatedTime": "1 min",
  "steps": [
    {
      "step": 1,
      "locationId": "lowenstein_entrance",
      "location": {
        "_id": "lowenstein_entrance",
        "name": "Lowenstein Center Main Entrance",
        "description": "Main entrance to Lowenstein Center",
        "building": "Lowenstein Center",
        "floor": 1,
        "type": "entrance",
        "images": [...],
        "amenities": [...],
        "accessibility": {...}
      },
      "instruction": "Start at Lowenstein Center Main Entrance",
      "distance": 0,
      "cumulativeDistance": 0,
      "type": "start"
    },
    {
      "step": 2,
      "locationId": "lowenstein_lobby_1",
      "location": {...},
      "instruction": "Walk straight through the main entrance",
      "distance": 10,
      "cumulativeDistance": 10,
      "type": "waypoint"
    },
    {
      "step": 3,
      "locationId": "lowenstein_elevator_bank_a",
      "location": {...},
      "instruction": "Turn right towards the elevator bank",
      "distance": 15,
      "cumulativeDistance": 25,
      "type": "waypoint"
    },
    {
      "step": 4,
      "locationId": "lowenstein_floor8_lobby",
      "location": {...},
      "instruction": "Take elevator to 8th floor",
      "distance": 30,
      "cumulativeDistance": 55,
      "type": "waypoint"
    },
    {
      "step": 5,
      "locationId": "lowenstein_ll817",
      "location": {...},
      "instruction": "Walk down the corridor, room is on your left",
      "distance": 20,
      "cumulativeDistance": 75,
      "type": "destination"
    }
  ],
  "metadata": {
    "startLocation": {...},
    "endLocation": {...},
    "totalSteps": 5,
    "generatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Features:**
- Uses Neo4j `shortestPath` algorithm for optimal routing
- Enriches each step with full MongoDB location details
- Provides turn-by-turn navigation instructions
- Calculates total distance and estimated walking time
- Handles edge cases (same start/end location)

**Error Responses:**
- `400 Bad Request` - Missing start or end parameter
- `404 Not Found` - Location doesn't exist or no path found

---

### 8. Get Navigation Path (POST)

Alternative endpoint for navigation using POST body instead of query parameters.

**Endpoint:** `POST /api/navigate`

**Request Body:**
```json
{
  "start": "lowenstein_entrance",
  "end": "lowenstein_ll817"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3001/api/navigate \
  -H "Content-Type: application/json" \
  -d '{
    "start": "lowenstein_entrance",
    "end": "lowenstein_ll817"
  }'
```

**Example Response (200 OK):**
Same as GET endpoint above.

**Use Case:** Preferred for programmatic access or when using libraries that don't handle query parameters well.

---

## Utility Endpoints

### 9. Health Check

Check if the API server is running and healthy.

**Endpoint:** `GET /api/health`

**Example Request:**
```bash
curl -X GET http://localhost:3001/api/health
```

**Example Response (200 OK):**
```json
{
  "success": true,
  "message": "RamsNavigator API is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Use Case:** 
- Health monitoring
- Load balancer health checks
- Deployment verification

---

### 10. Debug Routes (Development Only)

List all registered API routes. **Only available in development mode** (when `NODE_ENV !== 'production'`).

**Endpoint:** `GET /api/debug/routes`

**Example Request:**
```bash
curl -X GET http://localhost:3001/api/debug/routes
```

**Example Response (200 OK):**
```json
{
  "routes": [
    "GET /api/debug/routes",
    "GET /api/health",
    "GET /api/locations",
    "GET /api/locations/building/:building",
    "GET /api/locations/floor/:building/:floor",
    "GET /api/locations/search",
    "GET /api/locations/:id",
    "GET /api/navigate",
    "POST /api/locations/batch",
    "POST /api/navigate"
  ],
  "total": 10
}
```

**Use Case:**
- Development debugging
- Verifying route registration
- API discovery during development

**Note:** This endpoint is automatically disabled in production environments.

---

## Testing Guide

### Testing with cURL

All endpoints can be tested using cURL commands. Examples are provided in each endpoint section above.

### Testing with Postman

1. **Import Collection:**
   - Create a new collection in Postman
   - Add requests for each endpoint
   - Set base URL: `http://localhost:3001/api`

2. **Example Setup:**
   ```
   Collection: RamsNavigator API
   ├── Location Endpoints
   │   ├── Get All Locations
   │   ├── Get Location by ID
   │   ├── Get Locations by Building
   │   ├── Get Locations by Floor
   │   ├── Batch Get Locations
   │   └── Search Locations
   ├── Navigation Endpoints
   │   ├── GET Navigate
   │   └── POST Navigate
   └── Utility
       ├── Health Check
       └── Debug Routes (dev only)
   ```

### Testing with JavaScript/Node.js

```javascript
const API_BASE = 'http://localhost:3001/api';

// Example: Get all locations
async function getAllLocations(building, floor, limit) {
  const params = new URLSearchParams();
  if (building) params.append('building', building);
  if (floor) params.append('floor', floor);
  if (limit) params.append('limit', limit);
  const url = `${API_BASE}/locations${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url);
  const result = await response.json();
  return result;
}

// Example: Get location by ID
async function getLocation(id) {
  const response = await fetch(`${API_BASE}/locations/${id}`);
  const result = await response.json();
  return result;
}

// Example: Search locations
async function searchLocations(query) {
  const response = await fetch(
    `${API_BASE}/locations/search?q=${encodeURIComponent(query)}`
  );
  const result = await response.json();
  return result;
}

// Example: Get navigation path
async function getNavigationPath(start, end) {
  const response = await fetch(
    `${API_BASE}/navigate?start=${start}&end=${end}`
  );
  const result = await response.json();
  return result;
}

// Example: Batch fetch locations
async function batchGetLocations(ids) {
  const response = await fetch(`${API_BASE}/locations/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  });
  const result = await response.json();
  return result;
}

// Usage
(async () => {
  try {
    // Get all locations
    const allLocations = await getAllLocations();
    console.log(`Found ${allLocations.count} locations`);

    // Get a location
    const location = await getLocation('lowenstein_ll817');
    console.log('Location:', location.data);

    // Search locations
    const searchResults = await searchLocations('classroom');
    console.log('Search results:', searchResults.data);

    // Get navigation path
    const path = await getNavigationPath(
      'lowenstein_entrance',
      'lowenstein_ll817'
    );
    console.log('Path steps:', path.steps);
    console.log('Total distance:', path.totalDistance);

    // Batch fetch
    const locations = await batchGetLocations([
      'lowenstein_entrance',
      'lowenstein_lobby_1'
    ]);
    console.log('Batch locations:', locations.data);
  } catch (error) {
    console.error('Error:', error);
  }
})();
```

### Testing with Python

```python
import requests

API_BASE = "http://localhost:3001/api"

# Example: Get all locations
def get_all_locations(building=None, floor=None, limit=None):
    params = {}
    if building:
        params['building'] = building
    if floor:
        params['floor'] = floor
    if limit:
        params['limit'] = limit
    response = requests.get(f"{API_BASE}/locations", params=params)
    response.raise_for_status()
    return response.json()

# Example: Get location by ID
def get_location(location_id):
    response = requests.get(f"{API_BASE}/locations/{location_id}")
    response.raise_for_status()
    return response.json()

# Example: Search locations
def search_locations(query):
    response = requests.get(
        f"{API_BASE}/locations/search",
        params={"q": query}
    )
    response.raise_for_status()
    return response.json()

# Example: Get navigation path
def get_navigation_path(start, end):
    response = requests.get(
        f"{API_BASE}/navigate",
        params={"start": start, "end": end}
    )
    response.raise_for_status()
    return response.json()

# Example: Batch get locations
def batch_get_locations(location_ids):
    response = requests.post(
        f"{API_BASE}/locations/batch",
        json={"ids": location_ids}
    )
    response.raise_for_status()
    return response.json()

# Usage
if __name__ == "__main__":
    # Get all locations
    all_locations = get_all_locations()
    print(f"Found {all_locations['count']} locations")

    # Get location
    location = get_location("lowenstein_ll817")
    print("Location:", location["data"])

    # Search
    results = search_locations("classroom")
    print("Search results:", results["data"])

    # Navigation
    path = get_navigation_path("lowenstein_entrance", "lowenstein_ll817")
    print(f"Total distance: {path['totalDistance']}m")
    print(f"Estimated time: {path['estimatedTime']}")
    for step in path["steps"]:
        print(f"Step {step['step']}: {step['instruction']}")
```

### Complete Test Suite

Create a test file `test_api.js`:

```javascript
const API_BASE = 'http://localhost:3001/api';

async function testAllEndpoints() {
  console.log('Testing RamsNavigator API\n');

  // Test 1: Health Check
  console.log('1. Testing Health Check...');
  try {
    const health = await fetch(`${API_BASE}/health`).then(r => r.json());
    console.log('Health check passed:', health.message);
  } catch (error) {
    console.error('Health check failed:', error);
  }

  // Test 2: Get All Locations
  console.log('\n2. Testing Get All Locations...');
  try {
    const allLocations = await fetch(`${API_BASE}/locations`)
      .then(r => r.json());
    console.log(`Retrieved ${allLocations.count} locations`);
  } catch (error) {
    console.error('Get all locations failed:', error);
  }

  // Test 3: Get Location by ID
  console.log('\n3. Testing Get Location by ID...');
  try {
    const location = await fetch(`${API_BASE}/locations/lowenstein_ll817`)
      .then(r => r.json());
    console.log('Location retrieved:', location.data.name);
  } catch (error) {
    console.error('Get location failed:', error);
  }

  // Test 4: Search Locations
  console.log('\n4. Testing Search Locations...');
  try {
    const search = await fetch(`${API_BASE}/locations/search?q=classroom`)
      .then(r => r.json());
    console.log(`Search found ${search.count} locations`);
  } catch (error) {
    console.error('Search failed:', error);
  }

  // Test 5: Navigation Path
  console.log('\n5. Testing Navigation Path...');
  try {
    const path = await fetch(
      `${API_BASE}/navigate?start=lowenstein_entrance&end=lowenstein_ll817`
    ).then(r => r.json());
    console.log(`Path found: ${path.totalDistance}m, ${path.estimatedTime}`);
    console.log(`   Steps: ${path.steps.length}`);
  } catch (error) {
    console.error('Navigation failed:', error);
  }

  // Test 6: Batch Get Locations
  console.log('\n6. Testing Batch Get Locations...');
  try {
    const batch = await fetch(`${API_BASE}/locations/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: ['lowenstein_entrance', 'lowenstein_lobby_1']
      })
    }).then(r => r.json());
    console.log(`Batch retrieved ${batch.found} locations`);
  } catch (error) {
    console.error('Batch get failed:', error);
  }

  console.log('\nAll tests completed!');
}

// Run tests
testAllEndpoints();
```

Run with:
```bash
node test_api.js
```

---

## Error Handling

All endpoints follow consistent error response format:

### Error Response Format

```json
{
  "error": "Error Type",
  "message": "Human-readable error message"
}
```

### HTTP Status Codes

| Code | Meaning | Example Use Case |
|------|---------|------------------|
| `200` | Success | Request completed successfully |
| `400` | Bad Request | Missing or invalid parameters |
| `404` | Not Found | Resource doesn't exist or path not found |
| `500` | Internal Server Error | Server-side error |

### Common Error Scenarios

**400 Bad Request Examples:**
```json
{
  "error": "Bad Request",
  "message": "Location ID is required"
}
```

**404 Not Found Examples:**
```json
{
  "error": "Not Found",
  "message": "Location with ID 'invalid_id' not found"
}
```

```json
{
  "error": "Not Found",
  "message": "No path found between 'Location A' and 'Location B'"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal Server Error",
  "message": "Failed to fetch location details"
}
```

---

## Database Integration

The API uses a hybrid database approach:

**MongoDB:**
- Stores detailed location information
- Fast lookups and searches
- Rich metadata (images, amenities, accessibility)

**Neo4j:**
- Stores navigation graph (locations as nodes, connections as relationships)
- Efficient pathfinding using `shortestPath` algorithm
- Navigation instructions and distances

**How They Work Together:**
1. Navigation endpoints query Neo4j for shortest path
2. Extract location IDs from the path
3. Batch fetch full location details from MongoDB
4. Combine results into enriched navigation response

---

## Performance Tips

1. **Use Projections:** Location list endpoints automatically use projections to limit returned fields
2. **Batch Operations:** Use `/api/locations/batch` instead of multiple single requests
3. **Search Limits:** Search endpoint limits results to 50 for performance
4. **Connection Pooling:** Database connections are pooled for efficiency

---

## Next Steps

1. **Add Indexing:** Create MongoDB indexes on frequently queried fields:
   ```javascript
   db.locations.createIndex({ building: 1, floor: 1 });
   db.locations.createIndex({ name: "text", description: "text" });
   ```

2. **Add Authentication:** Implement auth middleware for production

3. **Add Rate Limiting:** Protect API from abuse

4. **Add Caching:** Cache frequently accessed locations

5. **Add Pagination:** For large result sets

---

## Support

For issues or questions:
- Check server logs for detailed error messages
- Verify database connections are working
- Ensure data is seeded in both MongoDB and Neo4j
- Test health endpoint first to verify server is running

---

**Last Updated:** 2024-01-15
**API Version:** 1.1.0
**Total Endpoints:** 10 (6 Location, 2 Navigation, 2 Utility)

