// src/components/ui/EmptyState.js - Premium empty state with illustrations
import React from 'react';
import { Link } from 'react-router-dom';
import './EmptyState.css';

// SVG Illustrations
const Illustrations = {
  noData: (
    <svg width="200" height="160" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background circles */}
      <circle cx="100" cy="80" r="60" fill="#f0f7ff" />
      <circle cx="100" cy="80" r="45" fill="#e0efff" />

      {/* Document icon */}
      <rect x="70" y="45" width="60" height="75" rx="6" fill="white" stroke="#6366F1" strokeWidth="2"/>
      <rect x="80" y="60" width="40" height="4" rx="2" fill="#e5e7eb"/>
      <rect x="80" y="70" width="30" height="4" rx="2" fill="#e5e7eb"/>
      <rect x="80" y="80" width="35" height="4" rx="2" fill="#e5e7eb"/>
      <rect x="80" y="90" width="25" height="4" rx="2" fill="#e5e7eb"/>

      {/* Magnifying glass */}
      <circle cx="140" cy="110" r="18" stroke="#6366F1" strokeWidth="3" fill="white"/>
      <line x1="153" y1="123" x2="165" y2="135" stroke="#6366F1" strokeWidth="3" strokeLinecap="round"/>

      {/* Sparkles */}
      <circle cx="50" cy="50" r="3" fill="#6366F1"/>
      <circle cx="160" cy="40" r="2" fill="#10b981"/>
      <circle cx="45" cy="100" r="2" fill="#8b5cf6"/>
    </svg>
  ),
  noControls: (
    <svg width="200" height="160" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <circle cx="100" cy="80" r="60" fill="#f0fdf4" />
      <circle cx="100" cy="80" r="45" fill="#dcfce7" />

      {/* Clipboard */}
      <rect x="65" y="35" width="70" height="90" rx="8" fill="white" stroke="#10b981" strokeWidth="2"/>
      <rect x="85" y="28" width="30" height="14" rx="4" fill="#10b981"/>

      {/* Checklist items */}
      <rect x="78" y="55" width="12" height="12" rx="3" stroke="#d1d5db" strokeWidth="2" fill="white"/>
      <rect x="95" y="58" width="30" height="6" rx="2" fill="#e5e7eb"/>

      <rect x="78" y="75" width="12" height="12" rx="3" stroke="#d1d5db" strokeWidth="2" fill="white"/>
      <rect x="95" y="78" width="25" height="6" rx="2" fill="#e5e7eb"/>

      <rect x="78" y="95" width="12" height="12" rx="3" stroke="#d1d5db" strokeWidth="2" fill="white"/>
      <rect x="95" y="98" width="28" height="6" rx="2" fill="#e5e7eb"/>

      {/* Plus icon */}
      <circle cx="145" cy="115" r="20" fill="#10b981"/>
      <line x1="145" y1="105" x2="145" y2="125" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      <line x1="135" y1="115" x2="155" y2="115" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  ),
  noCustomers: (
    <svg width="200" height="160" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <circle cx="100" cy="80" r="60" fill="#faf5ff" />
      <circle cx="100" cy="80" r="45" fill="#f3e8ff" />

      {/* Person silhouette */}
      <circle cx="100" cy="55" r="20" fill="white" stroke="#8b5cf6" strokeWidth="2"/>
      <path d="M60 115 Q60 85 100 85 Q140 85 140 115" fill="white" stroke="#8b5cf6" strokeWidth="2"/>

      {/* Plus badge */}
      <circle cx="130" cy="50" r="15" fill="#8b5cf6"/>
      <line x1="130" y1="43" x2="130" y2="57" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="123" y1="50" x2="137" y2="50" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>

      {/* Decorative dots */}
      <circle cx="45" cy="60" r="3" fill="#8b5cf6" opacity="0.5"/>
      <circle cx="155" cy="90" r="2" fill="#8b5cf6" opacity="0.5"/>
      <circle cx="50" cy="110" r="2" fill="#10b981" opacity="0.5"/>
    </svg>
  ),
  noActivity: (
    <svg width="200" height="160" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <circle cx="100" cy="80" r="60" fill="#fffbeb" />
      <circle cx="100" cy="80" r="45" fill="#fef3c7" />

      {/* Activity chart */}
      <rect x="55" y="50" width="90" height="70" rx="8" fill="white" stroke="#f59e0b" strokeWidth="2"/>

      {/* Chart bars */}
      <rect x="70" y="85" width="12" height="25" rx="2" fill="#fcd34d"/>
      <rect x="90" y="75" width="12" height="35" rx="2" fill="#fbbf24"/>
      <rect x="110" y="90" width="12" height="20" rx="2" fill="#fcd34d"/>
      <rect x="130" y="80" width="12" height="30" rx="2" fill="#f59e0b"/>

      {/* Pulse line */}
      <path d="M60 65 L80 65 L90 55 L100 75 L110 60 L120 70 L140 70" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>

      {/* Clock icon */}
      <circle cx="155" cy="45" r="15" fill="white" stroke="#f59e0b" strokeWidth="2"/>
      <line x1="155" y1="45" x2="155" y2="38" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
      <line x1="155" y1="45" x2="160" y2="48" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  noTeam: (
    <svg width="200" height="160" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <circle cx="100" cy="80" r="60" fill="#f0f7ff" />
      <circle cx="100" cy="80" r="45" fill="#dbeafe" />

      {/* Three people */}
      <circle cx="70" cy="60" r="15" fill="white" stroke="#6366F1" strokeWidth="2"/>
      <path d="M45 105 Q45 80 70 80 Q95 80 95 105" fill="white" stroke="#6366F1" strokeWidth="2"/>

      <circle cx="100" cy="50" r="18" fill="white" stroke="#4F46E5" strokeWidth="2.5"/>
      <path d="M70 100 Q70 70 100 70 Q130 70 130 100" fill="white" stroke="#4F46E5" strokeWidth="2.5"/>

      <circle cx="130" cy="60" r="15" fill="white" stroke="#6366F1" strokeWidth="2"/>
      <path d="M105 105 Q105 80 130 80 Q155 80 155 105" fill="white" stroke="#6366F1" strokeWidth="2"/>

      {/* Connection lines */}
      <line x1="85" y1="55" x2="95" y2="55" stroke="#6366F1" strokeWidth="1.5" strokeDasharray="3 3"/>
      <line x1="105" y1="55" x2="115" y2="55" stroke="#6366F1" strokeWidth="1.5" strokeDasharray="3 3"/>
    </svg>
  )
};

