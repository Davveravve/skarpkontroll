// src/pages/CustomerForm.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { addDoc, collection, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

const CustomerForm = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { customerId } = useParams();
  const isEdit = Boolean(customerId);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // State
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load customer data for editing
  useEffect(() => {
    if (isEdit && customerId) {
      loadCustomer();
    }
  }, [isEdit, customerId]);

  const loadCustomer = async () => {
    try {
      setLoading(true);
      const customerDoc = await getDoc(doc(db, 'customers', customerId));
      
      if (customerDoc.exists()) {
        const customerData = customerDoc.data();
        setFormData({
          name: customerData.name || '',
          contact: customerData.contact || '',
          phone: customerData.phone || '',
          email: customerData.email || ''
        });
      } else {
        setError('Kunden hittades inte');
      }
    } catch (err) {
      console.error('Error loading customer:', err);
      setError('Kunde inte ladda kunddata');
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
    
    if (!formData.name.trim()) {
      setError('Namn är obligatoriskt');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const customerData = {
        ...formData,
        name: formData.name.trim(),
        updatedAt: serverTimestamp(),
        userId: currentUser.uid
      };

      if (isEdit) {
        await updateDoc(doc(db, 'customers', customerId), customerData);
        navigate(`/customers/${customerId}`);
      } else {
        customerData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'customers'), customerData);
        navigate(`/customers/${docRef.id}`);
      }
    } catch (err) {
      console.error('Error saving customer:', err);
      setError(isEdit ? 'Kunde inte uppdatera kund' : 'Kunde inte skapa kund');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading && isEdit) {
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
        <p style={{ color: '#6b7280', fontSize: '16px' }}>Laddar kunddata...</p>
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
        <span>{isEdit ? 'Redigera kund' : 'Ny kund'}</span>
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
          {isEdit ? 'Redigera kund' : 'Lägg till ny kund'}
        </h1>
        <p style={{ 
          fontSize: windowWidth > 1024 ? '18px' : '16px',
          color: '#6b7280',
          margin: '8px 0 0 0'
        }}>
          {isEdit ? 'Uppdatera kundinformation' : 'Fyll i kundens information för att skapa en ny kund'}
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
              Kundinformation
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: 0
            }}>
              Grundläggande information om kunden
            </p>
          </div>

          {/* Form Fields */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: windowWidth > 768 ? 'repeat(2, 1fr)' : '1fr',
            gap: '24px',
            marginBottom: '32px'
          }}>
            {/* Namn */}
            <div style={{
              gridColumn: windowWidth > 768 ? 'span 2' : 'span 1'
            }}>
              <label 
                htmlFor="name"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}
              >
                Namn <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Företagsnamn eller privatperson"
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

            {/* Kontaktperson */}
            <div>
              <label 
                htmlFor="contact"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}
              >
                Kontaktperson
              </label>
              <input
                type="text"
                id="contact"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                placeholder="Namn på kontaktperson"
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

            {/* Telefonnummer */}
            <div>
              <label 
                htmlFor="phone"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
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

            {/* E-postadress */}
            <div style={{
              gridColumn: windowWidth > 768 ? 'span 2' : 'span 1'
            }}>
              <label 
                htmlFor="email"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}
              >
                E-postadress
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="kontakt@exempel.se"
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
              onClick={() => navigate('/customers')}
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
                (isEdit ? 'Uppdatera kund' : 'Skapa kund')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerForm;