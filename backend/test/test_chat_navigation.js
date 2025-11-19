/**
 * Test script for AI Chat / LLM Navigation Endpoints
 * 
 * This script tests the new chat-based navigation features that use LLM
 * to parse natural language queries and map them to actual locations.
 * 
 * Prerequisites:
 * 1. Backend server running (npm start)
 * 2. MongoDB seeded with locations (node data/seed-mongodb.js)
 * 3. Neo4j seeded with graph (node data/seed-neo4j.js)
 * 4. OpenRouter API key configured in .env (optional, will use fallback if missing)
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'cyan');
  console.log('='.repeat(70) + '\n');
}

async function testEndpoint(name, url, method = 'GET', body = null) {
  log(`Testing: ${name}`, 'blue');
  log(`${method} ${url}`, 'reset');
  
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
      log(`Request body: ${JSON.stringify(body, null, 2)}`, 'reset');
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      log('SUCCESS', 'green');
      console.log(JSON.stringify(data, null, 2));
      return { success: true, data };
    } else {
      log(`FAILED (${response.status})`, 'red');
      console.log(JSON.stringify(data, null, 2));
      return { success: false, data };
    }
  } catch (error) {
    log(`ERROR: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('RamsNavigator AI Chat Navigation Tests', 'cyan');
  log('Make sure backend server is running on port 3001\n', 'yellow');
  
  // Test 1: Health check
  logSection('Test 1: Health Check');
  await testEndpoint(
    'Health Check',
    `${API_BASE}/health`
  );
  
  // Test 2: Parse intent - explicit locations
  logSection('Test 2: Parse Intent - Explicit Locations');
  await testEndpoint(
    'Parse: "I am at the main entrance, take me to room 817"',
    `${API_BASE}/chat/parse-intent`,
    'POST',
    { query: 'I am at the main entrance, take me to room 817' }
  );
  
  // Test 3: Parse intent - activity-based (books → library)
  logSection('Test 3: Parse Intent - Activity to Location (Books)');
  await testEndpoint(
    'Parse: "I am at the main gate, I want to borrow some books"',
    `${API_BASE}/chat/parse-intent`,
    'POST',
    { query: 'I am at the main gate, I want to borrow some books' }
  );
  
  // Test 4: Parse intent - implicit destination
  logSection('Test 4: Parse Intent - Implicit Destination');
  await testEndpoint(
    'Parse: "Take me to the 8th floor"',
    `${API_BASE}/chat/parse-intent`,
    'POST',
    { query: 'Take me to the 8th floor' }
  );
  
  // Test 5: Parse intent - casual language
  logSection('Test 5: Parse Intent - Casual Language');
  await testEndpoint(
    'Parse: "I need to get to classroom 817"',
    `${API_BASE}/chat/parse-intent`,
    'POST',
    { query: 'I need to get to classroom 817' }
  );
  
  // Test 6: Complete navigation - explicit locations
  logSection('Test 6: Complete Navigation - Explicit Locations');
  await testEndpoint(
    'Navigate: "I am at the main entrance, take me to room 817"',
    `${API_BASE}/chat/navigate`,
    'POST',
    { query: 'I am at the main entrance, take me to room 817' }
  );
  
  // Test 7: Complete navigation - from lobby to classroom
  logSection('Test 7: Complete Navigation - Lobby to Classroom');
  await testEndpoint(
    'Navigate: "I am at the lobby, navigate me to LL-817"',
    `${API_BASE}/chat/navigate`,
    'POST',
    { query: 'I am at the lobby, navigate me to LL-817' }
  );
  
  // Test 8: Error handling - vague query
  logSection('Test 8: Error Handling - Vague Query');
  await testEndpoint(
    'Navigate: "I want to go somewhere"',
    `${API_BASE}/chat/navigate`,
    'POST',
    { query: 'I want to go somewhere' }
  );
  
  // Test 9: Error handling - missing query
  logSection('Test 9: Error Handling - Missing Query');
  await testEndpoint(
    'Navigate: (empty query)',
    `${API_BASE}/chat/navigate`,
    'POST',
    { query: '' }
  );
  
  // Test 10: Multi-word locations
  logSection('Test 10: Parse Intent - Multi-word Locations');
  await testEndpoint(
    'Parse: "From Lowenstein Center Main Lobby to 8th floor"',
    `${API_BASE}/chat/parse-intent`,
    'POST',
    { query: 'From Lowenstein Center Main Lobby to 8th floor' }
  );
  
  logSection('Test Summary');
  log('All tests completed!', 'green');
  log('Check the output above for any failures.', 'yellow');
  log('\nNote: If OpenRouter API key is not configured, the system will use', 'yellow');
  log('fallback rule-based parsing which has limited capabilities.', 'yellow');
  log('\nTo enable full LLM capabilities:', 'cyan');
  log('1. Get a free API key from https://openrouter.ai/', 'cyan');
  log('2. Add it to backend/.env as OPENROUTER_API_KEY', 'cyan');
  log('3. See backend/OPENROUTER_SETUP.md for detailed instructions', 'cyan');
}

// Run tests
runTests().catch(error => {
  log(`\nTest suite failed: ${error.message}`, 'red');
  process.exit(1);
});
