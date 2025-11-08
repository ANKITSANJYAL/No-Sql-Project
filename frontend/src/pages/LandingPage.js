import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LandingPage.css';

export default function LandingPage() {
  const nav = useNavigate();

  return (
    <div className="landing-container">
      <div className="landing-hero">
        <h1>RamsNavigator</h1>
        <p>Choose how you'd like to navigate: manual entry or natural language chat.</p>
        <div className="landing-actions">
          <button className="landing-btn manual" onClick={() => nav('/manual')}>Manual Entry (Map-style)</button>
          <button className="landing-btn chat" onClick={() => nav('/chat')}>Chat-style (Natural Language)</button>
        </div>
      </div>
    </div>
  );
}
