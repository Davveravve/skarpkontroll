// src/pages/AddressDetail.js - Förbättrad med Dashboard-stil
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmation } from '../components/ConfirmationProvider';

const AddressDetail = () => {
  const { currentUser } = useAuth();
  const { customerId, addressId } = useParams();
  const navigate = useNavigate();
  const confirmation = useConfirmation();
  const [address, setAddress] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [installations, setInstallations] = useState([]);
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
        setError('Du måste vara inloggad för att visa adresser');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Hämta kund
        const customerDoc = await getDoc(doc(db, 'customers', customerId));
        if (customerDoc.exists()) {
          setCustomer({ id: customerDoc.id, ...customerDoc.data() });
        }

        // Hämta adress
        const addressDoc = await getDoc(doc(db, 'addresses', addressId));
        if (addressDoc.exists()) {
          const addressData = { id: addressDoc.id, ...addressDoc.data() };
          setAddress(addressData);
          setEditedName(addressData.street || addressData.name || '');
        }

        // Hämta anläggningar för denna adress
        const installationsQuery = query(
          collection(db, 'installations'),
          where('addressId', '==', addressId)
        );
        
        const installationsSnapshot = await getDocs(installationsQuery);
        const installationsData = installationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setInstallations(installationsData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Kunde inte ladda adressinformation');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customerId, addressId, currentUser]);

  const handleNameEdit = async () => {
    if (!editedName.trim()) return;
    
    try {
      setUpdating(true);
      const addressRef = doc(db, 'addresses', addressId);
      await updateDoc(addressRef, {
        street: editedName.trim(),
        updatedAt: serverTimestamp()
      });
      
      setAddress({ ...address, street: editedName.trim() });
      setEditingName(false);
    } catch (err) {
      console.error('Error updating address name:', err);
      alert('Kunde inte uppdatera adressnamn');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = () => {
    confirmation.confirm({
      title: 'Ta bort adress',
      message: `Är du säker på att du vill ta bort "${address?.street || address?.name}"? Detta kommer att ta bort alla tillhörande anläggningar och kontroller.`,
      confirmText: 'Ta bort',
      cancelText: 'Avbryt',
      onConfirm: async () => {
        setUpdating(true);
        
        try {
          // Ta bort adressen
          await deleteDoc(doc(db, 'addresses', addressId));
          
          // Ta bort relaterade anläggningar
          for (const installation of installations) {
            await deleteDoc(doc(db, 'installations', installation.id));
          }
          
          navigate(`/customers/${customerId}`);
        } catch (err) {
          console.error('Error deleting address:', err);
          setError('Kunde inte ta bort adress');
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
          Laddar adress...
        </span>
      </div>
    );
  }

  if (error || !address) {
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
            {error || 'Adressen hittades inte'}
          </h3>
          <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '24px' }}>
            {error || 'Den adress du söker efter finns inte eller har tagits bort.'}
          </p>
          <Link 
            to={`/customers/${customerId}`}
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
      {/* Back Button - Samma stil som CustomerDetail */}
      <div style={{ marginBottom: '24px' }}>
        <Link 
          to={`/customers/${customerId}`}
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
          Tillbaka till {customer?.name}
        </Link>
      </div>

      {/* Breadcrumb - Samma stil som CustomerDetail */}
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
        <span>{address?.street || address?.name}</span>
      </div>

      {/* Header med adressnamn och edit-funktion */}
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
                      setEditedName(address.street || address.name || '');
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
                    setEditedName(address.street || address.name || '');
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
                  {address?.street || address?.name}
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
              to={`/customers/${customerId}/addresses/${addressId}/installations/new`}
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
              Lägg till anläggning
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
                  Ta bort adress
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Anläggningar - Samma stil som adresskort */}
      {installations.length === 0 ? (
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
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
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
            Inga anläggningar än
          </h3>
          <p style={{ 
            color: '#6b7280',
            marginBottom: '32px',
            fontSize: '16px',
            margin: 0,
            paddingBottom: '32px'
          }}>
            Lägg till den första anläggningen för denna adress för att komma igång.
          </p>
          <Link 
            to={`/customers/${customerId}/addresses/${addressId}/installations/new`}
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
            Lägg till första anläggningen
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${windowWidth > 768 ? '320px' : '280px'}, 1fr))`,
          gap: '24px'
        }}>
          {installations.map(installation => (
            <Link 
              key={installation.id} 
              to={`/customers/${customerId}/addresses/${addressId}/installations/${installation.id}`}
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
                  {installation.name}
                </h3>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <polyline points="9,18 15,12 9,6"/>
                </svg>
              </div>
              
              {installation.type && (
                <div style={{
                  color: '#6b7280',
                  fontSize: '14px',
                  marginBottom: '8px'
                }}>
                  {installation.type}
                </div>
              )}
              
              {installation.description && (
                <p style={{
                  color: '#6b7280',
                  fontSize: '14px',
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  {installation.description}
                </p>
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

export default AddressDetail;