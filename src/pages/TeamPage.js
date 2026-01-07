// src/pages/TeamPage.js - Team management page
import React, { useState, useRef } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { useConfirmation } from '../components/ConfirmationProvider';
import './TeamPage.css';

const TeamPage = () => {
  const { currentUser } = useAuth();
  const {
    currentTeam,
    userTeams,
    teamMembers,
    loading,
    isTeamOwner,
    hasTeam,
    createTeam,
    joinTeam,
    leaveTeam,
    removeMember,
    updateTeamLogo,
    removeTeamLogo,
    switchTeam,
    updateTeamPassword,
    updateTeamName,
    transferOwnership,
    deleteTeam
  } = useTeam();

  const toast = useToast();
  const confirmation = useConfirmation();
  const fileInputRef = useRef(null);
  const [teamName, setTeamName] = useState('');
  const [teamPassword, setTeamPassword] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [switchingTeam, setSwitchingTeam] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordEdit, setShowPasswordEdit] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [editedTeamName, setEditedTeamName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [showTransferOwnership, setShowTransferOwnership] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showLeaveAsOwner, setShowLeaveAsOwner] = useState(false);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) {
      toast.error('Ange ett teamnamn');
      return;
    }

    setActionLoading(true);
    const result = await createTeam(teamName.trim(), teamPassword || null);
    setActionLoading(false);

    if (result.success) {
      toast.success(`Team "${teamName}" skapat!`);
      setTeamName('');
      setTeamPassword('');
      setShowAddTeam(false);
    } else {
      toast.error(result.error);
    }
  };

  const handleSwitchTeam = async (teamId) => {
    if (teamId === currentTeam?.id) return;

    setSwitchingTeam(teamId);
    const result = await switchTeam(teamId);
    setSwitchingTeam(null);

    if (result.success) {
      toast.success('Bytte team');
    } else {
      toast.error(result.error || 'Kunde inte byta team');
    }
  };

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error('Ange en inbjudningskod');
      return;
    }

    setActionLoading(true);
    const result = await joinTeam(joinCode.trim(), joinPassword || null);
    setActionLoading(false);

    if (result.success) {
      toast.success(`Du gick med i "${result.team.name}"!`);
      setJoinCode('');
      setJoinPassword('');
      setShowAddTeam(false);
    } else {
      toast.error(result.error);
    }
  };

  const handleLeaveTeam = async () => {
    // Om ägare - kolla om det finns andra medlemmar
    if (isTeamOwner) {
      const otherMembers = teamMembers.filter(m => m.id !== currentUser?.uid);

      if (otherMembers.length > 0) {
        // Finns andra medlemmar - visa modal för att välja ny ägare
        setSelectedNewOwner('');
        setShowLeaveAsOwner(true);
      } else {
        // Enda medlemmen - bekräfta radering av teamet
        confirmation.confirm({
          title: 'Ta bort team',
          message: 'Du är den enda medlemmen. Om du lämnar kommer teamet att tas bort. Är du säker?',
          confirmText: 'Ja, ta bort teamet',
          cancelText: 'Avbryt',
          confirmButtonClass: 'danger',
          onConfirm: async () => {
            setActionLoading(true);
            const result = await deleteTeam();
            setActionLoading(false);

            if (result.success) {
              toast.success('Teamet har tagits bort');
            } else {
              toast.error(result.error);
            }
          }
        });
      }
    } else {
      // Inte ägare - lämna normalt
      confirmation.confirm({
        title: 'Lämna team',
        message: 'Är du säker på att du vill lämna teamet?',
        confirmText: 'Ja, lämna',
        cancelText: 'Avbryt',
        confirmButtonClass: 'warning',
        onConfirm: async () => {
          setActionLoading(true);
          const result = await leaveTeam();
          setActionLoading(false);

          if (result.success) {
            toast.success('Du har lämnat teamet');
          } else {
            toast.error(result.error);
          }
        }
      });
    }
  };

  const handleLeaveAsOwner = async () => {
    if (!selectedNewOwner) {
      toast.error('Välj en ny ägare först');
      return;
    }

    setTransferLoading(true);

    // Först överför ägarskapret
    const transferResult = await transferOwnership(selectedNewOwner);

    if (!transferResult.success) {
      setTransferLoading(false);
      toast.error(transferResult.error || 'Kunde inte överföra ägarskap');
      return;
    }

    // Sen lämna teamet
    const leaveResult = await leaveTeam();
    setTransferLoading(false);
    setShowLeaveAsOwner(false);

    if (leaveResult.success) {
      toast.success('Ägarskap överfört och du har lämnat teamet');
    } else {
      toast.error(leaveResult.error || 'Kunde inte lämna teamet');
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    confirmation.confirm({
      title: 'Ta bort medlem',
      message: `Är du säker på att du vill ta bort ${memberName} från teamet?`,
      confirmText: 'Ja, ta bort',
      cancelText: 'Avbryt',
      confirmButtonClass: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        const result = await removeMember(memberId);
        setActionLoading(false);

        if (result.success) {
          toast.success(`${memberName} har tagits bort`);
        } else {
          toast.error(result.error);
        }
      }
    });
  };

  const copyCodeToClipboard = async () => {
    if (currentTeam?.code) {
      await navigator.clipboard.writeText(currentTeam.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    const result = await updateTeamPassword(newPassword);
    setPasswordLoading(false);

    if (result.success) {
      toast.success(newPassword ? 'Lösenord uppdaterat' : 'Lösenord borttaget');
      setNewPassword('');
      setShowPasswordEdit(false);
    } else {
      toast.error(result.error);
    }
  };

  const handleRemovePassword = async () => {
    confirmation.confirm({
      title: 'Ta bort lösenord',
      message: 'Är du säker på att du vill ta bort lösenordsskyddet? Vem som helst med inbjudningskoden kan då gå med i teamet.',
      confirmText: 'Ja, ta bort',
      cancelText: 'Avbryt',
      confirmButtonClass: 'warning',
      onConfirm: async () => {
        setPasswordLoading(true);
        const result = await updateTeamPassword(null);
        setPasswordLoading(false);

        if (result.success) {
          toast.success('Lösenordsskydd borttaget');
        } else {
          toast.error(result.error);
        }
      }
    });
  };

  const handleLogoSelect = () => {
    fileInputRef.current?.click();
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validera filtyp
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Endast bilder (JPG, PNG, GIF, WebP) stöds');
      return;
    }

    // Validera filstorlek (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Bilden får max vara 2MB');
      return;
    }

    setLogoUploading(true);
    const result = await updateTeamLogo(file);
    setLogoUploading(false);

    if (result.success) {
      toast.success('Logotypen har uppdaterats!');
    } else {
      toast.error(result.error || 'Kunde inte ladda upp logotypen');
    }

    // Rensa input
    e.target.value = '';
  };

  const handleLogoRemove = () => {
    confirmation.confirm({
      title: 'Ta bort logotyp',
      message: 'Är du säker på att du vill ta bort teamets logotyp?',
      confirmText: 'Ja, ta bort',
      cancelText: 'Avbryt',
      confirmButtonClass: 'danger',
      onConfirm: async () => {
        setLogoUploading(true);
        const result = await removeTeamLogo();
        setLogoUploading(false);

        if (result.success) {
          toast.success('Logotypen har tagits bort');
        } else {
          toast.error(result.error || 'Kunde inte ta bort logotypen');
        }
      }
    });
  };

  const handleUpdateTeamName = async (e) => {
    e.preventDefault();
    if (!editedTeamName.trim()) {
      toast.error('Ange ett teamnamn');
      return;
    }

    setNameLoading(true);
    const result = await updateTeamName(editedTeamName.trim());
    setNameLoading(false);

    if (result.success) {
      toast.success('Teamnamn uppdaterat');
      setShowNameEdit(false);
    } else {
      toast.error(result.error);
    }
  };

  const handleTransferOwnership = async () => {
    if (!selectedNewOwner) {
      toast.error('Välj en ny ägare');
      return;
    }

    const newOwnerMember = teamMembers.find(m => m.id === selectedNewOwner);
    const newOwnerName = newOwnerMember?.displayName || 'vald medlem';

    confirmation.confirm({
      title: 'Överför ägarskap',
      message: `Är du säker på att du vill överföra ägarskapet till ${newOwnerName}? Du kommer inte längre kunna hantera teaminställningar.`,
      confirmText: 'Ja, överför',
      cancelText: 'Avbryt',
      confirmButtonClass: 'warning',
      onConfirm: async () => {
        setTransferLoading(true);
        const result = await transferOwnership(selectedNewOwner);
        setTransferLoading(false);

        if (result.success) {
          toast.success(`Ägarskapet har överförts till ${newOwnerName}`);
          setShowTransferOwnership(false);
          setSelectedNewOwner('');
        } else {
          toast.error(result.error);
        }
      }
    });
  };

  const handleDeleteTeam = () => {
    confirmation.confirm({
      title: 'Ta bort team',
      message: `Är du säker på att du vill ta bort "${currentTeam.name}"? Detta kan inte ångras. Alla medlemmar kommer att tas bort från teamet.`,
      confirmText: 'Ja, ta bort',
      cancelText: 'Avbryt',
      confirmButtonClass: 'danger',
      onConfirm: async () => {
        setDeleteLoading(true);
        const result = await deleteTeam();
        setDeleteLoading(false);

        if (result.success) {
          toast.success('Teamet har tagits bort');
        } else {
          toast.error(result.error);
        }
      }
    });
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Loading state
  if (loading) {
    return (
      <div className="team-page">
        <div className="team-page-loading">
          <div className="team-page-spinner"></div>
          <p>Laddar team...</p>
        </div>
      </div>
    );
  }

  // No team - show create/join options
  if (!hasTeam) {
    return (
      <div className="team-page">
        <header className="team-page-header">
          <div className="team-page-header-content">
            <h1 className="team-page-title">Team</h1>
            <p className="team-page-subtitle">Skapa eller gå med i ett team för att samarbeta</p>
          </div>
        </header>

        <div className="team-page-grid">
          {/* Create Team Card */}
          <div className="team-page-card">
            <div className="team-page-card-header">
              <div>
                <h2 className="team-page-card-title">Skapa nytt team</h2>
                <p className="team-page-card-subtitle">Starta ett eget team och bjud in kollegor</p>
              </div>
            </div>
            <div className="team-page-card-body">
              <form onSubmit={handleCreateTeam}>
                <div className="team-page-form-group">
                  <label>Teamnamn</label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="T.ex. Mitt Företag AB"
                    disabled={actionLoading}
                  />
                </div>
                <div className="team-page-form-group">
                  <label>Lösenord <span className="team-page-optional">(valfritt)</span></label>
                  <input
                    type="password"
                    value={teamPassword}
                    onChange={(e) => setTeamPassword(e.target.value)}
                    placeholder="Lämna tomt för öppet team"
                    disabled={actionLoading}
                    autoComplete="off"
                  />
                  <span className="team-page-hint">Skydda teamet med lösenord</span>
                </div>
                <button type="submit" className="team-page-btn team-page-btn--primary" disabled={actionLoading}>
                  {actionLoading ? 'Skapar...' : 'Skapa team'}
                </button>
              </form>
            </div>
          </div>

          {/* Join Team Card */}
          <div className="team-page-card">
            <div className="team-page-card-header">
              <div>
                <h2 className="team-page-card-title">Gå med i team</h2>
                <p className="team-page-card-subtitle">Har du fått en inbjudningskod?</p>
              </div>
            </div>
            <div className="team-page-card-body">
              <form onSubmit={handleJoinTeam}>
                <div className="team-page-form-group">
                  <label>Inbjudningskod</label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="XXXX XXXX XXXX"
                    disabled={actionLoading}
                    autoComplete="off"
                  />
                </div>
                <div className="team-page-form-group">
                  <label>Lösenord <span className="team-page-optional">(om det krävs)</span></label>
                  <input
                    type="password"
                    value={joinPassword}
                    onChange={(e) => setJoinPassword(e.target.value)}
                    placeholder="Ange om teamet har lösenord"
                    disabled={actionLoading}
                    autoComplete="off"
                  />
                </div>
                <button type="submit" className="team-page-btn team-page-btn--secondary" disabled={actionLoading}>
                  {actionLoading ? 'Går med...' : 'Gå med i team'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Has team - show team management
  return (
    <div className="team-page">
      <header className="team-page-header">
        <div className="team-page-header-content">
          <h1 className="team-page-title">{currentTeam.name}</h1>
          <p className="team-page-subtitle">{teamMembers.length} {teamMembers.length === 1 ? 'medlem' : 'medlemmar'}</p>
        </div>
      </header>

      <div className="team-page-content">
        {/* Team Logo Card - Alla medlemmar kan ändra */}
        <div className="team-page-card team-page-logo-card">
          <div className="team-page-card-header">
            <div>
              <h2 className="team-page-card-title">Teamlogotyp</h2>
              <p className="team-page-card-subtitle">Visas i PDF-protokoll istället för företagsnamn</p>
            </div>
          </div>
          <div className="team-page-card-body">
            <div className="team-page-logo-section">
              <div className="team-page-logo-preview">
                {currentTeam.logoUrl ? (
                  <img
                    src={currentTeam.logoUrl}
                    alt="Teamlogotyp"
                    className="team-page-logo-image"
                  />
                ) : (
                  <div className="team-page-logo-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span>Ingen logotyp</span>
                  </div>
                )}
              </div>
              <div className="team-page-logo-actions">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoChange}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  style={{ display: 'none' }}
                />
                <button
                  className="team-page-btn team-page-btn--primary"
                  onClick={handleLogoSelect}
                  disabled={logoUploading}
                >
                  {logoUploading ? (
                    <>
                      <div className="team-page-btn-spinner"></div>
                      Laddar upp...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      {currentTeam.logoUrl ? 'Byt logotyp' : 'Ladda upp logotyp'}
                    </>
                  )}
                </button>
                {currentTeam.logoUrl && (
                  <button
                    className="team-page-btn team-page-btn--danger team-page-btn--outline"
                    onClick={handleLogoRemove}
                    disabled={logoUploading}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    Ta bort
                  </button>
                )}
              </div>
              <p className="team-page-logo-hint">
                Stöds: JPG, PNG, GIF, WebP. Max 2MB.
              </p>
            </div>
          </div>
        </div>

        {/* Invite Card - Only for owners */}
        {isTeamOwner && (
          <div className="team-page-card team-page-invite-card">
            <div className="team-page-card-header">
              <div>
                <h2 className="team-page-card-title">Bjud in medlemmar</h2>
                <p className="team-page-card-subtitle">Dela denna kod med personer du vill bjuda in</p>
              </div>
            </div>
            <div className="team-page-card-body">
              <div className="team-page-invite-box">
                <code className="team-page-invite-code">{currentTeam.code}</code>
                <button
                  className={`team-page-btn team-page-btn--small ${codeCopied ? 'team-page-btn--success' : ''}`}
                  onClick={copyCodeToClipboard}
                >
                  {codeCopied ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Kopierad!
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      Kopiera
                    </>
                  )}
                </button>
              </div>
              {/* Password section */}
              <div className="team-page-password-section">
                <div className="team-page-password-header">
                  <span className="team-page-password-label">Lösenord</span>
                  {currentTeam.password ? (
                    <span className="team-page-badge team-page-badge--active">Aktivt</span>
                  ) : (
                    <span className="team-page-badge">Inaktivt</span>
                  )}
                </div>

                {currentTeam.password && !showPasswordEdit && (
                  <div className="team-page-password-display">
                    <div className="team-page-password-value">
                      {showPassword ? currentTeam.password : '••••••••'}
                    </div>
                    <div className="team-page-password-actions">
                      <button
                        className="team-page-btn team-page-btn--small team-page-btn--secondary"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          {showPassword ? (
                            <>
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                              <line x1="1" y1="1" x2="23" y2="23"/>
                            </>
                          ) : (
                            <>
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </>
                          )}
                        </svg>
                        {showPassword ? 'Dölj' : 'Visa'}
                      </button>
                      <button
                        className="team-page-btn team-page-btn--small team-page-btn--secondary"
                        onClick={() => {
                          setShowPasswordEdit(true);
                          setNewPassword('');
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Ändra
                      </button>
                      <button
                        className="team-page-btn team-page-btn--small team-page-btn--danger team-page-btn--outline"
                        onClick={handleRemovePassword}
                        disabled={passwordLoading}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                        Ta bort
                      </button>
                    </div>
                  </div>
                )}

                {!currentTeam.password && !showPasswordEdit && (
                  <div className="team-page-password-empty">
                    <p>Inget lösenord - vem som helst med koden kan gå med</p>
                    <button
                      className="team-page-btn team-page-btn--small team-page-btn--primary"
                      onClick={() => {
                        setShowPasswordEdit(true);
                        setNewPassword('');
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      Lägg till lösenord
                    </button>
                  </div>
                )}

                {showPasswordEdit && (
                  <form onSubmit={handleUpdatePassword} className="team-page-password-form">
                    <div className="team-page-form-group">
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Ange nytt lösenord"
                        disabled={passwordLoading}
                        autoFocus
                      />
                    </div>
                    <div className="team-page-password-form-actions">
                      <button
                        type="submit"
                        className="team-page-btn team-page-btn--small team-page-btn--primary"
                        disabled={passwordLoading || !newPassword.trim()}
                      >
                        {passwordLoading ? 'Sparar...' : 'Spara'}
                      </button>
                      <button
                        type="button"
                        className="team-page-btn team-page-btn--small team-page-btn--secondary"
                        onClick={() => {
                          setShowPasswordEdit(false);
                          setNewPassword('');
                        }}
                        disabled={passwordLoading}
                      >
                        Avbryt
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}


        {/* Team Settings Card - Only for owners */}
        {isTeamOwner && (
          <div className="team-page-card team-page-settings-card">
            <div className="team-page-card-header">
              <div>
                <h2 className="team-page-card-title">Teaminställningar</h2>
                <p className="team-page-card-subtitle">Hantera teamet</p>
              </div>
            </div>
            <div className="team-page-card-body">
              {/* Edit Team Name */}
              <div className="team-page-setting-row">
                <div className="team-page-setting-info">
                  <span className="team-page-setting-label">Teamnamn</span>
                  {!showNameEdit && (
                    <span className="team-page-setting-value">{currentTeam.name}</span>
                  )}
                </div>
                {!showNameEdit ? (
                  <button
                    className="team-page-btn team-page-btn--small team-page-btn--secondary"
                    onClick={() => {
                      setShowNameEdit(true);
                      setEditedTeamName(currentTeam.name);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Ändra
                  </button>
                ) : (
                  <form onSubmit={handleUpdateTeamName} className="team-page-setting-form">
                    <input
                      type="text"
                      value={editedTeamName}
                      onChange={(e) => setEditedTeamName(e.target.value)}
                      disabled={nameLoading}
                      autoFocus
                    />
                    <div className="team-page-setting-form-actions">
                      <button
                        type="submit"
                        className="team-page-btn team-page-btn--small team-page-btn--primary"
                        disabled={nameLoading || !editedTeamName.trim()}
                      >
                        {nameLoading ? 'Sparar...' : 'Spara'}
                      </button>
                      <button
                        type="button"
                        className="team-page-btn team-page-btn--small team-page-btn--secondary"
                        onClick={() => {
                          setShowNameEdit(false);
                          setEditedTeamName('');
                        }}
                        disabled={nameLoading}
                      >
                        Avbryt
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Transfer Ownership */}
              {teamMembers.length > 1 && (
                <div className="team-page-setting-row">
                  <div className="team-page-setting-info">
                    <span className="team-page-setting-label">Överför ägarskap</span>
                    <span className="team-page-setting-hint">Gör en annan medlem till ägare</span>
                  </div>
                  {!showTransferOwnership ? (
                    <button
                      className="team-page-btn team-page-btn--small team-page-btn--secondary"
                      onClick={() => setShowTransferOwnership(true)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="8.5" cy="7" r="4"/>
                        <polyline points="17 11 19 13 23 9"/>
                      </svg>
                      Överför
                    </button>
                  ) : (
                    <div className="team-page-setting-form">
                      <select
                        value={selectedNewOwner}
                        onChange={(e) => setSelectedNewOwner(e.target.value)}
                        disabled={transferLoading}
                        className="team-page-select"
                      >
                        <option value="">Välj ny ägare...</option>
                        {teamMembers
                          .filter(m => m.id !== currentUser?.uid)
                          .map(member => (
                            <option key={member.id} value={member.id}>
                              {member.displayName}
                            </option>
                          ))
                        }
                      </select>
                      <div className="team-page-setting-form-actions">
                        <button
                          type="button"
                          className="team-page-btn team-page-btn--small team-page-btn--warning"
                          onClick={handleTransferOwnership}
                          disabled={transferLoading || !selectedNewOwner}
                        >
                          {transferLoading ? 'Överför...' : 'Bekräfta'}
                        </button>
                        <button
                          type="button"
                          className="team-page-btn team-page-btn--small team-page-btn--secondary"
                          onClick={() => {
                            setShowTransferOwnership(false);
                            setSelectedNewOwner('');
                          }}
                          disabled={transferLoading}
                        >
                          Avbryt
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Delete Team */}
              <div className="team-page-setting-row team-page-setting-row--danger">
                <div className="team-page-setting-info">
                  <span className="team-page-setting-label">Ta bort team</span>
                  <span className="team-page-setting-hint">Permanent radering - kan inte ångras</span>
                </div>
                <button
                  className="team-page-btn team-page-btn--small team-page-btn--danger"
                  onClick={handleDeleteTeam}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <>
                      <div className="team-page-btn-spinner"></div>
                      Tar bort...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                      </svg>
                      Ta bort
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Members Card */}
        <div className="team-page-card">
          <div className="team-page-card-header">
            <div>
              <h2 className="team-page-card-title">Medlemmar</h2>
              <p className="team-page-card-subtitle">Personer i ditt team</p>
            </div>
          </div>
          <div className="team-page-card-body team-page-card-body--flush">
            <div className="team-page-members">
              {teamMembers.map((member, index) => (
                <div
                  key={member.id}
                  className="team-page-member"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="team-page-member-avatar">
                    {getInitials(member.displayName)}
                  </div>
                  <div className="team-page-member-info">
                    <div className="team-page-member-name">
                      {member.displayName}
                      {member.id === currentTeam.ownerId && (
                        <span className="team-page-badge team-page-badge--owner">Ägare</span>
                      )}
                      {member.id === currentUser?.uid && (
                        <span className="team-page-badge team-page-badge--you">Du</span>
                      )}
                    </div>
                    <div className="team-page-member-meta">
                      {member.email}
                      {member.companyName && ` • ${member.companyName}`}
                    </div>
                  </div>
                  {isTeamOwner && member.id !== currentUser?.uid && (
                    <button
                      className="team-page-btn team-page-btn--danger team-page-btn--small"
                      onClick={() => handleRemoveMember(member.id, member.displayName)}
                      disabled={actionLoading}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Teams Card - Always show */}
        <div className="team-page-card">
          <div className="team-page-card-header">
            <div>
              <h2 className="team-page-card-title">Dina team</h2>
              <p className="team-page-card-subtitle">
                {userTeams.length === 1 ? 'Du är medlem i 1 team' : `Du är medlem i ${userTeams.length} team`}
              </p>
            </div>
            <button
              className="team-page-btn team-page-btn--small team-page-btn--secondary"
              onClick={() => setShowAddTeam(!showAddTeam)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              {showAddTeam ? 'Avbryt' : 'Lägg till'}
            </button>
          </div>
          <div className="team-page-card-body team-page-card-body--flush">
            <div className="team-page-teams">
              {userTeams.map((team, index) => (
                <button
                  key={team.id}
                  className={`team-page-team ${team.id === currentTeam.id ? 'team-page-team--active' : ''}`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => handleSwitchTeam(team.id)}
                  disabled={switchingTeam === team.id}
                >
                  <div className="team-page-team-icon">
                    {team.logoUrl ? (
                      <img src={team.logoUrl} alt={team.name} />
                    ) : (
                      team.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="team-page-team-info">
                    <div className="team-page-team-name">{team.name}</div>
                    <div className="team-page-team-meta">
                      {team.members?.length || 1} {(team.members?.length || 1) === 1 ? 'medlem' : 'medlemmar'}
                      {team.ownerId === currentUser?.uid && ' • Ägare'}
                    </div>
                  </div>
                  {team.id === currentTeam.id ? (
                    <span className="team-page-badge team-page-badge--active">Aktivt</span>
                  ) : switchingTeam === team.id ? (
                    <div className="team-page-btn-spinner"></div>
                  ) : (
                    <svg className="team-page-team-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {/* Add Team Form */}
            {showAddTeam && (
              <div className="team-page-add-team">
                <div className="team-page-add-team-grid">
                  {/* Create Team */}
                  <div className="team-page-add-team-section">
                    <h3>Skapa nytt team</h3>
                    <form onSubmit={handleCreateTeam}>
                      <div className="team-page-form-group">
                        <input
                          type="text"
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          placeholder="Teamnamn"
                          disabled={actionLoading}
                        />
                      </div>
                      <div className="team-page-form-group">
                        <input
                          type="password"
                          value={teamPassword}
                          onChange={(e) => setTeamPassword(e.target.value)}
                          placeholder="Lösenord (valfritt)"
                          disabled={actionLoading}
                        />
                      </div>
                      <button type="submit" className="team-page-btn team-page-btn--primary" disabled={actionLoading}>
                        {actionLoading ? 'Skapar...' : 'Skapa team'}
                      </button>
                    </form>
                  </div>

                  {/* Join Team */}
                  <div className="team-page-add-team-section">
                    <h3>Gå med i team</h3>
                    <form onSubmit={handleJoinTeam}>
                      <div className="team-page-form-group">
                        <input
                          type="text"
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                          placeholder="Inbjudningskod"
                          disabled={actionLoading}
                        />
                      </div>
                      <div className="team-page-form-group">
                        <input
                          type="password"
                          value={joinPassword}
                          onChange={(e) => setJoinPassword(e.target.value)}
                          placeholder="Lösenord (om det krävs)"
                          disabled={actionLoading}
                        />
                      </div>
                      <button type="submit" className="team-page-btn team-page-btn--secondary" disabled={actionLoading}>
                        {actionLoading ? 'Går med...' : 'Gå med'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Leave Team - visas för alla */}
        <div className="team-page-actions">
          <button
            className="team-page-btn team-page-btn--danger team-page-btn--outline"
            onClick={handleLeaveTeam}
            disabled={actionLoading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {actionLoading ? 'Lämnar...' : 'Lämna team'}
          </button>
        </div>

        {/* Modal för att välja ny ägare när ägare lämnar */}
        {showLeaveAsOwner && (
          <div className="team-page-modal-overlay" onClick={() => setShowLeaveAsOwner(false)}>
            <div className="team-page-modal" onClick={e => e.stopPropagation()}>
              <h3>Välj ny ägare</h3>
              <p>Du måste välja en ny ägare innan du kan lämna teamet.</p>

              <div className="team-page-owner-select">
                {teamMembers
                  .filter(m => m.id !== currentUser?.uid)
                  .map(member => (
                    <label key={member.id} className="team-page-owner-option">
                      <input
                        type="radio"
                        name="newOwner"
                        value={member.id}
                        checked={selectedNewOwner === member.id}
                        onChange={(e) => setSelectedNewOwner(e.target.value)}
                      />
                      <span className="team-page-owner-info">
                        <span className="team-page-owner-name">{member.displayName}</span>
                        {member.email && <span className="team-page-owner-email">{member.email}</span>}
                      </span>
                    </label>
                  ))}
              </div>

              <div className="team-page-modal-actions">
                <button
                  className="team-page-btn team-page-btn--secondary"
                  onClick={() => setShowLeaveAsOwner(false)}
                  disabled={transferLoading}
                >
                  Avbryt
                </button>
                <button
                  className="team-page-btn team-page-btn--danger"
                  onClick={handleLeaveAsOwner}
                  disabled={!selectedNewOwner || transferLoading}
                >
                  {transferLoading ? 'Överför och lämnar...' : 'Överför ägarskap och lämna'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamPage;
