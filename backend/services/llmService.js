require('dotenv').config();

/**
 * LLM Service for parsing natural language navigation queries
 * Uses OpenAI API with GPT-4o-mini (fast and cost-effective model)
 * Note: Node.js v18+ has native fetch support
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
// Using GPT-4o-mini - fast, affordable, and capable model
const MODEL = 'gpt-4o-mini';

// No model discovery needed for OpenAI - we use a single, reliable model

/**
 * Build context-aware prompt with available locations
 * @param {string} userQuery - Natural language query from user
 * @param {Array} locations - Available campus locations from MongoDB
 * @returns {string} Formatted prompt for LLM
 */
function buildNavigationPrompt(userQuery, locations) {
  // Extract location names and amenities for LLM context
  // To avoid very large prompts, compress the locations list: limit to a maximum and shorten amenities
  const MAX_LOCATIONS_IN_PROMPT = 60;
  let locationsToInclude = locations;
  if (Array.isArray(locations) && locations.length > MAX_LOCATIONS_IN_PROMPT) {
    // Simple heuristic: prefer locations with type 'library', 'cafe', 'classroom', then fill with first N
    const priorityTypes = ['library', 'cafe', 'classroom', 'dining', 'elevator'];
    const prioritized = [];
    for (const t of priorityTypes) {
      for (const loc of locations) {
        if (loc.type && loc.type.toLowerCase() === t && !prioritized.includes(loc)) prioritized.push(loc);
      }
    }
    // Fill remaining with the first locations until we reach the cap
    for (const loc of locations) {
      if (prioritized.includes(loc)) continue;
      prioritized.push(loc);
      if (prioritized.length >= MAX_LOCATIONS_IN_PROMPT) break;
    }
    locationsToInclude = prioritized.slice(0, MAX_LOCATIONS_IN_PROMPT);
    console.warn(`buildNavigationPrompt: truncated locations from ${locations.length} to ${locationsToInclude.length} for prompt size`);
  }

  const locationContext = (locationsToInclude || []).map(loc => {
    const shortAmenities = (loc.amenities || []).slice(0, 3).map(a => a.split(' ')[0]).join(', ');
    const amenitiesStr = shortAmenities ? ` (amenities: ${shortAmenities})` : '';
    return `- "${loc.name}" [ID: ${loc._id}] - ${loc.type || 'unknown'} in ${loc.building || 'unknown'}, Floor ${loc.floor || 'n/a'}${amenitiesStr}`;
  }).join('\n');

  return `You are a campus navigation assistant for Fordham University. Your job is to parse natural language navigation requests and extract structured information.

AVAILABLE LOCATIONS:
${locationContext}

USER REQUEST: "${userQuery}"

TASK:
Analyze the user's request and extract:
1. START LOCATION: Where the user is currently (may be explicit like "main entrance" or implicit like "I'm at the lobby")
2. END LOCATION: Where they want to go (may be explicit like "Room 817" or implicit based on activity like "borrow books" → library, "grab coffee" → coffee shop)
3. WAYPOINTS: Any intermediate stops mentioned (e.g., "coffee first, then library")
4. INTENT: Brief description of what the user wants to do

IMPORTANT RULES:
- Match user's casual descriptions to formal location names (e.g., "main gate" → "Lowenstein Center Main Entrance")
- Infer destinations from activities:
  * "borrow books", "study", "library" → locations with "library" type or amenities
  * "grab coffee", "caffeine", "coffee shop" → locations with "cafe" or "coffee" in amenities
  * "attend class", "classroom" → locations with "classroom" type
  * "take elevator" → locations with "elevator" type
- If start location is unclear, use "current_location" or the first mentioned location
- Only use location IDs from the AVAILABLE LOCATIONS list above
- Return "null" for any field that cannot be determined

OUTPUT FORMAT (respond ONLY with valid JSON, no other text):
{
  "start": {
    "id": "location_id or null",
    "name": "Location Name or null",
    "confidence": 0.0-1.0
  },
  "end": {
    "id": "location_id or null", 
    "name": "Location Name or null",
    "confidence": 0.0-1.0
  },
  "waypoints": [
    {
      "id": "location_id",
      "name": "Location Name",
      "reason": "why stopping here"
    }
  ],
  "intent": "Brief summary of what user wants",
  "activityType": "navigation|information|assistance"
}

EXAMPLE 1:
User: "I am at the main gate, I want to borrow some books"
Response:
{
  "start": {"id": "lowenstein_entrance", "name": "Lowenstein Center Main Entrance", "confidence": 0.9},
  "end": {"id": null, "name": null, "confidence": 0.0},
  "waypoints": [],
  "intent": "User wants to borrow books from library",
  "activityType": "navigation"
}

EXAMPLE 2:
User: "Take me to room 817"
Response:
{
  "start": {"id": null, "name": "Current Location", "confidence": 0.5},
  "end": {"id": "lowenstein_ll817", "name": "Classroom LL-817", "confidence": 0.95},
  "waypoints": [],
  "intent": "Navigate to classroom 817",
  "activityType": "navigation"
}

EXAMPLE 3:
User: "I need to go to the 8th floor but grab coffee first"
Response:
{
  "start": {"id": null, "name": "Current Location", "confidence": 0.5},
  "end": {"id": "lowenstein_floor8_lobby", "name": "Lowenstein 8th Floor Lobby", "confidence": 0.8},
  "waypoints": [
    {
      "id": "lowenstein_cafeteria",
      "name": "Lowenstein Cafeteria",
      "reason": "Get coffee before going to 8th floor"
    }
  ],
  "intent": "Navigate to 8th floor with coffee stop",
  "activityType": "navigation"
}

EXAMPLE 4:
User: "I'm at main entrance, need to grab lunch at the cafeteria then go to library"
Response:
{
  "start": {"id": "lowenstein_entrance", "name": "Lowenstein Center Main Entrance", "confidence": 0.9},
  "end": {"id": "lowenstein_library", "name": "Lowenstein Library", "confidence": 0.9},
  "waypoints": [
    {
      "id": "lowenstein_cafeteria",
      "name": "Lowenstein Cafeteria",
      "reason": "Grab lunch before going to library"
    }
  ],
  "intent": "Get lunch at cafeteria, then go to library to study",
  "activityType": "navigation"
}

EXAMPLE 5:
User: "take me to the classroom from main entrance, but I want to grab a coffee and book first"
Response:
{
  "start": {"id": "lowenstein_entrance", "name": "Lowenstein Center Main Entrance", "confidence": 0.9},
  "end": {"id": "lowenstein_ll817", "name": "Classroom LL-817", "confidence": 0.85},
  "waypoints": [
    {
      "id": "lowenstein_cafeteria",
      "name": "Lowenstein Cafeteria",
      "reason": "Grab coffee"
    },
    {
      "id": "lowenstein_library",
      "name": "Lowenstein Library",
      "reason": "Get book"
    }
  ],
  "intent": "Navigate to classroom with stops at cafe and library",
  "activityType": "navigation"
}

CRITICAL RULES FOR WAYPOINTS:
- The END location is the FINAL destination (e.g., "classroom", "room 817")
- WAYPOINTS are intermediate stops BEFORE reaching the end (e.g., "coffee", "book", "lunch")
- Look for words like "first", "then", "before", "after", "stop by", "via", "through", "but I want to"
- Extract ALL intermediate stops as separate waypoints
- If user says "coffee AND book" or "coffee and book", create TWO waypoints
- The system will optimize the ORDER of waypoints automatically to find shortest path
- DO NOT put intermediate stops as the end location

Now analyze the USER REQUEST and respond with JSON only:`;
}

