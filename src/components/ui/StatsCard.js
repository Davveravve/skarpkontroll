// src/components/ui/StatsCard.js - Premium statistics card
import React from 'react';
import './StatsCard.css';

const StatsCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  color = 'blue',
  onClick
}) => {
  const colorClasses = {
    blue: 'stats-card--blue',
    green: 'stats-card--green',
    purple: 'stats-card--purple',
    orange: 'stats-card--orange',
    red: 'stats-card--red'
  };

  return (
    <div
      className={`stats-card ${colorClasses[color]} ${onClick ? 'stats-card--clickable' : ''}`}
      onClick={onClick}
    >
      {/* Background decoration */}
      <div className="stats-card-bg-decoration" />

      {/* Header with icon and trend */}
      <div className="stats-card-header">
        <div className="stats-card-icon">
          {icon}
        </div>
        {trend && (
          <div className={`stats-card-trend stats-card-trend--${trend}`}>
            {trend === 'up' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            ) : trend === 'down' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            ) : null}
            <span>{trendValue}</span>
          </div>
        )}
      </div>

      {/* Value and title */}
      <div className="stats-card-body">
        <div className="stats-card-value">{value}</div>
        <div className="stats-card-title">{title}</div>
        {subtitle && <div className="stats-card-subtitle">{subtitle}</div>}
      </div>

      {/* Hover shine effect */}
      <div className="stats-card-shine" />
    </div>
  );
};

// Preset icons for common stats
export const StatsIcons = {
  customers: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  controls: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  completed: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  ),
  pdf: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="12" y1="18" x2="12" y2="12"/>
      <line x1="9" y1="15" x2="12" y2="12"/>
      <line x1="15" y1="15" x2="12" y2="12"/>
    </svg>
  ),
  team: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
      <line x1="9" y1="9" x2="9.01" y2="9"/>
      <line x1="15" y1="9" x2="15.01" y2="9"/>
    </svg>
  ),
  activity: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
};

export default StatsCard;
