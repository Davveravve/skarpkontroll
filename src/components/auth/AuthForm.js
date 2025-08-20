import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    companyName: '',
    contactPerson: '',
    phone: '',
    agreeToTerms: false
  });

  const { register, login, resetPassword, authError, setAuthError } = useAuth();

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!resetEmail.trim()) {
      setError('Ange din e-postadress');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await resetPassword(resetEmail);
      if (result.success) {
        setSuccess('Instruktioner för lösenordsåterställning har skickats till din e-post');
        setShowForgotPassword(false);
        setResetEmail('');
      } else {
        setError(result.error || 'Kunde inte skicka återställningslänk');
      }
    } catch (err) {
      setError('Ett oväntat fel uppstod. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    setShowForgotPassword(false);
    setResetEmail('');
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
        maxWidth: isLogin ? '420px' : '600px',
        background: 'white',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
          color: 'white',
          padding: 'var(--space-xl)',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            margin: '0 0 var(--space-sm) 0'
          }}>
            {isLogin ? 'Välkommen tillbaka!' : 'Kom igång idag'}
          </h1>
          <p style={{
            fontSize: 'var(--font-size-base)',
            opacity: 0.9,
            margin: 0
          }}>
            {isLogin 
              ? 'Logga in på ditt konto för att fortsätta' 
              : 'Skapa ditt konto och få 14 dagars gratis provperiod'
            }
          </p>
        </div>

        {/* Form Content */}
        <div style={{
          padding: 'var(--space-xl)'
        }}>
          {/* Error/Success Messages */}
          {displayError && (
            <div style={{
              background: 'var(--color-error-bg)',
              border: '1px solid var(--color-error-border)',
              color: 'var(--color-error-text)',
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-lg)',
              fontSize: 'var(--font-size-sm)'
            }}>
              {displayError}
            </div>
          )}

          {success && (
            <div style={{
              background: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              color: 'var(--color-success-text)',
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-lg)',
              fontSize: 'var(--font-size-sm)'
            }}>
              {success}
            </div>
          )}

          {/* Main Auth Form */}
          {!showForgotPassword ? (
            <form onSubmit={handleSubmit} style={{ marginBottom: 'var(--space-lg)' }}>
              {/* Form Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: !isLogin && windowWidth > 600 ? '1fr 1fr' : '1fr',
                gap: 'var(--space-lg)',
                marginBottom: 'var(--space-lg)'
              }}>
                {/* Email */}
                <div style={{ gridColumn: !isLogin && windowWidth > 600 ? 'span 2' : 'span 1' }}>
                  <label style={{
                    display: 'block',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-primary)',
                    marginBottom: 'var(--space-xs)'
                  }}>
                    E-postadress *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="din@epost.se"
                    required
                    style={{
                      width: '100%',
                      padding: 'var(--space-md)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--font-size-base)',
                      background: 'white',
                      transition: 'border-color var(--transition-fast)',
                      opacity: loading ? 0.7 : 1
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                  />
                </div>

                {/* Password */}
                <div style={{ gridColumn: !isLogin && windowWidth > 600 ? 'span 2' : 'span 1' }}>
                  <label style={{
                    display: 'block',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-primary)',
                    marginBottom: 'var(--space-xs)'
                  }}>
                    Lösenord *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="Minst 6 tecken"
                    required
                    style={{
                      width: '100%',
                      padding: 'var(--space-md)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--font-size-base)',
                      background: 'white',
                      transition: 'border-color var(--transition-fast)',
                      opacity: loading ? 0.7 : 1
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                  />
                </div>

                {/* Registration Only Fields */}
                {!isLogin && (
                  <>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-medium)',
                        color: 'var(--color-text-primary)',
                        marginBottom: 'var(--space-xs)'
                      }}>
                        Företagsnamn *
                      </label>
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        disabled={loading}
                        placeholder="Ditt företag AB"
                        required
                        style={{
                          width: '100%',
                          padding: 'var(--space-md)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 'var(--font-size-base)',
                          background: 'white',
                          transition: 'border-color var(--transition-fast)',
                          opacity: loading ? 0.7 : 1
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-medium)',
                        color: 'var(--color-text-primary)',
                        marginBottom: 'var(--space-xs)'
                      }}>
                        Kontaktperson *
                      </label>
                      <input
                        type="text"
                        name="contactPerson"
                        value={formData.contactPerson}
                        onChange={handleChange}
                        disabled={loading}
                        placeholder="För- och efternamn"
                        required
                        style={{
                          width: '100%',
                          padding: 'var(--space-md)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 'var(--font-size-base)',
                          background: 'white',
                          transition: 'border-color var(--transition-fast)',
                          opacity: loading ? 0.7 : 1
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                      />
                    </div>

                    <div style={{ gridColumn: windowWidth > 600 ? 'span 2' : 'span 1' }}>
                      <label style={{
                        display: 'block',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-medium)',
                        color: 'var(--color-text-primary)',
                        marginBottom: 'var(--space-xs)'
                      }}>
                        Telefonnummer
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        disabled={loading}
                        placeholder="070-123 45 67"
                        style={{
                          width: '100%',
                          padding: 'var(--space-md)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 'var(--font-size-base)',
                          background: 'white',
                          transition: 'border-color var(--transition-fast)',
                          opacity: loading ? 0.7 : 1
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Terms Checkbox for Registration */}
              {!isLogin && (
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-sm)',
                  marginBottom: 'var(--space-lg)'
                }}>
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleChange}
                    disabled={loading}
                    required
                    style={{
                      marginTop: '2px',
                      accentColor: 'var(--color-primary)'
                    }}
                  />
                  <label style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.5
                  }}>
                    Jag accepterar{' '}
                    <a 
                      href="/terms" 
                      target="_blank"
                      style={{
                        color: 'var(--color-primary)',
                        textDecoration: 'none'
                      }}
                    >
                      användarvillkoren
                    </a>
                    {' '}och{' '}
                    <a 
                      href="/privacy" 
                      target="_blank"
                      style={{
                        color: 'var(--color-primary)',
                        textDecoration: 'none'
                      }}
                    >
                      integritetspolicyn
                    </a>
                  </label>
                </div>
              )}

              {/* Submit Button */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-md)'
              }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: 'var(--space-md)',
                    background: loading ? 'var(--color-gray-400)' : 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-base)',
                    fontWeight: 'var(--font-weight-medium)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all var(--transition-fast)',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? (isLogin ? 'Loggar in...' : 'Skapar konto...') : (isLogin ? 'Logga in' : 'Skapa konto')}
                </button>

                {/* Forgot Password for Login */}
                {isLogin && (
                  <button 
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
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
            </form>
          ) : (
            /* Forgot Password Form */
            <div style={{
              padding: 'var(--space-lg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-gray-50)',
              marginBottom: 'var(--space-lg)'
            }}>
              <h3 style={{ 
                margin: '0 0 var(--space-md) 0',
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)'
              }}>
                Återställ lösenord
              </h3>
              <p style={{
                margin: '0 0 var(--space-lg) 0',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5
              }}>
                Ange din e-postadress så skickar vi instruktioner för att återställa ditt lösenord.
              </p>
              <form onSubmit={handleForgotPassword}>
                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <label style={{
                    display: 'block',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-primary)',
                    marginBottom: 'var(--space-xs)'
                  }}>
                    E-postadress
                  </label>
                  <input
                    type="email"
                    placeholder="din@epost.se"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    disabled={loading}
                    required
                    style={{
                      width: '100%',
                      padding: 'var(--space-md)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--font-size-base)',
                      background: 'white',
                      transition: 'border-color var(--transition-fast)',
                      opacity: loading ? 0.7 : 1
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                  />
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: 'var(--space-sm)',
                  flexDirection: windowWidth > 480 ? 'row' : 'column'
                }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      flex: windowWidth > 480 ? 1 : 'none',
                      padding: 'var(--space-sm) var(--space-md)',
                      background: loading ? 'var(--color-gray-400)' : 'var(--color-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'all var(--transition-fast)',
                      opacity: loading ? 0.7 : 1
                    }}
                  >
                    {loading ? 'Skickar...' : 'Skicka återställningslänk'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail('');
                      setError('');
                      setSuccess('');
                    }}
                    disabled={loading}
                    style={{
                      flex: windowWidth > 480 ? 1 : 'none',
                      padding: 'var(--space-sm) var(--space-md)',
                      background: 'transparent',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'all var(--transition-fast)',
                      opacity: loading ? 0.7 : 1
                    }}
                  >
                    Avbryt
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Features for Registration */}
          {!isLogin && !showForgotPassword && (
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
                gap: 'var(--space-lg)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-md)'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    background: 'var(--color-success)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span style={{ color: 'white', fontSize: '12px' }}>✓</span>
                  </div>
                  <div>
                    <h4 style={{
                      fontSize: 'var(--font-size-base)',
                      fontWeight: 'var(--font-weight-medium)',
                      margin: '0 0 var(--space-xs) 0'
                    }}>
                      Molnlagring
                    </h4>
                    <p style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      margin: 0,
                      lineHeight: 1.4
                    }}>
                      Säker backup av alla dina data
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Toggle Mode */}
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-lg) 0',
            borderTop: '1px solid var(--color-border)',
            marginTop: 'var(--space-xl)'
          }}>
            <p style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              margin: '0 0 var(--space-sm) 0'
            }}>
              {isLogin ? 'Har du inget konto?' : 'Har du redan ett konto?'}
            </p>
            <button
              type="button"
              onClick={toggleMode}
              disabled={loading}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-primary)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                cursor: loading ? 'not-allowed' : 'pointer',
                textDecoration: 'underline',
                transition: 'color var(--transition-fast)',
                opacity: loading ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) e.target.style.color = 'var(--color-primary-dark)';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.target.style.color = 'var(--color-primary)';
              }}
            >
              {isLogin ? 'Skapa konto här' : 'Logga in här'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;