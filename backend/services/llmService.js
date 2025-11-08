require('dotenv').config();

/**
 * LLM Service for parsing natural language navigation queries
 * Uses OpenRouter API with free models (e.g., google/gemini-2.0-flash-thinking-exp:free)
 * Note: Node.js v18+ has native fetch support
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Preferred models (try in order). Start with Mistral free model suggested by user.
let MODEL = 'mistralai/mistral-small-3.2-24b-instruct:free';
const FALLBACK_MODEL = 'google/gemini-2.0-flash-exp:free';

// Model rotation list (will be augmented from remote discovery when needed)
const MODEL_CANDIDATES = [MODEL, FALLBACK_MODEL];

// Helper: fetch list of available models from OpenRouter and pick a candidate
async function discoverModelCandidate() {
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}` }
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.warn('Failed to fetch models from OpenRouter:', resp.status, err);
      return null;
    }

    const md = await resp.json();
    const ids = md.models?.map(m => m.id || m.name || '').filter(Boolean) || [];

    // Prefer models with ':free' in the id, then any 'gpt' or 'llama' or 'gemini'
    const freeCandidate = ids.find(id => id.toLowerCase().includes(':free'))
      || ids.find(id => /gpt|llama|gemini|google/i.test(id));

    return freeCandidate || ids[0] || null;
  } catch (err) {
    console.warn('Error discovering models from OpenRouter:', err.message || err);
    return null;
  }
}

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
  "waypoints": [],
  "intent": "Navigate to 8th floor with coffee stop",
  "activityType": "navigation"
}

Now analyze the USER REQUEST and respond with JSON only:`;
}

/**
 * Call OpenRouter API to parse navigation intent
 * @param {string} userQuery - User's natural language query
 * @param {Array} locations - Available locations from database
 * @returns {Promise<Object>} Parsed intent
 */
async function parseNavigationIntent(userQuery, locations) {
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'your_openrouter_api_key_here') {
    console.warn('OpenRouter API key not configured. Using fallback parsing.');
    return fallbackParser(userQuery, locations);
  }

  try {
    const prompt = buildNavigationPrompt(userQuery, locations);
    // Helper to send a single OpenRouter request for a specific model
    async function sendOpenRouterRequest(modelId) {
      const resp = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ramsnavigator.fordham.edu',
          'X-Title': 'RamsNavigator'
        },
        body: JSON.stringify({
          model: modelId,
          messages: [ { role: 'user', content: [ { type: 'text', text: prompt } ] } ],
          temperature: 0.3,
          max_tokens: 700
        })
      });

      return resp;
    }

    // Try model candidates in order, with limited retries/backoff
    const candidates = [...new Set([...MODEL_CANDIDATES])];

    // Discover additional candidates if initial attempts fail
    const discovered = await discoverModelCandidate();
    if (discovered && !candidates.includes(discovered)) candidates.push(discovered);

    let lastErr = null;
    for (let i = 0; i < candidates.length; i++) {
      const candidateModel = candidates[i];
      try {
        const resp = await sendOpenRouterRequest(candidateModel);
        if (!resp.ok) {
          const errText = await resp.text();
          // Rate-limited: try next candidate after short backoff
          if (resp.status === 429) {
            console.warn(`Model ${candidateModel} rate-limited (429), trying next candidate after backoff`);
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
            lastErr = new Error(`OpenRouter retry error: 429 - ${errText}`);
            continue; // try next model
          }
          // Invalid model id -> try discovery/next candidate
          if (resp.status === 400 && /not a valid model id/i.test(errText)) {
            console.warn('Invalid model id:', candidateModel);
            lastErr = new Error(`Invalid model: ${candidateModel}`);
            continue;
          }
          // Other errors: capture and try next
          lastErr = new Error(`OpenRouter API error: ${resp.status} - ${errText}`);
          continue;
        }

        // Successful response
        const data = await resp.json();
        let rawContent = data.choices?.[0]?.message?.content;
        if (!rawContent) throw new Error('Empty response from LLM');

        let llmResponse = '';
        if (typeof rawContent === 'string') {
          llmResponse = rawContent.trim();
        } else if (Array.isArray(rawContent)) {
          llmResponse = rawContent.map(part => {
            if (typeof part === 'string') return part;
            if (part.type === 'text' && part.text) return part.text;
            if (part.type === 'image_url' && part.image_url && part.image_url.url) return `[image: ${part.image_url.url}]`;
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
        // Save chosen model for future requests
        MODEL = candidateModel;

        return { ...parsedIntent, rawQuery: userQuery, timestamp: new Date().toISOString(), model: MODEL };
      } catch (err) {
        console.warn('OpenRouter attempt failed for model', candidateModel, err.message || err);
        lastErr = err;
        // continue to next candidate
      }
    }

    // If we exit loop without return, all candidates failed
    console.error('All OpenRouter model attempts failed:', lastErr && lastErr.message);
    throw lastErr || new Error('All OpenRouter attempts failed');

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
