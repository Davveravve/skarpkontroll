// src/pages/CustomerDetail.js - Uppdaterad för nya kontroll-systemet
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmation } from '../components/ConfirmationProvider';

const CustomerDetail = () => {
  const { currentUser } = useAuth();
  const { customerId } = useParams();
  const navigate = useNavigate();
  const confirmation = useConfirmation();
  
  const [customer, setCustomer] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [controls, setControls] = useState([]);
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
        setError('Du måste vara inloggad för att visa kunder');
        setLoading(false);
        return;
      }

      console.log('🔍 CustomerDetail: Fetching data for customer ID:', customerId);
      console.log('👤 Current user:', currentUser.uid);

      try {
        // Hämta kund - VIKTIGT: Kontrollera att kunden tillhör denna användare
        const customerDoc = await getDoc(doc(db, 'customers', customerId));
        
        console.log('📄 Customer document exists:', customerDoc.exists());
        
        if (!customerDoc.exists()) {
          console.error('❌ Customer document not found');
          setError('Kunden hittades inte');
          return;
        }
        
        const customerData = { id: customerDoc.id, ...customerDoc.data() };
        console.log('📋 Customer data:', customerData);
        
        // Kontrollera att kunden tillhör denna användare
        if (customerData.userId !== currentUser.uid) {
          console.error('❌ User does not own this customer');
          console.error('Customer userId:', customerData.userId);
          console.error('Current user uid:', currentUser.uid);
          setError('Du har inte behörighet att se denna kund');
          return;
        }
        
        console.log('✅ Customer loaded successfully');
        setCustomer(customerData);
        setEditedName(customerData.name || '');

        // Hämta adresser för denna kund (gamla systemet) - UTAN sortering för att undvika index-problem
        const addressesQuery = query(
          collection(db, 'addresses'),
          where('customerId', '==', customerId)
          // orderBy('createdAt', 'desc') // Kommenterad tills index skapats
        );
        
        const addressesSnapshot = await getDocs(addressesQuery);
        const addressesData = addressesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setAddresses(addressesData);

        // Hämta kontroller för denna kund (nya systemet) - UTAN sortering för att undvika index-problem
        const controlsQuery = query(
          collection(db, 'controls'),
          where('customerId', '==', customerId),
          where('userId', '==', currentUser.uid)
          // orderBy('createdAt', 'desc') // Kommenterad tills index skapats
        );
        
        const controlsSnapshot = await getDocs(controlsQuery);
        const controlsData = controlsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sortera i JavaScript istället (temporary fix)
        controlsData.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });
        
        console.log('📋 Controls loaded:', controlsData.length);
        setControls(controlsData);

      } catch (err) {
        console.error('❌ CustomerDetail: Error fetching data:', err);
        console.error('Error details:', err.message);
        console.error('Error code:', err.code);
        setError(`Kunde inte ladda kundinformation: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customerId, currentUser]);

  const handleNameEdit = async () => {
    if (!editedName.trim()) return;
    
    try {
      setUpdating(true);
      const customerRef = doc(db, 'customers', customerId);
      await updateDoc(customerRef, {
        name: editedName.trim(),
        updatedAt: serverTimestamp()
      });
      
      setCustomer({ ...customer, name: editedName.trim() });
      setEditingName(false);
    } catch (err) {
      console.error('Error updating customer name:', err);
      alert('Kunde inte uppdatera kundnamn');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = () => {
    confirmation.confirm({
      title: 'Ta bort kund',
      message: `Är du säker på att du vill ta bort "${customer?.name}"? Detta kommer att ta bort alla relaterade adresser, anläggningar och kontroller.`,
      confirmText: 'Ta bort',
      cancelText: 'Avbryt',
      onConfirm: async () => {
        setUpdating(true);
        
        try {
          // Ta bort kunden
          await deleteDoc(doc(db, 'customers', customerId));
          
          // Navigate till kundlista
          navigate('/customers');
        } catch (err) {
          console.error('Error deleting customer:', err);
          setError('Kunde inte ta bort kund');
          setUpdating(false);
        }
      }
    });
  };

  const handleDeleteControl = async (controlId, controlName) => {
    const confirmed = await confirmation.confirm({
      title: 'Radera kontroll',
      message: `Är du säker på att du vill radera kontrollen "${controlName}"? Detta kommer också att radera alla noder och anmärkningar som tillhör kontrollen.`,
      confirmText: 'Radera',
      cancelText: 'Avbryt',
      type: 'danger'
    });

    if (!confirmed) return;

    setUpdating(true);
    try {
      // Ta bort kontrollen från Firestore
      await deleteDoc(doc(db, 'controls', controlId));
      
      // Uppdatera local state
      setControls(prev => prev.filter(c => c.id !== controlId));
      
      console.log('✅ Control deleted successfully');
    } catch (err) {
      console.error('Error deleting control:', err);
      alert('Kunde inte radera kontrollen');
    } finally {
      setUpdating(false);
    }
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
        <div style={{
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
          Laddar kunddata...
        </span>
      </div>
    );
  }

  if (error || !customer) {
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
            {error || 'Kunde inte ladda kunddata'}
          </h3>
          <Link 
            to="/customers"
            style={{
              color: '#0066cc',
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
      maxWidth: '1200px',
      margin: '0 auto',
      padding: windowWidth > 1024 ? '0 24px' : '0 16px'
    }}>
      {/* CSS */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Breadcrumb */}
      <div style={{ marginBottom: '24px' }}>
        <Link 
          to="/customers"
          style={{
            color: '#6b7280',
            textDecoration: 'none',
            fontSize: '14px',
            display: 'inline-flex',
            alignItems: 'center'
          }}
        >
          ← Tillbaka till kunder
        </Link>
      </div>

      {/* Header Card */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: windowWidth > 768 ? '32px' : '24px',
        marginBottom: '32px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 10px 15px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ flex: 1 }}>
            {editingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleNameEdit()}
                  style={{
                    fontSize: windowWidth > 768 ? '28px' : '24px',
                    fontWeight: 'bold',
                    color: '#1f2937',
                    border: '2px solid #0066cc',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    background: 'white',
                    minWidth: '200px',
                    flex: 1
                  }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleNameEdit}
                    disabled={updating || !editedName.trim()}
                    style={{
                      padding: '8px 16px',
                      background: updating || !editedName.trim() ? '#9ca3af' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: updating || !editedName.trim() ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {updating ? 'Sparar...' : 'Spara'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setEditedName(customer.name || '');
                    }}
                    style={{
                      padding: '8px 16px',
                      background: '#f8fafc',
                      color: '#64748b',
                      border: '2px solid #e2e8f0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            ) : (
              <h1 
                style={{
                  fontSize: windowWidth > 768 ? '28px' : '24px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  margin: 0,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onClick={() => setEditingName(true)}
              >
                {customer.name}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </h1>
            )}
            
            {customer.email && (
              <p style={{
                color: '#6b7280',
                fontSize: '16px',
                margin: '8px 0 0 0'
              }}>
                {customer.email}
              </p>
            )}
            
            {customer.phone && (
              <p style={{
                color: '#6b7280',
                fontSize: '16px',
                margin: '4px 0 0 0'
              }}>
                {customer.phone}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Link
              to={`/customers/${customerId}/edit`}
              style={{
                padding: '12px 20px',
                background: '#f0f9ff',
                color: '#0066cc',
                textDecoration: 'none',
                borderRadius: '8px',
                border: '2px solid #bae6fd',
                fontSize: '14px',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Redigera
            </Link>
            
            <button
              onClick={handleDelete}
              disabled={updating}
              style={{
                padding: '12px 20px',
                background: '#fef2f2',
                color: '#dc2626',
                border: '2px solid #fecaca',
                borderRadius: '8px',
                cursor: updating ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Ta bort
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Endast Nya Kontroller */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '32px'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#1f2937',
            margin: 0
          }}>
            Kontroller ({controls.length})
          </h2>
          
          <Link
            to={`/customers/${customerId}/controls/new`}
            style={{
              padding: '12px 24px',
              background: '#0066cc',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0, 102, 204, 0.2)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#0056b3';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 102, 204, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#0066cc';
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 102, 204, 0.2)';
            }}
          >
            + Ny kontroll
          </Link>
        </div>

        {/* Info box - endast om inga kontroller finns */}
        {controls.length === 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '1px solid #bae6fd',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '32px'
          }}>
            <p style={{
              color: '#0369a1',
              fontSize: '16px',
              margin: 0,
              lineHeight: '1.5',
              fontWeight: '500'
            }}>
              Skapa kontroller enkelt utan förplanering. Bygg strukturen med noder och anmärkningar medan du kontrollerar.
            </p>
          </div>
        )}

        {controls.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '64px 32px',
            background: 'white',
            border: '2px dashed #d1d5db',
            borderRadius: '16px',
            color: '#6b7280'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: '#f3f4f6',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '24px'
            }}>
            </div>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600',
              color: '#374151',
              marginBottom: '12px' 
            }}>
              Inga kontroller än
            </h3>
            <p style={{ 
              fontSize: '16px', 
              marginBottom: '32px',
              color: '#6b7280' 
            }}>
              Kom igång genom att skapa din första kontroll
            </p>
            <Link
              to={`/customers/${customerId}/controls/new`}
              style={{
                padding: '16px 32px',
                background: '#0066cc',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                display: 'inline-block',
                boxShadow: '0 4px 12px rgba(0, 102, 204, 0.25)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#0056b3';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 102, 204, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#0066cc';
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 102, 204, 0.25)';
              }}
            >
              Skapa första kontrollen
            </Link>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: windowWidth > 1024 ? 'repeat(auto-fill, minmax(350px, 1fr))' : '1fr',
            gap: '20px'
          }}>
            {controls.map(control => (
              <div 
                key={control.id} 
                style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '16px',
                  padding: '24px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0px)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                }}
              >
                {/* Status accent line */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: control.status === 'completed' 
                    ? 'linear-gradient(90deg, #10b981, #059669)' 
                    : 'linear-gradient(90deg, #f59e0b, #d97706)'
                }} />
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: '16px'
                }}>
                  <h3 style={{
                    color: '#1f2937',
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: '600',
                    lineHeight: '1.3',
                    flex: 1
                  }}>
                    {control.name}
                  </h3>
                  
                  <span style={{
                    padding: '6px 12px',
                    background: control.status === 'completed' 
                      ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)' 
                      : 'linear-gradient(135deg, #fef3c7, #fde68a)',
                    color: control.status === 'completed' ? '#065f46' : '#92400e',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginLeft: '12px'
                  }}>
                    {control.status === 'completed' ? 'Slutförd' : 'Aktiv'}
                  </span>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  color: '#6b7280',
                  fontSize: '14px'
                }}>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    {control.createdAt?.toDate?.()?.toLocaleDateString('sv-SE') || 'Okänt datum'}
                  </span>
                </div>
                
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteControl(control.id, control.name);
                  }}
                  disabled={updating}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'rgba(220, 38, 38, 0.1)',
                    border: '1px solid rgba(220, 38, 38, 0.2)',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    color: '#dc2626',
                    cursor: updating ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    opacity: updating ? 0.5 : 1,
                    transition: 'all 0.2s'
                  }}
                  title="Ta bort kontroll"
                  onMouseEnter={(e) => {
                    if (!updating) {
                      e.currentTarget.style.background = 'rgba(220, 38, 38, 0.15)';
                      e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.2)';
                  }}
                >
                  Ta bort
                </button>
                
                {/* Clickable area (everything except delete button) */}
                <Link 
                  to={`/controls/${control.id}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: '90px', // Leave space for delete button
                    bottom: 0,
                    textDecoration: 'none',
                    zIndex: 1
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetail;