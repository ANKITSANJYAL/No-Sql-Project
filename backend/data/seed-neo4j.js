const { connectDatabases, closeDatabases, neo4jDriver } = require('../config/database');

async function seedNeo4j() {
  const session = neo4jDriver.session();
  
  try {
    await connectDatabases();
    console.log('Seeding Neo4j with navigation graph...\n');
    
    // Clear existing data
    await session.run('MATCH (n) DETACH DELETE n');
    console.log('Cleared existing graph data');
    
    // Create Location Nodes - Actual Fordham Locations
    const locations = [
      { id: 'main_entrance', name: 'Main Entrance', type: 'entrance', building: 'Leon Lowenstein Building', floor: '0' },
      { id: 'front_desk_lobby', name: 'Front Desk Lobby', type: 'lobby', building: 'Leon Lowenstein Building', floor: '0' },
      { id: 'water_fountain', name: 'Water Fountain Junction', type: 'junction', building: 'Leon Lowenstein Building', floor: '0' },
      { id: 'veronica_lally_theatre', name: 'Veronica Lally Theatre Entrance', type: 'venue_entrance', building: 'Leon Lowenstein Building', floor: '0' },
      { id: 'library_corridor', name: 'Library Corridor', type: 'hallway', building: 'Leon Lowenstein Building', floor: '0' },
      { id: 'quinn_commons_wall', name: 'Quinn Library Learning Commons Wall', type: 'junction', building: 'Leon Lowenstein Building', floor: '0' },
      { id: 'quinn_library_entrance', name: 'Quinn Library Entrance', type: 'library_entrance', building: 'Leon Lowenstein Building', floor: '0' },
      { id: 'escalator_up', name: 'Escalator Up', type: 'escalator', building: 'Leon Lowenstein Building', floor: '0-1' },
      { id: 'plaza_indoor_junction', name: 'Plaza Indoor Junction', type: 'junction', building: 'Leon Lowenstein Building', floor: '0' },
      { id: 'plaza_gate_area', name: 'Plaza Gate Area', type: 'exit', building: 'Leon Lowenstein Building', floor: '1' },
      { id: 'plaza_elevator_area', name: 'Plaza Elevator Area', type: 'elevator', building: 'Leon Lowenstein Building', floor: '1-3' },
      { id: 'ram_cafe', name: 'Ram Café', type: 'cafe', building: 'Leon Lowenstein Building', floor: '1' },
      { id: 'third_floor_study_area', name: '3rd Floor Study Area', type: 'study_area', building: 'Leon Lowenstein Building', floor: '3' },
      { id: 'elevator_section_corridor', name: 'Elevator Section Corridor', type: 'corridor', building: 'Leon Lowenstein Building', floor: '3' },
      { id: 'hallway_to_class', name: 'Hallway to Class', type: 'hallway', building: 'Leon Lowenstein Building', floor: '3' },
      { id: 'classroom', name: 'Classroom', type: 'classroom', building: 'Leon Lowenstein Building', floor: '3' },
      { id: 'escalator_down', name: 'Escalator Down', type: 'escalator', building: 'Leon Lowenstein Building', floor: '2-1' },
      { id: 'plaza', name: 'Plaza', type: 'outdoor_plaza', building: 'Leon Lowenstein Building', floor: 'Outdoor' },
      { id: 'gabelli_entrance', name: 'Gabelli School of Business Entrance', type: 'entrance', building: 'Gabelli School of Business', floor: '0' }
    ];
    
    for (const loc of locations) {
      await session.run(
        `CREATE (:Location {id: $id, name: $name, type: $type, building: $building, floor: $floor})`,
        loc
      );
    }
    console.log(`Created ${locations.length} location nodes`);
    
    // Create Neo4j Indexes for optimal query performance
    console.log('\n=== CREATING NEO4J INDEXES ===\n');
    
    try {
      // 1. Index on Location.id (most important - used in all pathfinding queries)
      await session.run(
        `CREATE INDEX location_id_index IF NOT EXISTS FOR (n:Location) ON (n.id)`
      );
      console.log('✓ Created index on Location.id (most important for pathfinding)');
      
      // 2. Index on Location.type (for filtering locations by type)
      await session.run(
        `CREATE INDEX location_type_index IF NOT EXISTS FOR (n:Location) ON (n.type)`
      );
      console.log('✓ Created index on Location.type (for type-based filtering)');
      
      // 3. Composite index on Location.building and Location.floor
      await session.run(
        `CREATE INDEX location_building_floor_index IF NOT EXISTS FOR (n:Location) ON (n.building, n.floor)`
      );
      console.log('✓ Created composite index on Location.building + Location.floor (for building/floor queries)');
      
      console.log('\nAll indexes created successfully!');
    } catch (error) {
      console.error('Warning: Error creating indexes:', error.message);
      console.error('Indexes may already exist or there was a configuration issue.');
    }
    
    // Create Relationships (connections between locations)
    // Each connection includes forwardInstruction and reverseInstruction for bidirectional navigation
    const connections = [
      {
        from: 'main_entrance',
        to: 'front_desk_lobby',
        distance: 2,
        weight: 2,
        forwardInstruction: 'Walk straight from main entrance into the lobby',
        reverseInstruction: 'Walk straight from lobby towards the main entrance'
      },
      {
        from: 'front_desk_lobby',
        to: 'water_fountain',
        distance: 4,
        weight: 4,
        forwardInstruction: 'Walk straight through the lobby, the water fountain will be on your right',
        reverseInstruction: 'Walk straight through the lobby back towards the front desk'
      },
      {
        from: 'water_fountain',
        to: 'escalator_up',
        distance: 3,
        weight: 3,
        forwardInstruction: 'Walk about 3m from the water fountain, the escalator up will be on your right',
        reverseInstruction: 'From the escalator, walk about 3m back, the water fountain will be on your left'
      },
      {
        from: 'water_fountain',
        to: 'escalator_down',
        distance: 3,
        weight: 3,
        forwardInstruction: 'Walk about 3m from the water fountain, the escalator down will be on your right',
        reverseInstruction: 'Once you come down the escalator, walk about 3m back, the water fountain will be on your left'
      },
      {
        from: 'water_fountain',
        to: 'veronica_lally_theatre',
        distance: 5,
        weight: 5,
        forwardInstruction: 'Right next to the water fountain, enter the corridor entrance that leads to Veronica Lally Theatre',
        reverseInstruction: 'Exit the theatre corridor, the water fountain will be next to you on your left'
      },
      {
        from: 'veronica_lally_theatre',
        to: 'library_corridor',
        distance: 0.5,
        weight: 0.5,
        forwardInstruction: 'From the theatre entrance, take left and walk 0.5m to reach the library corridor entrance on your right',
        reverseInstruction: 'At the end of the library corridor, turn left and walk 0.5m to reach the theatre entrance'
      },
      {
        from: 'library_corridor',
        to: 'quinn_commons_wall',
        distance: 10,
        weight: 10,
        forwardInstruction: 'Walk straight 10m down the corridor until you reach the Quinn Library Learning Commons wall',
        reverseInstruction: 'Walk straight 10m back down the corridor from the Quinn Library Learning Commons wall'
      },
      {
        from: 'quinn_commons_wall',
        to: 'quinn_library_entrance',
        distance: 1,
        weight: 1,
        forwardInstruction: 'From the commons wall, take left and walk 1m, then the Quinn Library entrance will be on your right',
        reverseInstruction: 'Exit the Quinn Library entrance, walk 1m straight to the left, then turn right to reach the commons wall'
      },
      {
        from: 'escalator_up',
        to: 'plaza_indoor_junction',
        distance: 3,
        weight: 3,
        forwardInstruction: 'Get off the escalator, take left and walk 3m to reach the plaza indoor junction',
        reverseInstruction: 'From the plaza indoor junction, walk 3m straight towards the escalator, then turn right to reach the escalator going down'
      },
      {
        from: 'plaza_indoor_junction',
        to: 'plaza_gate_area',
        distance: 3,
        weight: 3,
        forwardInstruction: 'From the junction, walk straight 3m and the plaza gate area will be on your right',
        reverseInstruction: 'From the plaza gate area, walk straight 3m back towards the escalator to reach the junction'
      },
      {
        from: 'plaza_indoor_junction',
        to: 'plaza_elevator_area',
        distance: 3,
        weight: 3,
        forwardInstruction: 'From the junction, walk straight 3m past the plaza gate area, the elevator area will be on your left',
        reverseInstruction: 'From the elevator area, walk straight 3m back past the plaza gate area to reach the junction'
      },
      {
        from: 'plaza_indoor_junction',
        to: 'ram_cafe',
        distance: 6,
        weight: 6,
        forwardInstruction: 'From the junction, walk straight ahead past the plaza gate area and elevator area, Ram Café will be in front of you',
        reverseInstruction: 'From Ram Café, walk straight ahead back past the elevator area and plaza gate area to reach the junction'
      },
      {
        from: 'plaza_elevator_area',
        to: 'third_floor_study_area',
        distance: 1,
        weight: 1,
        forwardInstruction: 'Take the elevator up to 3rd floor, exit and you will see the study area in front of you',
        reverseInstruction: 'From the study area, walk straight to the elevator, then take the elevator down to Plaza'
      },
      {
        from: 'third_floor_study_area',
        to: 'elevator_section_corridor',
        distance: 3,
        weight: 3,
        forwardInstruction: 'From the study area, take right towards the elevator corridor and walk straight down the corridor',
        reverseInstruction: 'From the corridor, walk straight back towards the study area, then turn left to reach the study area'
      },
      {
        from: 'elevator_section_corridor',
        to: 'hallway_to_class',
        distance: 7,
        weight: 7,
        forwardInstruction: 'Continue walking straight down the hallway for about 7m',
        reverseInstruction: 'Walk straight back down the hallway for about 7m towards the elevator section'
      },
      {
        from: 'hallway_to_class', //TO-DO:end of hallway??
        to: 'classroom',
        distance: 0,
        weight: 0,
        forwardInstruction: 'At the end of the hallway, the classroom is located on your left',
        reverseInstruction: 'Exit the classroom, turn right to enter the hallway'
      },
      {
        from: 'plaza_indoor_junction',
        to: 'escalator_down',
        distance: 3,
        weight: 3,
        forwardInstruction: 'From the junction, walk 3m straight, then turn right to reach the escalator down',
        reverseInstruction: 'Get off the escalator down, turn left and walk 3m to reach the junction'
      },
      {
        from: 'plaza_gate_area',
        to: 'plaza',
        distance: 1,
        weight: 1,
        forwardInstruction: 'Exit through the plaza gate doors to reach the plaza (scan your ID here)',
        reverseInstruction: 'Enter through the plaza gate doors from the plaza (scan your ID here)'
      },
      {
        from: 'plaza',
        to: 'gabelli_entrance',
        distance: 7,
        weight: 7,
        forwardInstruction: 'Walk straight 7m through the plaza towards the Gabelli School of Business entrance',
        reverseInstruction: 'Walk straight 7m through the plaza from the Gabelli School of Business entrance'
      },
      {
        from: 'gabelli_entrance',
        to: 'quinn_library_entrance',
        distance: 1,
        weight: 1,
        forwardInstruction: 'Enter through the Gabelli entrance and go inside the building to reach the Quinn Library',
        reverseInstruction: 'Exit the Quinn Library, go through the Gabelli entrance to reach the plaza'
      }
    ];
    
    for (const conn of connections) {
      await session.run(
        `MATCH (a:Location {id: $from})
         MATCH (b:Location {id: $to})
         CREATE (a)-[:CONNECTED_TO {
           weight: $weight,
           forwardInstruction: $forwardInstruction,
           direction: 'bidirectional',
           distance: $distance
         }]->(b)
         CREATE (b)-[:CONNECTED_TO {
           weight: $weight,
           reverseInstruction: $reverseInstruction,
           direction: 'bidirectional',
           distance: $distance
         }]->(a)`,
        conn
      );
    }
    console.log(`Created ${connections.length * 2} relationships (bidirectional)`);
    console.log('\nNeo4j seeding completed!');
    
  } catch (error) {
    console.error('Error seeding Neo4j:', error);
  } finally {
    await session.close();
    await closeDatabases();
  }
}

seedNeo4j();

