// src/components/ProgressTracker.js - Onboarding progress tracker
import React from 'react';
import { Link } from 'react-router-dom';
import './ProgressTracker.css';

// Clean SVG Icons
const Icons = {
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  team: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  customer: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  control: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  pdf: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="12" y1="18" x2="12" y2="12"/>
      <line x1="9" y1="15" x2="12" y2="12"/>
      <line x1="15" y1="15" x2="12" y2="12"/>
    </svg>
  ),
  arrow: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  )
};

const ProgressTracker = ({ hasTeam, hasCustomers, hasControls }) => {
  const steps = [
    {
      id: 'team',
      label: 'Skapa team',
      description: 'Skapa eller gå med i ett team',
      completed: hasTeam,
      icon: Icons.team,
      link: '/team'
    },
    {
      id: 'customer',
      label: 'Lägg till kund',
      description: 'Skapa din första kund',
      completed: hasCustomers,
      icon: Icons.customer,
      link: '/customers/new',
      disabled: !hasTeam
    },
    {
      id: 'control',
      label: 'Skapa kontroll',
      description: 'Gör din första kontroll',
      completed: hasControls,
      icon: Icons.control,
      link: '/customers',
      disabled: !hasCustomers
    }
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const allCompleted = completedCount === steps.length;

  if (allCompleted) {
    return null; // Hide when all steps are completed
  }

  return (
    <div className="progress-tracker">
      <div className="progress-tracker-header">
        <h3>Kom igång</h3>
        <span className="progress-count">{completedCount} av {steps.length} klart</span>
      </div>

      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>

      <div className="progress-steps">
        {steps.map((step, index) => {
          const isNext = !step.completed && (index === 0 || steps[index - 1].completed);

          return (
            <div
              key={step.id}
              className={`progress-step ${step.completed ? 'completed' : ''} ${isNext ? 'next' : ''} ${step.disabled ? 'disabled' : ''}`}
            >
              <div className="step-indicator">
                {step.completed ? (
                  <span className="step-check">{Icons.check}</span>
                ) : (
                  <span className="step-number">{index + 1}</span>
                )}
              </div>

              <div className="step-content">
                <div className="step-icon">{step.icon}</div>
                <div className="step-text">
                  <span className="step-label">{step.label}</span>
                  <span className="step-description">{step.description}</span>
                </div>
              </div>

              {!step.completed && !step.disabled && (
                <Link to={step.link} className="step-action">
                  {isNext ? 'Gör det nu' : 'Gå hit'}
                  {Icons.arrow}
                </Link>
              )}

              {step.completed && (
                <span className="step-completed-badge">Klart</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressTracker;
