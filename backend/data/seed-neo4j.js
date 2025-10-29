const { connectDatabases, closeDatabases, neo4jDriver } = require('../config/database');

async function seedNeo4j() {
  const session = neo4jDriver.session();
  
  try {
    await connectDatabases();
    console.log('Seeding Neo4j with navigation graph...\n');
    
    // Clear existing data
    await session.run('MATCH (n) DETACH DELETE n');
    console.log('Cleared existing graph data');
    
    // Create Location Nodes
    const locations = [
      { id: 'lowenstein_entrance', name: 'Lowenstein Center Main Entrance', type: 'entrance', building: 'Lowenstein Center', floor: 1 },
      { id: 'lowenstein_lobby_1', name: 'Lowenstein Center Main Lobby', type: 'lobby', building: 'Lowenstein Center', floor: 1 },
      { id: 'lowenstein_elevator_bank_a', name: 'Lowenstein Elevator Bank A', type: 'elevator', building: 'Lowenstein Center', floor: 1 },
      { id: 'lowenstein_floor8_lobby', name: 'Lowenstein 8th Floor Lobby', type: 'lobby', building: 'Lowenstein Center', floor: 8 },
      { id: 'lowenstein_ll817', name: 'Classroom LL-817', type: 'classroom', building: 'Lowenstein Center', floor: 8 }
    ];
    
    for (const loc of locations) {
      await session.run(
        `CREATE (:Location {id: $id, name: $name, type: $type, building: $building, floor: $floor})`,
        loc
      );
    }
    console.log(`✅ Created ${locations.length} location nodes`);
    
    // Create Relationships (connections between locations)
    const connections = [
      {
        from: 'lowenstein_entrance',
        to: 'lowenstein_lobby_1',
        weight: 1,
        instructions: 'Walk straight through the main entrance',
        distance: 10
      },
      {
        from: 'lowenstein_lobby_1',
        to: 'lowenstein_elevator_bank_a',
        weight: 1,
        instructions: 'Turn right towards the elevator bank',
        distance: 15
      },
      {
        from: 'lowenstein_elevator_bank_a',
        to: 'lowenstein_floor8_lobby',
        weight: 2,
        instructions: 'Take elevator to 8th floor',
        distance: 30
      },
      {
        from: 'lowenstein_floor8_lobby',
        to: 'lowenstein_ll817',
        weight: 1,
        instructions: 'Walk down the corridor, room is on your left',
        distance: 20
      }
    ];
    
    for (const conn of connections) {
      await session.run(
        `MATCH (a:Location {id: $from})
         MATCH (b:Location {id: $to})
         CREATE (a)-[:CONNECTED_TO {
           weight: $weight,
           instructions: $instructions,
           direction: 'bidirectional',
           distance: $distance
         }]->(b)
         CREATE (b)-[:CONNECTED_TO {
           weight: $weight,
           instructions: $instructions,
           direction: 'bidirectional',
           distance: $distance
         }]->(a)`,
        conn
      );
    }
    console.log(`✅ Created ${connections.length * 2} relationships (bidirectional)`);
    
    // Verify the graph
    const result = await session.run('MATCH (n) RETURN count(n) as nodeCount');
    console.log(`\nTotal nodes in graph: ${result.records[0].get('nodeCount')}`);
    
    const relResult = await session.run('MATCH ()-[r]->() RETURN count(r) as relCount');
    console.log(`Total relationships: ${relResult.records[0].get('relCount')}`);
    
  } catch (error) {
    console.error('Error seeding Neo4j:', error);
  } finally {
    await session.close();
    await closeDatabases();
  }
}

seedNeo4j();