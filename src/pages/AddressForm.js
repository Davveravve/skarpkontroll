// src/pages/AddressForm.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { addDoc, collection, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

const AddressForm = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { customerId, addressId } = useParams();
  const isEdit = Boolean(addressId);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // State
  const [formData, setFormData] = useState({
    street: '',
    postalCode: '',
    city: '',
    description: ''
  });
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load customer and address data
  useEffect(() => {
    loadData();
  }, [customerId, addressId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load customer data
      const customerDoc = await getDoc(doc(db, 'customers', customerId));
      if (customerDoc.exists()) {
        setCustomer({ id: customerDoc.id, ...customerDoc.data() });
      } else {
        setError('Kunden hittades inte');
        return;
      }

      // Load address data if editing
      if (isEdit && addressId) {
        const addressDoc = await getDoc(doc(db, 'addresses', addressId));
        if (addressDoc.exists()) {
          const addressData = addressDoc.data();
          setFormData({
            street: addressData.street || '',
            postalCode: addressData.postalCode || '',
            city: addressData.city || '',
            description: addressData.description || ''
          });
        } else {
          setError('Adressen hittades inte');
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Kunde inte ladda data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.street.trim()) {
      setError('Gatuadress är obligatorisk');
      return;
    }

    if (!formData.city.trim()) {
      setError('Stad är obligatorisk');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const addressData = {
        ...formData,
        street: formData.street.trim(),
        city: formData.city.trim(),
        customerId,
        updatedAt: serverTimestamp(),
        userId: currentUser.uid
      };

      if (isEdit) {
        await updateDoc(doc(db, 'addresses', addressId), addressData);
        navigate(`/customers/${customerId}/addresses/${addressId}`);
      } else {
        addressData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'addresses'), addressData);
        navigate(`/customers/${customerId}/addresses/${docRef.id}`);
      }
    } catch (err) {
      console.error('Error saving address:', err);
      setError(isEdit ? 'Kunde inte uppdatera adress' : 'Kunde inte skapa adress');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading && (!customer || isEdit)) {
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
        <p style={{ color: '#6b7280', fontSize: '16px' }}>Laddar...</p>
      </div>
    );
  }

  if (!customer && !loading) {
    return (
      <div style={{
        maxWidth: '800px',
        margin: '40px auto',
        padding: '32px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>Kunden hittades inte</h2>
        <Link 
          to="/customers"
          style={{
            color: '#0066cc',
            textDecoration: 'none',
            fontWeight: '500'
          }}
        >
          ← Tillbaka till kunder
        </Link>
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
          to={`/customers/${customerId}/addresses`}
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
          Tillbaka till adresser
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
          to={`/customers/${customerId}/addresses`}
          style={{ color: '#0066cc', textDecoration: 'none' }}
        >
          Adresser
        </Link>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9,18 15,12 9,6"/>
        </svg>
        <span>{isEdit ? 'Redigera adress' : 'Ny adress'}</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: windowWidth > 1024 ? '48px' : '32px' }}>
        <h1 style={{ 
          fontSize: windowWidth > 1024 ? '32px' : windowWidth > 768 ? '28px' : '24px',
          fontWeight: 'bold',
          color: '#0066cc',
          marginBottom: '8px',
          margin: 0
        }}>
          {isEdit ? 'Redigera adress' : 'Lägg till ny adress'}
        </h1>
        <p style={{ 
          fontSize: windowWidth > 1024 ? '18px' : '16px',
          color: '#6b7280',
          margin: '8px 0 0 0'
        }}>
          {customer ? (
            <>
              {isEdit ? 'Uppdatera adress för' : 'Lägg till ny adress för'} <strong>{customer.name}</strong>
            </>
          ) : (
            'Hantera adressinformation'
          )}
        </p>
      </div>

      {/* Main Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: windowWidth > 1024 ? '2fr 1fr' : '1fr',
        gap: '32px'
      }}>
        {/* Form Container */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
            {/* Form Header */}
            <div style={{
              paddingBottom: '24px',
              marginBottom: '32px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 8px 0'
              }}>
                Adressinformation
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: 0
              }}>
                Ange adressuppgifter för kunden
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '24px',
                color: '#dc2626',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                {error}
              </div>
            )}

            {/* Form Fields */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: windowWidth > 768 ? 'repeat(2, 1fr)' : '1fr',
              gap: '24px',
              marginBottom: '32px'
            }}>
              {/* Gatuadress */}
              <div style={{
                gridColumn: windowWidth > 768 ? 'span 2' : 'span 1'
              }}>
                <label 
                  htmlFor="street"
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '8px'
                  }}
                >
                  Gatuadress <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  id="street"
                  name="street"
                  value={formData.street}
                  onChange={handleChange}
                  placeholder="Exempelgatan 123"
                  required
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px',
                    background: loading ? '#f9fafb' : 'white',
                    color: loading ? '#9ca3af' : '#111827',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#0066cc'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* Postnummer */}
              <div>
                <label 
                  htmlFor="postalCode"
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '8px'
                  }}
                >
                  Postnummer
                </label>
                <input
                  type="text"
                  id="postalCode"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  placeholder="123 45"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px',
                    background: loading ? '#f9fafb' : 'white',
                    color: loading ? '#9ca3af' : '#111827',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#0066cc'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* Stad */}
              <div>
                <label 
                  htmlFor="city"
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '8px'
                  }}
                >
                  Stad <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Stockholm"
                  required
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px',
                    background: loading ? '#f9fafb' : 'white',
                    color: loading ? '#9ca3af' : '#111827',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#0066cc'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* Beskrivning */}
              <div style={{
                gridColumn: windowWidth > 768 ? 'span 2' : 'span 1'
              }}>
                <label 
                  htmlFor="description"
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '8px'
                  }}
                >
                  Beskrivning
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Ytterligare information om adressen..."
                  rows="3"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px',
                    background: loading ? '#f9fafb' : 'white',
                    color: loading ? '#9ca3af' : '#111827',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#0066cc'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              paddingTop: '24px',
              borderTop: '1px solid #e5e7eb',
              flexDirection: windowWidth < 480 ? 'column-reverse' : 'row'
            }}>
              <button
                type="button"
                onClick={() => navigate(`/customers/${customerId}/addresses`)}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  background: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#6b7280',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: loading ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = '#e5e7eb';
                    e.currentTarget.style.color = '#374151';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.color = '#6b7280';
                  }
                }}
              >
                Avbryt
              </button>
              
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  background: loading ? '#9ca3af' : '#0066cc',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = '#0052a3';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = '#0066cc';
                    e.currentTarget.style.transform = 'translateY(0px)';
                  }
                }}
              >
                {loading && (
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                )}
                {loading ? 
                  (isEdit ? 'Uppdaterar...' : 'Skapar...') : 
                  (isEdit ? 'Uppdatera adress' : 'Skapa adress')
                }
              </button>
            </div>
          </form>
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

              
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddressForm;