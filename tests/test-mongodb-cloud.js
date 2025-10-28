/**
 * RamsNavigator - MongoDB Atlas Connection Test
 */

const dotenv = require('dotenv');
const path = require('path');
const { MongoClient } = require('mongodb');

const configPath = path.resolve(__dirname, '../config.env');
const result = dotenv.config({ path: configPath });

if (result.error) {
    console.error('Error loading config.env:', result.error.message);
    process.exit(1);
}

const URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DATABASE || 'RamsNavigator';

if (!URI) {
    console.error('❌ Missing configuration in config.env');
    console.error('Required: MONGODB_URI');
    process.exit(1);
}

async function testConnection() {
    console.log('\nTesting MongoDB connection...');
    
    const client = new MongoClient(URI);
    
    try {
        await client.connect();
        
        // Check admin access
        let hasAdminAccess = false;
        try {
            const adminDb = client.db().admin();
            const serverInfo = await adminDb.serverStatus();
            hasAdminAccess = true;
            console.log('✓ Connected to MongoDB Atlas');
            console.log(`  Server: ${serverInfo.version}`);
        } catch (e) {
            console.log('✓ Connected to MongoDB Atlas');
            console.log('  Access: Limited admin privileges');
            console.log('\nTo grant full admin access:');
            console.log('  1. Go to: https://cloud.mongodb.com/');
            console.log('  2. Click "Database Access"');
            console.log('  3. Find your user and click "Edit"');
            console.log('  4. Select "Atlas admin" under privileges');
            console.log('  5. Click "Update User"');
        }
        
        const db = client.db(DB_NAME);
        const collection = db.collection('test');
        
        const testDoc = {
            name: 'RamsNavigator',
            timestamp: new Date(),
            status: 'connected'
        };
        
        const insertResult = await collection.insertOne(testDoc);
        const doc = await collection.findOne({ _id: insertResult.insertedId });
        await collection.deleteOne({ _id: insertResult.insertedId });
        
        console.log(`  Database: ${DB_NAME}`);
        console.log(`  Test document: ${doc.name}`);
    } catch (error) {
        console.error('✗ Connection failed:', error.message);
        process.exit(1);
    } finally {
        await client.close();
    }
}

testConnection();