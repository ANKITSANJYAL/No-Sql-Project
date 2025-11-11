const { connectDatabases, closeDatabases, neo4jDriver } = require('../config/database');

async function seedNeo4j() {
  const session = neo4jDriver.session();
  
  try {
    await connectDatabases();
    console.log('Seeding Neo4j with navigation graph...\n');
    
    // Clear existing data
    await session.run('MATCH (n) DETACH DELETE n');
    console.log('✓ Cleared existing graph data');
    
    // Create Location Nodes - Actual Fordham Locations
    const locations = [
      { id: 'main_entrance', name: 'Main Entrance', type: 'entrance', building: 'Leon Lowenstein Building', floor: '1' },
      { id: 'front_desk_lobby', name: 'Front Desk Lobby', type: 'lobby', building: 'Leon Lowenstein Building', floor: '1' },
      { id: 'water_fountain', name: 'Water Fountain Junction', type: 'junction', building: 'Leon Lowenstein Building', floor: '1' },
      { id: 'veronica_lally_theatre', name: 'Veronica Lally Theatre Entrance', type: 'venue_entrance', building: 'Leon Lowenstein Building', floor: '1' },
      { id: 'library_corridor', name: 'Library Corridor', type: 'hallway', building: 'Leon Lowenstein Building', floor: '1' },
      { id: 'quinn_commons_wall', name: 'Quinn Library Learning Commons Wall', type: 'junction', building: 'Leon Lowenstein Building', floor: '1' },
      { id: 'quinn_library_entrance', name: 'Quinn Library Entrance', type: 'library_entrance', building: 'Leon Lowenstein Building', floor: '1' },
      { id: 'escalator_up', name: 'Escalator Up', type: 'escalator', building: 'Leon Lowenstein Building', floor: '1-2' },
      { id: 'second_floor_junction', name: 'Second Floor Junction', type: 'junction', building: 'Leon Lowenstein Building', floor: '2' },
      { id: 'plaza_gate_area', name: 'Plaza Gate Area', type: 'exit', building: 'Leon Lowenstein Building', floor: '2' },
      { id: 'elevator_area', name: 'Elevator Area', type: 'elevator', building: 'Leon Lowenstein Building', floor: '2-3' },
      { id: 'ram_cafe', name: 'Ram Café', type: 'cafe', building: 'Leon Lowenstein Building', floor: '2' },
      { id: 'third_floor_study_area', name: '3rd Floor Study Area', type: 'study_area', building: 'Leon Lowenstein Building', floor: '3' },
      { id: 'elevator_section_corridor', name: 'Elevator Section Corridor', type: 'corridor', building: 'Leon Lowenstein Building', floor: '3' },
      { id: 'hallway_to_class', name: 'Hallway to Class', type: 'hallway', building: 'Leon Lowenstein Building', floor: '3' },
      { id: 'classroom', name: 'Classroom', type: 'classroom', building: 'Leon Lowenstein Building', floor: '3' },
      { id: 'escalator_down', name: 'Escalator Down', type: 'escalator', building: 'Leon Lowenstein Building', floor: '2-1' },
      { id: 'plaza', name: 'Plaza', type: 'outdoor_plaza', building: 'Leon Lowenstein Building', floor: 'Outdoor' },
      { id: 'gabelli_entrance', name: 'Gabelli School of Business Entrance', type: 'entrance', building: 'Gabelli School of Business', floor: '1' }
    ];
    
    for (const loc of locations) {
      await session.run(
        `CREATE (:Location {id: $id, name: $name, type: $type, building: $building, floor: $floor})`,
        loc
      );
    }
    console.log(`✓ Created ${locations.length} location nodes`);
    
    // Create Relationships (connections between locations)
    // Note: Using same instructions for both directions for now
    // Can be enhanced with direction-specific instructions later
    const connections = [
      {
        from: 'main_entrance',
        to: 'front_desk_lobby',
        distance: 2,
        weight: 2,
        instructions: 'Walk straight from main entrance towards the front desk'
      },
      {
        from: 'front_desk_lobby',
        to: 'water_fountain',
        distance: 4,
        weight: 4,
        instructions: 'Continue straight ahead through the lobby'
      },
      {
        from: 'front_desk_lobby',
        to: 'escalator_up',
        distance: 11,
        weight: 11,
        instructions: 'Walk straight from front desk until you see the escalator'
      },
      {
        from: 'water_fountain',
        to: 'veronica_lally_theatre',
        distance: 5,
        weight: 5,
        instructions: 'Turn right at the water fountain and walk straight down the hallway'
      },
      {
        from: 'water_fountain',
        to: 'escalator_down',
        distance: 1,
        weight: 1,
        instructions: 'The downward escalator from floor 2 arrives here'
      },
      {
        from: 'veronica_lally_theatre',
        to: 'library_corridor',
        distance: 0.5,
        weight: 0.5,
        instructions: 'Turn left at the theatre entrance to access the library corridor'
      },
      {
        from: 'library_corridor',
        to: 'quinn_commons_wall',
        distance: 10,
        weight: 10,
        instructions: 'Walk straight down the long corridor until you reach the Quinn Library Learning Commons wall'
      },
      {
        from: 'quinn_commons_wall',
        to: 'quinn_library_entrance',
        distance: 1,
        weight: 1,
        instructions: 'Turn left and walk to the Quinn Library entrance doors'
      },
      {
        from: 'escalator_up',
        to: 'second_floor_junction',
        distance: 0.5,
        weight: 0.5,
        instructions: 'Step off escalator and turn LEFT, walk 0.5m to reach the main junction'
      },
      {
        from: 'second_floor_junction',
        to: 'elevator_area',
        distance: 1,
        weight: 1,
        instructions: 'From the junction, turn LEFT to reach the elevator area'
      },
      {
        from: 'second_floor_junction',
        to: 'plaza_gate_area',
        distance: 1,
        weight: 1,
        instructions: 'From the junction, turn RIGHT to reach the plaza gate doors'
      },
      {
        from: 'second_floor_junction',
        to: 'ram_cafe',
        distance: 3,
        weight: 3,
        instructions: 'From the junction, walk STRAIGHT ahead 3m to Ram Café'
      },
      {
        from: 'elevator_area',
        to: 'third_floor_study_area',
        distance: 1,
        weight: 1,
        instructions: 'Take elevator to 3rd floor, exit and walk 0.5m straight to study area'
      },
      {
        from: 'third_floor_study_area',
        to: 'elevator_section_corridor',
        distance: 3,
        weight: 3,
        instructions: 'Turn left and walk straight 3m until you cross the elevator section'
      },
      {
        from: 'elevator_section_corridor',
        to: 'hallway_to_class',
        distance: 7,
        weight: 7,
        instructions: 'Continue straight down the classroom hallway for 7m'
      },
      {
        from: 'hallway_to_class',
        to: 'classroom',
        distance: 0,
        weight: 0,
        instructions: 'The classroom is located on your left'
      },
      {
        from: 'second_floor_junction',
        to: 'escalator_down',
        distance: 1,
        weight: 1,
        instructions: 'Near the junction you will find the downward escalator'
      },
      {
        from: 'plaza_gate_area',
        to: 'plaza',
        distance: 0,
        weight: 0,
        instructions: 'Exit through the plaza gate doors (scan your ID here)'
      },
      {
        from: 'plaza',
        to: 'gabelli_entrance',
        distance: 7,
        weight: 7,
        instructions: 'Walk straight 7m through the plaza towards Gabelli School of Business entrance'
      },
      {
        from: 'gabelli_entrance',
        to: 'quinn_library_entrance',
        distance: 0,
        weight: 0,
        instructions: 'Enter through Gabelli entrance to access Quinn Library'
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
    console.log(`✓ Created ${connections.length * 2} relationships (bidirectional)`);
    
    // Verify the graph
    const result = await session.run('MATCH (n) RETURN count(n) as nodeCount');
    console.log(`\n✓ Total nodes in graph: ${result.records[0].get('nodeCount')}`);
    
    const relResult = await session.run('MATCH ()-[r]->() RETURN count(r) as relCount');
    console.log(`✓ Total relationships: ${relResult.records[0].get('relCount')}`);
    
    // Display sample paths
    console.log('\n--- Sample Navigation Paths ---');
    const paths = [
      { start: 'main_entrance', end: 'quinn_library_entrance', name: 'Main Entrance → Library' },
      { start: 'main_entrance', end: 'classroom', name: 'Main Entrance → Classroom' },
      { start: 'main_entrance', end: 'ram_cafe', name: 'Main Entrance → Ram Café' }
    ];
    
    for (const path of paths) {
      const pathResult = await session.run(
        `MATCH path = shortestPath(
          (start:Location {id: $start})-[:CONNECTED_TO*]-(end:Location {id: $end})
        )
        RETURN length(path) as steps`,
        { start: path.start, end: path.end }
      );
      
      if (pathResult.records.length > 0) {
        const steps = pathResult.records[0].get('steps').toNumber();
        console.log(`  ✓ ${path.name}: ${steps} steps`);
      }
    }
    
  } catch (error) {
    console.error('✗ Error seeding Neo4j:', error);
  } finally {
    await session.close();
    await closeDatabases();
  }
}

seedNeo4j();

