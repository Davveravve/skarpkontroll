// src/components/OnboardingWizard.js - Guided onboarding for new users
import React, { useState } from 'react';
import { useTeam } from '../contexts/TeamContext';
import './OnboardingWizard.css';

// Clean SVG Icons
const Icons = {
  team: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  create: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="16"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  ),
  join: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
      <polyline points="10 17 15 12 10 7"/>
      <line x1="15" y1="12" x2="3" y2="12"/>
    </svg>
  ),
  check: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  arrow: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  close: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
};

const OnboardingWizard = ({ onComplete, onSkip }) => {
  const { createTeam, joinTeam } = useTeam();
  const [step, setStep] = useState('choice'); // choice, create, join
  const [teamName, setTeamName] = useState('');
  const [teamPassword, setTeamPassword] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setError('Ange ett teamnamn');
      return;
    }

    setLoading(true);
    setError('');

    const result = await createTeam(teamName.trim(), teamPassword || null);

    if (result.success) {
      setSuccess({
        type: 'created',
        teamName: teamName.trim(),
        code: result.code
      });
    } else {
      setError(result.error || 'Kunde inte skapa team');
    }

    setLoading(false);
  };

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError('Ange en inbjudningskod');
      return;
    }

    setLoading(true);
    setError('');

    const result = await joinTeam(joinCode.trim(), joinPassword || null);

    if (result.success) {
      setSuccess({
        type: 'joined',
        teamName: result.team.name
      });
    } else {
      setError(result.error || 'Kunde inte gå med i team');
    }

    setLoading(false);
  };

  const handleComplete = () => {
    if (onComplete) onComplete();
  };

  // Success screen
  if (success) {
    return (
      <div className="onboarding-overlay">
        <div className="onboarding-modal onboarding-success">
          <div className="success-icon">
            {Icons.check}
          </div>
          <h2>
            {success.type === 'created' ? 'Team skapat!' : 'Välkommen till teamet!'}
          </h2>
          <p className="success-team-name">{success.teamName}</p>

          {success.code && (
            <div className="success-code-box">
              <span className="code-label">Inbjudningskod</span>
              <code className="code-value">{success.code}</code>
              <p className="code-hint">Dela koden med dina kollegor</p>
            </div>
          )}

          <button className="btn-primary btn-large" onClick={handleComplete}>
            Börja använda SkarpKontroll
            <span className="btn-icon">{Icons.arrow}</span>
          </button>
        </div>
      </div>
    );
  }

  // Choice screen
  if (step === 'choice') {
    return (
      <div className="onboarding-overlay">
        <div className="onboarding-modal">
          {onSkip && (
            <button className="onboarding-close" onClick={onSkip}>
              {Icons.close}
            </button>
          )}

          <div className="onboarding-header">
            <div className="onboarding-icon">
              {Icons.team}
            </div>
            <h2>Välkommen till SkarpKontroll</h2>
            <p>För att komma igång behöver du vara med i ett team</p>
          </div>

          <div className="onboarding-options">
            <button
              className="option-card"
              onClick={() => setStep('create')}
            >
              <div className="option-icon option-icon-create">
                {Icons.create}
              </div>
              <div className="option-content">
                <h3>Skapa nytt team</h3>
                <p>Starta ett nytt team och bjud in kollegor</p>
              </div>
              <span className="option-arrow">{Icons.arrow}</span>
            </button>

            <button
              className="option-card"
              onClick={() => setStep('join')}
            >
              <div className="option-icon option-icon-join">
                {Icons.join}
              </div>
              <div className="option-content">
                <h3>Gå med i team</h3>
                <p>Har du fått en inbjudningskod?</p>
              </div>
              <span className="option-arrow">{Icons.arrow}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Create team form
  if (step === 'create') {
    return (
      <div className="onboarding-overlay">
        <div className="onboarding-modal">
          <button className="onboarding-back" onClick={() => { setStep('choice'); setError(''); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Tillbaka
          </button>

          <div className="onboarding-header">
            <div className="onboarding-icon onboarding-icon-create">
              {Icons.create}
            </div>
            <h2>Skapa nytt team</h2>
            <p>Ge ditt team ett namn</p>
          </div>

          {error && <div className="onboarding-error">{error}</div>}

          <form onSubmit={handleCreateTeam} className="onboarding-form">
            <div className="form-group">
              <label htmlFor="teamName">Teamnamn</label>
              <input
                id="teamName"
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="T.ex. Mitt Företag AB"
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="teamPassword">
                Lösenord <span className="optional">(valfritt)</span>
              </label>
              <input
                id="teamPassword"
                type="password"
                value={teamPassword}
                onChange={(e) => setTeamPassword(e.target.value)}
                placeholder="Lämna tomt för inget lösenord"
                disabled={loading}
              />
              <span className="form-hint">
                Om du anger lösenord måste nya medlemmar ange det
              </span>
            </div>

            <button
              type="submit"
              className="btn-primary btn-large btn-full"
              disabled={loading || !teamName.trim()}
            >
              {loading ? 'Skapar team...' : 'Skapa team'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Join team form
  if (step === 'join') {
    return (
      <div className="onboarding-overlay">
        <div className="onboarding-modal">
          <button className="onboarding-back" onClick={() => { setStep('choice'); setError(''); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Tillbaka
          </button>

          <div className="onboarding-header">
            <div className="onboarding-icon onboarding-icon-join">
              {Icons.join}
            </div>
            <h2>Gå med i team</h2>
            <p>Ange inbjudningskoden du fått</p>
          </div>

          {error && <div className="onboarding-error">{error}</div>}

          <form onSubmit={handleJoinTeam} className="onboarding-form">
            <div className="form-group">
              <label htmlFor="joinCode">Inbjudningskod</label>
              <input
                id="joinCode"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="T.ex. XDFS KLSP DSUT"
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="joinPassword">
                Lösenord <span className="optional">(om det krävs)</span>
              </label>
              <input
                id="joinPassword"
                type="password"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                placeholder="Ange om teamet har lösenord"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn-primary btn-large btn-full"
              disabled={loading || !joinCode.trim()}
            >
              {loading ? 'Går med...' : 'Gå med i team'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
};

export default OnboardingWizard;
