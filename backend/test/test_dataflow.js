const { connectDatabases, closeDatabases, neo4jDriver, getMongoDb } = require('../config/database');

async function testDataFlow() {
  const session = neo4jDriver.session();
  
  try {
    await connectDatabases();
    const db = getMongoDb();
    
    console.log('Testing data flow: MongoDB → Neo4j\n');
    
    // 1. Query MongoDB for location details
    const location = await db.collection('locations').findOne({ _id: 'lowenstein_ll817' });
    console.log('📄 MongoDB Data:');
    console.log(`   Name: ${location.name}`);
    console.log(`   Description: ${location.description}`);
    console.log(`   Amenities: ${location.amenities.join(', ')}`);
    
    // 2. Query Neo4j for navigation path
    const pathResult = await session.run(
      `MATCH path = shortestPath(
        (start:Location {id: 'lowenstein_entrance'})-[:CONNECTED_TO*]-(end:Location {id: 'lowenstein_ll817'})
      )
      RETURN [node in nodes(path) | node.id] as locationIds,
             [rel in relationships(path) | rel.instructions] as instructions`
    );
    
    const locationIds = pathResult.records[0].get('locationIds');
    const instructions = pathResult.records[0].get('instructions');
    
    console.log('\n🗺️  Neo4j Path:');
    console.log(`   Route: ${locationIds.join(' → ')}`);
    console.log('\n📍 Turn-by-turn Directions:');
    
    // 3. Combine data: Neo4j path + MongoDB details
    for (let i = 0; i < locationIds.length; i++) {
      const locId = locationIds[i];
      const locDetails = await db.collection('locations').findOne({ _id: locId });
      
      console.log(`   ${i + 1}. ${locDetails.name} (${locDetails.type})`);
      if (instructions[i]) {
        console.log(`      → ${instructions[i]}`);
      }
    }
    
    console.log('\n✅ Data flow test successful! MongoDB and Neo4j are working together.');
    
  } catch (error) {
    console.error('Error testing data flow:', error);
  } finally {
    await session.close();
    await closeDatabases();
  }
}

testDataFlow();