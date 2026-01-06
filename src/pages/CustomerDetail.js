// src/pages/CustomerDetail.js - Premium customer detail page
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, updateDoc, deleteDoc, serverTimestamp, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import { useConfirmation } from '../components/ConfirmationProvider';
import { useToast } from '../components/ui/Toast';
import { naturalCompare } from '../utils/sorting';
import './CustomerDetail.css';

const CustomerDetail = () => {
  const { currentUser } = useAuth();
  const { currentTeam, hasTeam } = useTeam();
  const { customerId } = useParams();
  const navigate = useNavigate();
  const confirmation = useConfirmation();
  const toast = useToast();

  const [customer, setCustomer] = useState(null);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  useEffect(() => {
    if (!currentUser) {
      setError('Du måste vara inloggad för att visa kunder');
      setLoading(false);
      return;
    }

    if (!hasTeam || !currentTeam) {
      setError('Du måste vara med i ett team för att visa kunder');
      setLoading(false);
      return;
    }

    // Realtidslyssnare för kund
    const customerRef = doc(db, 'customers', customerId);
    const unsubscribeCustomer = onSnapshot(customerRef, (customerDoc) => {
      if (!customerDoc.exists()) {
        setError('Kunden hittades inte');
        setLoading(false);
        return;
      }

      const customerData = { id: customerDoc.id, ...customerDoc.data() };

      // Kontrollera att kunden tillhör detta team
      if (customerData.teamId !== currentTeam.id) {
        setError('Du har inte behörighet att se denna kund');
        setLoading(false);
        return;
      }

      setCustomer(customerData);
      setEditedName(customerData.name || '');
    }, (err) => {
      console.error('Error listening to customer:', err);
      setError(`Kunde inte ladda kundinformation: ${err.message}`);
      setLoading(false);
    });

    // Realtidslyssnare för kontroller
    const controlsQuery = query(
      collection(db, 'inspections'),
      where('customerId', '==', customerId),
      where('teamId', '==', currentTeam.id)
    );

    const unsubscribeControls = onSnapshot(controlsQuery, (snapshot) => {
      const controlsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));

      // Sortera efter datum, sedan namn naturligt
      controlsData.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        if (aTime !== bTime) return bTime - aTime;
        return naturalCompare(a.name || '', b.name || '');
      });

      setControls(controlsData);
      setLoading(false);
    }, (err) => {
      console.error('Error listening to controls:', err);
      setLoading(false);
    });

    // Cleanup
    return () => {
      unsubscribeCustomer();
      unsubscribeControls();
    };
  }, [customerId, currentUser, currentTeam, hasTeam]);

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
      toast.success('Kundnamn uppdaterat');
    } catch (err) {
      console.error('Error updating customer name:', err);
      toast.error('Kunde inte uppdatera kundnamn');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = () => {
    confirmation.confirm({
      title: 'Ta bort kund',
      message: `Är du säker på att du vill ta bort "${customer?.name}"? Detta kommer att ta bort alla relaterade kontroller.`,
      confirmText: 'Ta bort',
      cancelText: 'Avbryt',
      onConfirm: async () => {
        setUpdating(true);

        try {
          await deleteDoc(doc(db, 'customers', customerId));
          toast.success('Kunden har tagits bort');
          navigate('/customers');
        } catch (err) {
          console.error('Error deleting customer:', err);
          toast.error('Kunde inte ta bort kund');
          setUpdating(false);
        }
      }
    });
  };

  const handleDeleteControl = (controlId, controlName) => {
    confirmation.confirm({
      title: 'Radera kontroll',
      message: `Är du säker på att du vill radera kontrollen "${controlName}"? Detta kommer också att radera alla noder och anmärkningar.`,
      confirmText: 'Radera',
      cancelText: 'Avbryt',
      onConfirm: async () => {
        setUpdating(true);
        try {
          await deleteDoc(doc(db, 'inspections', controlId));
          setControls(prev => prev.filter(c => c.id !== controlId));
          toast.success('Kontrollen har raderats');
        } catch (err) {
          console.error('Error deleting control:', err);
          toast.error('Kunde inte radera kontrollen');
        } finally {
          setUpdating(false);
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="customer-detail">
        <div className="customer-detail-loading">
          <div className="customer-detail-spinner"></div>
          <span className="customer-detail-loading-text">Laddar kunddata...</span>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="customer-detail">
        <div className="customer-detail-error">
          <h3 className="customer-detail-error-title">
            {error || 'Kunde inte ladda kunddata'}
          </h3>
          <Link to="/customers" className="customer-detail-error-link">
            ← Tillbaka till kunder
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-detail">
      {/* Breadcrumb */}
      <div className="customer-detail-breadcrumb">
        <Link to="/customers" className="customer-detail-back">
          ← Tillbaka till kunder
        </Link>
      </div>

      {/* Header Card */}
      <div className="customer-detail-header">
        <div className="customer-detail-header-content">
          <div className="customer-detail-info">
            {editingName ? (
              <div className="customer-detail-name-edit">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleNameEdit()}
                  className="customer-detail-name-input"
                  autoFocus
                />
                <div className="customer-detail-edit-actions">
                  <button
                    onClick={handleNameEdit}
                    disabled={updating || !editedName.trim()}
                    className="customer-detail-btn customer-detail-btn--success"
                  >
                    {updating ? 'Sparar...' : 'Spara'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setEditedName(customer.name || '');
                    }}
                    className="customer-detail-btn customer-detail-btn--outline"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            ) : (
              <h1
                className="customer-detail-title"
                onClick={() => setEditingName(true)}
              >
                {customer.name}
                <svg className="customer-detail-edit-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </h1>
            )}

            {customer.email && (
              <p className="customer-detail-subtitle">{customer.email}</p>
            )}

            {customer.phone && (
              <p className="customer-detail-subtitle">{customer.phone}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="customer-detail-actions">
            <Link
              to={`/customers/${customerId}/edit`}
              className="customer-detail-btn customer-detail-btn--secondary"
            >
              Redigera
            </Link>

            <button
              onClick={handleDelete}
              disabled={updating}
              className="customer-detail-btn customer-detail-btn--danger"
            >
              Ta bort
            </button>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div>
        <div className="customer-detail-section-header">
          <h2 className="customer-detail-section-title">
            Kontroller ({controls.length})
          </h2>

          <Link
            to={`/customers/${customerId}/controls/new`}
            className="customer-detail-btn customer-detail-btn--primary"
          >
            + Ny kontroll
          </Link>
        </div>

        {/* Info box */}
        {controls.length === 0 && (
          <div className="customer-detail-info-box">
            <p className="customer-detail-info-text">
              Skapa kontroller enkelt utan förplanering. Bygg strukturen med noder och anmärkningar medan du kontrollerar.
            </p>
          </div>
        )}

        {controls.length === 0 ? (
          <div className="customer-detail-empty">
            <div className="customer-detail-empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </div>
            <h3 className="customer-detail-empty-title">Inga kontroller än</h3>
            <p className="customer-detail-empty-text">
              Kom igång genom att skapa din första kontroll
            </p>
            <Link
              to={`/customers/${customerId}/controls/new`}
              className="customer-detail-btn customer-detail-btn--primary"
            >
              Skapa första kontrollen
            </Link>
          </div>
        ) : (
          <div className="customer-detail-controls-grid">
            {controls.map(control => (
              <div key={control.id} className="customer-detail-control-card">
                {/* Status accent line */}
                <div className={`customer-detail-control-accent ${
                  control.status === 'completed'
                    ? 'customer-detail-control-accent--completed'
                    : control.status === 'draft'
                    ? 'customer-detail-control-accent--draft'
                    : 'customer-detail-control-accent--active'
                }`} />

                {/* Title row */}
                <div className="customer-detail-control-title-row">
                  <h3 className="customer-detail-control-name">{control.name}</h3>
                </div>

                {/* Status badge */}
                <div className="customer-detail-control-status">
                  <span className={`customer-detail-control-badge ${
                    control.status === 'completed'
                      ? 'customer-detail-control-badge--completed'
                      : control.status === 'draft'
                      ? 'customer-detail-control-badge--draft'
                      : 'customer-detail-control-badge--active'
                  }`}>
                    {control.status === 'completed' ? 'Slutförd' : control.status === 'draft' ? 'Utkast' : 'Aktiv'}
                  </span>
                </div>

                <div className="customer-detail-control-meta">
                  <span>
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
                  className="customer-detail-control-delete"
                  title="Ta bort kontroll"
                >
                  Ta bort
                </button>

                {/* Clickable area */}
                <Link
                  to={`/controls/${control.id}`}
                  className="customer-detail-control-link"
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
