# RamsNavigator - Campus Indoor Navigation System

A full-stack indoor navigation application for Fordham University, built with React, Node.js/Express, MongoDB, and Neo4j.

## Table of Contents

- [Quick Start](#quick-start)
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Data Population](#data-population)
- [Running the Application](#running-the-application)
- [Verification](#verification)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

## Quick Start

For a quick setup, follow these steps in order:

1. **Install Prerequisites**: Node.js, MongoDB, Neo4j
2. **Clone and Install**: Clone repository and run `npm install` in both `backend` and `frontend` directories
3. **Configure Environment**: Create `.env` file in `backend` directory with database credentials
4. **Populate Databases**: Run `node data/seed-mongodb.js` then `node data/seed-neo4j.js`
5. **Start Application**: Run `npm start` in `backend`, then `npm start` in `frontend`

See detailed instructions below for each step.

## Overview

RamsNavigator provides turn-by-turn indoor navigation guidance for navigating Fordham University's campus buildings. The system uses:
- **Neo4j** for pathfinding and navigation graph
- **MongoDB** for location details and metadata
- **React** for the frontend interface
- **Node.js/Express** for the backend API

## Features

- **Location Search**: Search locations by name, building, or description
- **Turn-by-Turn Navigation**: Get detailed step-by-step directions between locations
- **AI Chat Assistant**: Natural language navigation using LLM (OpenRouter)
  - "I'm at the main gate, I want to borrow books"
  - "Take me to room 817"
  - Understands activities and amenities (coffee, library, classroom, etc.)
- **Location Details**: View comprehensive information about each location
- **Building & Floor Filtering**: Filter locations by building and floor
- **Modern UI**: Responsive, user-friendly interface
- **Real-time API Integration**: Dynamic data fetching from MongoDB and Neo4j

## Tech Stack

### Frontend
- React 18.2.0
- React Router DOM
- CSS3 with custom properties

### Backend
- Node.js
- Express.js
- MongoDB (via mongodb driver)
- Neo4j (via neo4j-driver)

## Prerequisites

Before you begin, ensure you have the following installed and running:

### 1. Node.js (v14 or higher)

**Download**: [https://nodejs.org/](https://nodejs.org/)

**Verify Installation**:
```bash
node --version
npm --version
```

Expected output: Node.js v14+ and npm v6+

### 2. MongoDB Community Edition

**Download**: [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)

**Installation Steps**:

#### macOS (using Homebrew):
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community

# Verify MongoDB is running
mongosh
```

#### Linux:
```bash
# Install MongoDB (Ubuntu/Debian)
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
mongosh
```

#### Windows:
1. Download MongoDB installer from the official website
2. Run the installer and follow the setup wizard
3. MongoDB will start automatically as a service
4. Verify by opening Command Prompt and running: `mongosh`

**Default MongoDB Connection**:
- URI: `mongodb://localhost:27017`
- Port: `27017`

### 3. Neo4j

**Download**: [https://neo4j.com/download/](https://neo4j.com/download/) or use [Neo4j Desktop](https://neo4j.com/download/)

**Installation Steps**:

#### Option A: Neo4j Desktop (Recommended for beginners)
1. Download and install Neo4j Desktop
2. Create a new project
3. Create a new database instance
4. Start the database
5. Note your password (default username is `neo4j`)

#### Option B: Neo4j Community Edition
1. Download Neo4j Community Edition
2. Extract and install
3. Start Neo4j service
4. Access Neo4j Browser at `http://localhost:7474`
5. Set initial password (default username is `neo4j`)

**Default Neo4j Connection**:
- URI: `bolt://localhost:7687`
- Browser: `http://localhost:7474`
- Default Username: `neo4j`
- Default Password: `neo4j` (change on first login)

**Verify Neo4j is Running**:
- Open Neo4j Browser at `http://localhost:7474`
- Or check service status in Neo4j Desktop

## Installation

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd "No-Sql-Project"
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

**Expected Output**: Dependencies will be installed. You should see a `node_modules` folder created.

**Verify Installation**:
```bash
npm list --depth=0
```

You should see packages like: `express`, `mongodb`, `neo4j-driver`, `cors`, `dotenv`

### Step 3: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

**Expected Output**: Dependencies will be installed. You should see a `node_modules` folder created.

**Verify Installation**:
```bash
npm list --depth=0
```

You should see packages like: `react`, `react-dom`, `react-router-dom`

## Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd backend
touch .env
```

**Important**: The `.env` file should be in the `backend` directory, not the root directory.

Add the following environment variables to `backend/.env`:

```env
# Server Configuration
PORT=3001

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=rams_navigator

# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_neo4j_password_here

# OpenRouter API Configuration (Optional - for AI Chat feature)
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

**Configuration Details**:

1. **PORT**: Backend server port (default: 3001)
2. **MONGODB_URI**: MongoDB connection string
   - Local: `mongodb://localhost:27017`
   - If using authentication: `mongodb://username:password@localhost:27017`
3. **MONGODB_DATABASE**: Database name (can be any name, e.g., `rams_navigator`)
4. **NEO4J_URI**: Neo4j connection string
   - Local: `bolt://localhost:7687`
5. **NEO4J_USERNAME**: Neo4j username (default: `neo4j`)
6. **NEO4J_PASSWORD**: Your Neo4j password (set during Neo4j installation)
7. **OPENROUTER_API_KEY**: Optional - Get a free API key from [OpenRouter.ai](https://openrouter.ai/) for AI chat features

**Example `.env` file** (replace with your actual values):
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=rams_navigator
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=mypassword123
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
```

### Frontend Configuration

The frontend will connect to the backend API at `http://localhost:3001/api` by default. 

**Optional**: To change the API URL, create a `.env.local` file in the `frontend` directory:

```bash
cd frontend
touch .env.local
```

Add:
```env
REACT_APP_API_URL=http://localhost:3001/api
```

## Database Setup

Before populating the databases, ensure both MongoDB and Neo4j are running:

### Verify MongoDB is Running

```bash
# Check MongoDB service status
mongosh

# Or test connection
mongosh "mongodb://localhost:27017"
```

If successful, you'll see the MongoDB shell prompt.

### Verify Neo4j is Running

1. Open Neo4j Browser at `http://localhost:7474`
2. Or check Neo4j Desktop if using Neo4j Desktop
3. Test connection with your credentials

## Data Population

The project includes two seed scripts that populate the databases with Fordham University campus location data:

1. **MongoDB Seed Script** (`seed-mongodb.js`): Populates location details, images, amenities, and accessibility information
2. **Neo4j Seed Script** (`seed-neo4j.js`): Creates the navigation graph with location nodes and connections

### What Data is Populated?

#### MongoDB Data (19 Locations):
- Main Entrance, Front Desk Lobby, Water Fountain Junction
- Veronica Lally Theatre, Library Corridor, Quinn Library
- Escalators, Elevators, Plaza areas
- Ram Café, Study Areas, Classrooms
- Gabelli School of Business Entrance
- Each location includes: name, description, building, floor, type, images, amenities, accessibility info

#### Neo4j Data:
- 19 Location nodes (matching MongoDB locations)
- 20 bidirectional connections (40 relationships total)
- Navigation instructions for each connection
- Distance and weight information for pathfinding
- Indexes for optimal query performance

### Step 1: Seed MongoDB

**Location**: `backend/data/seed-mongodb.js`

**What it does**:
- Clears existing location data
- Inserts 19 location documents with full details
- Creates indexes for optimal query performance:
  - Compound index on building + floor
  - Text index on name + description (name weighted 10x)
  - Index on type
  - Compound index on building + type
  - Array index on amenities

**Run the script**:
```bash
cd backend
node data/seed-mongodb.js
```

**Expected Output**:
```
Neo4j connected successfully
MongoDB connected successfully
Cleared existing locations
Inserted 19 locations into MongoDB

=== CREATING INDEXES ===

Created index: building + floor
Created text index: name (weight: 10) + description (weight: 1)
Created index: type
Created index: building + type
Created index: amenities

MongoDB seeding completed!
Databases disconnected
```

**If you see errors**:
- Check that MongoDB is running: `mongosh`
- Verify `MONGODB_URI` and `MONGODB_DATABASE` in `.env` file
- Ensure you're in the `backend` directory when running the script

### Step 2: Seed Neo4j

**Location**: `backend/data/seed-neo4j.js`

**What it does**:
- Clears existing graph data
- Creates 19 Location nodes
- Creates 20 bidirectional connections (40 relationships total)
- Creates indexes for optimal pathfinding:
  - Index on Location.id (most important)
  - Index on Location.type
  - Composite index on Location.building + Location.floor

**Run the script**:
```bash
cd backend
node data/seed-neo4j.js
```

**Expected Output**:
```
Neo4j connected successfully
MongoDB connected successfully
Seeding Neo4j with navigation graph...

Cleared existing graph data
Created 19 location nodes

=== CREATING NEO4J INDEXES ===

Created index on Location.id (most important for pathfinding)
Created index on Location.type (for type-based filtering)
Created composite index on Location.building + Location.floor (for building/floor queries)

All indexes created successfully!

Creating connections...
Created 40 relationships (bidirectional)

Neo4j seeding completed!
Databases disconnected
```

**If you see errors**:
- Check that Neo4j is running: Open `http://localhost:7474` in browser
- Verify `NEO4J_URI`, `NEO4J_USERNAME`, and `NEO4J_PASSWORD` in `.env` file
- Ensure you're in the `backend` directory when running the script

### Important Notes

1. **Run scripts in order**: Always run `seed-mongodb.js` first, then `seed-neo4j.js`
2. **Scripts clear existing data**: Both scripts automatically clear existing data before seeding
3. **Location IDs must match**: Neo4j location IDs must match MongoDB `_id` fields for the system to work correctly
4. **Re-running scripts**: You can safely re-run both scripts to reset the database

## Verification

After populating the databases, verify the data was inserted correctly:

### Verify MongoDB Data

```bash
# Connect to MongoDB
mongosh

# Switch to your database
use rams_navigator

# Count locations
db.locations.countDocuments()

# View sample locations
db.locations.find().limit(3).pretty()

# Check indexes
db.locations.getIndexes()
```

**Expected Results**:
- Location count: `19`
- Sample locations should show: Main Entrance, Front Desk Lobby, etc.
- Indexes should include: `building_floor_1`, `name_description_text`, `type_1`, etc.

### Verify Neo4j Data

1. Open Neo4j Browser: `http://localhost:7474`
2. Login with your credentials
3. Run these queries:

```cypher
// Count location nodes
MATCH (n:Location) RETURN count(n) as nodeCount

// Count relationships
MATCH ()-[r:CONNECTED_TO]->() RETURN count(r) as relCount

// View sample locations
MATCH (n:Location) RETURN n.id, n.name, n.type LIMIT 5

// View graph visualization
MATCH (n:Location)-[r:CONNECTED_TO]->(m:Location) 
RETURN n, r, m LIMIT 50
```

**Expected Results**:
- Node count: `19`
- Relationship count: `40` (20 bidirectional connections)
- Sample locations should include: main_entrance, front_desk_lobby, etc.

## Running the Application

### Start the Backend Server

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Start the server**:
   ```bash
   npm start
   ```

3. **Expected output**:
   ```
   Neo4j connected successfully
   MongoDB connected successfully
   Server ready with database connections (MongoDB & Neo4j)
   Server running on port 3001
   ```

4. **Verify backend is running**:
   - Open browser: `http://localhost:3001/api/health`
   - You should see: `{"status":"ok","message":"Server is running"}`
   - Or check terminal for "Server running on port 3001"

**Keep this terminal window open** - the server must remain running.

### Start the Frontend Development Server

1. **Open a new terminal window/tab** (keep backend running in the first terminal)

2. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

3. **Start the React development server**:
   ```bash
   npm start
   ```

4. **Expected output**:
   ```
   Compiled successfully!
   
   You can now view rams-navigator in the browser.
   
     Local:            http://localhost:3000
     On Your Network:  http://192.168.x.x:3000
   ```

5. **Browser should automatically open** at `http://localhost:3000`

   **Note**: 
   - Frontend runs on port **3000**
   - Backend API runs on port **3001**
   - Both must be running simultaneously

### Access the Application

- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:3001/api`
- **API Health Check**: `http://localhost:3001/api/health`
- **Neo4j Browser**: `http://localhost:7474`

## Project Structure

```
No-Sql-Project/
├── backend/
│   ├── config/
│   │   └── database.js          # Database connection configuration
│   ├── data/
│   │   ├── seed-mongodb.js      # MongoDB seeding script (19 locations)
│   │   └── seed-neo4j.js       # Neo4j seeding script (19 nodes, 40 relationships)
│   ├── services/
│   │   └── llmService.js        # LLM service for AI chat
│   ├── API_DOCUMENTATION.md     # Complete API documentation
│   ├── package.json
│   ├── server.js                # Express server & API endpoints
│   └── .env                     # Environment variables (create this)
│
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── logo.png
│   ├── src/
│   │   ├── components/
│   │   │   ├── SearchBar.js     # Location search component
│   │   │   ├── NavigationView.js # Navigation display
│   │   │   ├── LocationDetails.js # Location popup
│   │   │   ├── Header.js
│   │   │   ├── ChatAssistant.js # AI chat interface
│   │   │   └── GraphVisualization.js
│   │   ├── pages/
│   │   │   ├── LandingPage.js
│   │   │   ├── ChatPage.js
│   │   │   └── ManualPage.js
│   │   ├── config/
│   │   │   └── api.js           # API endpoints configuration
│   │   ├── styles/              # CSS files
│   │   ├── App.js               # Main app component
│   │   └── index.js
│   ├── package.json
│   └── README.md
│
├── README.md                    # This file
└── .gitignore
```

## API Documentation

Complete API documentation is available in `backend/API_DOCUMENTATION.md`.

### Quick API Overview

**Base URL**: `http://localhost:3001/api`

#### Location Endpoints
- `GET /api/locations` - Get all locations
- `GET /api/locations/:id` - Get location by ID
- `GET /api/locations/building/:building` - Get locations by building
- `GET /api/locations/floor/:building/:floor` - Get locations by building and floor
- `GET /api/locations/search?q=query` - Search locations
- `POST /api/locations/batch` - Get multiple locations by IDs

#### Navigation Endpoints
- `GET /api/navigate?start=id&end=id` - Get navigation path
- `POST /api/navigate` - Get navigation path (POST method)

#### AI Chat Endpoints
- `POST /api/chat/parse-intent` - Parse natural language query
- `POST /api/chat/navigate` - Complete chat-to-navigation pipeline

#### Utility Endpoints
- `GET /api/health` - Health check
- `GET /api/debug/routes` - List all registered routes

See `backend/API_DOCUMENTATION.md` for detailed documentation, examples, and testing instructions.

## Development

### Testing the API

You can test the API endpoints using:

1. **cURL**:
   ```bash
   # Health check
   curl http://localhost:3001/api/health
   
   # Get all locations
   curl http://localhost:3001/api/locations
   
   # Search locations
   curl "http://localhost:3001/api/locations/search?q=library"
   
   # Get navigation path
   curl "http://localhost:3001/api/navigate?start=main_entrance&end=quinn_library_entrance"
   ```

2. **Postman**: Import the endpoints from `backend/API_DOCUMENTATION.md`

3. **Browser**: Visit `http://localhost:3001/api/health` for a health check

### Resetting Databases

To reset and re-seed the databases:

```bash
# Re-seed MongoDB (automatically clears existing data)
cd backend
node data/seed-mongodb.js

# Re-seed Neo4j (automatically clears existing data)
node data/seed-neo4j.js
```

**Note**: Both scripts automatically clear existing data before seeding, so you can safely re-run them.

## Troubleshooting

### Installation Issues

**Problem**: `npm install` fails
- **Solution**: 
  - Ensure Node.js is installed: `node --version`
  - Try deleting `node_modules` and `package-lock.json`, then run `npm install` again
  - Check internet connection
  - On macOS/Linux, try `sudo npm install` if permission errors occur

**Problem**: `Cannot find module` errors
- **Solution**: 
  - Ensure you ran `npm install` in both `backend` and `frontend` directories
  - Delete `node_modules` and `package-lock.json`, then reinstall

### Backend Issues

**Problem**: `Failed to connect to databases`
- **Solution**: 
  - Verify MongoDB is running: `mongosh` or `brew services list | grep mongodb`
  - Verify Neo4j is running: Open `http://localhost:7474` in browser
  - Check `.env` file exists in `backend` directory
  - Verify all environment variables in `.env` are correct
  - Check database credentials match your setup

**Problem**: `Port 3001 already in use`
- **Solution**: 
  - Find process using port 3001: `lsof -i :3001` (macOS/Linux) or `netstat -ano | findstr :3001` (Windows)
  - Kill the process or change `PORT` in `backend/.env` to a different port (e.g., `3002`)
  - Update frontend `.env.local` if you change the port

**Problem**: `Route not found` errors
- **Solution**: 
  - Ensure backend server is running
  - Check API base URL in frontend configuration
  - Verify routes are defined in `server.js`

**Problem**: `Cannot find module 'dotenv'` or other modules
- **Solution**: 
  - Run `npm install` in `backend` directory
  - Ensure you're in the `backend` directory when running scripts

### Frontend Issues

**Problem**: `Failed to fetch` or CORS errors
- **Solution**: 
  - Ensure backend server is running on port 3001
  - Check browser console for detailed error messages
  - Verify `REACT_APP_API_URL` in frontend `.env.local` matches backend port
  - Check backend CORS configuration in `server.js`

**Problem**: `Cannot find module` errors
- **Solution**: 
  - Run `npm install` in the `frontend` directory
  - Delete `node_modules` and reinstall if needed

**Problem**: API calls failing
- **Solution**: 
  - Check browser console (F12) for errors
  - Verify backend server is running: `http://localhost:3001/api/health`
  - Check network tab in browser dev tools
  - Verify API endpoints in `frontend/src/config/api.js`

**Problem**: Page shows blank or errors
- **Solution**: 
  - Check browser console for React errors
  - Ensure backend is running
  - Clear browser cache and reload

### Database Issues

**Problem**: MongoDB connection fails
- **Solution**: 
  - Verify MongoDB is running:
    - macOS: `brew services list | grep mongodb`
    - Linux: `sudo systemctl status mongod`
    - Windows: Check Services app
  - Test connection: `mongosh "mongodb://localhost:27017"`
  - Check `MONGODB_URI` in `.env` file
  - Default URI: `mongodb://localhost:27017`
  - If using authentication, include credentials: `mongodb://username:password@localhost:27017`

**Problem**: Neo4j connection fails
- **Solution**:
  - Verify Neo4j is running:
    - Open Neo4j Browser: `http://localhost:7474`
    - Check Neo4j Desktop if using it
  - Test connection with credentials
  - Check `NEO4J_URI` in `.env` file (should be `bolt://localhost:7687`)
  - Verify `NEO4J_USERNAME` and `NEO4J_PASSWORD` are correct
  - Try resetting Neo4j password if needed

**Problem**: No data after seeding
- **Solution**: 
  - Check for error messages when running seed scripts
  - Verify databases are running before seeding
  - Check `.env` file has correct credentials
  - Run seed scripts again and check output
  - Verify data using MongoDB shell and Neo4j Browser (see Verification section)

**Problem**: Seed script fails with connection error
- **Solution**:
  - Ensure you're in the `backend` directory when running scripts
  - Verify `.env` file exists in `backend` directory
  - Check that MongoDB and Neo4j are running
  - Test connections manually (see Database Setup section)

**Problem**: "Index already exists" warnings
- **Solution**: 
  - These are harmless warnings - indexes may already exist
  - The script will continue and complete successfully
  - You can ignore these warnings

### Data Population Issues

**Problem**: MongoDB seed shows "Inserted 0 locations"
- **Solution**:
  - Check for errors in the output
  - Verify MongoDB connection in `.env`
  - Ensure MongoDB is running
  - Check that location data array is not empty in `seed-mongodb.js`

**Problem**: Neo4j seed shows "Created 0 location nodes"
- **Solution**:
  - Check for errors in the output
  - Verify Neo4j connection in `.env`
  - Ensure Neo4j is running
  - Check that locations array is not empty in `seed-neo4j.js`

**Problem**: Location IDs don't match between MongoDB and Neo4j
- **Solution**:
  - This is critical - IDs must match exactly
  - Check that `_id` in MongoDB matches `id` in Neo4j
  - Re-run both seed scripts in order
  - Verify using the Verification section queries

### Common Error Messages

**"ECONNREFUSED"**: Database service is not running
- Start MongoDB: `brew services start mongodb-community` (macOS) or `sudo systemctl start mongod` (Linux)
- Start Neo4j: Use Neo4j Desktop or start Neo4j service

**"Authentication failed"**: Wrong credentials
- Check username and password in `.env` file
- Verify credentials work by connecting manually (mongosh or Neo4j Browser)

**"Cannot read property 'collection' of undefined"**: MongoDB not connected
- Verify MongoDB connection in `.env`
- Ensure `connectDatabases()` is called before using database

**"Session is closed"**: Neo4j session issue
- This usually means the script completed - check if data was inserted
- If persistent, restart Neo4j and re-run seed script

## Additional Resources

- **API Documentation**: See `backend/API_DOCUMENTATION.md` for complete API reference
- **Project Proposal**: [Google Docs](https://docs.google.com/document/d/1rVzWPu0YoM1GG3z4FTF8Tp8RPfdU8UGZ452_0NnM5iw/edit?tab=r.r73yq0ag3nty)
- **To-Do List**: [Google Sheets](https://docs.google.com/spreadsheets/d/1hKXdWQx23C13Wb2uFooPJ27rYtiHhiEOPQDQ5EwyijE/edit?gid=0#gid=0)

---

## Quick Reference

### Essential Commands

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Configure environment
cd backend && touch .env  # Then edit with your credentials

# Populate databases
cd backend && node data/seed-mongodb.js
cd backend && node data/seed-neo4j.js

# Start application
cd backend && npm start    # Terminal 1
cd frontend && npm start   # Terminal 2

# Verify databases
mongosh                    # MongoDB
# Open http://localhost:7474  # Neo4j Browser
```

### Important Files

- `backend/.env` - Environment variables (create this)
- `backend/data/seed-mongodb.js` - MongoDB data population
- `backend/data/seed-neo4j.js` - Neo4j data population
- `backend/server.js` - Express server and API routes

### Default Ports

- Frontend: `3000`
- Backend API: `3001`
- MongoDB: `27017`
- Neo4j Bolt: `7687`
- Neo4j Browser: `7474`

---

**Happy Navigating!**

For questions or issues, refer to the Troubleshooting section above or check the API documentation.
