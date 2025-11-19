const { connectDatabases, closeDatabases, getMongoDb } = require('../config/database');

// GCP Storage base URL - Actual bucket with uploaded images
const GCP_STORAGE_BASE = "https://storage.googleapis.com/rams-navigator-images";

// ACTUAL LOCATION DATA - Fordham Rose Hill Campus
const actualLocations = [
  {
    _id: "main_entrance",
    name: "Main Entrance",
    description: "Main entrance lobby with terrazzo flooring, featuring Fordham seal on floor, information desk visible ahead with wooden wall paneling",
    building: "Leon Lowenstein Building",
    floor: 1,
    type: "entrance",
    images: [
      {
        url: `${GCP_STORAGE_BASE}/locations/main_entrance.jpg`,
        alt_text: "Main entrance lobby with Fordham seal on floor",
        is_primary: true
      }
    ],
    amenities: ["information_desk", "automatic_doors", "security"],
    accessibility: {
      wheelchair_accessible: true,
      automatic_doors: true,
      elevator_nearby: true
    }
  },
  {
    _id: "front_desk_lobby",
    name: "Front Desk Lobby",
    description: "Reception area with front desk against wooden textured wall, terrazzo flooring continues, administrative counter visible",
    building: "Leon Lowenstein Building",
    floor: 1,
    type: "lobby",
    images: [
      {
        url: `${GCP_STORAGE_BASE}/locations/front_desk_lobby.jpg`,
        alt_text: "Front desk area with wooden wall paneling",
        is_primary: true
      }
    ],
    amenities: ["front_desk", "information", "seating"],
    accessibility: {
      wheelchair_accessible: true,
      automatic_doors: true
    }
  },
  {
    _id: "water_fountain",
    name: "Water Fountain Junction",
    description: "Hallway intersection with wall-mounted water fountain and phone, terrazzo flooring, wooden wall panels, view through to corridors ahead",
    building: "Leon Lowenstein Building",
    floor: 1,
    type: "junction",
    images: [
      {
        url: `${GCP_STORAGE_BASE}/locations/water_fountain.jpg`,
        alt_text: "Hallway junction with water fountain",
        is_primary: true
      }
    ],
    amenities: ["water_fountain", "phone"],
    accessibility: {
      wheelchair_accessible: true
    }
  },
  {
    _id: "veronica_lally_theatre",
    name: "Veronica Lally Theatre Entrance",
    description: "Theater entrance with curved red wall featuring repeated text 'VERONICA LALLY THEATRE', orange wooden reception desk, modern linear ceiling lighting, patterned floor with geometric design in red, black and white",
    building: "Leon Lowenstein Building",
    floor: 1,
    type: "venue_entrance",
    images: [
      {
        url: `${GCP_STORAGE_BASE}/locations/veronica_lally_theatre.jpg`,
        alt_text: "Theatre entrance with curved red wall and reception desk",
        is_primary: true
      }
    ],
    amenities: ["theatre", "reception_desk", "seating"],
    accessibility: {
      wheelchair_accessible: true
    }
  },
  {
    _id: "library_corridor",
    name: "Library Corridor",
    description: "Long corridor with gray walls, black handrails on both sides, terrazzo flooring with red accent strips, fluorescent lighting, leading to library area",
    building: "Leon Lowenstein Building",
    floor: 1,
    type: "hallway",
    images: [
      {
        url: `${GCP_STORAGE_BASE}/locations/library_corridor.jpg`,
        alt_text: "Long corridor leading to library",
        is_primary: true
      }
    ],
    amenities: ["handrails"],
    accessibility: {
      wheelchair_accessible: true,
      handrails: true
    }
  },
  {
    _id: "quinn_commons_wall",
    name: "Quinn Library Learning Commons Wall",
    description: "Signage wall for Quinn Library Learning Commons, exposed ceiling with orange/tan colored flooring and modern industrial design elements",
    building: "Leon Lowenstein Building",
    floor: 1,
    type: "junction",
    images: [
      {
        url: `${GCP_STORAGE_BASE}/locations/quinn_commons_wall.jpg`,
        alt_text: "Quinn Library Learning Commons signage wall",
        is_primary: true
      }
    ],
    amenities: ["signage"],
    accessibility: {
      wheelchair_accessible: true
    }
  },
  {
    _id: "quinn_library_entrance",
    name: "Quinn Library Entrance",
    description: "Double frosted glass doors with metal handles marked 'QUINN LIBRARY' in text above, wooden frame surround, two small window panels in doors",
    building: "Leon Lowenstein Building",
    floor: 1,
    type: "library_entrance",
    images: [
      {
        url: `${GCP_STORAGE_BASE}/locations/quinn_library_entrance.jpg`,
        alt_text: "Quinn Library entrance doors",
        is_primary: true
      }
    ],
    amenities: ["library", "study_spaces", "computers", "wifi"],
    accessibility: {
      wheelchair_accessible: true,
      automatic_doors: true
    }
  },
  {
    _id: "escalator_up",
    name: "Escalator Up",
    description: "Escalator with wooden paneling and Fordham University seal on floor, connects first floor to second floor",
    building: "Leon Lowenstein Building",
    floor: "1-2",
    type: "escalator",
    images: [
      {
        url: `${GCP_STORAGE_BASE}/locations/escalator_up.jpg`,
        alt_text: "Upward escalator with Fordham seal",
        is_primary: true
      }
    ],
    amenities: ["escalator"],
    accessibility: {
      wheelchair_accessible: false,
      elevator_nearby: true
    }
  },
  {
    _id: "plaza_indoor_junction",
    name: "Second Floor Junction",
    description: "Main junction on second floor after stepping off escalator and turning left. Plaza Gate on left, Elevators on right, Ram Café straight ahead",
    building: "Leon Lowenstein Building",
    floor: 2,
    type: "junction",
    images: [
      {
        url: `${GCP_STORAGE_BASE}/locations/second_floor_junction.jpg`,
        alt_text: "Main junction on second floor",
        is_primary: true
      }
    ],
    amenities: ["seating", "signage"],
    accessibility: {
      wheelchair_accessible: true,
      elevator_nearby: true
    }
  },
  {
    _id: "plaza_gate_area",
    name: "Plaza Gate Area",
    description: "Glass plaza doors with exit signage, ID scan required, leads to outdoor plaza",
    building: "Leon Lowenstein Building",
    floor: 2,
    type: "exit",
    images: [
      {
        url: `${GCP_STORAGE_BASE}/locations/plaza_gate_area.jpg`,
        alt_text: "Plaza exit doors with ID scanner",
        is_primary: true
      }
    ],
    amenities: ["id_scanner", "exit"],
    accessibility: {
      wheelchair_accessible: true,
      automatic_doors: true
    }
  },
  {
    _id: "plaza_elevator_area",
    name: "Elevator Area",
    description: "Elevator bank with dark gray doors, information boards posted on center panel, tile flooring, provides vertical access between floors",
    building: "Leon Lowenstein Building",
    floor: "2-3",
    type: "elevator",
    images: [
      {
        url: `${GCP_STORAGE_BASE}/locations/elevator_area.jpg`,
        alt_text: "Elevator bank",
        is_primary: true
      }
    ],
    amenities: ["elevators", "information_boards"],
    accessibility: {
      wheelchair_accessible: true,
      elevator_nearby: true
    }
  },
  {
    _id: "ram_cafe",
    name: "Ram Café",
    description: "Campus café with red accent wall and 'Ram Café' signage, entrance with wooden paneling, bulletin boards on left side, open dining area visible through entrance",
    building: "Leon Lowenstein Building",
    floor: 2,
    type: "cafe",
    images: [
      {
        url: `${GCP_STORAGE_BASE}/locations/ram_cafe.jpg`,
        alt_text: "Ram Café entrance",
        is_primary: true
      }
    ],
    amenities: ["cafe", "food", "seating", "wifi", "bulletin_boards"],
    accessibility: {
      wheelchair_accessible: true
    }
  },
  {
    _id: "third_floor_study_area",
    name: "3rd Floor Study Area",
    description: "Open study space with desks and chairs, cylindrical columns, terrazzo flooring, natural lighting with seating arrangements throughout",
    building: "Leon Lowenstein Building",
    floor: 3,
    type: "study_area",
    images: [
      {
        url: `${GCP_STORAGE_BASE}/locations/third_floor_study_area.jpg`,
        alt_text: "Open study area with desks",
        is_primary: true
      }
    ],
    amenities: ["study_space", "desks", "chairs", "natural_light", "wifi"],
    accessibility: {
      wheelchair_accessible: true,
      elevator_nearby: true
    }
  },
  {
    _id: "elevator_section_corridor",
    name: "Elevator Section Corridor",
    description: "Corridor section passing elevator area on third floor, modern hallway with dark walls and tile flooring",
    building: "Leon Lowenstein Building",
    floor: 3,
    type: "corridor",
    images: [
      {
        url: `${GCP_STORAGE_BASE}/locations/elevator_section_corridor.jpg`,
        alt_text: "Third floor corridor near elevators",
        is_primary: true
      }
    ],
    amenities: [],
    accessibility: {
      wheelchair_accessible: true
    }
  },
  {
    _id: "hallway_to_class",
    name: "Hallway to Class",
    description: "Academic hallway with dark walls, black handrails, terrazzo flooring with tan tile sections, recessed lighting, classroom doors along left side",
    building: "Leon Lowenstein Building",
    floor: 3,
    type: "hallway",
    images: [
      {
        url: `${GCP_STORAGE_BASE}/locations/hallway_to_class.jpg`,
        alt_text: "Classroom hallway",
        is_primary: true
      }
    ],
    amenities: ["handrails"],
    accessibility: {
      wheelchair_accessible: true,
      handrails: true
    }
  },
  {
    _id: "classroom",
    name: "Classroom",
    description: "Classroom with dark wood door featuring window panel, room number placard on wall, located on left side of hallway",
    building: "Leon Lowenstein Building",
    floor: 3,
    type: "classroom",
    images: [
      {
        url: `${GCP_STORAGE_BASE}/locations/classroom.jpg`,
        alt_text: "Classroom entrance",
        is_primary: true
      }
    ],
    amenities: ["projector", "whiteboard", "desks", "chairs"],
    accessibility: {
      wheelchair_accessible: true
    }
  },
  {
    _id: "escalator_down",
    name: "Escalator Down",
    description: "Downward escalator from second floor to first floor, wooden architectural features with curved wooden panels, modern design with recessed lighting",
    building: "Leon Lowenstein Building",
    floor: "2-1",
    type: "escalator",
    images: [
      {
        url: `${GCP_STORAGE_BASE}/locations/escalator_down.jpg`,
        alt_text: "Downward escalator",
        is_primary: true
      }
    ],
    amenities: ["escalator"],
    accessibility: {
      wheelchair_accessible: false,
      elevator_nearby: true
    }
  },
  {
    _id: "plaza",
    name: "Plaza",
    description: "Outdoor plaza area with covered pergola structure, grass lawns with tiered seating areas, stone planters with blue tile accents, trees and landscaping, paved walkways connecting to Gabelli School of Business entrance visible in background",
    building: "Leon Lowenstein Building",
    floor: "Outdoor",
    type: "outdoor_plaza",
    images: [
      {
        url: `${GCP_STORAGE_BASE}/locations/plaza.jpg`,
        alt_text: "Outdoor plaza with seating areas",
        is_primary: true
      }
    ],
    amenities: ["outdoor_seating", "landscaping", "pergola", "walkways"],
    accessibility: {
      wheelchair_accessible: true
    }
  },
  {
    _id: "gabelli_entrance",
    name: "Gabelli School of Business Entrance",
    description: "Entrance to Gabelli School of Business with illuminated signage reading 'GABELLI SCHOOL OF BUSINESS', 'STUDENT AFFAIRS', and 'GERALD M. QUINN LIBRARY', glass doors with brick facade and warm interior lighting",
    building: "Gabelli School of Business",
    floor: 1,
    type: "entrance",
    images: [
      {
        url: `${GCP_STORAGE_BASE}/locations/gabelli_entrance.jpg`,
        alt_text: "Gabelli School entrance with illuminated signage",
        is_primary: true
      }
    ],
    amenities: ["automatic_doors", "signage", "student_affairs", "library_access"],
    accessibility: {
      wheelchair_accessible: true,
      automatic_doors: true
    }
  }
];

async function seedMongoDB() {
  try {
    await connectDatabases();
    const db = getMongoDb();
    
    // Clear existing data
    await db.collection('locations').deleteMany({});
    console.log('✓ Cleared existing locations');
    
    // Insert actual location data
    const result = await db.collection('locations').insertMany(actualLocations);
    console.log(`✓ Inserted ${result.insertedCount} locations into MongoDB`);
    
    // Verify data
    const count = await db.collection('locations').countDocuments();
    console.log(`✓ Total locations in database: ${count}`);
    
    // Display some sample locations
    console.log('\nSample locations:');
    const samples = await db.collection('locations')
      .find({})
      .limit(3)
      .project({ _id: 1, name: 1, building: 1, floor: 1 })
      .toArray();
    samples.forEach(loc => {
      console.log(`  - ${loc.name} (${loc.building}, Floor ${loc.floor})`);
    });
    
  } catch (error) {
    console.error('✗ Error seeding MongoDB:', error);
  } finally {
    await closeDatabases();
  }
}

seedMongoDB();