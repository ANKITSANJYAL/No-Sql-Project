# 🚀 QUICK START - Populate & Run RamsNavigator

## 1️⃣ Populate Databases (First Time Setup)

```bash
cd /Users/roublenepalgmail.com/No-Sql-Project/backend

# Seed MongoDB (19 locations with GCP images)
node data/seed-mongodb.js

# Seed Neo4j (19 nodes, 40 relationships)
node data/seed-neo4j.js

# Verify everything worked
node data/verify-data.js
```

**Expected Output:**
```
✓ Total locations: 19 ✓ CORRECT
✓ Total nodes: 19 ✓ CORRECT
✓ Total relationships: 40 ✓ CORRECT
✅ ALL CHECKS PASSED!
```

---

## 2️⃣ Start Application

### Terminal 1 - Backend
```bash
cd /Users/roublenepalgmail.com/No-Sql-Project/backend
npm start
```
Should see: `Server running on http://localhost:3001`

### Terminal 2 - Frontend
```bash
cd /Users/roublenepalgmail.com/No-Sql-Project/frontend
npm start
```
Should open: `http://localhost:3000`

---

## 3️⃣ Test Your App

### In the UI:
- **Route 1:** Search "Main Entrance" → "Quinn Library Entrance"
- **Route 2:** Search "Main Entrance" → "Classroom"
- **Route 3:** Search "Main Entrance" → "Ram Café"

### In the Chatbot:
- "How do I get to Quinn Library?"
- "Take me to the classroom"
- "Navigate to Ram Café from the main entrance"

**Expected Results:**
- ✅ Turn-by-turn directions
- ✅ Real Fordham campus images
- ✅ Building and floor information
- ✅ Accurate distances

---

## 🔧 Troubleshooting

### "Cannot connect to MongoDB"
```bash
# Check if running
brew services list | grep mongodb

# Start if needed
brew services start mongodb-community
```

### "Cannot connect to Neo4j"
```bash
# Check if running
neo4j status

# Start if needed
neo4j start
```

### "Module not found" errors
```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install
```

---

## 📊 What's in the Database?

**19 Real Fordham Locations:**
- Main Entrance, Front Desk Lobby, Water Fountain Junction
- Veronica Lally Theatre, Library Corridor, Quinn Library Entrance
- Escalators Up/Down, Elevators, Second Floor Junction
- Plaza Gate, Ram Café, Study Area, Classroom
- Plaza, Gabelli Entrance

**20 Bidirectional Navigation Paths:**
- Complete graph connecting all locations
- Supports 3 main routes + combinations
- Real distances and turn-by-turn instructions

**19 GCP Images:**
- All hosted on `https://storage.googleapis.com/rams-navigator-images/`
- Dynamically loaded in navigation steps

---

## 🎯 You're Ready!

Your RamsNavigator prototype is now running with **actual Fordham campus data**. 

For detailed information, see:
- `DATABASE_UPDATE_GUIDE.md` - Complete setup guide
- `ACTUAL_DATA_MIGRATION_SUMMARY.md` - What changed and why

