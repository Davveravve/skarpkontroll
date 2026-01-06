// src/components/TeamSelector.js - Team dropdown selector
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeam } from '../contexts/TeamContext';
import './TeamSelector.css';

const TeamSelector = () => {
  const navigate = useNavigate();
  const { currentTeam, userTeams, switchTeam, loading } = useTeam();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef(null);

  // Stäng dropdown när man klickar utanför
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitchTeam = async (teamId) => {
    if (teamId === currentTeam?.id) {
      setIsOpen(false);
      return;
    }

    setSwitching(true);
    await switchTeam(teamId);
    setSwitching(false);
    setIsOpen(false);
  };

  const handleCreateTeam = () => {
    setIsOpen(false);
    navigate('/team');
  };

  if (loading) {
    return (
      <div className="team-selector team-selector--loading">
        <div className="team-selector-skeleton"></div>
      </div>
    );
  }

  if (!currentTeam) {
    return (
      <button className="team-selector team-selector--empty" onClick={() => navigate('/team')}>
        <div className="team-selector-icon team-selector-icon--add">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
        </div>
        <span>Välj team</span>
      </button>
    );
  }

  return (
    <div className="team-selector" ref={dropdownRef}>
      <button
        className={`team-selector-trigger ${isOpen ? 'team-selector-trigger--open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
      >
        <div className="team-selector-current">
          <div className="team-selector-icon">
            {currentTeam.logoUrl ? (
              <img src={currentTeam.logoUrl} alt={currentTeam.name} />
            ) : (
              <span>{currentTeam.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="team-selector-info">
            <span className="team-selector-name">{currentTeam.name}</span>
            <span className="team-selector-meta">{userTeams.length} team</span>
          </div>
        </div>
        <svg
          className={`team-selector-chevron ${isOpen ? 'team-selector-chevron--open' : ''}`}
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {isOpen && (
        <div className="team-selector-dropdown">
          <div className="team-selector-header">
            <span>Dina team</span>
          </div>

          <div className="team-selector-list">
            {userTeams.map((team) => (
              <button
                key={team.id}
                className={`team-selector-item ${team.id === currentTeam.id ? 'team-selector-item--active' : ''}`}
                onClick={() => handleSwitchTeam(team.id)}
                disabled={switching}
              >
                <div className="team-selector-item-icon">
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt={team.name} />
                  ) : (
                    <span>{team.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="team-selector-item-info">
                  <span className="team-selector-item-name">{team.name}</span>
                  <span className="team-selector-item-members">
                    {team.members?.length || 1} medlemmar
                  </span>
                </div>
                {team.id === currentTeam.id && (
                  <svg className="team-selector-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            ))}
          </div>

          <div className="team-selector-footer">
            <button className="team-selector-create" onClick={handleCreateTeam}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              <span>Skapa nytt team</span>
            </button>
            <button className="team-selector-manage" onClick={() => { setIsOpen(false); navigate('/team'); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              <span>Hantera team</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamSelector;
