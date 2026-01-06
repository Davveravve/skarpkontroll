// src/pages/LoginPage.js - Professionell login-sida med SKARP design
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const { login, currentUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error || 'Inloggning misslyckades. Försök igen.');
      }
    } catch (err) {
      setError('Ett oväntat fel inträffade. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-background)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: windowWidth > 768 ? 'var(--space-xl)' : 'var(--space-lg)',
    }}>
      {/* Login Container */}
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: 'linear-gradient(145deg, var(--color-surface) 0%, #fefefe 100%)',
        borderRadius: 'var(--radius-xl)',
        border: '2px solid var(--color-gray-300)',
        boxShadow: `
          0 8px 25px rgba(0, 0, 0, 0.1),
          0 20px 40px rgba(0, 102, 204, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.6)
        `,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Gradient accent line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-light) 100%)'
        }} />

        {/* Main Content */}
        <div style={{ padding: windowWidth > 768 ? 'var(--space-3xl)' : 'var(--space-xl)' }}>
          
          {/* Logo & Header */}
          <div style={{
            textAlign: 'center',
            marginBottom: windowWidth > 768 ? 'var(--space-3xl)' : 'var(--space-xl)'
          }}>
            {/* SK Logo */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-md)',
              marginBottom: 'var(--space-xl)'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'var(--font-weight-bold)',
                fontSize: '1.5rem',
                boxShadow: '0 4px 12px rgba(0, 102, 204, 0.3)'
              }}>
                SK
              </div>
              <div>
                <h1 style={{
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-2xl)',
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

            {/* Welcome Header */}
            <div>
              <h2 style={{
                fontSize: windowWidth > 768 ? 'var(--font-size-2xl)' : 'var(--font-size-xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-sm)',
                margin: 0
              }}>
                Välkommen tillbaka
              </h2>
              <p style={{
                fontSize: 'var(--font-size-base)',
                color: 'var(--color-text-muted)',
                margin: 0
              }}>
                Logga in för att komma åt ditt kontrollsystem
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              background: 'var(--color-danger-alpha)',
              border: '2px solid var(--color-danger)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-md)',
              marginBottom: 'var(--space-xl)',
              color: 'var(--color-danger)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} style={{ marginBottom: 'var(--space-xl)' }}>
            
            {/* Email Field */}
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label 
                htmlFor="email"
                style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--space-sm)'
                }}
              >
                E-postadress <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="din@epost.se"
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: 'var(--space-md) var(--space-lg)',
                  border: '2px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: 'var(--font-size-base)',
                  fontFamily: 'inherit',
                  background: loading ? 'var(--color-gray-100)' : 'var(--color-surface)',
                  color: loading ? 'var(--color-text-disabled)' : 'var(--color-text-primary)',
                  outline: 'none',
                  transition: 'all var(--transition-normal)',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-primary)';
                  e.target.style.boxShadow = '0 0 0 3px var(--color-primary-alpha)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-border)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <label 
                htmlFor="password"
                style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--space-sm)'
                }}
              >
                Lösenord <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Ditt lösenord"
                  required
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: 'var(--space-md) var(--space-lg)',
                    paddingRight: '3.5rem',
                    border: '2px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    fontSize: 'var(--font-size-base)',
                    fontFamily: 'inherit',
                    background: loading ? 'var(--color-gray-100)' : 'var(--color-surface)',
                    color: loading ? 'var(--color-text-disabled)' : 'var(--color-text-primary)',
                    outline: 'none',
                    transition: 'all var(--transition-normal)',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--color-primary)';
                    e.target.style.boxShadow = '0 0 0 3px var(--color-primary-alpha)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--color-border)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                
                {/* Password Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  style={{
                    position: 'absolute',
                    right: 'var(--space-md)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    padding: 'var(--space-xs)',
                    borderRadius: 'var(--radius-md)',
                    transition: 'all var(--transition-fast)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) e.target.style.color = 'var(--color-text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) e.target.style.color = 'var(--color-text-muted)';
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <path d="M1 1l22 22"/>
                        <path d="M8.71 8.71a4 4 0 1 1 5.65 5.65"/>
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button 
              type="submit" 
              disabled={loading}
              style={{
                width: '100%',
                padding: 'var(--space-lg)',
                background: loading ? 
                  'var(--color-gray-400)' : 
                  'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
                border: '2px solid transparent',
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--font-size-base)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all var(--transition-normal)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-sm)',
                boxShadow: loading ? 'none' : '0 4px 6px rgba(0, 102, 204, 0.25), 0 2px 4px rgba(0, 0, 0, 0.1)',
                opacity: loading ? 0.7 : 1,
                transform: loading ? 'none' : 'translateY(0)',
                minHeight: '48px'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.background = 'linear-gradient(135deg, var(--color-primary-dark) 0%, #003a7a 100%)';
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 15px rgba(0, 102, 204, 0.3), 0 4px 8px rgba(0, 0, 0, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.background = 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 6px rgba(0, 102, 204, 0.25), 0 2px 4px rgba(0, 0, 0, 0.1)';
                }
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Loggar in...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10,17 15,12 10,7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  Logga in
                </>
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div style={{
            textAlign: 'center',
            borderTop: '1px solid var(--color-border)',
            paddingTop: 'var(--space-xl)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md)'
          }}>
            <p style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-muted)',
              margin: 0
            }}>
              Har du inget konto?{' '}
              <Link 
                to="/register" 
                style={{
                  color: 'var(--color-primary)',
                  textDecoration: 'none',
                  fontWeight: 'var(--font-weight-semibold)',
                  transition: 'color var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.target.style.color = 'var(--color-primary-dark)'}
                onMouseLeave={(e) => e.target.style.color = 'var(--color-primary)'}
              >
                Skapa konto här
              </Link>
            </p>
            
            <button 
              type="button"
              onClick={() => alert('Glömt lösenord funktionen kommer snart')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted)',
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
                textDecoration: 'underline',
                transition: 'color var(--transition-fast)',
                padding: 'var(--space-xs)'
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--color-primary)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--color-text-muted)'}
            >
              Glömt lösenord?
            </button>
          </div>
        </div>
      </div>

      {/* Global Styles for animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;