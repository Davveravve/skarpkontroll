// src/pages/ControlForm.js - Superenkel kontrollskapare
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import { useToast } from '../components/ui/Toast';
import { createTeamLogger } from '../services/teamLogger';

const ControlForm = () => {
  const { currentUser, userProfile } = useAuth();
  const { currentTeam, hasTeam } = useTeam();
  const { customerId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [customer, setCustomer] = useState(null);
  const [controlName, setControlName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Team logger for activity tracking
  const logger = useMemo(() => {
    if (!currentTeam?.id || !currentUser?.uid) return null;
    return createTeamLogger({
      teamId: currentTeam.id,
      userId: currentUser.uid,
      userName: userProfile?.companyName || currentUser.email?.split('@')[0] || 'Anonym'
    });
  }, [currentTeam?.id, currentUser?.uid, currentUser?.email, userProfile?.companyName]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!currentUser) {
        setError('Du måste vara inloggad');
        setLoading(false);
        return;
      }

      if (!hasTeam) {
        setError('Du måste vara med i ett team');
        setLoading(false);
        return;
      }

      try {
        // Hämta kunden
        const customerQuery = query(
          collection(db, 'customers'),
          where('teamId', '==', currentTeam.id),
          where('__name__', '==', customerId)
        );

        const customerSnapshot = await getDocs(customerQuery);
        
        if (!customerSnapshot.empty) {
          const customerDoc = customerSnapshot.docs[0];
          setCustomer({ id: customerDoc.id, ...customerDoc.data() });
          
          // Föreslå ett standardnamn baserat på datum
          const today = new Date();
          const dateStr = today.toLocaleDateString('sv-SE');
          setControlName(`Kontroll ${customerDoc.data().name} - ${dateStr}`);
        } else {
          setError('Kunden kunde inte hittas');
        }
      } catch (err) {
        console.error('Error fetching customer:', err);
        setError('Kunde inte ladda kunddata');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [customerId, currentUser, currentTeam, hasTeam]);

  const handleCreateControl = async (e) => {
    e.preventDefault();
    
    if (!controlName.trim()) {
      toast.error('Ange ett namn för kontrollen');
      return;
    }

    setSaving(true);

    try {
      // Skapa ny kontroll
      const newControl = {
        name: controlName.trim(),
        customerId,
        customerName: customer.name,
        teamId: currentTeam.id,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        userId: currentUser.uid,
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid,
        rootNodeId: null // Sätts när första noden skapas
      };

      const docRef = await addDoc(collection(db, 'inspections'), newControl);
      console.log('Control created with ID:', docRef.id);

      // Log control creation
      if (logger) {
        logger.controlCreated(docRef.id, controlName.trim(), customer.name);
      }

      // Ga direkt till kontroll-vyn
      navigate(`/controls/${docRef.id}`);
      
    } catch (err) {
      console.error('Error creating control:', err);
      setError('Kunde inte skapa kontrollen: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: windowWidth > 768 ? '40px 24px' : '20px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #6366F1',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <span style={{ 
          marginLeft: '16px', 
          color: '#6b7280',
          fontSize: '16px'
        }}>
          Laddar...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: windowWidth > 768 ? '40px 24px' : '20px 16px'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '48px',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ 
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#dc2626',
            marginBottom: '8px'
          }}>
            {error}
          </h3>
          <Link 
            to="/customers"
            style={{
              color: '#6366F1',
              textDecoration: 'none',
              fontSize: '16px'
            }}
          >
            ← Tillbaka till kunder
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: windowWidth > 768 ? '40px 24px' : '20px 16px'
    }}>
      {/* CSS för spinner */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Header */}
      <div style={{
        marginBottom: '32px'
      }}>
        <Link 
          to={`/customers/${customerId}`}
          style={{
            color: '#6b7280',
            textDecoration: 'none',
            fontSize: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            marginBottom: '16px'
          }}
        >
          ← Tillbaka till {customer?.name}
        </Link>
        
        <h1 style={{
          fontSize: windowWidth > 768 ? '32px' : '28px',
          fontWeight: 'bold',
          color: '#1f2937',
          margin: '0 0 8px 0'
        }}>
          Ny kontroll
        </h1>
        
        <p style={{
          color: '#6b7280',
          fontSize: '16px',
          margin: 0
        }}>
          Skapa en ny kontroll för <strong>{customer?.name}</strong>
        </p>
      </div>

      {/* Form Card */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: windowWidth > 768 ? '32px' : '24px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 10px 15px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <form onSubmit={handleCreateControl}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Kontrollnamn
            </label>
            
            <input
              type="text"
              value={controlName}
              onChange={(e) => setControlName(e.target.value)}
              placeholder="T.ex. Vinterservice 2024, Brandskyddskontroll..."
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#6366F1'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
            
            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              marginTop: '6px',
              margin: '6px 0 0 0'
            }}>
              Ge kontrollen ett beskrivande namn som är lätt att känna igen senare
            </p>
          </div>

          {/* Info Box */}

          {/* Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            flexDirection: windowWidth > 480 ? 'row' : 'column'
          }}>
            <Link
              to={`/customers/${customerId}`}
              style={{
                flex: windowWidth > 480 ? '0 0 auto' : '1',
                padding: '12px 24px',
                background: '#f8fafc',
                color: '#64748b',
                textDecoration: 'none',
                borderRadius: '8px',
                border: '2px solid #e2e8f0',
                fontSize: '16px',
                fontWeight: '500',
                textAlign: 'center',
                transition: 'all 0.2s',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box'
              }}
            >
              Avbryt
            </Link>
            
            <button
              type="submit"
              disabled={saving || !controlName.trim()}
              style={{
                flex: '1',
                padding: '12px 24px',
                background: saving || !controlName.trim() ? '#9ca3af' : '#6366F1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: saving || !controlName.trim() ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                minHeight: '44px',
                boxSizing: 'border-box'
              }}
            >
              {saving ? 'Skapar...' : 'Skapa kontroll'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ControlForm;