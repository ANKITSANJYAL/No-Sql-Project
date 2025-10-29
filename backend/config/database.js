require('dotenv').config();
const neo4j = require('neo4j-driver');
const { MongoClient } = require('mongodb');

// Neo4j Connection
const neo4jDriver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

// MongoDB Connection
const mongoClient = new MongoClient(process.env.MONGODB_URI);
let mongoDB;

async function connectDatabases() {
  try {
    // Test Neo4j connection
    const neo4jSession = neo4jDriver.session();
    await neo4jSession.run('RETURN 1');
    console.log('✅ Neo4j connected successfully');
    await neo4jSession.close();

    // Connect to MongoDB
    await mongoClient.connect();
    mongoDB = mongoClient.db(process.env.MONGODB_DATABASE);
    console.log('✅ MongoDB connected successfully');
    
    return { neo4jDriver, mongoDB };
  } catch (error) {
    console.error('❌ Database connection error:', error);
    throw error;
  }
}

async function closeDatabases() {
  await neo4jDriver.close();
  await mongoClient.close();
  console.log('Databases disconnected');
}

module.exports = { connectDatabases, closeDatabases, neo4jDriver, getMongoDb: () => mongoDB };