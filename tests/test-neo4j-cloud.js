/**
 * RamsNavigator - Neo4j AuraDB Connection Test
 */

const dotenv = require('dotenv');
const path = require('path');
const neo4j = require('neo4j-driver');

const configPath = path.resolve(__dirname, '../config.env');
const result = dotenv.config({ path: configPath });

if (result.error) {
    console.error('Error loading config.env:', result.error.message);
    process.exit(1);
}

const URI = process.env.NEO4J_URI;
const USER = process.env.NEO4J_USERNAME;
const PASSWORD = process.env.NEO4J_PASSWORD;

if (!URI || !PASSWORD) {
    console.error('❌ Missing configuration in config.env');
    console.error('Required: NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD');
    process.exit(1);
}

async function testConnection() {
    console.log('\nTesting Neo4j connection...');
    
    const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));
    
    try {
        const serverInfo = await driver.getServerInfo();
        
        const session = driver.session();
        try {
            const result = await session.run(
                'MERGE (n:TestNode {name: "RamsNavigator"}) RETURN n.name as name'
            );
            console.log('✓ Connected to Neo4j AuraDB');
            console.log(`  Version: ${serverInfo.agent}`);
            console.log(`  Test query: ${result.records[0].get('name')}`);
        } finally {
            await session.close();
        }
    } catch (error) {
        console.error('✗ Connection failed:', error.message);
        process.exit(1);
    } finally {
        await driver.close();
    }
}

testConnection();