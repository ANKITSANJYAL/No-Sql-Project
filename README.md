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
├── requirements.txt        # Python dependencies (optional)
├── README.md              # This file
├── .gitignore             # Git ignore rules
└── tests/                 # Connection test scripts
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