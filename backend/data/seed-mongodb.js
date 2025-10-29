const { connectDatabases, closeDatabases, getMongoDb } = require('../config/database');

const dummyLocations = [
  {
    _id: "lowenstein_entrance",
    name: "Lowenstein Center Main Entrance",
    description: "Main entrance to Lowenstein Center",
    building: "Lowenstein Center",
    floor: 1,
    type: "entrance",
    images: [
      {
        url: "/images/lowenstein_entrance.jpg",
        alt_text: "Main entrance doors",
        orientation: "north",
        is_primary: true
      }
    ],
    amenities: ["security_desk", "automatic_doors"],
    accessibility: {
      wheelchair_accessible: true,
      automatic_doors: true,
      elevator_nearby: true
    }
  },
  {
    _id: "lowenstein_lobby_1",
    name: "Lowenstein Center Main Lobby",
    description: "Main entrance hall with security desk and information center",
    building: "Lowenstein Center",
    floor: 1,
    type: "lobby",
    images: [
      {
        url: "/images/lowenstein_lobby_north.jpg",
        alt_text: "View from entrance facing security desk",
        orientation: "north",
        is_primary: true
      }
    ],
    amenities: ["security_desk", "information", "seating", "vending_machines"],
    accessibility: {
      wheelchair_accessible: true,
      automatic_doors: true,
      elevator_nearby: true
    }
  },
  {
    _id: "lowenstein_elevator_bank_a",
    name: "Lowenstein Elevator Bank A",
    description: "Main elevator bank serving all floors",
    building: "Lowenstein Center",
    floor: 1,
    type: "elevator",
    images: [
      {
        url: "/images/elevator_bank_a.jpg",
        alt_text: "Four elevator doors",
        orientation: "east",
        is_primary: true
      }
    ],
    amenities: ["elevators"],
    accessibility: {
      wheelchair_accessible: true,
      elevator_nearby: true
    }
  },
  {
    _id: "lowenstein_floor8_lobby",
    name: "Lowenstein 8th Floor Lobby",
    description: "8th floor landing area near elevators",
    building: "Lowenstein Center",
    floor: 8,
    type: "lobby",
    images: [
      {
        url: "/images/floor8_lobby.jpg",
        alt_text: "8th floor corridor",
        orientation: "north",
        is_primary: true
      }
    ],
    amenities: ["seating", "water_fountain"],
    accessibility: {
      wheelchair_accessible: true
    }
  },
  {
    _id: "lowenstein_ll817",
    name: "Classroom LL-817",
    description: "Large lecture classroom with 50 seats",
    building: "Lowenstein Center",
    floor: 8,
    type: "classroom",
    images: [
      {
        url: "/images/ll817_entrance.jpg",
        alt_text: "Classroom entrance door",
        orientation: "west",
        is_primary: true
      }
    ],
    amenities: ["projector", "whiteboard", "computer"],
    accessibility: {
      wheelchair_accessible: true
    }
  }
];

async function seedMongoDB() {
  try {
    await connectDatabases();
    const db = getMongoDb();
    
    // Clear existing data
    await db.collection('locations').deleteMany({});
    console.log('Cleared existing locations');
    
    // Insert dummy data
    const result = await db.collection('locations').insertMany(dummyLocations);
    console.log(`✅ Inserted ${result.insertedCount} locations into MongoDB`);
    
    // Verify data
    const count = await db.collection('locations').countDocuments();
    console.log(`Total locations in database: ${count}`);
    
  } catch (error) {
    console.error('Error seeding MongoDB:', error);
  } finally {
    await closeDatabases();
  }
}

seedMongoDB();