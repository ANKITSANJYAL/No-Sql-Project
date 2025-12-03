/**
 * Data Validation Service - Ensures Neo4j and MongoDB are in sync
 */

const { getMongoDb, neo4jDriver } = require('../config/database');

class DataValidationService {
  /**
   * Validate that all Neo4j nodes have corresponding MongoDB documents
   */
  async validateDataSync() {
    const db = getMongoDb();
    const session = neo4jDriver.session();
    
    try {
      const results = {
        timestamp: new Date(),
        neo4jNodes: 0,
        mongoDocuments: 0,
        missingInMongo: [],
        missingInNeo4j: [],
        orphanedRelationships: [],
        inconsistentData: [],
        isValid: true,
        summary: ''
      };

      // Get all Neo4j location IDs
      const neo4jResult = await session.run(`
        MATCH (loc:Location)
        RETURN loc.id as id, loc.name as name, loc.type as type
        ORDER BY loc.id
      `);
      
      const neo4jLocations = neo4jResult.records.map(record => ({
        id: record.get('id'),
        name: record.get('name'),
        type: record.get('type')
      }));
      
      results.neo4jNodes = neo4jLocations.length;

      // Get all MongoDB location IDs
      const mongoLocations = await db.collection('locations')
        .find({})
        .project({ _id: 1, name: 1, type: 1 })
        .toArray();
      
      results.mongoDocuments = mongoLocations.length;

      // Create lookup sets
      const neo4jIds = new Set(neo4jLocations.map(loc => loc.id));
      const mongoIds = new Set(mongoLocations.map(loc => loc._id));

      // Find locations in Neo4j but not in MongoDB
      for (const loc of neo4jLocations) {
        if (!mongoIds.has(loc.id)) {
          results.missingInMongo.push({
            id: loc.id,
            name: loc.name,
            type: loc.type
          });
          results.isValid = false;
        }
      }

      // Find locations in MongoDB but not in Neo4j
      for (const loc of mongoLocations) {
        if (!neo4jIds.has(loc._id)) {
          results.missingInNeo4j.push({
            id: loc._id,
            name: loc.name,
            type: loc.type
          });
          results.isValid = false;
        }
      }

      // Check for orphaned relationships (relationships pointing to non-existent nodes)
      const relationshipsResult = await session.run(`
        MATCH (a:Location)-[r:CONNECTED_TO]->(b:Location)
        RETURN a.id as fromId, b.id as toId, r.forwardInstruction as instruction
      `);

      for (const record of relationshipsResult.records) {
        const fromId = record.get('fromId');
        const toId = record.get('toId');
        
        if (!neo4jIds.has(fromId) || !neo4jIds.has(toId)) {
          results.orphanedRelationships.push({
            from: fromId,
            to: toId,
            instruction: record.get('instruction')
          });
          results.isValid = false;
        }
      }

      // Check for data inconsistencies (name/type mismatch between Neo4j and MongoDB)
      for (const neo4jLoc of neo4jLocations) {
        const mongoLoc = mongoLocations.find(m => m._id === neo4jLoc.id);
        if (mongoLoc) {
          const issues = [];
          
          if (neo4jLoc.name !== mongoLoc.name) {
            issues.push(`Name mismatch: Neo4j="${neo4jLoc.name}", MongoDB="${mongoLoc.name}"`);
          }
          
          if (neo4jLoc.type !== mongoLoc.type) {
            issues.push(`Type mismatch: Neo4j="${neo4jLoc.type}", MongoDB="${mongoLoc.type}"`);
          }
          
          if (issues.length > 0) {
            results.inconsistentData.push({
              id: neo4jLoc.id,
              issues
            });
            results.isValid = false;
          }
        }
      }

      // Generate summary
      if (results.isValid) {
        results.summary = `✅ All data is synchronized. ${results.neo4jNodes} nodes in Neo4j match ${results.mongoDocuments} documents in MongoDB.`;
      } else {
        const problems = [];
        if (results.missingInMongo.length > 0) {
          problems.push(`${results.missingInMongo.length} nodes missing in MongoDB`);
        }
        if (results.missingInNeo4j.length > 0) {
          problems.push(`${results.missingInNeo4j.length} documents missing in Neo4j`);
        }
        if (results.orphanedRelationships.length > 0) {
          problems.push(`${results.orphanedRelationships.length} orphaned relationships`);
        }
        if (results.inconsistentData.length > 0) {
          problems.push(`${results.inconsistentData.length} data inconsistencies`);
        }
        results.summary = `❌ Data sync issues found: ${problems.join(', ')}`;
      }

      return results;
    } finally {
      await session.close();
    }
  }

