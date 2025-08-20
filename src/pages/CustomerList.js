// src/pages/CustomerList.js - Matchande Dashboard-stil
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

const CustomerList = () => {
  const { currentUser } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!currentUser) {
        setError('Du måste vara inloggad för att visa kunder');
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'customers'),
          where('userId', '==', currentUser.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const customersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setCustomers(customersData);
        setFilteredCustomers(customersData);
      } catch (err) {
        console.error('Error fetching customers:', err);
        setError('Kunde inte ladda kunder');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [currentUser]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customers]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const getCustomerInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
          Laddar kunder...
        </span>
      </div>
    );
  }

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
          <div style={{
            width: '64px',
            height: '64px',
            background: '#fef2f2',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h3 style={{ 
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#dc2626',
            marginBottom: '8px',
            margin: 0,
            paddingBottom: '8px'
          }}>
            Ett fel uppstod
          </h3>
          <p style={{ 
            color: '#6b7280',
            fontSize: '16px',
            margin: 0
          }}>
            {error}
          </p>
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
      {/* Clean Header - Samma stil som Dashboard */}
      <div style={{ marginBottom: windowWidth > 1024 ? '48px' : '32px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: windowWidth > 768 ? 'center' : 'flex-start',
          flexDirection: windowWidth > 768 ? 'row' : 'column',
          gap: windowWidth > 768 ? '0' : '24px',
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{ 
              fontSize: windowWidth > 1024 ? '32px' : windowWidth > 768 ? '28px' : '24px',
              fontWeight: 'bold',
              color: '#0066cc',
              marginBottom: '8px',
              margin: 0,
              paddingBottom: '8px'
            }}>
              Kunder
            </h1>
            <p style={{ 
              fontSize: windowWidth > 1024 ? '18px' : '16px',
              color: '#6b7280',
              margin: 0
            }}>
              {customers.length} {customers.length === 1 ? 'kund' : 'kunder'} registrerade
            </p>
          </div>
          
          <Link 
            to="/customers/new" 
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
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#0066cc';
              e.currentTarget.style.transform = 'translateY(0px)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Lägg till kund
          </Link>
        </div>

        {/* Search - Samma stil som Dashboard */}
        <div style={{ maxWidth: '500px' }}>
          <div style={{ position: 'relative' }}>
            <svg 
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none'
              }}
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#6b7280" 
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Sök efter kund..."
              value={searchTerm}
              onChange={handleSearch}
              style={{
                width: '100%',
                padding: '12px 48px 12px 48px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                background: 'white',
                color: '#111827',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#0066cc'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
            />
            {searchTerm && (
              <button 
                onClick={clearSearch} 
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          {searchTerm && (
            <div style={{ marginTop: '12px' }}>
              <span style={{
                color: '#0066cc',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {filteredCustomers.length} av {customers.length} kunder
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {filteredCustomers.length === 0 ? (
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
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          
          {searchTerm ? (
            <>
              <h3 style={{ 
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#0066cc',
                marginBottom: '8px',
                margin: 0,
                paddingBottom: '8px'
              }}>
                Inga kunder matchade din sökning
              </h3>
              <p style={{ 
                color: '#6b7280',
                marginBottom: '32px',
                fontSize: '16px',
                margin: 0,
                paddingBottom: '32px'
              }}>
                Försök med andra sökord eller rensa sökningen för att se alla kunder.
              </p>
              <button 
                onClick={clearSearch} 
                style={{
                  padding: '12px 24px',
                  background: '#f3f4f6',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#0066cc',
                  cursor: 'pointer'
                }}
              >
                Rensa sökningen
              </button>
            </>
          ) : (
            <>
              <h3 style={{ 
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#0066cc',
                marginBottom: '8px',
                margin: 0,
                paddingBottom: '8px'
              }}>
                Inga kunder än
              </h3>
              <p style={{ 
                color: '#6b7280',
                marginBottom: '32px',
                fontSize: '16px',
                margin: 0,
                paddingBottom: '32px'
              }}>
                Kom igång genom att lägga till din första kund för att kunna skapa adresser och anläggningar.
              </p>
              <Link 
                to="/customers/new" 
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
                Lägg till första kunden
              </Link>
            </>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${windowWidth > 768 ? '280px' : '240px'}, 1fr))`,
          gap: '24px'
        }}>
          {filteredCustomers.map(customer => (
            <Link 
              key={customer.id} 
              to={`/customers/${customer.id}`} 
              style={{
                textDecoration: 'none',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                minHeight: '180px',
                justifyContent: 'center'
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
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, #0066cc, #0052a3)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                color: 'white',
                fontSize: '24px',
                fontWeight: 'bold'
              }}>
                {getCustomerInitials(customer.name)}
              </div>
              <h3 style={{
                color: '#0066cc',
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                lineHeight: '1.3'
              }}>
                {customer.name}
              </h3>
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

export default CustomerList;