// src/components/subscription/SubscriptionManager.js - Professionell abonnemangssida med SKARP design
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const SubscriptionManager = () => {
  const { currentUser, userProfile } = useAuth();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Perfekt för små företag som börjar',
      price: 199,
      popular: false,
      features: [
        { text: '5 kunder', included: true },
        { text: '10 mallar', included: true },
        { text: 'Obegränsade kontroller', included: true },
        { text: '2 GB lagring', included: true },
        { text: 'E-post support', included: true },
        { text: 'Export till PDF', included: true },
        { text: 'Prioriterad support', included: false },
        { text: 'API-åtkomst', included: false }
      ]
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'Mest populära valet för växande företag',
      price: 399,
      popular: true,
      features: [
        { text: '25 kunder', included: true },
        { text: 'Obegränsade mallar', included: true },
        { text: 'Obegränsade kontroller', included: true },
        { text: '10 GB lagring', included: true },
        { text: 'Prioriterad support', included: true },
        { text: 'Export till PDF', included: true },
        { text: 'Anpassade rapporter', included: true },
        { text: 'API-åtkomst', included: false }
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'För stora organisationer med speciella behov',
      price: 799,
      popular: false,
      features: [
        { text: 'Obegränsade kunder', included: true },
        { text: 'Obegränsade mallar', included: true },
        { text: 'Obegränsade kontroller', included: true },
        { text: 'Obegränsad lagring', included: true },
        { text: 'Prioriterad support', included: true },
        { text: 'Export till PDF', included: true },
        { text: 'Anpassade rapporter', included: true },
        { text: 'API-åtkomst', included: true }
      ]
    }
  ];

  const currentSubscription = userProfile?.subscription || {
    plan: 'starter',
    status: 'trial'
  };

  const PlanCard = ({ plan }) => (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(145deg, var(--color-surface) 0%, #fefefe 100%)',
      border: plan.popular ? '2px solid var(--color-primary)' : '2px solid var(--color-gray-300)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-xl)',
      height: 'fit-content',
      transition: 'all var(--transition-normal)',
      boxShadow: plan.popular ? 
        '0 8px 25px rgba(0, 102, 204, 0.15), 0 20px 40px rgba(0, 102, 204, 0.1)' : 
        '0 4px 6px rgba(0, 0, 0, 0.07), 0 10px 15px rgba(0, 0, 0, 0.1)',
      transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
      zIndex: plan.popular ? 2 : 1
    }}>
      {/* Popular Badge */}
      {plan.popular && (
        <div style={{
          position: 'absolute',
          top: '-12px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
          color: 'white',
          padding: 'var(--space-sm) var(--space-lg)',
          borderRadius: 'var(--radius-full)',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-bold)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          boxShadow: '0 4px 12px rgba(0, 102, 204, 0.3)'
        }}>
          Mest populär
        </div>
      )}

      {/* Plan Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: 'var(--space-xl)',
        paddingTop: plan.popular ? 'var(--space-md)' : '0'
      }}>
        <h3 style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-sm)',
          margin: '0 0 var(--space-sm) 0'
        }}>
          {plan.name}
        </h3>
        
        <p style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-muted)',
          marginBottom: 'var(--space-lg)',
          margin: '0 0 var(--space-lg) 0'
        }}>
          {plan.description}
        </p>

        {/* Price */}
        <div style={{
          marginBottom: 'var(--space-lg)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: 'var(--space-xs)'
          }}>
            <span style={{
              fontSize: 'var(--font-size-3xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: plan.popular ? 'var(--color-primary)' : 'var(--color-text-primary)'
            }}>
              {plan.price}
            </span>
            <span style={{
              fontSize: 'var(--font-size-lg)',
              color: 'var(--color-text-muted)'
            }}>
              kr
            </span>
          </div>
          <p style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-muted)',
            margin: 'var(--space-xs) 0 0 0'
          }}>
            per månad
          </p>
        </div>
      </div>

      {/* Features List */}
      <div style={{
        marginBottom: 'var(--space-xl)'
      }}>
        {plan.features.map((feature, index) => (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-md)',
            opacity: feature.included ? 1 : 0.5
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: feature.included ? 'var(--color-primary)' : 'var(--color-gray-300)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {feature.included ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-500)" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              )}
            </div>
            <span style={{
              fontSize: 'var(--font-size-sm)',
              color: feature.included ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              textDecoration: feature.included ? 'none' : 'line-through'
            }}>
              {feature.text}
            </span>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <button style={{
        width: '100%',
        padding: 'var(--space-md) var(--space-lg)',
        background: plan.popular ? 
          'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)' : 
          'var(--color-surface)',
        border: plan.popular ? 'none' : '2px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        color: plan.popular ? 'white' : 'var(--color-text-primary)',
        fontSize: 'var(--font-size-base)',
        fontWeight: 'var(--font-weight-semibold)',
        cursor: 'pointer',
        transition: 'all var(--transition-normal)',
        boxShadow: plan.popular ? '0 4px 6px rgba(0, 102, 204, 0.25)' : 'none'
      }}
      onMouseEnter={(e) => {
        if (plan.popular) {
          e.target.style.background = 'linear-gradient(135deg, var(--color-primary-dark) 0%, #003a7a 100%)';
          e.target.style.transform = 'translateY(-2px)';
        } else {
          e.target.style.borderColor = 'var(--color-primary)';
          e.target.style.color = 'var(--color-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (plan.popular) {
          e.target.style.background = 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)';
          e.target.style.transform = 'translateY(0)';
        } else {
          e.target.style.borderColor = 'var(--color-border)';
          e.target.style.color = 'var(--color-text-primary)';
        }
      }}>
        {currentSubscription.plan === plan.id ? 'Nuvarande plan' : 'Välj plan'}
      </button>

      {/* Current Plan Indicator */}
      {currentSubscription.plan === plan.id && (
        <div style={{
          marginTop: 'var(--space-md)',
          textAlign: 'center'
        }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-xs)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-primary)',
            fontWeight: 'var(--font-weight-semibold)'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22,4 12,14.01 9,11.01"/>
            </svg>
            Aktiv plan
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      padding: windowWidth > 1024 ? 'var(--space-2xl)' : 'var(--space-xl)',
      maxWidth: '1400px',
      margin: '0 auto',
      background: 'var(--color-background)',
      minHeight: '100vh'
    }}>
      
      {/* Page Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: windowWidth > 1024 ? 'var(--space-3xl)' : 'var(--space-2xl)'
      }}>
        <h1 style={{
          fontSize: windowWidth > 1024 ? 'var(--font-size-3xl)' : 'var(--font-size-2xl)',
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-md)',
          margin: '0 0 var(--space-md) 0'
        }}>
          Välj ditt abonnemang
        </h1>
        
        <p style={{
          fontSize: 'var(--font-size-lg)',
          color: 'var(--color-text-muted)',
          maxWidth: '600px',
          margin: '0 auto var(--space-lg) auto'
        }}>
          Skala ditt SKARP kontrollsystem efter dina behov. Alla planer inkluderar grundläggande funktioner.
        </p>

        {/* Current Status */}
        {userProfile && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            background: 'var(--color-primary-alpha)',
            border: '1px solid var(--color-primary)',
            borderRadius: 'var(--radius-full)',
            padding: 'var(--space-sm) var(--space-lg)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-primary)',
            fontWeight: 'var(--font-weight-semibold)'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="m12 1 1.84 3.68L18 5.84l-1.16 3.84L20 12l-3.16 2.32L18 18.16l-3.84-1.16L12 23l-2.32-3.16L5.84 18l1.16-3.84L4 12l3.16-2.32L5.84 5.84l3.84 1.16z"/>
            </svg>
            Nuvarande: {plans.find(p => p.id === currentSubscription.plan)?.name || 'Starter'}
            {currentSubscription.status === 'trial' && ' (Provperiod)'}
          </div>
        )}
      </div>

      {/* Plans Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: windowWidth > 1024 ? 
          'repeat(3, 1fr)' : 
          windowWidth > 768 ? 'repeat(2, 1fr)' : '1fr',
        gap: windowWidth > 1024 ? 'var(--space-xl)' : 'var(--space-lg)',
        marginBottom: 'var(--space-3xl)'
      }}>
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>

      {/* Information Section */}
      <div style={{
        background: 'linear-gradient(145deg, var(--color-surface) 0%, #fefefe 100%)',
        border: '2px solid var(--color-gray-300)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-2xl)',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 10px 15px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: 'var(--space-xl)'
        }}>
          <h2 style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-md)',
            margin: '0 0 var(--space-md) 0'
          }}>
            Vanliga frågor
          </h2>
          <p style={{
            fontSize: 'var(--font-size-base)',
            color: 'var(--color-text-muted)',
            margin: 0
          }}>
            Här är svaren på de mest vanliga frågorna om våra abonnemang
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: windowWidth > 768 ? 'repeat(2, 1fr)' : '1fr',
          gap: 'var(--space-xl)'
        }}>
          {/* FAQ Items */}
          <div>
            <h3 style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-sm)',
              margin: '0 0 var(--space-sm) 0'
            }}>
              Kan jag ändra plan när som helst?
            </h3>
            <p style={{
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              margin: 0
            }}>
              Ja, du kan uppgradera eller nedgradera ditt abonnemang när som helst. Ändringar träder i kraft direkt.
            </p>
          </div>

          <div>
            <h3 style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-sm)',
              margin: '0 0 var(--space-sm) 0'
            }}>
              Vad händer med min data?
            </h3>
            <p style={{
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              margin: 0
            }}>
              All din data sparas säkert i molnet. Du kan exportera dina kontroller och rapporter när som helst.
            </p>
          </div>

          <div>
            <h3 style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-sm)',
              margin: '0 0 var(--space-sm) 0'
            }}>
              Finns det rabatter?
            </h3>
            <p style={{
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              margin: 0
            }}>
              Vi erbjuder rabatter för årlig betalning och volymrabatter för större organisationer. Kontakta oss för mer information.
            </p>
          </div>

          <div>
            <h3 style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-sm)',
              margin: '0 0 var(--space-sm) 0'
            }}>
              Hur fungerar support?
            </h3>
            <p style={{
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              margin: 0
            }}>
              Alla planer inkluderar e-post support. Professional och Enterprise får prioriterad support med snabbare svarstider.
            </p>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div style={{
        textAlign: 'center',
        marginTop: 'var(--space-3xl)'
      }}>
        <h3 style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-md)',
          margin: '0 0 var(--space-md) 0'
        }}>
          Behöver du hjälp att välja?
        </h3>
        <p style={{
          fontSize: 'var(--font-size-base)',
          color: 'var(--color-text-muted)',
          marginBottom: 'var(--space-lg)',
          margin: '0 0 var(--space-lg) 0'
        }}>
          Kontakta oss så hjälper vi dig hitta den perfekta lösningen för ditt företag
        </p>
        
        <button style={{
          padding: 'var(--space-md) var(--space-xl)',
          background: 'transparent',
          border: '2px solid var(--color-primary)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--color-primary)',
          fontSize: 'var(--font-size-base)',
          fontWeight: 'var(--font-weight-semibold)',
          cursor: 'pointer',
          transition: 'all var(--transition-normal)'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'var(--color-primary)';
          e.target.style.color = 'white';
          e.target.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'transparent';
          e.target.style.color = 'var(--color-primary)';
          e.target.style.transform = 'translateY(0)';
        }}>
          Kontakta säljteamet
        </button>
      </div>
    </div>
  );
};

export default SubscriptionManager;