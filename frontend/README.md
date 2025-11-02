# RamsNavigator Frontend

A modern React-based frontend for the RamsNavigator campus indoor navigation system.

## 🚀 Features

- **Intuitive Search Interface**: Easy-to-use search bar with autocomplete suggestions
- **Turn-by-Turn Navigation**: Step-by-step directions with visual guidance
- **AI-Powered Chat Assistant**: Natural language queries with RAG integration
- **Location Details**: Rich information about campus locations including amenities and hours
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Modern UI/UX**: Clean, professional design with smooth animations

## 📁 Project Structure

```
frontend/
├── public/
│   └── index.html              # HTML template
├── src/
│   ├── components/             # React components
│   │   ├── Header.js           # Navigation header
│   │   ├── SearchBar.js        # Location search with autocomplete
│   │   ├── NavigationView.js   # Turn-by-turn directions display
│   │   ├── LocationDetails.js  # Location information modal
│   │   └── ChatAssistant.js    # AI chat interface
│   ├── styles/                 # CSS stylesheets
│   │   ├── index.css           # Global styles & CSS variables
│   │   ├── App.css             # App layout styles
│   │   ├── Header.css
│   │   ├── SearchBar.css
│   │   ├── NavigationView.css
│   │   ├── LocationDetails.css
│   │   └── ChatAssistant.css
│   ├── config/
│   │   └── api.js              # API configuration & helper functions
│   ├── App.js                  # Main App component
│   └── index.js                # Entry point
├── package.json
├── .env.example                # Environment variables template
└── README.md
```

## 🛠️ Installation

1. **Install Dependencies**
```bash
cd frontend
npm install
```

2. **Configure Environment**
```bash
cp .env.example .env.local
```

Edit `.env.local` and update the API URL to match your backend:
```
REACT_APP_API_URL=http://localhost:3001/api
```

3. **Start Development Server**
```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### API Integration

Update the API endpoints in `src/config/api.js` to match your backend routes:

```javascript
export const API_ENDPOINTS = {
  navigate: `${API_BASE_URL}/navigate`,
  locations: `${API_BASE_URL}/locations`,
  chat: `${API_BASE_URL}/chat`,
  // Add more endpoints as needed
};
```

### Styling Customization

Global CSS variables are defined in `src/styles/index.css`:

```css
:root {
  --primary-color: #003087;      /* Main brand color */
  --secondary-color: #FFC82C;    /* Accent color */
  --accent-color: #E63946;       /* Alert/highlight color */
  /* ... more variables */
}
```

## 🖼️ Image Management

### Option 1: Cloud Storage (Recommended for Production)

**Using Google Cloud Storage:**

1. **Set up GCP Bucket**
   - Create a bucket in Google Cloud Storage
   - Set appropriate permissions (public read)
   - Configure CORS if needed

2. **Store Image URLs in MongoDB**
   ```javascript
   {
     _id: "lowenstein_ll817",
     name: "Room LL817",
     images: [
       "https://storage.googleapis.com/your-bucket/locations/ll817-main.jpg",
       "https://storage.googleapis.com/your-bucket/locations/ll817-entrance.jpg"
     ]
   }
   ```

3. **Update .env.local**
   ```
   REACT_APP_IMAGE_BASE_URL=https://storage.googleapis.com/your-bucket-name
   ```

**Alternative Cloud Options:**
- AWS S3
- Azure Blob Storage
- Cloudinary (includes image optimization)

### Option 2: Local Storage (Development/Testing)

1. **Create images directory**
   ```bash
   mkdir -p public/images/locations
   ```

2. **Add images to public folder**
   ```
   public/
   └── images/
       └── locations/
           ├── entrance.jpg
           ├── hallway.jpg
           ├── room817.jpg
           └── ...
   ```

3. **Reference in MongoDB**
   ```javascript
   {
     _id: "lowenstein_ll817",
     images: ["/images/locations/room817.jpg"]
   }
   ```

### Image Best Practices

- **Size**: Optimize images to 1920x1080px or smaller
- **Format**: Use WebP for better compression, fallback to JPG
- **Naming**: Use descriptive names: `{building}_{floor}_{room}-{view}.jpg`
- **Alt Text**: Store descriptive alt text in MongoDB for accessibility

### Sample Image Upload Workflow

```javascript
// Backend route to handle image uploads
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  // Upload to GCP
  const blob = bucket.file(`locations/${req.file.originalname}`);
  const blobStream = blob.createWriteStream();
  
  blobStream.end(req.file.buffer);
  
  // Get public URL
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
  
  // Store in MongoDB
  await db.collection('locations').updateOne(
    { _id: req.body.locationId },
    { $push: { images: publicUrl } }
  );
  
  res.json({ imageUrl: publicUrl });
});
```

## 🔗 Connecting to Backend

### Example API Integration

Update components to use actual API calls:

**SearchBar.js:**
```javascript
const fetchLocations = async (query) => {
  const response = await fetch(`${API_ENDPOINTS.searchLocations}?q=${query}`);
  const data = await response.json();
  setSuggestions(data.locations);
};
```

**NavigationView.js:**
```javascript
const fetchRoute = async (start, end) => {
  const response = await fetch(
    `${API_ENDPOINTS.navigate}?start=${start}&end=${end}`
  );
  const route = await response.json();
  setNavigationData(route);
};
```

## 📱 Responsive Design

The app is fully responsive with breakpoints at:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## 🎨 UI Components

### Key Components:

1. **Header**: Fixed navigation bar with logo and menu
2. **SearchBar**: Autocomplete search with start/end location inputs
3. **NavigationView**: Step-by-step directions with progress tracking
4. **LocationDetails**: Modal showing location information
5. **ChatAssistant**: Floating AI assistant with natural language processing

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` folder.

### Deployment Options

- **Netlify**: Connect your Git repository for automatic deployments
- **Vercel**: Zero-config deployments for React apps
- **Firebase Hosting**: Fast CDN-backed hosting
- **Traditional Hosting**: Upload `build/` folder to any web server

## 🔮 Next Steps

1. **Connect to Backend APIs**: Replace mock data with real API calls
2. **Image Integration**: Implement image storage and retrieval
3. **User Authentication**: Add login/profile features if needed
4. **Campus Map Visualization**: Consider adding interactive floor plans
5. **Offline Support**: Implement service workers for offline navigation
6. **Analytics**: Add user tracking for improvements
7. **Accessibility**: Conduct WCAG compliance audit

## 🤝 Contributing

When adding new features:
1. Create new components in `src/components/`
2. Add corresponding styles in `src/styles/`
3. Update API endpoints in `src/config/api.js`
4. Test on mobile, tablet, and desktop views

## 📝 License

This project is part of the RamsNavigator campus navigation system.

---

Built with ❤️ using React

