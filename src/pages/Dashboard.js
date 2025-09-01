// src/pages/Dashboard.js - Fixad version med korrekta namn och bättre innehåll
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { currentUser, userProfile } = useAuth();
  const [recentInspections, setRecentInspections] = useState([]);
  const [hasCustomers, setHasCustomers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        console.log('📊 Loading dashboard data for user:', currentUser.email);

        // Check if user has any customers first
        const customersSnapshot = await getDocs(
          query(collection(db, 'customers'), where('userId', '==', currentUser.uid))
        );

        // Set hasCustomers for conditional rendering
        const hasCustomersResult = customersSnapshot.docs.length > 0;
        setHasCustomers(hasCustomersResult);
        
        // Fetch recent controls (new structure)
        const controlsSnapshot = await getDocs(
          query(collection(db, 'controls'), where('userId', '==', currentUser.uid))
        );

        const controls = controlsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const sortedControls = controls
          .sort((a, b) => {
            const aDate = a.createdAt?.seconds || 0;
            const bDate = b.createdAt?.seconds || 0;
            return bDate - aDate;
          })
          .slice(0, 5);

        setRecentInspections(sortedControls);
        
        // Store hasCustomers in component state if needed
        // You might want to add this as a state variable
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser]);

  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return 'Okänt datum';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('sv-SE');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid var(--color-gray-200)',
          borderTop: '4px solid var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <span style={{ 
          color: 'var(--color-text-muted)',
          fontSize: 'var(--font-size-base)'
        }}>
          Laddar dashboard...
        </span>
      </div>
    );
  }

  const userName = userProfile?.companyName || currentUser?.email?.split('@')[0] || 'Användare';

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: windowWidth > 1024 ? '0 24px' : '0 16px' 
    }}>
      
      {/* Welcome Header */}
      <div style={{ 
        marginBottom: windowWidth > 1024 ? '48px' : '32px' 
      }}>
        <h1 style={{ 
          fontSize: windowWidth > 1024 ? '32px' : windowWidth > 768 ? '28px' : '24px',
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-sm)',
          margin: '0 0 var(--space-sm) 0'
        }}>
          Välkommen tillbaka, {userName}!
        </h1>
        <p style={{ 
          fontSize: 'var(--font-size-lg)',
          color: 'var(--color-text-muted)',
          margin: 0
        }}>
          Här är en översikt av ditt SKARP kontrollsystem
        </p>
      </div>

      {/* About Section */}
      <div style={{
        background: 'linear-gradient(145deg, var(--color-surface) 0%, #fefefe 100%)',
        border: '2px solid var(--color-gray-300)',
        borderRadius: 'var(--radius-xl)',
        padding: windowWidth > 1024 ? 'var(--space-2xl)' : 'var(--space-xl)',
        marginBottom: windowWidth > 1024 ? '48px' : '32px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 10px 15px rgba(0, 0, 0, 0.1)',
        position: 'relative'
      }}>
        {/* Gradient accent line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0'
        }} />

        <div style={{
          display: 'grid',
          gridTemplateColumns: windowWidth > 768 ? '1fr 300px' : '1fr',
          gap: 'var(--space-xl)',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-md)',
              margin: '0 0 var(--space-md) 0'
            }}>
              Effektiva kontroller - enkelt och smidigt
            </h2>
            
            <p style={{
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              marginBottom: 'var(--space-lg)',
              margin: '0 0 var(--space-lg) 0'
            }}>
              Skapa kontroller enkelt med hjälp av mallar som kan återanvändas till andra kontroller. 
              Snabbt och smidigt. Spara kontrollerna enkelt till PDF och håll koll på alla dina installationer.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: windowWidth > 480 ? 'repeat(2, 1fr)' : '1fr',
              gap: 'var(--space-md)'
            }}>
              {[
                { icon: '📋', text: 'Återanvändbara mallar' },
                { icon: '📄', text: 'Exportera till PDF' },
                { icon: '📱', text: 'Fungerar överallt' },
                { icon: '⚡', text: 'Snabbt och enkelt' }
              ].map((feature, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-secondary)'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
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

          {windowWidth > 768 && !hasCustomers && (
            <div style={{
              background: 'var(--color-primary-alpha)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-xl)',
              textAlign: 'center',
              border: '1px solid var(--color-primary)'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-md) auto',
                color: 'white',
                fontSize: '24px'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12c.552 0 1-.448 1-1V8a2 2 0 0 0-2-2h-1V4a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v3c0 .552.448 1 1 1h1v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2h1z"/>
                </svg>
              </div>
              <h3 style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-primary)',
                marginBottom: 'var(--space-sm)',
                margin: '0 0 var(--space-sm) 0'
              }}>
                Kom igång nu
              </h3>
              <p style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-muted)',
                margin: '0 0 var(--space-lg) 0'
              }}>
                Skapa din första kund och kontroll
              </p>
              <Link 
                to="/customers/new"
                style={{
                  display: 'inline-block',
                  padding: 'var(--space-md) var(--space-lg)',
                  background: 'var(--color-primary)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  transition: 'all var(--transition-normal)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--color-primary-dark)';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'var(--color-primary)';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                Lägg till kund
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent Inspections */}
      <div style={{
        background: 'linear-gradient(145deg, var(--color-surface) 0%, #fefefe 100%)',
        border: '2px solid var(--color-gray-300)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 10px 15px rgba(0, 0, 0, 0.1)',
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

        {/* Card Header */}
        <div style={{
          padding: windowWidth > 1024 ? '32px 32px 24px 32px' : '24px 16px'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: windowWidth > 768 ? 'center' : 'flex-start',
            flexDirection: windowWidth > 768 ? 'row' : 'column',
            gap: windowWidth > 768 ? '0' : '12px'
          }}>
            <div>
              <h2 style={{ 
                fontSize: windowWidth > 1024 ? '24px' : windowWidth > 768 ? '22px' : '20px',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-text-primary)',
                marginBottom: '4px',
                margin: '0 0 4px 0'
              }}>
                Senaste kontroller
              </h2>
              <p style={{ 
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-muted)',
                margin: 0
              }}>
                Översikt av dina senaste kontroller
              </p>
            </div>
            <Link 
              to="/customers" 
              style={{ 
                textDecoration: 'none',
                padding: 'var(--space-sm) var(--space-lg)',
                background: 'var(--color-surface-hover)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-primary)',
                transition: 'all var(--transition-normal)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'var(--color-primary)';
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'var(--color-surface-hover)';
                e.target.style.color = 'var(--color-primary)';
              }}
            >
              Visa alla →
            </Link>
          </div>
        </div>

        {/* Card Body */}
        <div style={{ 
          padding: windowWidth > 1024 ? '0 32px 32px 32px' : '0 16px 24px 16px' 
        }}>
          {recentInspections.length === 0 && !hasCustomers ? (
            <div style={{
              textAlign: 'center',
              padding: 'var(--space-2xl)'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: 'var(--color-gray-100)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-lg) auto'
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12c.552 0 1-.448 1-1V8a2 2 0 0 0-2-2h-1V4a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v3c0 .552.448 1 1 1h1v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2h1z"/>
                </svg>
              </div>
              <h3 style={{
                fontSize: 'var(--font-size-xl)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-sm)',
                margin: '0 0 var(--space-sm) 0'
              }}>
                Inga kontroller ännu
              </h3>
              <p style={{
                fontSize: 'var(--font-size-base)',
                color: 'var(--color-text-muted)',
                marginBottom: 'var(--space-xl)',
                margin: '0 0 var(--space-xl) 0'
              }}>
                Börja genom att lägga till en kund och skapa din första kontroll
              </p>
              <Link 
                to="/customers/new"
                style={{
                  display: 'inline-block',
                  padding: 'var(--space-md) var(--space-xl)',
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: 'var(--font-size-base)',
                  fontWeight: 'var(--font-weight-semibold)',
                  textDecoration: 'none',
                  transition: 'all var(--transition-normal)',
                  boxShadow: '0 4px 6px rgba(0, 102, 204, 0.25)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, var(--color-primary-dark) 0%, #003a7a 100%)';
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 15px rgba(0, 102, 204, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 6px rgba(0, 102, 204, 0.25)';
                }}
              >
                Lägg till första kunden
              </Link>
            </div>
          ) : recentInspections.length === 0 && hasCustomers ? (
            <div style={{
              textAlign: 'center',
              padding: 'var(--space-2xl)'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: 'var(--color-gray-100)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-lg) auto'
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12c.552 0 1-.448 1-1V8a2 2 0 0 0-2-2h-1V4a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v3c0 .552.448 1 1 1h1v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2h1z"/>
                </svg>
              </div>
              <h3 style={{
                fontSize: 'var(--font-size-xl)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-sm)',
                margin: '0 0 var(--space-sm) 0'
              }}>
                Inga kontroller ännu
              </h3>
              <p style={{
                fontSize: 'var(--font-size-base)',
                color: 'var(--color-text-muted)',
                marginBottom: 'var(--space-xl)',
                margin: '0 0 var(--space-xl) 0'
              }}>
                Skapa din första kontroll för en befintlig kund
              </p>
              <Link 
                to="/customers"
                style={{
                  display: 'inline-block',
                  padding: 'var(--space-md) var(--space-xl)',
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: 'var(--font-size-base)',
                  fontWeight: 'var(--font-weight-semibold)',
                  textDecoration: 'none',
                  transition: 'all var(--transition-normal)',
                  boxShadow: '0 4px 6px rgba(0, 102, 204, 0.25)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, var(--color-primary-dark) 0%, #003a7a 100%)';
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 15px rgba(0, 102, 204, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 6px rgba(0, 102, 204, 0.25)';
                }}
              >
                Välj kund och skapa kontroll
              </Link>
            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 'var(--space-lg)' 
            }}>
              {recentInspections.map((inspection, index) => (
                <Link
                  key={inspection.id}
                  to={`/controls/${inspection.id}`}
                  style={{
                    display: 'block',
                    padding: windowWidth > 1024 ? '24px' : '16px',
                    background: 'var(--color-surface)',
                    border: '2px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    textDecoration: 'none',
                    transition: 'all var(--transition-normal)',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = 'var(--color-primary)';
                    e.target.style.transform = 'translateY(-4px)';
                    e.target.style.boxShadow = '0 8px 25px rgba(0, 102, 204, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = 'var(--color-border)';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: windowWidth > 768 ? 'center' : 'flex-start',
                    flexDirection: windowWidth > 768 ? 'row' : 'column',
                    gap: windowWidth > 768 ? '0' : '12px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ 
                        fontSize: windowWidth > 1024 ? '18px' : '16px', 
                        fontWeight: 'var(--font-weight-semibold)', 
                        color: 'var(--color-primary)', 
                        marginBottom: '8px',
                        margin: '0 0 8px 0'
                      }}>
                        {/* Visa det riktiga namnet först, annars fallback */}
                        {inspection.name || 
                         (inspection.customerName && inspection.installationName 
                           ? `${inspection.customerName} - ${inspection.installationName}` 
                           : inspection.customerName || inspection.installationName || 'Kontroll')}
                      </h4>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: windowWidth > 768 ? '24px' : '12px', 
                        fontSize: 'var(--font-size-sm)', 
                        color: 'var(--color-text-muted)',
                        flexDirection: windowWidth > 768 ? 'row' : 'column',
                        alignItems: windowWidth > 768 ? 'center' : 'flex-start'
                      }}>
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-xs)'
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          {formatDate(inspection.createdAt)}
                        </span>
                        {inspection.templateName && (
                          <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-xs)'
                          }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14,2 14,8 20,8"/>
                            </svg>
                            {inspection.templateName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 'var(--space-lg)' 
                    }}>
                      <span style={{
                        padding: 'var(--space-xs) var(--space-md)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 'var(--font-weight-semibold)',
                        background: inspection.status === 'completed' ? 
                          'var(--color-primary-alpha)' : 
                          '#fef3c7',
                        color: inspection.status === 'completed' ? 
                          'var(--color-primary)' : 
                          '#92400e',
                        borderRadius: 'var(--radius-full)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {inspection.status === 'completed' ? 'Slutförd' : 'Pågående'}
                      </span>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2">
                        <polyline points="9,18 15,12 9,6"/>
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
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

export default Dashboard;