// src/pages/CustomerForm.js - Customer form page
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { addDoc, collection, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import { createTeamLogger } from '../services/teamLogger';
import './CustomerForm.css';

const CustomerForm = () => {
  const { currentUser, userProfile } = useAuth();
  const { currentTeam, hasTeam } = useTeam();
  const navigate = useNavigate();
  const { customerId } = useParams();
  const isEdit = Boolean(customerId);

  // Team logger for activity tracking
  const logger = useMemo(() => {
    if (!currentTeam?.id || !currentUser?.uid) return null;
    return createTeamLogger({
      teamId: currentTeam.id,
      userId: currentUser.uid,
      userName: userProfile?.companyName || currentUser.email?.split('@')[0] || 'Anonym'
    });
  }, [currentTeam?.id, currentUser?.uid, currentUser?.email, userProfile?.companyName]);

  // State
  const [formData, setFormData] = useState({
    name: '',
    orgNumber: '',
    contactPersons: []
  });

  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    role: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
          orgNumber: customerData.orgNumber || '',
          contactPersons: customerData.contactPersons || []
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

    if (!hasTeam) {
      setError('Du måste vara med i ett team för att skapa kunder');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const customerData = {
        name: formData.name.trim(),
        orgNumber: formData.orgNumber || '',
        contactPersons: formData.contactPersons || [],
        teamId: currentTeam.id,
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('Saving customer to Firebase:', customerData);

      if (isEdit) {
        await updateDoc(doc(db, 'customers', customerId), customerData);
        if (logger) {
          logger.customerUpdated(customerId, formData.name.trim());
        }
        console.log('Customer updated successfully');
        navigate(`/customers/${customerId}`);
      } else {
        const docRef = await addDoc(collection(db, 'customers'), customerData);
        console.log('Customer created successfully with ID:', docRef.id);
        if (logger) {
          logger.customerCreated(docRef.id, formData.name.trim());
        }
        navigate(`/customers/${docRef.id}`);
      }
    } catch (err) {
      console.error('ERROR saving customer:', err);
      console.error('Error details:', err.message, err.code);
      setError(isEdit ? `Kunde inte uppdatera kund: ${err.message}` : `Kunde inte skapa kund: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading && isEdit) {
    return (
      <div className="customer-form">
        <div className="customer-form-loading">
          <div className="customer-form-spinner"></div>
          <p>Laddar kunddata...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-form">
      {/* Breadcrumb */}
      <div className="customer-form-breadcrumb">
        <Link to="/customers" className="customer-form-breadcrumb-link">Kunder</Link>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9,18 15,12 9,6"/>
        </svg>
        <span>{isEdit ? 'Redigera kund' : 'Ny kund'}</span>
      </div>

      {/* Header */}
      <header className="customer-form-header">
        <div className="customer-form-header-content">
          <h1 className="customer-form-title">
            {isEdit ? 'Redigera kund' : 'Lägg till ny kund'}
          </h1>
          <p className="customer-form-subtitle">
            {isEdit ? 'Uppdatera kundinformation' : 'Fyll i kundens information för att skapa en ny kund'}
          </p>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="customer-form-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          {error}
        </div>
      )}

      {/* Form Card */}
      <div className="customer-form-card">
        <div className="customer-form-card-header">
          <h2>Kundinformation</h2>
          <p>Grundläggande information om kunden</p>
        </div>

        <form onSubmit={handleSubmit} className="customer-form-body">
          <div className="customer-form-grid">
            {/* Namn */}
            <div className="customer-form-group customer-form-group--full">
              <label htmlFor="name">
                Namn <span className="customer-form-required">*</span>
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
              />
            </div>

            {/* Organisationsnummer */}
            <div className="customer-form-group customer-form-group--full">
              <label htmlFor="orgNumber">Organisationsnummer</label>
              <input
                type="text"
                id="orgNumber"
                name="orgNumber"
                value={formData.orgNumber}
                onChange={handleChange}
                placeholder="123456-7890"
                disabled={loading}
              />
            </div>
          </div>

          {/* Kontaktpersoner (för framtida implementation) */}
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              Kontaktpersoner kan läggas till efter att kunden har skapats.
            </p>
          </div>

          {/* Form Actions */}
          <div className="customer-form-actions">
            <button
              type="button"
              className="customer-form-btn customer-form-btn--secondary"
              onClick={() => navigate('/customers')}
              disabled={loading}
            >
              Avbryt
            </button>

            <button
              type="submit"
              className="customer-form-btn customer-form-btn--primary"
              disabled={loading}
            >
              {loading && <div className="customer-form-btn-spinner"></div>}
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
