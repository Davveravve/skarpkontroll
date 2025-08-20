// src/pages/InstallationList.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const InstallationList = () => {
  const { customerId, addressId } = useParams();
  const navigate = useNavigate();
  const [installations, setInstallations] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
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
          setAddress({ id: addressDoc.id, ...addressDoc.data() });
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
        setError('Kunde inte ladda anläggningar');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customerId, addressId]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Laddar anläggningar...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-state">
          <h3>Ett fel uppstod</h3>
          <p>{error}</p>
          <button onClick={() => navigate(-1)} className="button secondary">
            Gå tillbaka
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-main">
            <h1>Anläggningar</h1>
            <div className="header-badges">
              <span className="type-badge">{installations.length} anläggningar</span>
            </div>
          </div>
          <div className="breadcrumb">
            <Link to="/customers">Kunder</Link>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9,18 15,12 9,6"/>
            </svg>
            <Link to={`/customers/${customerId}`}>{customer?.name || 'Kund'}</Link>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9,18 15,12 9,6"/>
            </svg>
            <span>{address?.street || 'Adress'}</span>
          </div>
        </div>

        <div className="header-actions">
          <Link 
            to={`/customers/${customerId}/addresses/${addressId}/installations/new`}
            className="button success"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Lägg till anläggning
          </Link>
        </div>
      </div>

      {/* Address Information Card */}
      <div className="info-card">
        <div className="card-header">
          <div className="card-header-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div>
            <h3>Adressinformation</h3>
            <p>Detaljer och specifikationer</p>
          </div>
        </div>

        <div className="card-content">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Kund</span>
              <span className="info-value">{customer?.name || 'Okänd'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Adress</span>
              <span className="info-value">
                {address ? `${address.street}, ${address.postalCode} ${address.city}` : 'Okänd'}
              </span>
            </div>
            {address?.type && (
              <div className="info-item">
                <span className="info-label">Typ</span>
                <span className="info-value">{address.type}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Installations List */}
      <div className="installations-card">
        <div className="card-header">
          <div className="card-header-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <div>
            <h3>Anläggningar</h3>
            <p>{installations.length} {installations.length === 1 ? 'anläggning registrerad' : 'anläggningar registrerade'}</p>
          </div>
        </div>

        <div className="card-content">
          {installations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <h4>Inga anläggningar än</h4>
              <p>Det finns inga anläggningar registrerade för denna adress. Lägg till den första anläggningen för att komma igång.</p>
              <Link 
                to={`/customers/${customerId}/addresses/${addressId}/installations/new`}
                className="button primary"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Lägg till anläggning
              </Link>
            </div>
          ) : (
            <div className="installations-list">
              {installations.map((installation) => (
                <div key={installation.id} className="installation-card">
                  <Link to={`/customers/${customerId}/addresses/${addressId}/installations/${installation.id}`}>
                    <div className="installation-content">
                      <div className="installation-header">
                        <h4>{installation.name}</h4>
                        <div className="installation-badges">
                          <span className={`status-badge ${installation.status === 'completed' ? 'completed' : 'pending'}`}>
                            {installation.status === 'completed' ? 'Klarmarkerad' : 'Ej klar'}
                          </span>
                          {installation.type && (
                            <span className="type-badge">{installation.type}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="installation-meta">
                        {installation.manufacturer && (
                          <div className="meta-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                            </svg>
                            <span>{installation.manufacturer}</span>
                          </div>
                        )}
                        
                        {installation.model && (
                          <div className="meta-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                            </svg>
                            <span>{installation.model}</span>
                          </div>
                        )}
                        
                        {installation.installationDate && (
                          <div className="meta-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                              <line x1="16" y1="2" x2="16" y2="6"/>
                              <line x1="8" y1="2" x2="8" y2="6"/>
                              <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            <span>Installerad: {installation.installationDate}</span>
                          </div>
                        )}
                      </div>
                      
                      {installation.description && (
                        <p className="installation-description">{installation.description}</p>
                      )}
                    </div>
                    
                    <div className="installation-arrow">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9,18 15,12 9,6"/>
                      </svg>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Back Navigation */}
      <div className="page-footer">
        <Link 
          to={`/customers/${customerId}/addresses/${addressId}`}
          className="button secondary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H6m0 0l6 6m-6-6l6-6"/>
          </svg>
          Tillbaka till adress
        </Link>
      </div>
    </div>
  );
};

export default InstallationList;