/**
 * Call OpenAI API to parse navigation intent
 * @param {string} userQuery - User's natural language query
 * @param {Array} locations - Available locations from database
 * @returns {Promise<Object>} Parsed intent
 */
async function parseNavigationIntent(userQuery, locations) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
    console.warn('OpenAI API key not configured. Using fallback parsing.');
    return fallbackParser(userQuery, locations);
  }

  try {
    const prompt = buildNavigationPrompt(userQuery, locations);
    
    // Call OpenAI API
    const resp = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 700
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`OpenAI API error: ${resp.status} - ${errText}`);
      
      // If rate limited or error, fall back to simple parsing
      if (resp.status === 429) {
        console.warn('OpenAI rate limit reached, using fallback parser');
      }
      return fallbackParser(userQuery, locations);
    }

    // Parse response
    const data = await resp.json();
    let rawContent = data.choices?.[0]?.message?.content;
    
    if (!rawContent) {
      throw new Error('Empty response from OpenAI');
    }

    let llmResponse = '';
    if (typeof rawContent === 'string') {
      llmResponse = rawContent.trim();
    } else if (Array.isArray(rawContent)) {
      llmResponse = rawContent.map(part => {
        if (typeof part === 'string') return part;
        if (part.type === 'text' && part.text) return part.text;
        return '';
      }).join('\n').trim();
    } else if (typeof rawContent === 'object' && rawContent.type === 'text' && rawContent.text) {
      llmResponse = rawContent.text.trim();
    } else {
      throw new Error('Unsupported LLM response format');
    }

    // Extract JSON from codeblock if present
    let jsonText = llmResponse;
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1].split('```')[0].trim();
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1].split('```')[0].trim();
    }

    const parsedIntent = JSON.parse(jsonText);

    return { 
      ...parsedIntent, 
      rawQuery: userQuery, 
      timestamp: new Date().toISOString(), 
      model: MODEL 
    };

  } catch (error) {
    console.error('Error parsing with LLM:', error);
    // Fallback to rule-based parsing
    return fallbackParser(userQuery, locations);
  }
}

