// src/pages/ProfilePage.js - Premium profile page
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import './ProfilePage.css';

const ProfilePage = () => {
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [profileData, setProfileData] = useState({
    contactPerson: '',
    phone: '',
    website: '',
    address: '',
    organizationNumber: '',
    logoUrl: ''
  });

  useEffect(() => {
    if (userProfile) {
      setProfileData({
        contactPerson: userProfile.contactPerson || '',
        phone: userProfile.phone || '',
        website: userProfile.website || '',
        address: userProfile.address || '',
        organizationNumber: userProfile.organizationNumber || '',
        logoUrl: userProfile.logoUrl || ''
      });
    }
  }, [userProfile]);

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;

    setSaving(true);

    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        ...profileData,
        updatedAt: serverTimestamp()
      });

      await fetchUserProfile(currentUser.uid);
      toast.success('Profilen har uppdaterats!');

    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Kunde inte uppdatera profilen. Försök igen.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file) => {
    if (!file || !currentUser) return;

    // Validera filtyp
    if (!file.type.startsWith('image/')) {
      toast.error('Vänligen välj en bildfil (JPG, PNG, etc.)');
      return;
    }

    // Validera filstorlek (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Bilden är för stor. Maximal storlek är 5MB.');
      return;
    }

    setUploadingLogo(true);

    try {
      // Ta bort gammal logotyp om den finns
      if (userProfile?.logoPath) {
        try {
          const oldRef = ref(storage, userProfile.logoPath);
          await deleteObject(oldRef);
        } catch (err) {
          console.log('Could not delete old logo:', err.message);
        }
      }

      // Skapa unikt filnamn
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `logo_${timestamp}.${fileExt}`;
      const filePath = `logos/${currentUser.uid}/${fileName}`;

      // Ladda upp till Firebase Storage
      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, file);

      // Hämta public URL
      const logoUrl = await getDownloadURL(storageRef);

      // Uppdatera i Firestore
      await updateDoc(doc(db, 'users', currentUser.uid), {
        logoUrl: logoUrl,
        logoPath: filePath,
        updatedAt: serverTimestamp()
      });

      // Uppdatera lokal state
      setProfileData(prev => ({
        ...prev,
        logoUrl: logoUrl
      }));

      await fetchUserProfile(currentUser.uid);
      toast.success('Logotypen har uppdaterats!');

    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error(`Kunde inte ladda upp logotypen: ${error.message}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!currentUser || !profileData.logoUrl) return;

    setUploadingLogo(true);

    try {
      // Ta bort från Firebase Storage
      if (userProfile?.logoPath) {
        try {
          const logoRef = ref(storage, userProfile.logoPath);
          await deleteObject(logoRef);
        } catch (err) {
          console.log('Could not delete logo from storage:', err.message);
        }
      }

      // Uppdatera i Firestore
      await updateDoc(doc(db, 'users', currentUser.uid), {
        logoUrl: '',
        logoPath: '',
        updatedAt: serverTimestamp()
      });

      // Uppdatera lokal state
      setProfileData(prev => ({
        ...prev,
        logoUrl: ''
      }));

      await fetchUserProfile(currentUser.uid);
      toast.success('Logotypen har tagits bort');

    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error('Kunde inte ta bort logotypen. Försök igen.');
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <div className="profile-spinner"></div>
          <p className="profile-loading-text">Laddar profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Header */}
      <header className="profile-header">
        <h1 className="profile-title">Min Profil</h1>
        <p className="profile-subtitle">
          Hantera dina kontoinställningar och företagsinformation
        </p>
      </header>

      {/* Account Info */}
      <div className="profile-card">
        <h2 className="profile-card-title">Kontoinformation</h2>

        <div className="profile-grid" style={{ marginBottom: '16px' }}>
          <div className="profile-field">
            <label className="profile-field-label">E-postadress</label>
            <div className="profile-field-value">
              {currentUser?.email || 'Ej angiven'}
            </div>
          </div>

          <div className="profile-field">
            <label className="profile-field-label">Status</label>
            <div className="profile-field-value profile-field-value--success">
              Gratis version
            </div>
          </div>
        </div>

        <div className="profile-grid">
          <div className="profile-field">
            <label className="profile-field-label">Medlem sedan</label>
            <div className="profile-field-value">
              {userProfile?.createdAt ?
                new Date(userProfile.createdAt.seconds * 1000).toLocaleDateString('sv-SE') :
                'Okänt datum'
              }
            </div>
          </div>

          <div className="profile-field">
            <label className="profile-field-label">Senast uppdaterad</label>
            <div className="profile-field-value">
              {userProfile?.updatedAt ?
                new Date(userProfile.updatedAt.seconds * 1000).toLocaleDateString('sv-SE') :
                'Aldrig'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Company Logo */}
      <div className="profile-card">
        <h2 className="profile-card-title">Företagslogotyp</h2>
        <p className="profile-card-subtitle">
          Logotypen kommer att visas i PDF-rapporter och andra dokument
        </p>

        <div className="profile-logo-section">
          {/* Logo Preview */}
          <div className="profile-logo-preview">
            <div className="profile-logo-box">
              {profileData.logoUrl ? (
                <img src={profileData.logoUrl} alt="Företagslogotyp" />
              ) : (
                <div className="profile-logo-placeholder">
                  <div className="profile-logo-placeholder-icon">🏢</div>
                  <div className="profile-logo-placeholder-text">Ingen logotyp</div>
                </div>
              )}
            </div>
          </div>

          {/* Logo Controls */}
          <div className="profile-logo-controls">
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    handleLogoUpload(file);
                    e.target.value = '';
                  }
                }}
                className="profile-file-input"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className={`profile-file-label ${uploadingLogo ? 'profile-file-label--disabled' : ''}`}
              >
                {uploadingLogo ? 'Laddar upp...' : profileData.logoUrl ? 'Byt logotyp' : 'Ladda upp logotyp'}
              </label>
            </div>

            {profileData.logoUrl && (
              <button
                onClick={handleRemoveLogo}
                disabled={uploadingLogo}
                className="profile-btn profile-btn--danger"
              >
                Ta bort logotyp
              </button>
            )}

            <div className="profile-tips">
              <strong>Tips:</strong>
              <ul>
                <li>Använd PNG eller JPG format</li>
                <li>Rekommenderad storlek: 300x150px</li>
                <li>Maximal filstorlek: 5MB</li>
                <li>Transparent bakgrund fungerar bäst</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="profile-card">
        <h2 className="profile-card-title">Kontaktinformation</h2>
        <p className="profile-card-subtitle">
          Denna information visas i dina PDF-rapporter
        </p>

        <div className="profile-grid profile-grid--wide">
          <div className="profile-field">
            <label className="profile-field-label">Kontaktperson *</label>
            <input
              type="text"
              value={profileData.contactPerson}
              onChange={(e) => handleInputChange('contactPerson', e.target.value)}
              className="profile-input"
            />
          </div>

          <div className="profile-field">
            <label className="profile-field-label">Telefonnummer</label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="profile-input"
            />
          </div>

          <div className="profile-field">
            <label className="profile-field-label">Hemsida</label>
            <input
              type="url"
              value={profileData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="https://exempel.se"
              className="profile-input"
            />
          </div>

          <div className="profile-field profile-field--full">
            <label className="profile-field-label">Adress</label>
            <input
              type="text"
              value={profileData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Gata 123, 123 45 Stad"
              className="profile-input"
            />
          </div>

          <div className="profile-field">
            <label className="profile-field-label">Organisationsnummer</label>
            <input
              type="text"
              value={profileData.organizationNumber}
              onChange={(e) => handleInputChange('organizationNumber', e.target.value)}
              placeholder="123456-7890"
              className="profile-input"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="profile-form-footer">
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="profile-btn profile-btn--success"
          >
            {saving ? 'Sparar...' : 'Spara ändringar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
