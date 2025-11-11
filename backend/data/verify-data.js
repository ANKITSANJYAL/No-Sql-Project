/**
 * Quick verification script to check if databases have been populated correctly
 * Run this AFTER running both seed scripts
 */

const { connectDatabases, closeDatabases, getMongoDb, neo4jDriver } = require('../config/database');

async function verifyDatabases() {
  console.log('\n=== DATABASE VERIFICATION ===\n');
  
  try {
    await connectDatabases();
    
    // ===== VERIFY MONGODB =====
    console.log('📊 Checking MongoDB...');
    const db = getMongoDb();
    
    const locationCount = await db.collection('locations').countDocuments();
    console.log(`  ✓ Total locations: ${locationCount} ${locationCount === 19 ? '✓ CORRECT' : '✗ EXPECTED 19'}`);
    
    // Check if images exist in documents
    const locationsWithImages = await db.collection('locations')
      .countDocuments({ 'images.0.url': { $exists: true } });
    console.log(`  ✓ Locations with images: ${locationsWithImages} ${locationsWithImages === 19 ? '✓ CORRECT' : '✗ EXPECTED 19'}`);
    
    // Sample some locations
    const sampleLocations = await db.collection('locations')
      .find({})
      .project({ _id: 1, name: 1, 'images.url': 1 })
      .limit(3)
      .toArray();
    
    console.log('\n  Sample locations:');
    sampleLocations.forEach(loc => {
      const imageUrl = loc.images?.[0]?.url || 'NO IMAGE';
      const hasImage = imageUrl.includes('storage.googleapis.com') ? '✓' : '✗';
      console.log(`    ${hasImage} ${loc._id}: ${loc.name}`);
      console.log(`       Image: ${imageUrl}`);
    });
    
    // ===== VERIFY NEO4J =====
    console.log('\n🔗 Checking Neo4j...');
    const session = neo4jDriver.session();
    
    try {
      // Count nodes
      const nodeResult = await session.run('MATCH (n:Location) RETURN count(n) as count');
      const nodeCount = nodeResult.records[0].get('count').toNumber();
      console.log(`  ✓ Total nodes: ${nodeCount} ${nodeCount === 19 ? '✓ CORRECT' : '✗ EXPECTED 19'}`);
      
      // Count relationships
      const relResult = await session.run('MATCH ()-[r:CONNECTED_TO]->() RETURN count(r) as count');
      const relCount = relResult.records[0].get('count').toNumber();
      console.log(`  ✓ Total relationships: ${relCount} ${relCount === 40 ? '✓ CORRECT' : '✗ EXPECTED 40'}`);
      
      // Test critical navigation paths
      console.log('\n  Testing navigation paths:');
      
      const testPaths = [
        { start: 'main_entrance', end: 'quinn_library_entrance', name: 'Main → Library' },
        { start: 'main_entrance', end: 'classroom', name: 'Main → Classroom' },
        { start: 'main_entrance', end: 'ram_cafe', name: 'Main → Ram Café' }
      ];
      
      for (const testPath of testPaths) {
        try {
          const pathResult = await session.run(
            `MATCH path = shortestPath(
              (start:Location {id: $start})-[:CONNECTED_TO*]-(end:Location {id: $end})
            )
            RETURN length(path) as steps, 
                   [node in nodes(path) | node.name] as locationNames`,
            { start: testPath.start, end: testPath.end }
          );
          
          if (pathResult.records.length > 0) {
            const steps = pathResult.records[0].get('steps').toNumber();
            const locations = pathResult.records[0].get('locationNames');
            console.log(`    ✓ ${testPath.name}: ${steps} steps`);
            console.log(`       Route: ${locations[0]} → ... → ${locations[locations.length - 1]}`);
          } else {
            console.log(`    ✗ ${testPath.name}: NO PATH FOUND`);
          }
        } catch (error) {
          console.log(`    ✗ ${testPath.name}: ERROR - ${error.message}`);
        }
      }
      
      // Check for isolated nodes (nodes with no connections)
      const isolatedResult = await session.run(
        `MATCH (n:Location)
         WHERE NOT (n)-[:CONNECTED_TO]-()
         RETURN n.id as id, n.name as name`
      );
      
      if (isolatedResult.records.length > 0) {
        console.log('\n  ⚠️  Warning: Found isolated nodes (no connections):');
        isolatedResult.records.forEach(record => {
          console.log(`    - ${record.get('id')}: ${record.get('name')}`);
        });
      } else {
        console.log('\n  ✓ No isolated nodes - all locations are connected');
      }
      
    } finally {
      await session.close();
    }
    
    // ===== FINAL SUMMARY =====
    console.log('\n=== SUMMARY ===');
    if (locationCount === 19 && nodeCount === 19 && relCount === 40) {
      console.log('✅ ALL CHECKS PASSED! Your databases are ready.');
      console.log('\nNext steps:');
      console.log('  1. Start backend: cd backend && npm start');
      console.log('  2. Start frontend: cd frontend && npm start');
      console.log('  3. Test navigation in the app');
    } else {
      console.log('⚠️  SOME CHECKS FAILED. Review the output above.');
      console.log('\nTo fix:');
      console.log('  1. Ensure both databases are running');
      console.log('  2. Re-run seed scripts:');
      console.log('     node data/seed-mongodb.js');
      console.log('     node data/seed-neo4j.js');
    }
    
  } catch (error) {
    console.error('\n✗ Verification failed:', error.message);
    console.error('\nMake sure:');
    console.error('  1. MongoDB is running (brew services list | grep mongodb)');
    console.error('  2. Neo4j is running (neo4j status)');
    console.error('  3. .env file has correct credentials');
  } finally {
    await closeDatabases();
  }
  
  console.log('\n');
}

verifyDatabases();

