import React from 'react';
import '../styles/Header.css';

function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div className="logo-section">
          <img 
            src="/logo.png" 
            alt="Fordham University" 
            className="fordham-logo"
            onError={(e) => {
              // Fallback if logo not found
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="logo-icon" style={{ display: 'none' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div className="logo-text-container">
            <h1 className="logo-text">RamsNavigator</h1>
            <p className="logo-subtitle">Fordham University</p>
          </div>
        </div>
        
        <nav className="nav-menu">
          <a href="/" className="nav-link">Home</a>
          <a href="#about" className="nav-link">About</a>
          <a href="#help" className="nav-link">Help</a>
        </nav>
      </div>
    </header>
  );
}

export default Header;

