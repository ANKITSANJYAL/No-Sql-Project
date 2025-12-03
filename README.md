# RamsNavigator 🗺️

Indoor campus navigation system for Fordham University using Neo4j (graph database), MongoDB (document store), and OpenAI for natural language processing.

## Tech Stack

- **Frontend**: React, Cytoscape.js (graph visualization), React Router
- **Backend**: Node.js, Express
- **Databases**: Neo4j (spatial relationships), MongoDB (location metadata & images)
- **AI**: OpenAI API (GPT-4o-mini for intent parsing)

## Prerequisites

- Node.js (v18+)
- MongoDB instance
- Neo4j instance
- OpenAI API key

## Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd No-Sql-Project
```

### 2. Configure Environment Variables

Create `backend/.env`:
```env
# Neo4j Configuration
NEO4J_URI=neo4j://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=rams_navigator

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Server
PORT=3001
```

### 3. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 4. Seed Databases

**Neo4j (Graph):**
```bash
cd backend
node data/seed-neo4j.js
```

**MongoDB (Documents):**
```bash
node data/seed-mongodb.js
```

### 5. Run Application

**Backend (Terminal 1):**
```bash
cd backend
npm start
```
Server runs on `http://localhost:3001`

**Frontend (Terminal 2):**
```bash
cd frontend
npm start
```
App opens at `http://localhost:3000`

## Features

- **Natural Language Navigation**: "Take me to the library but get coffee first"
- **Graph Visualization**: Interactive campus map with highlighted routes
- **Visual Landmarks**: Images and descriptions at each waypoint
- **Shortest Path**: Dijkstra algorithm for optimal routing
- **Admin Dashboard**: Database metrics and validation tools

## Project Structure

```
backend/
  ├── config/database.js       # DB connections
  ├── services/                # LLM, metrics, validation
  ├── data/                    # Seed scripts
  └── server.js                # API endpoints

frontend/
  ├── src/pages/               # Landing, Chat, Manual, Admin
  ├── src/components/          # Graph, Search, Navigation UI
  └── src/config/api.js        # Backend endpoints
```

## API Endpoints

- `POST /api/navigate` - Get navigation path
- `POST /api/chat/parse-intent` - Parse natural language query
- `GET /api/locations` - List all locations
- `GET /api/locations/search?q=query` - Search locations
- `GET /api/admin/metrics` - Database statistics

## Authors

Ankit Sanjyal, Prarthana Shiwakoti, Swoichha Adhikari
