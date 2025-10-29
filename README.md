# RamsNavigator - Indoor Campus Navigation System

An indoor campus navigation system using Neo4j for graph-based pathfinding and MongoDB for storing building and location data.

## Overview

RamsNavigator uses cloud-hosted databases shared among team members:

- **Neo4j AuraDB**: Navigational relationships between locations
- **MongoDB Atlas**: Building information, floor plans, and location metadata

## Quick Start

### Prerequisites

- **Node.js** (v16+): [Download](https://nodejs.org/)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure credentials:**
   
   Edit `config.env` with your database credentials:
   ```env
   NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=your-password
   
   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/RamsNavigator
   MONGODB_DATABASE=RamsNavigator
   ```

3. **Test connections:**
   ```bash
   npm test
   ```

## Setting Up Cloud Databases

### Neo4j AuraDB

1. Create account: https://neo4j.com/cloud/aura/
2. Create free database instance
3. Copy connection string and password
4. Update `config.env`

### MongoDB Atlas

1. Create account: https://www.mongodb.com/cloud/atlas/register
2. Create free M0 cluster
3. Configure database user with **"Atlas admin"** privileges
4. Configure Network Access (allow access from anywhere: `0.0.0.0/0`)
5. Copy connection string
6. Update `config.env`

**Important:** Make sure to grant "Atlas admin" privileges to avoid permission issues.

## Testing Connections

```bash
npm test              # Test both databases
npm run test:neo4j    # Test Neo4j only
npm run test:mongodb  # Test MongoDB only
```

## MongoDB Locations Setup

### Initial Setup (Run Once)

```bash
npm run setup:locations    # Create collection + indexes + validation
npm run seed:locations     # Load 3 sample locations with 1 image
```

### Locations Schema

```javascript
{
  _id: "1001",                    // String (matches Neo4j node ID)
  name: "Main Lobby",
  description: "...",
  building: "McGinley Center",
  floor: 1,
  type: "lobby",                  // lobby, classroom, elevator, stairs, etc.
  images: [
    {
      file_id: ObjectId("..."),   // GridFS reference
      alt_text: "...",
      orientation: "landscape",   // landscape, portrait, square
      is_primary: true
    }
  ],
  amenities: ["seating", "wifi"],
  accessibility: {
    wheelchair_accessible: true,
    automatic_doors: true,
    elevator_nearby: true
  },
  metadata: {
    last_updated: ISODate("..."),
    data_source: "manual_seed"
  }
}
```

### Indexes (Auto-Created)

- `{ building: 1, floor: 1 }` — Query by building + floor
- `{ type: 1 }` — Filter by location type
- `{ amenities: 1 }` — Search amenities
- `{ name: "text", description: "text" }` — Text search

### Working with Images

**Upload images to GridFS:**
```bash
# Put images in ./images folder, then:
npm run upload:images
# Output: lobby.jpg -> 6901758bd582ff466f82fc96
```

**Link image to location (Atlas UI):**
1. Go to `locations` collection → Edit document
2. Add to `images` array:
```javascript
{
  file_id: ObjectId("6901758bd582ff466f82fc96"),
  alt_text: "Main lobby entrance",
  orientation: "landscape",
  is_primary: true
}
```

**View uploaded images (Atlas UI):**
- Browse Collections → `images.files` (metadata)
- Browse Collections → `images.chunks` (file data)

**Note:** GridFS stores images in MongoDB; no external URLs needed.

## Connection Strings

### Neo4j

```javascript
const neo4j = require('neo4j-driver');
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);
```

### MongoDB

```javascript
const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db(process.env.MONGODB_DATABASE);
```

## Project Structure

```
No-Sql-Project/
├── config.env              # Database credentials (not in git)
├── package.json            # Node.js dependencies
├── README.md               # This file
├── images/                 # Store images for upload
├── db/                     # Database setup scripts
│   ├── setup.js            # Create locations collection + indexes
│   ├── load_sample.js      # Seed sample data
│   └── upload_images.js    # Bulk upload images to GridFS
└── tests/                  # Connection test scripts
    ├── test-neo4j-cloud.js
    └── test-mongodb-cloud.js
```

## Accessing Databases

### Neo4j AuraDB Browser

1. Visit: https://console.neo4j.io/
2. Log in with your credentials
3. Select your database
4. Run Cypher queries in the browser

### MongoDB Atlas

1. Visit: https://cloud.mongodb.com/
2. Log in with your credentials
3. Click your cluster → Browse Collections
4. View and manage your data

## Security

⚠️ **Important**: Never commit `config.env` to Git (already in `.gitignore`)

**To share credentials with team:**
- Use password manager (LastPass, 1Password, Bitwarden)
- Encrypted email
- Secure messaging (Slack DM)

## Free Tier Limits

**Neo4j AuraDB Free:**
- 50,000 nodes
- 175,000 relationships
- Always on

**MongoDB Atlas M0 Free:**
- 512 MB storage
- Shared RAM
- No credit card required

## Troubleshooting

**"Configuration not set"**
→ Update `config.env` with your actual credentials

**"Connection timeout"**
→ Check Network Access in MongoDB Atlas, verify IP whitelisting

**"Authentication failed"**
→ Verify username/password match your cloud database credentials

**"Module not found"**
→ Run: `npm install`

---

**Project Links:**
- [Proposal](https://docs.google.com/document/d/1rVzWPu0YoM1GG3z4FTF8Tp8RPfdU8UGZ452_0NnM5iw/edit?tab=t.r73yq0ag3nty)
- [To-Do](https://docs.google.com/spreadsheets/d/1hKXdWQx23C13Wb2uFooPJ27rYtiHhiEOPQDQ5EwyijE/edit?gid=0#gid=0)