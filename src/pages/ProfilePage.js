// src/pages/ProfilePage.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { supabase } from '../services/supabase';

const ProfilePage = () => {
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  const [profileData, setProfileData] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    website: '',
    address: '',
    organizationNumber: '',
    logoUrl: ''
  });

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (userProfile) {
      setProfileData({
        companyName: userProfile.companyName || '',
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
    setMessage('');
    
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        ...profileData,
        updatedAt: serverTimestamp()
      });
      
      await fetchUserProfile(currentUser.uid);
      setMessage('Profilen har uppdaterats!');
      
      setTimeout(() => setMessage(''), 3000);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Kunde inte uppdatera profilen. Försök igen.');
    } finally {
      setSaving(false);
    }
  };

    const handleLogoUpload = async (file) => {
    if (!file || !currentUser) return;
    
    // Validera filtyp
    if (!file.type.startsWith('image/')) {
        setMessage('Vänligen välj en bildfil (JPG, PNG, etc.)');
        return;
    }
    
    // Validera filstorlek (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        setMessage('Bilden är för stor. Maximal storlek är 5MB.');
        return;
    }
    
    setUploadingLogo(true);
    setMessage('');
    
    try {
        console.log('Starting logo upload...'); // LÄGG TILL: Debug logging
        
        // Ta bort gammal logotyp om den finns
        if (profileData.logoUrl) {
        const oldPath = profileData.logoUrl.split('/').pop();
        if (oldPath) {
            console.log('Removing old logo:', oldPath); // LÄGG TILL: Debug logging
            await supabase.storage.from('logos').remove([`${currentUser.uid}/${oldPath}`]);
        }
        }
        
        // Skapa unikt filnamn
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const fileName = `logo_${timestamp}.${fileExt}`;
        const filePath = `${currentUser.uid}/${fileName}`;
        
        console.log('Uploading to path:', filePath); // LÄGG TILL: Debug logging
        
        // Ladda upp till Supabase
        const { data, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });
        
        if (uploadError) {
        console.error('Supabase upload error:', uploadError); // LÄGG TILL: Error logging
        throw uploadError;
        }
        
        console.log('Supabase upload successful:', data); // LÄGG TILL: Success logging
        
        // Hämta public URL
        const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);
        
        const logoUrl = urlData.publicUrl;
        console.log('Generated public URL:', logoUrl); // LÄGG TILL: URL logging
        
        // LÄGG TILL: Vänta lite för att säkerställa att filen är helt uppladdad
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Uppdatera i Firestore
        console.log('Updating Firestore...'); // LÄGG TILL: Debug logging
        const updateData = {
        logoUrl: logoUrl,
        logoPath: filePath,
        updatedAt: serverTimestamp()
        };
        
        await updateDoc(doc(db, 'users', currentUser.uid), updateData);
        console.log('Firestore update successful'); // LÄGG TILL: Success logging
        
        // Uppdatera lokal state
        setProfileData(prev => ({
        ...prev,
        logoUrl: logoUrl
        }));
        
        // LÄGG TILL: Force refresh av användarprofil
        console.log('Refreshing user profile...'); // LÄGG TILL: Debug logging
        await fetchUserProfile(currentUser.uid);
        
        setMessage('Logotypen har uppdaterats!');
        setTimeout(() => setMessage(''), 3000);
        
    } catch (error) {
        console.error('Error uploading logo:', error); // Förbättra: Mer detaljerad error logging
        console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details
        });
        setMessage(`Kunde inte ladda upp logotypen: ${error.message}`); // ÄNDRA: Inkludera felmeddelande
    } finally {
        setUploadingLogo(false);
    }
    };

  const handleRemoveLogo = async () => {
    if (!currentUser || !profileData.logoUrl) return;
    
    setUploadingLogo(true);
    setMessage('');
    
    try {
      // Ta bort från storage
      if (userProfile.logoPath) {
        await supabase.storage.from('logos').remove([userProfile.logoPath]);
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
      setMessage('Logotypen har tagits bort');
      
      setTimeout(() => setMessage(''), 3000);
      
    } catch (error) {
      console.error('Error removing logo:', error);
      setMessage('Kunde inte ta bort logotypen. Försök igen.');
    } finally {
      setUploadingLogo(false);
    }
  };


  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f4f6',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#6b7280' }}>Laddar profil...</p>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: windowWidth <= 768 ? '16px' : '24px',
      background: '#f8fafc',
      minHeight: '100vh'
    }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Header */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: windowWidth <= 768 ? '24px' : '32px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <h1 style={{
          fontSize: windowWidth <= 768 ? '24px' : '28px',
          fontWeight: '700',
          color: '#111827',
          margin: '0 0 8px 0'
        }}>
          Min Profil
        </h1>
        <p style={{
          color: '#6b7280',
          fontSize: windowWidth <= 768 ? '14px' : '16px',
          margin: '0'
        }}>
          Hantera dina kontoinställningar och företagsinformation
        </p>
      </div>

      {/* Success/Error Message */}
      {message && (
        <div style={{
          background: message.includes('Kunde inte') || message.includes('för stor') ? '#fee2e2' : '#dcfce7',
          border: `1px solid ${message.includes('Kunde inte') || message.includes('för stor') ? '#fecaca' : '#bbf7d0'}`,
          color: message.includes('Kunde inte') || message.includes('för stor') ? '#dc2626' : '#166534',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '24px',
          fontSize: '14px'
        }}>
          {message}
        </div>
      )}

      {/* Account Info */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: windowWidth <= 768 ? '24px' : '32px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827',
          margin: '0 0 20px 0'
        }}>
          Kontoinformation
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: windowWidth <= 768 ? '1fr' : 'repeat(2, 1fr)',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '4px'
            }}>
              E-postadress
            </label>
            <div style={{
              padding: '12px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              {currentUser?.email || 'Ej angiven'}
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '4px'
            }}>
              Status
            </label>
            <div style={{
              padding: '12px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#10b981',
              fontWeight: '500'
            }}>
              Gratis version
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: windowWidth <= 768 ? '1fr' : 'repeat(2, 1fr)',
          gap: '16px'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '4px'
            }}>
              Medlem sedan
            </label>
            <div style={{
              padding: '12px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              {userProfile?.createdAt ? 
                new Date(userProfile.createdAt.seconds * 1000).toLocaleDateString('sv-SE') : 
                'Okänt datum'
              }
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '4px'
            }}>
              Senast uppdaterad
            </label>
            <div style={{
              padding: '12px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              {userProfile?.updatedAt ? 
                new Date(userProfile.updatedAt.seconds * 1000).toLocaleDateString('sv-SE') : 
                'Aldrig'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Company Logo */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: windowWidth <= 768 ? '24px' : '32px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827',
          margin: '0 0 8px 0'
        }}>
          Företagslogotyp
        </h2>
        <p style={{
          color: '#6b7280',
          fontSize: '14px',
          marginBottom: '20px'
        }}>
          Logotypen kommer att visas i PDF-rapporter och andra dokument
        </p>

        <div style={{
          display: 'flex',
          flexDirection: windowWidth <= 768 ? 'column' : 'row',
          gap: '24px',
          alignItems: windowWidth <= 768 ? 'stretch' : 'flex-start'
        }}>
          {/* Logo Preview */}
          <div style={{
            flex: '0 0 auto',
            textAlign: 'center'
          }}>
            <div style={{
              width: windowWidth <= 768 ? '200px' : '250px',
              height: windowWidth <= 768 ? '120px' : '150px',
              border: '2px dashed #d1d5db',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f9fafb',
              margin: windowWidth <= 768 ? '0 auto 16px' : '0 0 16px 0',
              overflow: 'hidden'
            }}>
              {profileData.logoUrl ? (
                <img 
                  src={profileData.logoUrl} 
                  alt="Företagslogotyp" 
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                  }}
                />
              ) : (
                <div style={{
                  textAlign: 'center',
                  color: '#9ca3af'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏢</div>
                  <div style={{ fontSize: '14px' }}>Ingen logotyp</div>
                </div>
              )}
            </div>
          </div>

          {/* Logo Controls */}
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ position: 'relative' }}>
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
                  style={{ display: 'none' }}
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    background: uploadingLogo ? '#6b7280' : '#3b82f6',
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: uploadingLogo ? 'not-allowed' : 'pointer',
                    opacity: uploadingLogo ? 0.7 : 1,
                    transition: 'all 0.2s ease',
                    width: windowWidth <= 768 ? '100%' : 'auto',
                    justifyContent: windowWidth <= 768 ? 'center' : 'flex-start',
                    boxSizing: 'border-box'
                  }}
                >
                  {uploadingLogo ? 'Laddar upp...' : profileData.logoUrl ? 'Byt logotyp' : 'Ladda upp logotyp'}
                </label>
              </div>

              {profileData.logoUrl && (
                <button
                  onClick={handleRemoveLogo}
                  disabled={uploadingLogo}
                  style={{
                    padding: '12px 20px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: uploadingLogo ? 'not-allowed' : 'pointer',
                    opacity: uploadingLogo ? 0.7 : 1,
                    transition: 'all 0.2s ease',
                    width: windowWidth <= 768 ? '100%' : 'auto'
                  }}
                >
                  Ta bort logotyp
                </button>
              )}

              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                padding: '12px',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '6px'
              }}>
                <strong>Tips:</strong>
                <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
                  <li>Använd PNG eller JPG format</li>
                  <li>Rekommenderad storlek: 300x150px</li>
                  <li>Maximal filstorlek: 5MB</li>
                  <li>Transparent bakgrund fungerar bäst</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Company Information */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: windowWidth <= 768 ? '24px' : '32px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827',
          margin: '0 0 8px 0'
        }}>
          Företagsinformation
        </h2>
        <p style={{
          color: '#6b7280',
          fontSize: '14px',
          marginBottom: '24px'
        }}>
          Denna information visas i dina PDF-rapporter
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: windowWidth <= 768 ? '1fr' : 'repeat(2, 1fr)',
          gap: '20px'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Företagsnamn *
            </label>
            <input
              type="text"
              value={profileData.companyName}
              onChange={(e) => handleInputChange('companyName', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Kontaktperson *
            </label>
            <input
              type="text"
              value={profileData.contactPerson}
              onChange={(e) => handleInputChange('contactPerson', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Telefonnummer
            </label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Hemsida
            </label>
            <input
              type="url"
              value={profileData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="https://exempel.se"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          <div style={{ gridColumn: windowWidth <= 768 ? '1' : 'span 2' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Adress
            </label>
            <input
              type="text"
              value={profileData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Gata 123, 123 45 Stad"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Organisationsnummer
            </label>
            <input
              type="text"
              value={profileData.organizationNumber}
              onChange={(e) => handleInputChange('organizationNumber', e.target.value)}
              placeholder="123456-7890"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>
        </div>

        {/* Save Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            style={{
              padding: '12px 24px',
              background: saving ? '#6b7280' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              transition: 'all 0.2s ease',
              width: windowWidth <= 768 ? '100%' : 'auto'
            }}
          >
            {saving ? 'Sparar...' : 'Spara ändringar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;