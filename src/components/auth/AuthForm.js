// src/components/auth/AuthForm.js - Professionell auth form med SKARP design
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    companyName: '',
    contactPerson: '',
    phone: '',
    agreeToTerms: false
  });

  const { currentUser, login, register, authError, setAuthError } = useAuth();

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hantera Google Password Manager och overlay-problem
  useEffect(() => {
    const removeGoogleOverlays = () => {
      const overlays = document.querySelectorAll('[role="alert"], .password-warning, [data-google]');
      overlays.forEach(overlay => {
        if (overlay.textContent?.includes('liknande lösenord') || 
            overlay.textContent?.includes('data breach') ||
            overlay.textContent?.includes('Check your saved passwords')) {
          overlay.style.display = 'none';
          overlay.remove();
        }
      });
    };

    const intervals = [100, 500, 1000, 2000];
    const timeouts = intervals.map(delay => 
      setTimeout(removeGoogleOverlays, delay)
    );

    return () => timeouts.forEach(clearTimeout);
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear errors when user types
    if (error) setError('');
    if (success) setSuccess('');
    if (authError) setAuthError(null);
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('E-postadress krävs');
      return false;
    }
    
    if (!formData.password) {
      setError('Lösenord krävs');
      return false;
    }
    
    if (formData.password.length < 6) {
      setError('Lösenordet måste vara minst 6 tecken');
      return false;
    }
    
    if (!isLogin) {
      if (!formData.companyName.trim()) {
        setError('Företagsnamn krävs');
        return false;
      }
      
      if (!formData.contactPerson.trim()) {
        setError('Kontaktperson krävs');
        return false;
      }
      
      if (!formData.agreeToTerms) {
        setError('Du måste acceptera användarvillkoren');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    
    try {
      if (isLogin) {
        const result = await login(formData.email, formData.password);
        if (!result.success) {
          setError(result?.error || 'Inloggning misslyckades');
        }
      } else {
        const result = await register(
          formData.email,
          formData.password,
          formData.companyName,
          formData.contactPerson,
          formData.phone
        );
        
        if (result.success) {
          if (result.requiresVerification) {
            setSuccess('Konto skapat! Kolla din e-post för att verifiera kontot.');
          } else {
            setSuccess('Konto skapat! Du får 14 dagars gratis provperiod.');
          }
          
          setFormData({
            email: '',
            password: '',
            companyName: '',
            contactPerson: '',
            phone: '',
            agreeToTerms: false
          });
        } else {
          setError(result?.error || 'Registrering misslyckades');
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError('Ett oväntat fel uppstod. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    if (authError) setAuthError(null);
    setFormData({
      email: '',
      password: '',
      companyName: '',
      contactPerson: '',
      phone: '',
      agreeToTerms: false
    });
  };

  const displayError = error || authError;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-background)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: windowWidth > 768 ? 'var(--space-xl)' : 'var(--space-lg)',
    }}>
      {/* Auth Container */}
      <div style={{
        width: '100%',
        maxWidth: isLogin ? '480px' : '520px',
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
                {isLogin ? 'Välkommen tillbaka' : 'Kom igång idag'}
              </h2>
              <p style={{
                fontSize: 'var(--font-size-base)',
                color: 'var(--color-text-muted)',
                margin: 0
              }}>
                {isLogin 
                  ? 'Logga in för att komma åt ditt kontrollsystem'
                  : 'Skapa ditt konto och få 14 dagars gratis provperiod'
                }
              </p>
            </div>
          </div>

          {/* Error Message */}
          {displayError && (
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
              {displayError}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div style={{
              background: 'var(--color-primary-alpha)',
              border: '2px solid var(--color-primary)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-md)',
              marginBottom: 'var(--space-xl)',
              color: 'var(--color-primary)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22,4 12,14.01 9,11.01"/>
              </svg>
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ marginBottom: 'var(--space-xl)' }} noValidate>
            
            {/* Registration Fields */}
            {!isLogin && (
              <>
                {/* Company Name */}
                <div style={{ marginBottom: 'var(--space-lg)' }}>
                  <label 
                    htmlFor="companyName"
                    style={{
                      display: 'block',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--space-sm)'
                    }}
                  >
                    Företagsnamn <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Ditt företags namn"
                    required
                    disabled={loading}
                    autoComplete="organization"
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

                {/* Contact Person */}
                <div style={{ marginBottom: 'var(--space-lg)' }}>
                  <label 
                    htmlFor="contactPerson"
                    style={{
                      display: 'block',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--space-sm)'
                    }}
                  >
                    Kontaktperson <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    id="contactPerson"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    placeholder="För- och efternamn"
                    required
                    disabled={loading}
                    autoComplete="name"
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

                {/* Phone */}
                <div style={{ marginBottom: 'var(--space-lg)' }}>
                  <label 
                    htmlFor="phone"
                    style={{
                      display: 'block',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--space-sm)'
                    }}
                  >
                    Telefonnummer
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="070-123 45 67"
                    disabled={loading}
                    autoComplete="tel"
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
              </>
            )}

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
                autoComplete={isLogin ? "email" : "username"}
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
            <div style={{ marginBottom: !isLogin ? 'var(--space-lg)' : 'var(--space-xl)' }}>
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
                  placeholder={isLogin ? 'Ditt lösenord' : 'Minst 6 tecken'}
                  required
                  minLength={6}
                  disabled={loading}
                  autoComplete={isLogin ? "current-password" : "new-password"}
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
                  title={showPassword ? 'Dölj lösenord' : 'Visa lösenord'}
                  tabIndex={-1}
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

            {/* Terms Agreement for Registration */}
            {!isLogin && (
              <div style={{ marginBottom: 'var(--space-xl)' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-sm)',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-secondary)'
                }}>
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    style={{
                      marginTop: '2px',
                      width: '16px',
                      height: '16px',
                      flexShrink: 0,
                      accentColor: 'var(--color-primary)'
                    }}
                  />
                  <span>
                    Jag accepterar{' '}
                    <a 
                      href="#" 
                      style={{
                        color: 'var(--color-primary)',
                        textDecoration: 'none',
                        fontWeight: 'var(--font-weight-semibold)'
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        console.log('Öppna användarvillkor');
                      }}
                      onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                    >
                      användarvillkoren
                    </a>
                    {' '}och{' '}
                    <a 
                      href="#" 
                      style={{
                        color: 'var(--color-primary)',
                        textDecoration: 'none',
                        fontWeight: 'var(--font-weight-semibold)'
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        console.log('Öppna integritetspolicy');
                      }}
                      onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                    >
                      integritetspolicyn
                    </a>
                  </span>
                </label>
              </div>
            )}

            {/* Submit Button */}
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
                  {isLogin ? 'Loggar in...' : 'Skapar konto...'}
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {isLogin ? (
                      <>
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                        <polyline points="10,17 15,12 10,7"/>
                        <line x1="15" y1="12" x2="3" y2="12"/>
                      </>
                    ) : (
                      <>
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <line x1="19" y1="8" x2="19" y2="14"/>
                        <line x1="22" y1="11" x2="16" y2="11"/>
                      </>
                    )}
                  </svg>
                  {isLogin ? 'Logga in' : 'Skapa konto'}
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
              {isLogin ? 'Har du inget konto?' : 'Har du redan ett konto?'}
            </p>
            
            <button 
              type="button" 
              onClick={toggleMode}
              disabled={loading}
              style={{
                background: 'transparent',
                border: '2px solid var(--color-primary)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-md) var(--space-lg)',
                color: 'var(--color-primary)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all var(--transition-normal)',
                opacity: loading ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.background = 'var(--color-primary)';
                  e.target.style.color = 'white';
                  e.target.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.background = 'transparent';
                  e.target.style.color = 'var(--color-primary)';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              {isLogin ? 'Skapa konto' : 'Logga in'}
            </button>

            {/* Forgot Password for Login */}
            {isLogin && (
              <button 
                type="button"
                onClick={() => {
                  console.log('Återställ lösenord för:', formData.email);
                  alert('Lösenordsåterställning är inte implementerad än');
                }}
                disabled={loading}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  fontSize: 'var(--font-size-sm)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  textDecoration: 'underline',
                  transition: 'color var(--transition-fast)',
                  padding: 'var(--space-xs)',
                  opacity: loading ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.target.style.color = 'var(--color-primary)';
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.target.style.color = 'var(--color-text-muted)';
                }}
              >
                Glömt lösenordet?
              </button>
            )}
          </div>

          {/* Features for Registration */}
          {!isLogin && (
            <div style={{
              marginTop: 'var(--space-xl)',
              padding: 'var(--space-xl)',
              background: 'var(--color-gray-50)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)'
            }}>
              <h3 style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-lg)',
                textAlign: 'center',
                margin: '0 0 var(--space-lg) 0'
              }}>
                Vad ingår i provperioden?
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: windowWidth > 480 ? 'repeat(2, 1fr)' : '1fr',
                gap: 'var(--space-md)'
              }}>
                {[
                  { icon: '👥', text: '1 kund' },
                  { icon: '📋', text: '3 mallar' },
                  { icon: '💾', text: '1 GB lagring' },
                  { icon: '✅', text: 'Obegränsade kontroller' }
                ].map((feature, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)'
                  }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'var(--color-primary-alpha)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      flexShrink: 0
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                        <polyline points="20,6 9,17 4,12"/>
                      </svg>
                    </div>
                    <span>{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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

export default AuthForm;