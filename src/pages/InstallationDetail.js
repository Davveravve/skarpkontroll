// src/pages/InstallationDetail.js - Förbättrad med Dashboard-stil
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmation } from '../components/ConfirmationProvider';

const InstallationDetail = () => {
  const { currentUser } = useAuth();
  const { customerId, addressId, installationId } = useParams();
  const navigate = useNavigate();
  const confirmation = useConfirmation();
  const [installation, setInstallation] = useState(null);
  const [address, setAddress] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        setError('Du måste vara inloggad för att visa anläggningar');
        setLoading(false);
        return;
      }

      try {
        // Hämta anläggning
        const installationDoc = await getDoc(doc(db, 'installations', installationId));
        
        if (!installationDoc.exists()) {
          setError('Anläggningen hittades inte');
          return;
        }
        
        const installationData = { id: installationDoc.id, ...installationDoc.data() };
        setInstallation(installationData);
        setEditedName(installationData.name || '');

        // Hämta kund- och adressinformation
        const [customerDoc, addressDoc] = await Promise.all([
          getDoc(doc(db, 'customers', customerId)),
          getDoc(doc(db, 'addresses', addressId))
        ]);

        if (customerDoc.exists()) {
          setCustomer({ id: customerDoc.id, ...customerDoc.data() });
        }

        if (addressDoc.exists()) {
          setAddress({ id: addressDoc.id, ...addressDoc.data() });
        }

        // Hämta kontroller för denna anläggning
        const inspectionsQuery = query(
          collection(db, 'inspections'),
          where('installationId', '==', installationId)
        );
        
        const inspectionsSnapshot = await getDocs(inspectionsQuery);
        const inspectionsData = inspectionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setInspections(inspectionsData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Kunde inte ladda anläggningsinformation');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customerId, addressId, installationId, currentUser]);

  const handleNameEdit = async () => {
    if (!editedName.trim()) return;
    
    try {
      setUpdating(true);
      const installationRef = doc(db, 'installations', installationId);
      await updateDoc(installationRef, {
        name: editedName.trim(),
        updatedAt: serverTimestamp()
      });
      
      setInstallation({ ...installation, name: editedName.trim() });
      setEditingName(false);
    } catch (err) {
      console.error('Error updating installation name:', err);
      alert('Kunde inte uppdatera anläggningsnamn');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = () => {
    confirmation.confirm({
      title: 'Ta bort anläggning',
      message: `Är du säker på att du vill ta bort "${installation?.name}"? Detta kommer att ta bort alla tillhörande kontroller.`,
      confirmText: 'Ta bort',
      cancelText: 'Avbryt',
      onConfirm: async () => {
        setUpdating(true);
        
        try {
          // Ta bort anläggningen
          await deleteDoc(doc(db, 'installations', installationId));
          
          // Ta bort relaterade kontroller
          for (const inspection of inspections) {
            await deleteDoc(doc(db, 'inspections', inspection.id));
          }
          
          navigate(`/customers/${customerId}/addresses/${addressId}`);
        } catch (err) {
          console.error('Error deleting installation:', err);
          setError('Kunde inte ta bort anläggning');
          setUpdating(false);
        }
      }
    });
  };

  if (loading) {
    return (
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: windowWidth > 1024 ? '0 24px' : '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px'
      }}>
        <div className="loading-spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #0066cc',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <span style={{ 
          marginLeft: '16px', 
          color: '#6b7280',
          fontSize: '16px'
        }}>
          Laddar anläggning...
        </span>
      </div>
    );
  }

  if (error || !installation) {
    return (
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: windowWidth > 1024 ? '0 24px' : '0 16px'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '48px',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          margin: '32px 0'
        }}>
          <h3 style={{ 
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#dc2626',
            marginBottom: '8px'
          }}>
            {error || 'Anläggningen hittades inte'}
          </h3>
          <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '24px' }}>
            {error || 'Den anläggning du söker efter finns inte eller har tagits bort.'}
          </p>
          <Link 
            to={`/customers/${customerId}/addresses/${addressId}`}
            style={{
              textDecoration: 'none',
              padding: '12px 24px',
              background: '#f3f4f6',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              fontSize: '14px',
              fontWeight: '500',
              color: '#0066cc',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H6m0 0l6 6m-6-6l6-6"/>
            </svg>
            Gå tillbaka
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: windowWidth > 1024 ? '0 24px' : '0 16px' 
    }}>
      {/* Back Button */}
      <div style={{ marginBottom: '24px' }}>
        <Link 
          to={`/customers/${customerId}/addresses/${addressId}`}
          style={{ 
            textDecoration: 'none',
            padding: '8px 16px',
            background: '#f3f4f6',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            fontSize: '14px',
            fontWeight: '500',
            color: '#0066cc',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e5e7eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f3f4f6';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H6m0 0l6 6m-6-6l6-6"/>
          </svg>
          Tillbaka till {address?.street || 'adress'}
        </Link>
      </div>

      {/* Breadcrumb */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: '#6b7280',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <Link 
          to="/customers"
          style={{ color: '#0066cc', textDecoration: 'none' }}
        >
          Kunder
        </Link>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9,18 15,12 9,6"/>
        </svg>
        <Link 
          to={`/customers/${customerId}`}
          style={{ color: '#0066cc', textDecoration: 'none' }}
        >
          {customer?.name}
        </Link>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9,18 15,12 9,6"/>
        </svg>
        <Link 
          to={`/customers/${customerId}/addresses/${addressId}`}
          style={{ color: '#0066cc', textDecoration: 'none' }}
        >
          {address?.street || address?.name}
        </Link>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9,18 15,12 9,6"/>
        </svg>
        <span>{installation?.name}</span>
      </div>

      {/* Header med anläggningsnamn och edit-funktion */}
      <div style={{ marginBottom: windowWidth > 1024 ? '48px' : '32px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: windowWidth > 768 ? 'center' : 'flex-start',
          flexDirection: windowWidth > 768 ? 'row' : 'column',
          gap: windowWidth > 768 ? '0' : '24px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {editingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  style={{
                    fontSize: windowWidth > 1024 ? '32px' : windowWidth > 768 ? '28px' : '24px',
                    fontWeight: 'bold',
                    color: '#0066cc',
                    background: 'white',
                    border: '2px solid #0066cc',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    outline: 'none'
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleNameEdit();
                    if (e.key === 'Escape') {
                      setEditingName(false);
                      setEditedName(installation.name || '');
                    }
                  }}
                  autoFocus
                />
                <button
                  onClick={handleNameEdit}
                  disabled={updating}
                  style={{
                    padding: '8px 16px',
                    background: '#0066cc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Spara
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setEditedName(installation.name || '');
                  }}
                  style={{
                    padding: '8px 16px',
                    background: '#f3f4f6',
                    color: '#6b7280',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Avbryt
                </button>
              </div>
            ) : (
              <>
                <h1 style={{ 
                  fontSize: windowWidth > 1024 ? '32px' : windowWidth > 768 ? '28px' : '24px',
                  fontWeight: 'bold',
                  color: '#0066cc',
                  margin: 0
                }}>
                  {installation?.name}
                </h1>
                <button
                  onClick={() => setEditingName(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.color = '#0066cc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.color = '#6b7280';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link 
              to={`/customers/${customerId}/addresses/${addressId}/installations/${installationId}/inspections/new`}
              style={{
                textDecoration: 'none',
                padding: '12px 24px',
                background: '#0066cc',
                borderRadius: '8px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '500',
                color: 'white',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#0052a3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#0066cc';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Ny kontroll
            </Link>
            
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDelete();
              }}
              disabled={updating}
              style={{
                padding: '12px 16px',
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: updating ? 'not-allowed' : 'pointer',
                opacity: updating ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!updating) {
                  e.currentTarget.style.background = '#fee2e2';
                  e.currentTarget.style.borderColor = '#fca5a5';
                }
              }}
              onMouseLeave={(e) => {
                if (!updating) {
                  e.currentTarget.style.background = '#fef2f2';
                  e.currentTarget.style.borderColor = '#fecaca';
                }
              }}
            >
              {updating ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #fca5a5',
                    borderTop: '2px solid #dc2626',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Tar bort...
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3,6 5,6 21,6"/>
                    <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                  </svg>
                  Ta bort anläggning
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Kontroller - Samma stil som anläggningskort */}
      {inspections.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '64px 32px',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: '#f3f4f6',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
              <path d="M9 12l2 2 4-4"/>
              <path d="M21 12c.552 0 1-.448 1-1V8a2 2 0 0 0-2-2h-1V4a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v3c0 .552.448 1 1 1h1v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2h1z"/>
            </svg>
          </div>
          
          <h3 style={{ 
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#0066cc',
            marginBottom: '8px',
            margin: 0,
            paddingBottom: '8px'
          }}>
            Inga kontroller än
          </h3>
          <p style={{ 
            color: '#6b7280',
            marginBottom: '32px',
            fontSize: '16px',
            margin: 0,
            paddingBottom: '32px'
          }}>
            Skapa den första kontrollen för denna anläggning för att komma igång.
          </p>
          <Link 
            to={`/customers/${customerId}/addresses/${addressId}/installations/${installationId}/inspections/new`}
            style={{
              textDecoration: 'none',
              padding: '12px 24px',
              background: '#0066cc',
              borderRadius: '8px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '500',
              color: 'white',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Skapa första kontrollen
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${windowWidth > 768 ? '320px' : '280px'}, 1fr))`,
          gap: '24px'
        }}>
          {inspections.map(inspection => (
            <Link 
              key={inspection.id} 
              to={`/customers/${customerId}/addresses/${addressId}/installations/${installationId}/inspections/${inspection.id}`}
              style={{
                textDecoration: 'none',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                display: 'block'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#0066cc';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 102, 204, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '16px'
              }}>
                <h3 style={{
                  color: '#0066cc',
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: '600',
                  lineHeight: '1.3'
                }}>
                  {inspection.name || inspection.templateName || 'Kontroll'}
                </h3>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <polyline points="9,18 15,12 9,6"/>
                </svg>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#6b7280',
                fontSize: '14px',
                marginBottom: '8px'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>
                  {inspection.createdAt && new Date(inspection.createdAt.seconds * 1000).toLocaleDateString('sv-SE')}
                </span>
              </div>
              
              {inspection.status && (
                <div style={{
                  display: 'inline-block',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  background: inspection.status === 'completed' ? '#f0f9f0' : '#fef9e7',
                  color: inspection.status === 'completed' ? '#0d5016' : '#8b5a00'
                }}>
                  {inspection.status === 'completed' ? 'Slutförd' : 'Pågående'}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default InstallationDetail;