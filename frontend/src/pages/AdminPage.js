import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminPage.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function AdminPage() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [validation, setValidation] = useState(null);
  const [graphStats, setGraphStats] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('adminAuthenticated');
    if (!isAuthenticated) {
      navigate('/admin/login');
    }
  }, [navigate]);

  // Fetch all data
  const fetchData = async () => {
    try {
      const [metricsRes, validationRes, statsRes, testsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/metrics`),
        fetch(`${API_BASE_URL}/api/admin/validate`),
        fetch(`${API_BASE_URL}/api/admin/graph-stats`),
        fetch(`${API_BASE_URL}/api/admin/test-navigation`)
      ]);

      const metricsData = await metricsRes.json();
      const validationData = await validationRes.json();
      const statsData = await statsRes.json();
      const testsData = await testsRes.json();

      setMetrics(metricsData.data);
      setValidation(validationData.data);
      setGraphStats(statsData.data);
      setTestResults(testsData.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setLoading(false);
    }
  };

  // Auto-refresh every 10 seconds
  useEffect(() => {
    fetchData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleResetMetrics = async () => {
    if (window.confirm('Are you sure you want to reset all metrics?')) {
      try {
        await fetch(`${API_BASE_URL}/api/metrics/reset`, { method: 'POST' });
        fetchData();
        alert('Metrics reset successfully!');
      } catch (error) {
        alert('Error resetting metrics: ' + error.message);
      }
    }
  };

  const handleExportMetrics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/metrics/export`);
      const data = await response.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ramsnavigator-metrics-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Metrics exported successfully!');
    } catch (error) {
      alert('Error exporting metrics: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading">Loading admin dashboard...</div>
      </div>
    );
  }

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuthenticated');
    navigate('/admin/login');
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>RamsNavigator Admin Dashboard</h1>
        <div className="admin-actions">
          <label className="auto-refresh">
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (10s)
          </label>
          <button onClick={fetchData} className="btn-refresh">Refresh Now</button>
          <button onClick={handleExportMetrics} className="btn-export">Export Data</button>
          <button onClick={handleResetMetrics} className="btn-reset">Reset Metrics</button>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </div>

      <div className="admin-tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''} 
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'navigation' ? 'active' : ''} 
          onClick={() => setActiveTab('navigation')}
        >
          Navigation
        </button>
        <button 
          className={activeTab === 'llm' ? 'active' : ''} 
          onClick={() => setActiveTab('llm')}
        >
          LLM Performance
        </button>
        <button 
          className={activeTab === 'validation' ? 'active' : ''} 
          onClick={() => setActiveTab('validation')}
        >
          Data Validation
        </button>
        <button 
          className={activeTab === 'tests' ? 'active' : ''} 
          onClick={() => setActiveTab('tests')}
        >
          Test Results
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'overview' && (
          <div className="tab-content">
            <h2>System Overview</h2>
            
            <div className="metrics-grid">
              <div className="metric-card uptime">
                <div className="metric-icon">UPTIME</div>
                <div className="metric-info">
                  <h3>System Uptime</h3>
                  <p className="metric-value">{metrics?.uptime?.hours || '0'} hours</p>
                  <p className="metric-label">Since {new Date(metrics?.uptime?.startedAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="metric-card navigation">
                <div className="metric-icon">NAV</div>
                <div className="metric-info">
                  <h3>Navigation Queries</h3>
                  <p className="metric-value">{metrics?.navigation?.totalQueries || 0}</p>
                  <p className="metric-label">Success Rate: {metrics?.navigation?.successRate || '0%'}</p>
                </div>
              </div>

              <div className="metric-card llm">
                <div className="metric-icon">AI</div>
                <div className="metric-info">
                  <h3>LLM Parse Rate</h3>
                  <p className="metric-value">{metrics?.llm?.successRate || '0%'}</p>
                  <p className="metric-label">{metrics?.llm?.successful || 0} successful parses</p>
                </div>
              </div>

              <div className="metric-card performance">
                <div className="metric-icon">PERF</div>
                <div className="metric-info">
                  <h3>Avg Response Time</h3>
                  <p className="metric-value">{metrics?.performance?.avgPathCalculationTime || '0ms'}</p>
                  <p className="metric-label">Pathfinding performance</p>
                </div>
              </div>

              <div className="metric-card validation">
                <div className="metric-icon">{validation?.isValid ? 'OK' : 'ERR'}</div>
                <div className="metric-info">
                  <h3>Data Synchronization</h3>
                  <p className="metric-value">{validation?.isValid ? 'Synced' : 'Issues Found'}</p>
                  <p className="metric-label">{validation?.neo4jNodes || 0} nodes synced</p>
                </div>
              </div>

              <div className="metric-card tests">
                <div className="metric-icon">TEST</div>
                <div className="metric-info">
                  <h3>Automated Tests</h3>
                  <p className="metric-value">{testResults?.successRate || '0%'}</p>
                  <p className="metric-label">{testResults?.passed || 0}/{testResults?.totalTests || 0} passed</p>
                </div>
              </div>
            </div>

            <div className="popular-routes">
              <h3>Top 5 Popular Routes</h3>
              <div className="routes-list">
                {metrics?.topRoutes && metrics.topRoutes.length > 0 ? (
                  metrics.topRoutes.map((route, index) => (
                    <div key={index} className="route-item">
                      <span className="route-rank">#{index + 1}</span>
                      <span className="route-path">{route.route}</span>
                      <span className="route-count">{route.count} uses</span>
                    </div>
                  ))
                ) : (
                  <p className="no-data">No routes data yet. Run some navigations!</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'navigation' && (
          <div className="tab-content">
            <h2>Navigation Performance</h2>
            
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Queries</h3>
                <p className="stat-value">{metrics?.navigation?.totalQueries || 0}</p>
              </div>
              <div className="stat-card success">
                <h3>Successful</h3>
                <p className="stat-value">{metrics?.navigation?.successful || 0}</p>
              </div>
              <div className="stat-card failed">
                <h3>Failed</h3>
                <p className="stat-value">{metrics?.navigation?.failed || 0}</p>
              </div>
              <div className="stat-card rate">
                <h3>Success Rate</h3>
                <p className="stat-value">{metrics?.navigation?.successRate || '0%'}</p>
              </div>
            </div>

            <div className="graph-statistics">
              <h3>📈 Graph Structure</h3>
              <div className="graph-stats-grid">
                <div className="graph-stat">
                  <span className="stat-label">Total Nodes:</span>
                  <span className="stat-number">{graphStats?.totalNodes || 0}</span>
                </div>
                <div className="graph-stat">
                  <span className="stat-label">Total Relationships:</span>
                  <span className="stat-number">{graphStats?.totalRelationships || 0}</span>
                </div>
                <div className="graph-stat">
                  <span className="stat-label">Avg Connections/Node:</span>
                  <span className="stat-number">{graphStats?.avgConnectionsPerNode || 0}</span>
                </div>
                <div className="graph-stat">
                  <span className="stat-label">Isolated Nodes:</span>
                  <span className="stat-number">{graphStats?.isolatedNodes || 0}</span>
                </div>
              </div>

              {graphStats?.nodesByType && (
                <div className="nodes-by-type">
                  <h4>Nodes by Type:</h4>
                  <div className="type-list">
                    {graphStats.nodesByType.map((item) => (
                      <div key={item.type} className="type-item">
                        <span className="type-name">{item.type}</span>
                        <span className="type-count">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {metrics?.recentErrors && metrics.recentErrors.length > 0 && (
              <div className="recent-errors">
                <h3>Recent Errors</h3>
                <div className="errors-list">
                  {metrics.recentErrors.map((error, index) => (
                    <div key={index} className="error-item">
                      <span className="error-time">{new Date(error.timestamp).toLocaleString()}</span>
                      <span className="error-message">{error.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'llm' && (
          <div className="tab-content">
            <h2>LLM Performance Analysis</h2>
            
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Parse Attempts</h3>
                <p className="stat-value">{(metrics?.llm?.successful || 0) + (metrics?.llm?.failed || 0)}</p>
              </div>
              <div className="stat-card success">
                <h3>Successful</h3>
                <p className="stat-value">{metrics?.llm?.successful || 0}</p>
              </div>
              <div className="stat-card failed">
                <h3>Failed</h3>
                <p className="stat-value">{metrics?.llm?.failed || 0}</p>
              </div>
              <div className="stat-card rate">
                <h3>Success Rate</h3>
                <p className="stat-value">{metrics?.llm?.successRate || '0%'}</p>
              </div>
            </div>

            <div className="llm-details">
              <div className="detail-card">
                <h3>Fallback Parser Usage</h3>
                <p className="detail-value">{metrics?.llm?.fallbackUsed || 0}</p>
                <p className="detail-description">Times fallback parser was used when LLM failed</p>
              </div>
              <div className="detail-card">
                <h3>Ambiguous Queries</h3>
                <p className="detail-value">{metrics?.llm?.ambiguousQueries || 0}</p>
                <p className="detail-description">Queries that needed clarification</p>
              </div>
            </div>

            <div className="llm-explanation">
              <h3>Ambiguity Handling Strategy</h3>
              <div className="explanation-content">
                <div className="explanation-step">
                  <span className="step-number">1</span>
                  <div className="step-content">
                    <h4>OpenAI GPT-4o-mini Parsing</h4>
                    <p>Primary parser with confidence scoring and context understanding</p>
                  </div>
                </div>
                <div className="explanation-step">
                  <span className="step-number">2</span>
                  <div className="step-content">
                    <h4>Ambiguity Detection</h4>
                    <p>Identifies missing start/end locations and requests clarification</p>
                  </div>
                </div>
                <div className="explanation-step">
                  <span className="step-number">3</span>
                  <div className="step-content">
                    <h4>Fallback Parser</h4>
                    <p>Keyword-based parser for basic queries when LLM unavailable</p>
                  </div>
                </div>
                <div className="explanation-step">
                  <span className="step-number">4</span>
                  <div className="step-content">
                    <h4>Activity Inference</h4>
                    <p>"coffee" → cafe, "study" → library, intelligent destination mapping</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'validation' && (
          <div className="tab-content">
            <h2>Data Validation & Synchronization</h2>
            
            <div className={`validation-status ${validation?.isValid ? 'valid' : 'invalid'}`}>
              <div className="status-icon">{validation?.isValid ? '✅' : '❌'}</div>
              <div className="status-info">
                <h3>{validation?.isValid ? 'All Systems Synchronized' : 'Sync Issues Detected'}</h3>
                <p>{validation?.summary}</p>
              </div>
            </div>

            <div className="validation-grid">
              <div className="validation-card">
                <h3>Neo4j Nodes</h3>
                <p className="validation-value">{validation?.neo4jNodes || 0}</p>
              </div>
              <div className="validation-card">
                <h3>MongoDB Documents</h3>
                <p className="validation-value">{validation?.mongoDocuments || 0}</p>
              </div>
              <div className="validation-card">
                <h3>Missing in MongoDB</h3>
                <p className="validation-value">{validation?.missingInMongo?.length || 0}</p>
              </div>
              <div className="validation-card">
                <h3>Missing in Neo4j</h3>
                <p className="validation-value">{validation?.missingInNeo4j?.length || 0}</p>
              </div>
            </div>

            {validation?.missingInMongo && validation.missingInMongo.length > 0 && (
              <div className="validation-issues">
                <h3>Missing in MongoDB</h3>
                <ul>
                  {validation.missingInMongo.map((item, index) => (
                    <li key={index}>{item.id} - {item.name} ({item.type})</li>
                  ))}
                </ul>
              </div>
            )}

            {validation?.missingInNeo4j && validation.missingInNeo4j.length > 0 && (
              <div className="validation-issues">
                <h3>Missing in Neo4j</h3>
                <ul>
                  {validation.missingInNeo4j.map((item, index) => (
                    <li key={index}>{item.id} - {item.name} ({item.type})</li>
                  ))}
                </ul>
              </div>
            )}

            {validation?.orphanedRelationships && validation.orphanedRelationships.length > 0 && (
              <div className="validation-issues">
                <h3>Orphaned Relationships</h3>
                <ul>
                  {validation.orphanedRelationships.map((rel, index) => (
                    <li key={index}>{rel.from} → {rel.to} ({rel.type})</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="data-update-info">
              <h3>Data Update Process</h3>
              <div className="update-steps">
                <div className="update-step">
                  <h4>1. Edit Seed Scripts</h4>
                  <p><code>backend/data/seed-mongodb.js</code> and <code>seed-neo4j.js</code></p>
                </div>
                <div className="update-step">
                  <h4>2. Run Seeds in Order</h4>
                  <p><code>node seed-mongodb.js</code> then <code>node seed-neo4j.js</code></p>
                </div>
                <div className="update-step">
                  <h4>3. Validate Sync</h4>
                  <p>Check this dashboard to ensure sync is maintained</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="tab-content">
            <h2>Automated Navigation Tests</h2>
            
            <div className={`test-summary ${testResults?.passed === testResults?.totalTests ? 'all-pass' : 'has-failures'}`}>
              <div className="summary-icon">
                {testResults?.passed === testResults?.totalTests ? '✅' : '⚠️'}
              </div>
              <div className="summary-info">
                <h3>Test Results: {testResults?.successRate || '0%'}</h3>
                <p>{testResults?.passed || 0} passed, {testResults?.failed || 0} failed out of {testResults?.totalTests || 0} tests</p>
                <p className="test-time">Completed at {new Date(testResults?.timestamp).toLocaleString()}</p>
              </div>
            </div>

            <div className="test-results-list">
              {testResults?.results && testResults.results.map((test, index) => (
                <div key={index} className={`test-result ${test.status === 'PASS' ? 'pass' : 'fail'}`}>
                  <div className="test-header">
                    <span className="test-status">{test.status === 'PASS' ? '✅' : '❌'}</span>
                    <h3>{test.testName}</h3>
                    <span className="test-duration">{test.duration}</span>
                  </div>
                  <div className="test-details">
                    <div className="test-metric">
                      <span className="metric-label">Hops Found:</span>
                      <span className="metric-value">{test.hopsFound}</span>
                    </div>
                    <div className="test-metric">
                      <span className="metric-label">Expected Max:</span>
                      <span className="metric-value">{test.expectedMaxHops}</span>
                    </div>
                    <div className="test-metric">
                      <span className="metric-label">Total Weight:</span>
                      <span className="metric-value">{test.weight}</span>
                    </div>
                    <div className="test-metric">
                      <span className="metric-label">Path Length:</span>
                      <span className="metric-value">{test.pathLength}</span>
                    </div>
                  </div>
                  {test.path && (
                    <div className="test-path">
                      <span className="path-label">Path:</span>
                      <span className="path-value">{test.path}</span>
                    </div>
                  )}
                  {test.error && (
                    <div className="test-error">
                      <span className="error-label">Error:</span>
                      <span className="error-value">{test.error}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="test-explanation">
              <h3>Test Validation Criteria</h3>
              <ul>
                <li>Shortest path algorithm finds correct routes</li>
                <li>Multi-floor navigation works (elevator usage)</li>
                <li>Path weights are calculated correctly</li>
                <li>No infinite loops or errors</li>
                <li>Performance meets acceptable thresholds (&lt;150ms)</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPage;
