// src/components/layout/MainLayout.js - Responsive layout with clickable user cards
import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const MainLayout = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navigationItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
      )
    },
    {
      path: '/customers',
      label: 'Kunder',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      )
    },
    {
      path: '/kontrollpunkter',
      label: 'Kontrollpunkter',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11l3 3L22 4"/>
          <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.73 0 3.35.49 4.73 1.34"/>
        </svg>
      )
    },
    {
      path: '/team',
      label: 'Team',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      )
    }
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setMobileMenuOpen(false);
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Determine if sidebar should be shown - Simplified: only desktop or mobile
  const showSidebar = windowWidth > 1024;
  const showMobileHeader = windowWidth <= 1024; // Changed from 768 to 1024

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-background)' }}>
      {/* Desktop Sidebar - Full Width */}
      {showSidebar && (
        <aside 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100vh',
            width: '280px',
            background: 'var(--color-surface)',
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            transition: 'all var(--transition-normal)'
          }}
        >
          {/* Logo Section */}
          <div style={{ padding: 'var(--space-xl)', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'var(--font-weight-bold)',
                  fontSize: '1.25rem',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}
              >
                SK
              </div>
              <div>
                <h1 style={{
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-lg)',
                  fontWeight: 'var(--font-weight-bold)',
                  margin: 0,
                  lineHeight: 1.2
                }}>
                  SKARP
                </h1>
                <p style={{
                  color: 'var(--color-text-muted)',
                  fontSize: 'var(--font-size-xs)',
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Kontrollsystem
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, padding: 'var(--space-lg) 0' }}>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {navigationItems.map((item) => (
                <li key={item.path} style={{ marginBottom: 'var(--space-xs)' }}>
                  <Link 
                    to={item.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-md)',
                      padding: 'var(--space-md) var(--space-xl)',
                      color: isActive(item.path) ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      textDecoration: 'none',
                      fontWeight: isActive(item.path) ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                      fontSize: 'var(--font-size-base)',
                      transition: 'all var(--transition-normal)',
                      borderRadius: 'var(--radius-md)',
                      margin: '0 var(--space-md)',
                      background: isActive(item.path) ? 'var(--color-primary-alpha)' : 'transparent',
                      border: isActive(item.path) ? '1px solid var(--color-primary)' : '1px solid transparent'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                    {isActive(item.path) && (
                      <div 
                        style={{
                          width: '6px',
                          height: '6px',
                          background: 'var(--color-primary)',
                          borderRadius: '50%',
                          marginLeft: 'auto'
                        }}
                      />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* User Section with Logout Button */}
          <div style={{ 
            padding: 'var(--space-lg) var(--space-xl)', 
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-surface-hover)'
          }}>
            {/* Logout Button */}
            <button 
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
                width: '100%',
                padding: 'var(--space-md)',
                marginBottom: 'var(--space-md)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-danger)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                transition: 'all var(--transition-normal)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'var(--color-danger-alpha)';
                e.target.style.borderColor = 'var(--color-danger)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'var(--color-surface)';
                e.target.style.borderColor = 'var(--color-border)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16,17 21,12 16,7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logga ut
            </button>

            {/* Clickable User Profile Card */}
            <Link
              to="/profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
                padding: 'var(--space-md)',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
                transition: 'all var(--transition-normal)',
                textDecoration: 'none',
                color: 'inherit'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-surface-hover)';
                e.currentTarget.style.borderColor = 'var(--color-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--color-surface)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }}
            >
              <div 
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'var(--color-primary)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-background)',
                  fontWeight: 'var(--font-weight-bold)',
                  fontSize: 'var(--font-size-sm)'
                }}
              >
                {getInitials(userProfile?.contactPerson || currentUser?.displayName)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  color: 'var(--color-text-primary)', 
                  fontWeight: 'var(--font-weight-semibold)',
                  fontSize: 'var(--font-size-sm)',
                  lineHeight: 1.2
                }}>
                  {userProfile?.contactPerson || currentUser?.displayName || 'Användare'}
                </div>
                <div style={{ 
                  color: 'var(--color-text-muted)', 
                  fontSize: 'var(--font-size-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Gratis
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9,18 15,12 9,6"/>
              </svg>
            </Link>
          </div>
        </aside>
      )}

      {/* Mobile Header */}
      {showMobileHeader && (
        <header 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '70px',
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)',
            zIndex: 1001
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '100%',
            padding: '0 var(--space-lg)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <div 
                style={{
                  width: '32px',
                  height: '32px',
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'var(--font-weight-bold)',
                  fontSize: 'var(--font-size-sm)',
                  boxShadow: '0 2px 8px rgba(0, 102, 204, 0.3)'
                }}
              >
                SK
              </div>
              <span style={{ 
                color: 'var(--color-text-primary)', 
                fontWeight: 'var(--font-weight-semibold)',
                fontSize: 'var(--font-size-lg)'
              }}>
                SKARP
              </span>
            </div>
            
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                background: 'var(--color-surface-hover)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all var(--transition-normal)'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileMenuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </>
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                  </>
                )}
              </svg>
            </button>
          </div>
        </header>
      )}

      {/* Mobile Menu */}
      {showMobileHeader && mobileMenuOpen && (
        <div 
          style={{
            position: 'fixed',
            top: '70px',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'var(--color-surface)',
            borderTop: '1px solid var(--color-border)',
            zIndex: 1000,
            overflow: 'auto'
          }}
        >
          <nav style={{ padding: 'var(--space-xl) var(--space-lg)' }}>
            {navigationItems.map((item) => (
              <Link 
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-md)',
                  padding: 'var(--space-lg)',
                  marginBottom: 'var(--space-md)',
                  background: isActive(item.path) ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                  color: isActive(item.path) ? 'var(--color-background)' : 'var(--color-text-primary)',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${isActive(item.path) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  fontWeight: isActive(item.path) ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                  textDecoration: 'none',
                  fontSize: 'var(--font-size-base)'
                }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>
          
          <div style={{ 
            padding: 'var(--space-lg)', 
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-surface-hover)'
          }}>
            <div style={{
              background: 'var(--color-surface)',
              padding: 'var(--space-lg)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)'
            }}>
              {/* Clickable User Profile Card - Mobile */}
              <Link 
                to="/profile"
                style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 'var(--space-md)', 
                  marginBottom: 'var(--space-lg)',
                  padding: 'var(--space-md)',
                  borderRadius: 'var(--radius-lg)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'background-color 0.2s ease'
                }}
                onClick={() => setMobileMenuOpen(false)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-surface-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div 
                  style={{
                    width: '40px',
                    height: '40px',
                    background: 'var(--color-primary)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-background)',
                    fontWeight: 'var(--font-weight-bold)'
                  }}
                >
                  {getInitials(userProfile?.contactPerson || currentUser?.displayName)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    color: 'var(--color-text-primary)', 
                    fontWeight: 'var(--font-weight-semibold)',
                    marginBottom: '4px'
                  }}>
                    {userProfile?.contactPerson || currentUser?.displayName || 'Användare'}
                  </div>
                  <div style={{ 
                    color: 'var(--color-text-muted)', 
                    fontSize: 'var(--font-size-xs)'
                  }}>
                    Gratis Plan
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9,18 15,12 9,6"/>
                </svg>
              </Link>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <button 
                  onClick={handleLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-md)',
                    padding: 'var(--space-md)',
                    background: 'var(--color-danger-alpha)',
                    color: 'var(--color-danger)',
                    border: '1px solid var(--color-danger)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontWeight: 'var(--font-weight-medium)',
                    justifyContent: 'center',
                    width: '100%'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16,17 21,12 16,7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Logga ut
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay for mobile menu */}
      {showMobileHeader && mobileMenuOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999
          }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main 
        style={{
          flex: 1,
          marginLeft: showSidebar ? '280px' : '0',
          marginTop: showMobileHeader ? '70px' : '0',
          minHeight: '100vh',
          background: 'var(--color-background)',
          transition: 'margin-left var(--transition-normal)'
        }}
      >
        <div style={{ padding: 'var(--space-2xl)' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;