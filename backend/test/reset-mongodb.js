require('dotenv').config();
const { MongoClient } = require('mongodb');

async function resetDatabase() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DATABASE);
    
    console.log('Dropping all collections...\n');
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      console.log(`Dropping: ${collection.name}`);
      await db.collection(collection.name).drop();
    }
    
    console.log('\nAll collections dropped successfully!');
    console.log('\nNow run: node data/seed-mongodb.js');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

resetDatabase();