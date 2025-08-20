// src/pages/CustomerDetail.js - Med kundinformations-sidebar
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore';
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
    const fetchCustomerAndAddresses = async () => {
      if (!currentUser) {
        setError('Du måste vara inloggad för att visa kunder');
        setLoading(false);
        return;
      }

      try {
        // Hämta kundinformation
        const customerDocRef = doc(db, 'customers', customerId);
        const customerDoc = await getDoc(customerDocRef);
        
        if (!customerDoc.exists()) {
          setError('Kunden hittades inte');
          return;
        }

        const customerData = { id: customerDoc.id, ...customerDoc.data() };
        setCustomer(customerData);
        setEditedName(customerData.name);

        // Hämta adresser för denna kund
        const addressesQuery = query(
          collection(db, 'addresses'),
          where('customerId', '==', customerId)
        );
        
        const addressesSnapshot = await getDocs(addressesQuery);
        const addressesData = addressesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setAddresses(addressesData);

      } catch (err) {
        console.error('Error fetching customer:', err);
        setError('Kunde inte ladda kundinformation');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerAndAddresses();
  }, [customerId, currentUser]);

  const handleNameEdit = async () => {
    if (!editedName.trim()) {
      alert('Kundnamnet kan inte vara tomt');
      return;
    }

    setUpdating(true);
    try {
      await updateDoc(doc(db, 'customers', customerId), {
        name: editedName.trim(),
        updatedAt: serverTimestamp()
      });

      setCustomer(prev => ({ ...prev, name: editedName.trim() }));
      setEditingName(false);
    } catch (err) {
      console.error('Error updating customer name:', err);
      alert('Kunde inte uppdatera kundnamnet');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = () => {
    confirmation.confirm({
      title: 'Ta bort kund',
      message: `Är du säker på att du vill ta bort "${customer.name}"? Detta kommer också att ta bort alla associerade adresser och installationer. Detta kan inte ångras.`,
      confirmText: 'Ta bort kund',
      cancelText: 'Avbryt',
      confirmButtonClass: 'danger',
      onConfirm: async () => {
        setUpdating(true);
        try {
          await deleteDoc(doc(db, 'customers', customerId));
          navigate('/customers');
        } catch (err) {
          console.error('Error deleting customer:', err);
          setError('Kunde inte ta bort kunden');
          setUpdating(false);
        }
      }
    });
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '50vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #f3f4f6',
          borderTop: '4px solid #0066cc',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>Laddar kundinformation...</p>
      </div>
    );
  }

  // Error state
  if (error) {
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
            Ett fel uppstod
          </h3>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>{error}</p>
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
      {/* CSS för spinner */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Back Button */}
      <div style={{ marginBottom: '24px' }}>
        <Link 
          to="/customers" 
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
          Tillbaka till kunder
        </Link>
      </div>

      {/* Breadcrumb */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: '#6b7280',
        marginBottom: '24px'
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
        <span>{customer?.name}</span>
      </div>

      {/* Main Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: windowWidth > 1024 ? '2fr 1fr' : '1fr',
        gap: '32px'
      }}>
        {/* Main Content */}
        <div>
          {/* Header med kundnamn och edit-funktion */}
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
                          setEditedName(customer.name);
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
                        setEditedName(customer.name);
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
                      {customer?.name}
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
              
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Link 
                  to={`/customers/${customerId}/addresses/new`}
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
                  Lägg till adress
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
                      Ta bort kund
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Addresses Section */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 8px 0'
              }}>
                Adresser
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: 0
              }}>
                {addresses.length === 0 ? 'Inga adresser registrerade' : 
                 `${addresses.length} ${addresses.length === 1 ? 'adress' : 'adresser'} registrerad${addresses.length === 1 ? '' : 'e'}`}
              </p>
            </div>

            {addresses.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px',
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
                  margin: '0 auto 16px'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  margin: '0 0 8px 0'
                }}>
                  Inga adresser än
                </h3>
                <p style={{ margin: '0 0 24px 0' }}>
                  Lägg till den första adressen för denna kund
                </p>
                <Link 
                  to={`/customers/${customerId}/addresses/new`}
                  style={{
                    textDecoration: 'none',
                    padding: '12px 24px',
                    background: '#0066cc',
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Lägg till adress
                </Link>
              </div>
            ) : (
              <div style={{ padding: '24px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(auto-fill, minmax(${windowWidth > 1024 ? '320px' : '280px'}, 1fr))`,
                  gap: '24px'
                }}>
                  {addresses.map(address => (
                    <Link 
                      key={address.id} 
                      to={`/customers/${customerId}/addresses/${address.id}`}
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
                        <div style={{
                          width: '48px',
                          height: '48px',
                          background: 'linear-gradient(135deg, #0066cc, #0052a3)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '18px',
                          fontWeight: 'bold'
                        }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                          <polyline points="9,18 15,12 9,6"/>
                        </svg>
                      </div>
                      
                      <h3 style={{
                        color: '#0066cc',
                        margin: '0 0 8px 0',
                        fontSize: '18px',
                        fontWeight: '600',
                        lineHeight: '1.3'
                      }}>
                        {address.street}
                      </h3>
                      
                      <div style={{
                        color: '#6b7280',
                        fontSize: '14px',
                        marginBottom: '8px'
                      }}>
                        {address.postalCode && `${address.postalCode} `}{address.city}
                      </div>
                      
                      {address.description && (
                        <p style={{
                          color: '#6b7280',
                          fontSize: '14px',
                          margin: 0,
                          lineHeight: '1.4'
                        }}>
                          {address.description}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Customer Info */}
        {customer && windowWidth > 1024 && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            height: 'fit-content',
            position: 'sticky',
            top: '24px'
          }}>
            <div style={{ padding: '24px' }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 16px 0'
              }}>
                Kundinformation
              </h3>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #0066cc, #0052a3)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}>
                  {customer.name?.charAt(0)?.toUpperCase() || 'K'}
                </div>
                <div>
                  <h4 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#111827',
                    margin: '0 0 4px 0'
                  }}>
                    {customer.name}
                  </h4>
                  {customer.contact && (
                    <p style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      margin: 0
                    }}>
                      {customer.contact}
                    </p>
                  )}
                </div>
              </div>

              {(customer.email || customer.phone) && (
                <div style={{
                  paddingTop: '16px',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  {customer.email && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      <span style={{
                        fontSize: '14px',
                        color: '#6b7280'
                      }}>
                        {customer.email}
                      </span>
                    </div>
                  )}
                  {customer.phone && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      <span style={{
                        fontSize: '14px',
                        color: '#6b7280'
                      }}>
                        {customer.phone}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Stats */}
              <div style={{
                paddingTop: '16px',
                borderTop: '1px solid #e5e7eb',
                marginTop: '16px'
              }}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: '0 0 12px 0'
                }}>
                  Statistik
                </h4>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: '#f8fafc',
                  borderRadius: '6px'
                }}>
                  <span style={{
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>
                    Adresser
                  </span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#0066cc'
                  }}>
                    {addresses.length}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div style={{
                paddingTop: '16px',
                borderTop: '1px solid #e5e7eb',
                marginTop: '16px'
              }}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: '0 0 12px 0'
                }}>
                  Snabbåtgärder
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Link
                    to={`/customers/${customerId}/addresses/new`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: '#6b7280',
                      textDecoration: 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f3f4f6';
                      e.currentTarget.style.color = '#0066cc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#6b7280';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Lägg till adress
                  </Link>
                  
                  <Link
                    to="/customers"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: '#6b7280',
                      textDecoration: 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f3f4f6';
                      e.currentTarget.style.color = '#0066cc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#6b7280';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    Alla kunder
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetail;