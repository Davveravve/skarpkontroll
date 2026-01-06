// src/pages/CustomerList.js - Customer list page
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import { sortByName } from '../utils/sorting';
import './CustomerList.css';

const CustomerList = () => {
  const { currentUser } = useAuth();
  const { currentTeam, hasTeam } = useTeam();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!currentUser) {
      setError('Du måste vara inloggad för att visa kunder');
      setLoading(false);
      return;
    }

    if (!hasTeam) {
      setError('Du måste vara med i ett team för att visa kunder');
      setLoading(false);
      return;
    }

    // Realtidslyssnare för customers
    const q = query(
      collection(db, 'customers'),
      where('teamId', '==', currentTeam.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));

      // Sortera naturligt efter namn
      const sorted = sortByName(customersData);
      setCustomers(sorted);
      setFilteredCustomers(sorted);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error('Error listening to customers:', err);
      setError('Kunde inte ladda kunder');
      setLoading(false);
    });

    // Cleanup
    return () => unsubscribe();
  }, [currentUser, currentTeam, hasTeam]);

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
      // Behåll sortering vid filtrering
      setFilteredCustomers(sortByName(filtered));
    }
  }, [searchTerm, customers]);

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
      <div className="customer-list">
        <div className="customer-list-loading">
          <div className="customer-list-spinner"></div>
          <span>Laddar kunder...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="customer-list">
        <div className="customer-list-error">
          <div className="customer-list-error-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h3>Ett fel uppstod</h3>
          <p>{error}</p>
          {!hasTeam && (
            <Link to="/team" className="customer-list-btn customer-list-btn--primary">
              Gå till Team-sidan
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="customer-list">
      {/* Header */}
      <header className="customer-list-header">
        <div className="customer-list-header-content">
          <h1 className="customer-list-title">Kunder</h1>
          <p className="customer-list-subtitle">
            {customers.length} {customers.length === 1 ? 'kund' : 'kunder'} registrerade
          </p>
        </div>
        <div className="customer-list-header-actions">
          <Link to="/customers/new" className="customer-list-btn customer-list-btn--primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Ny kund
          </Link>
        </div>
      </header>

      {/* Search */}
      <div className="customer-list-search">
        <div className="customer-list-search-input-wrapper">
          <svg className="customer-list-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            className="customer-list-search-input"
            placeholder="Sök efter kund..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="customer-list-search-clear" onClick={() => setSearchTerm('')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
        {searchTerm && (
          <p className="customer-list-search-results">
            {filteredCustomers.length} av {customers.length} kunder
          </p>
        )}
      </div>

      {/* Content */}
      {filteredCustomers.length === 0 ? (
        <div className="customer-list-empty">
          <div className="customer-list-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          {searchTerm ? (
            <>
              <h3>Inga kunder matchade din sökning</h3>
              <p>Försök med andra sökord eller rensa sökningen</p>
              <button className="customer-list-btn customer-list-btn--secondary" onClick={() => setSearchTerm('')}>
                Rensa sökningen
              </button>
            </>
          ) : (
            <>
              <h3>Inga kunder ännu</h3>
              <p>Kom igång genom att lägga till din första kund</p>
              <Link to="/customers/new" className="customer-list-btn customer-list-btn--primary">
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
        <div className="customer-list-grid">
          {filteredCustomers.map((customer, index) => (
            <Link
              key={customer.id}
              to={`/customers/${customer.id}`}
              className="customer-list-card"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="customer-list-card-avatar">
                {getCustomerInitials(customer.name)}
              </div>
              <div className="customer-list-card-info">
                <h3 className="customer-list-card-name">{customer.name}</h3>
                {customer.contact && (
                  <p className="customer-list-card-contact">{customer.contact}</p>
                )}
              </div>
              <svg className="customer-list-card-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerList;