/**
 * Fallback parser for when LLM is unavailable
 * Uses simple keyword matching and heuristics
 */
function fallbackParser(userQuery, locations) {
  const lowerQuery = userQuery.toLowerCase();
  
  // Activity keywords to location type mapping
  const activityMap = {
    'borrow books': 'library',
    'study': 'library',
    'library': 'library',
    'coffee': 'cafe',
    'caffeine': 'cafe',
    'eat': 'dining',
    'food': 'dining',
    'class': 'classroom',
    'lecture': 'classroom',
    'elevator': 'elevator',
    'stairs': 'stairs'
  };

  // Try to find start location
  let startLoc = null;
  const startKeywords = ['from', 'at', 'starting', "i'm at", 'currently'];
  for (const keyword of startKeywords) {
    if (lowerQuery.includes(keyword)) {
      // Find location mentions after this keyword
      for (const loc of locations) {
        const locName = loc.name.toLowerCase();
        const afterKeyword = lowerQuery.split(keyword)[1];
        if (afterKeyword && afterKeyword.includes(locName.substring(0, Math.min(locName.length, 15)))) {
          startLoc = { id: loc._id, name: loc.name, confidence: 0.7 };
          break;
        }
      }
      if (startLoc) break;
    }
  }

  // Try to find end location by name or activity
  let endLoc = null;
  const destKeywords = ['to', 'go to', 'navigate', 'take me', 'find', 'looking for'];
  
  // First try exact location matches
  for (const loc of locations) {
    if (lowerQuery.includes(loc.name.toLowerCase()) || 
        lowerQuery.includes(loc._id.toLowerCase())) {
      endLoc = { id: loc._id, name: loc.name, confidence: 0.9 };
      break;
    }
  }

  // If no exact match, try activity-based matching
  if (!endLoc) {
    for (const [activity, targetType] of Object.entries(activityMap)) {
      if (lowerQuery.includes(activity)) {
        // Find location with matching type or amenities
        const matchingLoc = locations.find(loc => 
          loc.type === targetType || 
          (loc.amenities && loc.amenities.some(a => a.includes(targetType)))
        );
        if (matchingLoc) {
          endLoc = { 
            id: matchingLoc._id, 
            name: matchingLoc.name, 
            confidence: 0.6 
          };
          break;
        }
      }
    }
  }

  return {
    start: startLoc || { id: null, name: 'Current Location', confidence: 0.3 },
    end: endLoc || { id: null, name: null, confidence: 0.0 },
    waypoints: [],
    intent: userQuery,
    activityType: 'navigation',
    rawQuery: userQuery,
    timestamp: new Date().toISOString(),
    model: 'fallback-parser',
    note: 'LLM unavailable, using rule-based parsing'
  };
}

module.exports = {
  parseNavigationIntent,
  buildNavigationPrompt
};