  /**
   * Get statistics about the graph structure
   */
  async getGraphStatistics() {
    const session = neo4jDriver.session();
    
    try {
      // Get node count by type
      const nodesByType = await session.run(`
        MATCH (loc:Location)
        RETURN loc.type as type, count(*) as count
        ORDER BY count DESC
      `);

      // Get relationship count
      const relationshipCount = await session.run(`
        MATCH ()-[r:CONNECTED_TO]->()
        RETURN count(r) as count
      `);

      // Get nodes with no connections
      const isolatedNodes = await session.run(`
        MATCH (loc:Location)
        WHERE NOT (loc)-[:CONNECTED_TO]-()
        RETURN loc.id as id, loc.name as name
      `);

      // Get average connections per node
      const avgConnections = await session.run(`
        MATCH (loc:Location)
        OPTIONAL MATCH (loc)-[r:CONNECTED_TO]-()
        WITH loc, count(r) as connectionCount
        RETURN avg(connectionCount) as avgConnections
      `);

      const totalNodes = nodesByType.records.reduce((sum, r) => sum + r.get('count').toNumber(), 0);
      
      return {
        totalNodes,
        nodesByType: nodesByType.records.map(r => ({
          type: r.get('type'),
          count: r.get('count').toNumber()
        })),
        totalRelationships: relationshipCount.records[0].get('count').toNumber(),
        isolatedNodes: isolatedNodes.records.map(r => ({
          id: r.get('id'),
          name: r.get('name')
        })),
        avgConnectionsPerNode: parseFloat(avgConnections.records[0].get('avgConnections').toFixed(2))
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Test pathfinding accuracy with known routes
   */
  async testNavigationAccuracy() {
    const session = neo4jDriver.session();
    
    try {
      // Define test cases with expected results
      const testCases = [
        {
          name: 'Main Entrance to Library',
          start: 'main_entrance',
          end: 'quinn_library_entrance',
          expectedMaxHops: 7,
          description: 'Short, direct route'
        },
        {
          name: 'Main Entrance to Cafe',
          start: 'main_entrance',
          end: 'ram_cafe',
          expectedMaxHops: 8,
          description: 'Medium-length route with elevator'
        },
        {
          name: 'Library to Classroom',
          start: 'quinn_library_entrance',
          end: 'classroom',
          expectedMaxHops: 10,
          description: 'Multi-floor navigation'
        }
      ];

      const results = [];

      for (const test of testCases) {
        try {
          const startTime = Date.now();
          
          const pathResult = await session.run(`
            MATCH (start:Location {id: $startId}), (end:Location {id: $endId})
            MATCH path = allShortestPaths((start)-[:CONNECTED_TO*..15]-(end))
            WITH path, 
                 relationships(path) as pathRels,
                 reduce(totalWeight = 0, r in relationships(path) | totalWeight + coalesce(r.weight, 1)) as pathWeight
            ORDER BY pathWeight ASC, length(path) ASC
            LIMIT 1
            RETURN 
              [node in nodes(path) | node.id] as locationIds,
              length(path) as hops,
              pathWeight as weight
          `, { startId: test.start, endId: test.end });

          const duration = Date.now() - startTime;

          if (pathResult.records.length > 0) {
            const record = pathResult.records[0];
            const hops = record.get('hops').toNumber();
            const weight = record.get('weight');
            const path = record.get('locationIds');

            results.push({
              testName: test.name,
              status: 'PASS',
              duration: `${duration}ms`,
              hopsFound: hops,
              expectedMaxHops: test.expectedMaxHops,
              withinExpectation: hops <= test.expectedMaxHops,
              weight: weight,
              pathLength: path.length,
              path: path.join(' → ')
            });
          } else {
            results.push({
              testName: test.name,
              status: 'FAIL',
              error: 'No path found',
              duration: `${duration}ms`
            });
          }
        } catch (error) {
          results.push({
            testName: test.name,
            status: 'ERROR',
            error: error.message
          });
        }
      }

      const passCount = results.filter(r => r.status === 'PASS' && r.withinExpectation).length;
      const failCount = results.filter(r => r.status !== 'PASS' || !r.withinExpectation).length;

      return {
        timestamp: new Date(),
        totalTests: testCases.length,
        passed: passCount,
        failed: failCount,
        successRate: `${((passCount / testCases.length) * 100).toFixed(2)}%`,
        results
      };
    } finally {
      await session.close();
    }
  }
}

const dataValidationService = new DataValidationService();

module.exports = dataValidationService;
