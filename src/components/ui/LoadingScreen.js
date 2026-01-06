// src/components/ui/LoadingScreen.js - Premium loading screen
import React from 'react';
import './LoadingScreen.css';

const LoadingScreen = ({ message = 'Laddar...' }) => {
  return (
    <div className="loading-screen">
      {/* Animated background */}
      <div className="loading-bg">
        <div className="loading-bg-gradient"></div>
        <div className="loading-bg-pattern"></div>
      </div>

      {/* Content */}
      <div className="loading-content">
        {/* Logo with pulse animation */}
        <div className="loading-logo">
          <div className="loading-logo-inner">
            <span>SK</span>
          </div>
          <div className="loading-logo-ring"></div>
          <div className="loading-logo-ring loading-logo-ring-2"></div>
        </div>

        {/* Brand name */}
        <div className="loading-brand">
          <h1>SKARP</h1>
          <span>KONTROLLSYSTEM</span>
        </div>

        {/* Loading indicator */}
        <div className="loading-indicator">
          <div className="loading-bar">
            <div className="loading-bar-progress"></div>
          </div>
          <p className="loading-message">{message}</p>
        </div>

        {/* Floating particles */}
        <div className="loading-particles">
          <div className="particle particle-1"></div>
          <div className="particle particle-2"></div>
          <div className="particle particle-3"></div>
          <div className="particle particle-4"></div>
          <div className="particle particle-5"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
