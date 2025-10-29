// RamsNavigator - MongoDB Locations Collection Setup
const path = require('path');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');

const configPath = path.resolve(__dirname, '../config.env');
dotenv.config({ path: configPath });

const URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DATABASE || 'RamsNavigator';

if (!URI) {
  console.error('Missing MONGODB_URI in config.env');
  process.exit(1);
}

const locationsValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['_id', 'name', 'building', 'floor', 'type', 'accessibility', 'metadata'],
    additionalProperties: false,
    properties: {
      _id: { bsonType: 'string', description: 'Must be Neo4j node ID as string' },
      name: { bsonType: 'string' },
      description: { bsonType: 'string' },
      building: { bsonType: 'string' },
      floor: { bsonType: ['int', 'long'], description: 'Floor number' },
      type: { bsonType: 'string' },
      images: {
        bsonType: 'array',
        items: {
          bsonType: 'object',
          required: ['file_id', 'is_primary'],
          additionalProperties: false,
          properties: {
            file_id: { bsonType: 'objectId', description: 'GridFS file ID' },
            alt_text: { bsonType: 'string' },
            orientation: { bsonType: 'string', enum: ['landscape', 'portrait', 'square'] },
            is_primary: { bsonType: 'bool' }
          }
        }
      },
      amenities: { bsonType: 'array', items: { bsonType: 'string' } },
      accessibility: {
        bsonType: 'object',
        required: ['wheelchair_accessible', 'automatic_doors', 'elevator_nearby'],
        additionalProperties: false,
        properties: {
          wheelchair_accessible: { bsonType: 'bool' },
          automatic_doors: { bsonType: 'bool' },
          elevator_nearby: { bsonType: 'bool' }
        }
      },
      metadata: {
        bsonType: 'object',
        required: ['last_updated', 'data_source'],
        additionalProperties: false,
        properties: {
          last_updated: { bsonType: 'date' },
          data_source: { bsonType: 'string' }
        }
      }
    }
  }
};

async function ensureLocationsCollection(db) {
  const name = 'locations';
  const existing = await db.listCollections({ name }).toArray();
  if (existing.length === 0) {
    await db.createCollection(name, {
      validator: locationsValidator,
      validationLevel: 'strict',
      validationAction: 'error'
    });
    console.log('✓ Created collection: locations with validator');
  } else {
    await db.command({
      collMod: name,
      validator: locationsValidator,
      validationLevel: 'strict',
      validationAction: 'error'
    });
    console.log('✓ Updated validator on existing collection: locations');
  }
}

async function createIndexes(db) {
  const col = db.collection('locations');
  const results = await col.createIndexes([
    { key: { building: 1, floor: 1 }, name: 'idx_building_floor' },
    { key: { type: 1 }, name: 'idx_type' },
    { key: { amenities: 1 }, name: 'idx_amenities' },
    { key: { name: 'text', description: 'text' }, name: 'idx_text_name_desc' }
  ]);
  console.log('✓ Indexes created:', results);
}

async function main() {
  console.log('\nSetting up MongoDB locations collection...');
  const client = new MongoClient(URI);
  await client.connect();
  try {
    const db = client.db(DB_NAME);
    await ensureLocationsCollection(db);
    await createIndexes(db);
    console.log('✓ Setup complete');
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});