const EmptyState = ({
  type = 'noData',
  title,
  description,
  actionLabel,
  actionLink,
  onAction,
  secondaryActionLabel,
  secondaryActionLink,
  onSecondaryAction
}) => {
  const illustration = Illustrations[type] || Illustrations.noData;

  return (
    <div className="empty-state">
      <div className="empty-state-illustration">
        {illustration}
      </div>

      <div className="empty-state-content">
        <h3 className="empty-state-title">{title}</h3>
        {description && (
          <p className="empty-state-description">{description}</p>
        )}
      </div>

      {(actionLabel || secondaryActionLabel) && (
        <div className="empty-state-actions">
          {actionLabel && actionLink && (
            <Link to={actionLink} className="empty-state-btn empty-state-btn--primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              {actionLabel}
            </Link>
          )}
          {actionLabel && onAction && !actionLink && (
            <button onClick={onAction} className="empty-state-btn empty-state-btn--primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && secondaryActionLink && (
            <Link to={secondaryActionLink} className="empty-state-btn empty-state-btn--secondary">
              {secondaryActionLabel}
            </Link>
          )}
          {secondaryActionLabel && onSecondaryAction && !secondaryActionLink && (
            <button onClick={onSecondaryAction} className="empty-state-btn empty-state-btn--secondary">
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
