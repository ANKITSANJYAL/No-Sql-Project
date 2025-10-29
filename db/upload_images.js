// RamsNavigator - Bulk upload images from ./images to GridFS (bucket: images)
const fs = require('fs');
const fsp = fs.promises;
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

const IMAGES_DIR = path.resolve(__dirname, '../images');
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

async function uploadFile(bucket, filePath, filename) {
  return new Promise((resolve, reject) => {
    const now = new Date();
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: { source: 'bulk_upload', uploadedAt: now, localPath: `images/${filename}` }
    });
    fs.createReadStream(filePath)
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => resolve(uploadStream.id));
  });
}

async function main() {
  console.log('\nUploading images from ./images to GridFS (bucket: images)...');

  try {
    const stat = await fsp.stat(IMAGES_DIR);
    if (!stat.isDirectory()) throw new Error('images path is not a directory');
  } catch (e) {
    console.error('images directory not found at:', IMAGES_DIR);
    console.error('Create an images/ folder and put your files there.');
    process.exit(1);
  }

  const entries = await fsp.readdir(IMAGES_DIR);
  const files = entries.filter((name) => ALLOWED_EXT.has(path.extname(name).toLowerCase()));

  if (files.length === 0) {
    console.warn('No image files found (.jpg, .jpeg, .png, .webp). Nothing to upload.');
    process.exit(0);
  }

  const client = new MongoClient(URI);
  await client.connect();
  try {
    const db = client.db(DB_NAME);
    const bucket = new GridFSBucket(db, { bucketName: 'images' });

    const results = [];
    for (const filename of files) {
      const filePath = path.join(IMAGES_DIR, filename);
      try {
        const id = await uploadFile(bucket, filePath, filename);
        results.push({ filename, id: id.toString() });
        console.log(`✓ Uploaded ${filename} -> ${id.toString()}`);
      } catch (err) {
        console.error(`✗ Failed ${filename}:`, err.message);
      }
    }

    console.log('\nMapping (filename -> ObjectId):');
    for (const r of results) {
      console.log(`${r.filename} -> ${r.id}`);
    }

    console.log('\nNext: In Atlas, copy the ObjectId into locations.images[].file_id');
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Upload failed:', err.message);
  process.exit(1);
});


