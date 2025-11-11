# Database Update Guide - Actual Fordham Data

## ✅ What Was Updated

All dummy data has been replaced with **actual Fordham Rose Hill campus data**:

### 📊 MongoDB (`seed-mongodb.js`)
- **19 actual locations** with real GCP image URLs
- Complete location details: descriptions, buildings, floors, types
- Amenities and accessibility information
- All images from your GCP bucket: `rams-navigator-images`

### 🔗 Neo4j (`seed-neo4j.js`)
- **19 location nodes** matching MongoDB
- **20 bidirectional connections** (40 total relationships)
- Navigation instructions, distances, and weights
- Complete graph for all 3 main routes

---

## 📍 Your 19 Locations

1. **Main Entrance** (Floor 1)
2. **Front Desk Lobby** (Floor 1)
3. **Water Fountain Junction** (Floor 1)
4. **Veronica Lally Theatre Entrance** (Floor 1)
5. **Library Corridor** (Floor 1)
6. **Quinn Library Learning Commons Wall** (Floor 1)
7. **Quinn Library Entrance** (Floor 1)
8. **Escalator Up** (Floor 1-2)
9. **Second Floor Junction** (Floor 2)
10. **Plaza Gate Area** (Floor 2)
11. **Elevator Area** (Floor 2-3)
12. **Ram Café** (Floor 2)
13. **3rd Floor Study Area** (Floor 3)
14. **Elevator Section Corridor** (Floor 3)
15. **Hallway to Class** (Floor 3)
16. **Classroom** (Floor 3)
17. **Escalator Down** (Floor 2-1)
18. **Plaza** (Outdoor)
19. **Gabelli School of Business Entrance** (Gabelli Building)

---

## 🚀 How to Populate Databases

### Step 1: Make sure databases are running

**MongoDB:**
```bash
# Check if MongoDB is running
brew services list | grep mongodb
# Or start it
brew services start mongodb-community
```

**Neo4j:**
```bash
# Check Neo4j status
neo4j status
# Or start it
neo4j start
```

### Step 2: Run seed scripts

```bash
cd /Users/roublenepalgmail.com/No-Sql-Project/backend

# Seed MongoDB (this will clear old data and insert 19 locations)
node data/seed-mongodb.js

# Seed Neo4j (this will clear old graph and create navigation paths)
node data/seed-neo4j.js
```

### Step 3: Verify data was loaded

**MongoDB:**
```bash
mongosh
> use ramsnavigator
> db.locations.countDocuments()
# Should return: 19

> db.locations.findOne({ _id: "main_entrance" })
# Should show main entrance data with GCP image URL
```

**Neo4j:**
Open Neo4j Browser: `http://localhost:7474`

Run this query:
```cypher
MATCH (n:Location) RETURN count(n)
// Should return: 19

MATCH ()-[r:CONNECTED_TO]->() RETURN count(r)
// Should return: 40 (20 bidirectional connections)

// Test a path: Main Entrance → Library
MATCH path = shortestPath(
  (start:Location {id: "main_entrance"})-[:CONNECTED_TO*]-(end:Location {id: "quinn_library_entrance"})
)
RETURN path
```

---

## 🎯 Your 3 Main Navigation Routes

### Route 1: Main Entrance → Quinn Library
```
main_entrance → front_desk_lobby → water_fountain → veronica_lally_theatre 
→ library_corridor → quinn_commons_wall → quinn_library_entrance
```

### Route 2: Main Entrance → Classroom
```
main_entrance → front_desk_lobby → escalator_up → second_floor_junction 
→ elevator_area → third_floor_study_area → elevator_section_corridor 
→ hallway_to_class → classroom
```

### Route 3: Main Entrance → Library (via Ram Café)
```
main_entrance → front_desk_lobby → escalator_up → second_floor_junction 
→ ram_cafe → [continue to library via various paths]
```

---

## 🖼️ All GCP Images

Your images are stored in: `https://storage.googleapis.com/rams-navigator-images/locations/`

1. `main_entrance.jpg`
2. `front_desk_lobby.jpg`
3. `water_fountain.jpg`
4. `veronica_lally_theatre.jpg`
5. `quinn_commons_wall.jpg`
6. `library_corridor.jpg`
7. `quinn_library_entrance.jpg`
8. `escalator_up.jpg`
9. `second_floor_junction.jpg`
10. `plaza_gate_area.jpg`
11. `elevator_area.jpg`
12. `ram_cafe.jpg`
13. `third_floor_study_area.jpg`
14. `elevator_section_corridor.jpg`
15. `hallway_to_class.jpg`
16. `classroom.jpg`
17. `escalator_down.jpg`
18. `plaza.jpg`
19. `gabelli_entrance.jpg`

---

## 📝 Important Notes

### Bidirectional Instructions
Currently, both directions use the **same instruction text**. This is intentional for now and can be enhanced later with direction-specific instructions (e.g., "turn left" vs "turn right").

To add direction-specific instructions in the future, modify the connections in `seed-neo4j.js` to include:
```javascript
{
  from: 'location_a',
  to: 'location_b',
  instructions_forward: 'Turn left at the fountain',
  instructions_backward: 'Turn right at the fountain',
  // ...
}
```

### Image Format in MongoDB
Each location stores images as:
```javascript
images: [
  {
    url: "https://storage.googleapis.com/rams-navigator-images/locations/main_entrance.jpg",
    alt_text: "Main entrance lobby with Fordham seal on floor",
    is_primary: true
  }
]
```

The frontend accesses images via: `location.images[0].url`

---

## 🔧 Troubleshooting

### "Cannot connect to MongoDB"
- Check if MongoDB is running: `brew services list | grep mongodb`
- Verify connection string in `.env`: `MONGODB_URI=mongodb://localhost:27017/ramsnavigator`

### "Cannot connect to Neo4j"
- Check if Neo4j is running: `neo4j status`
- Verify credentials in `.env`:
  ```
  NEO4J_URI=bolt://localhost:7687
  NEO4J_USER=neo4j
  NEO4J_PASSWORD=your_password
  ```

### "Seed script fails"
- Ensure both databases are running
- Check `.env` file has correct credentials
- Look at error messages for specific issues

---

## 🎓 Next Steps

1. **Run seed scripts** to populate databases
2. **Start backend server**: `npm start` (from backend directory)
3. **Start frontend**: `npm start` (from frontend directory)
4. **Test navigation**: Search "Main Entrance" to "Quinn Library Entrance"
5. **Check images**: Images should display in navigation steps

Your RamsNavigator is now ready with real Fordham campus data! 🎉

