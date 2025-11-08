# RamsNavigator - Campus Indoor Navigation System

A full-stack indoor navigation application for Fordham University, built with React, Node.js/Express, MongoDB, and Neo4j.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

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

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **MongoDB** - [Download & Install](https://www.mongodb.com/try/download/community)
- **Neo4j** - [Download & Install](https://neo4j.com/download/) or use [Neo4j Desktop](https://neo4j.com/download/)

### MongoDB Setup

1. Install MongoDB Community Edition
2. Start MongoDB service:
   ```bash
   # On macOS (using Homebrew)
   brew services start mongodb-community

   # On Linux
   sudo systemctl start mongod

   # On Windows
   # MongoDB should start automatically as a service
   ```

### Neo4j Setup

1. Install Neo4j Desktop or Neo4j Community Edition
2. Create a new database instance
3. Start the database (default port: 7687)
4. Note your database credentials (default: neo4j/neo4j, change password on first login)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "No-Sql-Project"
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

## Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd backend
touch .env
```

Add the following environment variables:

```env
# Server
PORT=3001

# MongoDB Configuration
MONGODB_URI=<Your_mongodb_uri>
MONGODB_DATABASE=<DB_NAME>

# Neo4j Configuration
NEO4J_URI=<NEO4J_URI>
NEO4J_USERNAME=<neo4j_username>
NEO4J_PASSWORD=<your_neo4j_password>

# OpenRouter API Configuration (for AI Chat)
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

**Important**: 
- Replace `your_neo4j_password` with your actual Neo4j password
- For AI chat feature, get a free API key from [OpenRouter.ai](https://openrouter.ai/)
- See `backend/OPENROUTER_SETUP.md` for detailed AI setup instructions

### Frontend Configuration

The frontend will connect to the backend API at `http://localhost:3001/api` by default. To change this:

1. Create a `.env.local` file in the `frontend` directory:
   ```bash
   cd frontend
   touch .env.local
   ```

2. Add:
   ```env
   REACT_APP_API_URL=http://localhost:3001/api
   ```

## Database Setup

### Step 1: Seed MongoDB

Populate MongoDB with location data:

```bash
cd backend
node data/seed-mongodb.js
```

Expected output:
```
MongoDB connected successfully
Seeding MongoDB with dummy location data...
Successfully inserted locations
MongoDB seeding completed!
```

### Step 2: Seed Neo4j

Populate Neo4j with navigation graph:

```bash
cd backend
node data/seed-neo4j.js
```

Expected output:
```
Neo4j connected successfully
MongoDB connected successfully
Seeding Neo4j with navigation graph...
Cleared existing graph data
Creating location nodes...
Created 5 location nodes
Creating connections...
Created 4 connections
Neo4j seeding completed!
```

## Running the Application

### Start the Backend Server

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Start the server:
   ```bash
   npm start
   ```

   The server will start on `http://localhost:3001`

   Expected output:
   ```
   Neo4j connected successfully
   MongoDB connected successfully
   Server ready with database connections (MongoDB & Neo4j)
   Server running on port 3001
   ```

### Start the Frontend Development Server

1. Open a **new terminal window/tab**

2. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

3. Start the React development server:
   ```bash
   npm start
   ```

   The frontend will automatically open in your browser at `http://localhost:3000`

   **Note**: The React development server runs on port 3000, while the backend API runs on port 3001.

## Project Structure

```
No-Sql-Project/
├── backend/
│   ├── config/
│   │   └── database.js          # Database connection configuration
│   ├── data/
│   │   ├── seed-mongodb.js      # MongoDB seeding script
│   │   └── seed-neo4j.js        # Neo4j seeding script
│   ├── test/                    # Test scripts
│   ├── API_DOCUMENTATION.md     # Complete API documentation
│   ├── package.json
│   └── server.js                # Express server & API endpoints
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SearchBar.js     # Location search component
│   │   │   ├── NavigationView.js # Navigation display
│   │   │   ├── LocationDetails.js # Location popup
│   │   │   ├── Header.js
│   │   │   └── ChatAssistant.js
│   │   ├── config/
│   │   │   └── api.js           # API endpoints configuration
│   │   ├── styles/              # CSS files
│   │   ├── App.js               # Main app component
│   │   └── index.js
│   ├── package.json
│   └── README.md
│
├── README.md                    # This file
├── FRONTEND_SETUP_GUIDE.md      # Detailed frontend setup guide
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
   # Get all locations
   curl http://localhost:3001/api/locations

   # Search locations
   curl "http://localhost:3001/api/locations/search?q=Lowenstein"

   # Get navigation path
   curl "http://localhost:3001/api/navigate?start=lowenstein_entrance&end=lowenstein_ll817"
   ```

2. **Postman**: Import the endpoints from `backend/API_DOCUMENTATION.md`

3. **Browser**: Visit `http://localhost:3001/api/health` for a health check

### Resetting Databases

To reset and re-seed the databases:

```bash
# Reset MongoDB
cd backend
node test/reset-mongodb.js

# Re-seed MongoDB
node data/seed-mongodb.js

# Re-seed Neo4j (automatically clears existing data)
node data/seed-neo4j.js
```

## 🐛 Troubleshooting

### Backend Issues

**Problem**: `Failed to connect to databases`
- **Solution**: Ensure MongoDB and Neo4j are running and credentials in `.env` are correct

**Problem**: `Port 3001 already in use`
- **Solution**: Change `PORT` in `backend/.env` or stop the process using port 3001

**Problem**: `Route not found` errors
- **Solution**: Ensure routes are defined in correct order (see `server.js` comments)

### Frontend Issues

**Problem**: `Failed to fetch` or CORS errors
- **Solution**: Ensure backend server is running on port 3001

**Problem**: `Cannot find module` errors
- **Solution**: Run `npm install` in the `frontend` directory

**Problem**: API calls failing
- **Solution**: Check browser console for errors and verify backend server is running

### Database Issues

**Problem**: MongoDB connection fails
- **Solution**: 
  - Verify MongoDB is running: `mongosh` or check service status
  - Check `MONGODB_URI` in `.env` file
  - Default URI: `mongodb://localhost:27017`

**Problem**: Neo4j connection fails
- **Solution**:
  - Verify Neo4j is running (check Neo4j Desktop or service)
  - Default URI: `bolt://localhost:7687`
  - Verify username/password in `.env`
  - Check Neo4j browser at `http://localhost:7474`

**Problem**: No data after seeding
- **Solution**: Run seed scripts again and check for error messages

## Additional Resources

- **API Documentation**: See `API_DOCUMENTATION.md` for complete API reference
- **Project Proposal**: [Google Docs](https://docs.google.com/document/d/1rVzWPu0YoM1GG3z4FTF8Tp8RPfdU8UGZ452_0NnM5iw/edit?tab=r.r73yq0ag3nty)
- **To-Do List**: [Google Sheets](https://docs.google.com/spreadsheets/d/1hKXdWQx23C13Wb2uFooPJ27rYtiHhiEOPQDQ5EwyijE/edit?gid=0#gid=0)

---

**Happy Navigating!**
