import React, { useState } from 'react';
import ChatAssistant from '../components/ChatAssistant';
import NavigationView from '../components/NavigationView';
import GraphVisualization from '../components/GraphVisualization';
import '../styles/ChatPage.css';

export default function ChatPage() {
  const [navigationData, setNavigationData] = useState(null);
  const [startName, setStartName] = useState('');
  const [endName, setEndName] = useState('');
  const [viewMode, setViewMode] = useState('graph'); // 'graph' or 'steps'

  return (
    <div className="chat-page">
      <div className="chat-layout">
        <div className="chat-left">
          <header className="chat-header-left">
            <h2>AI Navigation Assistant</h2>
            <p>Ask me naturally where you want to go on campus.</p>
          </header>

          <div className="chat-input-area">
            <ChatAssistant 
              embedded={true}
              onClose={() => { /* not used here */ }}
              onNavigate={(startId, endId, startN, endN) => {
                setStartName(startN || '');
                setEndName(endN || '');
              }}
              onNavigationResult={(result) => {
                setNavigationData(result);
                setStartName(result.parsedIntent?.start?.name || '');
                setEndName(result.parsedIntent?.end?.name || '');
              }}
              onUserMessage={() => {}}
              onBotMessage={() => {}}
            />
          </div>
        </div>

        <aside className="chat-output" role="region" aria-label="Navigation output panel">
          {navigationData ? (
            <>
              <div className="view-toggle">
                <button 
                  className={`toggle-btn ${viewMode === 'graph' ? 'active' : ''}`}
                  onClick={() => setViewMode('graph')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="3" fill="currentColor" />
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                  </svg>
                  Graph View
                </button>
                <button 
                  className={`toggle-btn ${viewMode === 'steps' ? 'active' : ''}`}
                  onClick={() => setViewMode('steps')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
                  </svg>
                  Step by Step
                </button>
              </div>
              
              {viewMode === 'graph' ? (
                <GraphVisualization 
                  navigationData={navigationData.navigation} 
                  startLocation={startName} 
                  endLocation={endName} 
                />
              ) : (
                <NavigationView 
                  navigationData={navigationData.navigation} 
                  startLocation={startName} 
                  endLocation={endName} 
                />
              )}
            </>
          ) : (
            <div className="chat-placeholder">Navigation output will appear here after the AI understands your request.</div>
          )}
        </aside>
      </div>
    </div>
  );
}
