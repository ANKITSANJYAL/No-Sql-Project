# 🗺️ RamsNavigator Frontend Setup Guide

## Quick Start

### 1. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

### 3. Start the Development Server

```bash
npm start
```

Your app will open at http://localhost:3000

---

## 📸 Image Management: Step-by-Step Guide

You asked about handling images for location photos. Here's a comprehensive guide:

### **Recommended Approach: Google Cloud Storage + MongoDB**

This is the best approach for production because:
- ✅ Fast image delivery via CDN
- ✅ Unlimited scalability
- ✅ No server storage issues
- ✅ Easy to manage and update images

---

## 🎯 Complete Image Workflow

### **Step 1: Set Up Google Cloud Storage**

1. **Create a GCP Account** (if you don't have one)
   - Go to https://cloud.google.com
   - Get $300 free credit for new users

2. **Create a Storage Bucket**
   ```bash
   # Install Google Cloud SDK first
   # Then run:
   gsutil mb gs://rams-navigator-images
   ```
   
   Or via GCP Console:
   - Go to Cloud Storage → Create Bucket
   - Name: `rams-navigator-images`
   - Location: Choose closest to your users
   - Storage class: Standard
   - Access control: Fine-grained

3. **Make Bucket Public (for reading)**
   ```bash
   gsutil iam ch allUsers:objectViewer gs://rams-navigator-images
   ```

4. **Set up CORS (so your website can access images)**
   
   Create a file `cors.json`:
   ```json
   [
     {
       "origin": ["*"],
       "method": ["GET"],
       "responseHeader": ["Content-Type"],
       "maxAgeSeconds": 3600
     }
   ]
   ```
   
   Apply it:
   ```bash
   gsutil cors set cors.json gs://rams-navigator-images
   ```

---

### **Step 2: Upload Sample Images**

For now, you can use free stock images from:
- **Unsplash**: https://unsplash.com (free, high-quality)
- **Pexels**: https://pexels.com (free stock photos)

**Suggested Images to Download:**
- Building entrances
- Hallways
- Staircases
- Classrooms
- Libraries
- Cafeterias

**Upload to GCP:**

```bash
# Upload a single image
gsutil cp entrance.jpg gs://rams-navigator-images/locations/

# Upload multiple images
gsutil -m cp *.jpg gs://rams-navigator-images/locations/

# Upload entire folder
gsutil -m cp -r images/ gs://rams-navigator-images/
```

**Organize your images:**
```
rams-navigator-images/
└── locations/
    ├── lowenstein_entrance.jpg
    ├── lowenstein_hallway_1.jpg
    ├── lowenstein_ll817.jpg
    ├── quinn_library_entrance.jpg
    ├── cafeteria_main.jpg
    └── ...
```

---

### **Step 3: Update MongoDB with Image URLs**

After uploading images, update your MongoDB location documents:

```javascript
// backend/data/seed-mongodb.js

const locations = [
  {
    _id: 'lowenstein_entrance',
    name: 'Lowenstein Building Entrance',
    type: 'entrance',
    building: 'Lowenstein',
    floor: 'Ground',
    description: 'Main entrance to Lowenstein Building',
    images: [
      'https://storage.googleapis.com/rams-navigator-images/locations/lowenstein_entrance.jpg'
    ],
    amenities: ['Accessible', 'Reception Desk'],
    coordinates: { x: 0, y: 0 }
  },
  {
    _id: 'lowenstein_ll817',
    name: 'Room LL817',
    type: 'classroom',
    building: 'Lowenstein',
    floor: 'Lower Level',
    description: 'Large lecture hall with multimedia equipment',
    images: [
      'https://storage.googleapis.com/rams-navigator-images/locations/lowenstein_ll817.jpg',
      'https://storage.googleapis.com/rams-navigator-images/locations/lowenstein_ll817_interior.jpg'
    ],
    amenities: ['WiFi', 'Projector', 'Whiteboard', 'Accessible'],
    capacity: 50,
    coordinates: { x: 45, y: -15 }
  },
  {
    _id: 'quinn_library',
    name: 'Quinn Library',
    type: 'library',
    building: 'Quinn',
    floor: 'Ground',
    description: 'Main university library with extensive collections and study spaces',
    images: [
      'https://storage.googleapis.com/rams-navigator-images/locations/quinn_library.jpg'
    ],
    amenities: ['WiFi', 'Printing', 'Study Rooms', 'Computers', 'Accessible'],
    hours: {
      weekday: '8:00 AM - 10:00 PM',
      weekend: '10:00 AM - 8:00 PM'
    },
    coordinates: { x: 100, y: 50 }
  }
  // Add more locations...
];
```

---

### **Step 4: Create Backend Image Upload API (Optional)**

For easy image management, create an upload endpoint:

```javascript
// backend/routes/images.js

const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');

const router = express.Router();
const storage = new Storage();
const bucket = storage.bucket('rams-navigator-images');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Upload image endpoint
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { locationId } = req.body;
    
    // Generate filename
    const filename = `locations/${locationId}_${Date.now()}.jpg`;
    
    // Upload to GCP
    const blob = bucket.file(filename);
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: req.file.mimetype,
    });

    blobStream.on('error', (err) => {
      res.status(500).json({ error: err.message });
    });

    blobStream.on('finish', async () => {
      // Make the file public
      await blob.makePublic();
      
      // Get public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      
      // Update MongoDB
      await db.collection('locations').updateOne(
        { _id: locationId },
        { $push: { images: publicUrl } }
      );
      
      res.json({
        message: 'Image uploaded successfully',
        imageUrl: publicUrl
      });
    });

    blobStream.end(req.file.buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

Add to your `server.js`:
```javascript
const imageRoutes = require('./routes/images');
app.use('/api/images', imageRoutes);
```

---

### **Step 5: Update Frontend to Display Images**

The frontend is already set up to display images! Just make sure your API returns the image URLs:

**Backend API Response Example:**
```javascript
// GET /api/locations/:id
{
  "_id": "lowenstein_ll817",
  "name": "Room LL817",
  "images": [
    "https://storage.googleapis.com/rams-navigator-images/locations/lowenstein_ll817.jpg"
  ],
  "description": "Large lecture hall...",
  // ... other fields
}
```

**Frontend will automatically display:**
- In `NavigationView`: Shows images at each navigation step
- In `LocationDetails`: Displays location photos in the modal

---

## 🔄 Alternative: Simple Local Storage (for Testing)

If you want to test without setting up GCP:

1. **Add images to frontend:**
   ```bash
   mkdir -p frontend/public/images/locations
   ```

2. **Copy images to that folder**

3. **Update MongoDB with local paths:**
   ```javascript
   images: ["/images/locations/room817.jpg"]
   ```

**Note:** This works for development but is NOT recommended for production.

---

## 📊 Image Workflow Summary

```
1. Collect/Download Images
   ↓
2. Upload to Google Cloud Storage
   ↓
3. Get Public URLs
   ↓
4. Store URLs in MongoDB location documents
   ↓
5. Backend API returns location data with image URLs
   ↓
6. Frontend displays images automatically
```

---

## 💰 Cost Considerations

**Google Cloud Storage Pricing (as of 2024):**
- Storage: ~$0.02/GB/month
- Network egress: First 1GB free, then ~$0.12/GB

**For your project:**
- ~1000 images @ 500KB each = 500MB storage
- Cost: **~$1/month** for storage
- If 1000 users view 10 images/month = ~5GB transfer
- Cost: **~$0.50/month** for bandwidth

**Total: Less than $2/month** 😊

---

## 🎨 Image Optimization Tips

Before uploading, optimize images:

```bash
# Install ImageMagick
brew install imagemagick  # macOS
sudo apt install imagemagick  # Linux

# Resize and compress
mogrify -resize 1920x1080\> -quality 85 *.jpg

# Convert to WebP (better compression)
cwebp -q 80 input.jpg -o output.webp
```

Or use online tools:
- **TinyPNG**: https://tinypng.com
- **Squoosh**: https://squoosh.app

---

## 🚀 Next Steps

1. ✅ Set up Google Cloud Storage bucket
2. ✅ Download/collect sample campus images
3. ✅ Upload images to GCP
4. ✅ Update MongoDB seed data with image URLs
5. ✅ Test frontend display
6. ✅ (Optional) Implement upload API for easy management

---

## 🆘 Troubleshooting

**Images not loading?**
- Check CORS configuration on bucket
- Verify images are public (or use signed URLs)
- Check browser console for errors

**Upload fails?**
- Check file size limits
- Verify GCP credentials
- Check bucket permissions

**Need help?**
- GCP Storage Docs: https://cloud.google.com/storage/docs
- Alternative: Try Cloudinary (has free tier, easier setup)

---

## 📝 Summary

**You asked:** "Should I upload images to GCP buckets and store URLs in MongoDB?"

**Answer:** **YES!** That's the best approach. Here's what you do:

1. Create GCP bucket (5 minutes)
2. Upload sample images from Unsplash/Pexels (10 minutes)
3. Copy public URLs into MongoDB location documents (5 minutes)
4. Done! Frontend will display them automatically ✨

The frontend is already built to handle this - you just need to provide the image URLs in your MongoDB data!

---

Good luck with your project! 🎓🗺️




