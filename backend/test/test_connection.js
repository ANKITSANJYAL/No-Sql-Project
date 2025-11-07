const { connectDatabases, closeDatabases } = require('../config/database');

async function testConnections() {
  try {
    console.log('Testing database connections...\n');
    await connectDatabases();
    console.log('\nAll connections successful!');
  } catch (error) {
    console.error('Connection test failed:', error.message);
  } finally {
    await closeDatabases();
  }
}

testConnections();