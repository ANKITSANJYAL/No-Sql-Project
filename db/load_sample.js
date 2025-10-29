// RamsNavigator - Seed sample locations and upload images to GridFS
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { MongoClient, GridFSBucket } = require('mongodb');

const configPath = path.resolve(__dirname, '../config.env');
dotenv.config({ path: configPath });

const URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DATABASE || 'RamsNavigator';

if (!URI) {
  console.error('Missing MONGODB_URI in config.env');
  process.exit(1);
}

async function uploadImage(bucket, filePath, filename) {
  const readStream = fs.createReadStream(filePath);
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename);
    readStream
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => resolve(uploadStream.id));
  });
}

async function main() {
  console.log('\nLoading sample locations and uploading image to GridFS...');
  const client = new MongoClient(URI);
  await client.connect();
  try {
    const db = client.db(DB_NAME);
    const bucket = new GridFSBucket(db, { bucketName: 'images' });

    const lobbyImagePath = path.resolve(__dirname, '../images/lobby.jpg');
    let lobbyFileId = null;
    if (fs.existsSync(lobbyImagePath)) {
      lobbyFileId = await uploadImage(bucket, lobbyImagePath, 'lobby.jpg');
      console.log('✓ Uploaded lobby.jpg to GridFS:', lobbyFileId.toString());
    } else {
      console.warn('! Sample image not found at images/lobby.jpg; inserting docs without images');
    }

    const locations = db.collection('locations');
    const now = new Date();

    const sampleDocs = [
      {
        _id: '1001', // Neo4j location node ID
        name: 'Main Lobby',
        description: 'Central lobby with seating and information desk.',
        building: 'McGinley Center',
        floor: 1,
        type: 'lobby',
        images: lobbyFileId
          ? [
              {
                file_id: lobbyFileId,
                alt_text: 'McGinley Center main lobby',
                orientation: 'landscape',
                is_primary: true
              }
            ]
          : [],
        amenities: ['seating', 'info_desk', 'restrooms_nearby'],
        accessibility: {
          wheelchair_accessible: true,
          automatic_doors: true,
          elevator_nearby: true
        },
        metadata: {
          last_updated: now,
          data_source: 'manual_seed'
        }
      },
      {
        _id: '1002',
        name: 'Room 204 - Classroom',
        description: 'Standard classroom with projector and whiteboard.',
        building: 'Keating Hall',
        floor: 2,
        type: 'classroom',
        images: [],
        amenities: ['projector', 'whiteboard', 'wifi'],
        accessibility: {
          wheelchair_accessible: true,
          automatic_doors: false,
          elevator_nearby: true
        },
        metadata: {
          last_updated: now,
          data_source: 'manual_seed'
        }
      },
      {
        _id: '1003',
        name: 'North Elevator',
        description: 'Elevator near the north entrance.',
        building: 'Walsh Library',
        floor: 1,
        type: 'elevator',
        images: [],
        amenities: ['elevator'],
        accessibility: {
          wheelchair_accessible: true,
          automatic_doors: false,
          elevator_nearby: true
        },
        metadata: {
          last_updated: now,
          data_source: 'manual_seed'
        }
      }
    ];

    await locations.insertMany(sampleDocs, { ordered: true });
    console.log(`✓ Inserted ${sampleDocs.length} sample location documents`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});


