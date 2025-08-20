// src/pages/InspectionForm.js - Förenklad med Dashboard-stil och multiselect
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where, getDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

const InspectionForm = () => {
  const { currentUser } = useAuth();
  const { customerId, addressId, installationId } = useParams();
  const navigate = useNavigate();
  const [installation, setInstallation] = useState(null);
  const [address, setAddress] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Form state
  const [inspectionName, setInspectionName] = useState('');
  const [selectedTemplates, setSelectedTemplates] = useState([]); // Array för flera mallar
  const [useQuickStart, setUseQuickStart] = useState(true);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        setError('Du måste vara inloggad för att skapa kontroller');
        setLoading(false);
        return;
      }

      try {
        // Hämta relaterad information
        const [customerDoc, addressDoc, installationDoc] = await Promise.all([
          getDoc(doc(db, 'customers', customerId)),
          getDoc(doc(db, 'addresses', addressId)),
          getDoc(doc(db, 'installations', installationId))
        ]);

        if (customerDoc.exists()) {
          setCustomer({ id: customerDoc.id, ...customerDoc.data() });
        }
        
        if (addressDoc.exists()) {
          setAddress({ id: addressDoc.id, ...addressDoc.data() });
        }
        
        if (installationDoc.exists()) {
          const installationData = { id: installationDoc.id, ...installationDoc.data() };
          setInstallation(installationData);
          
          // Sätt standardnamn baserat på anläggning och datum
          const today = new Date().toLocaleDateString('sv-SE');
          setInspectionName(`${installationData.name} - Kontroll ${today}`);
        }

        // Hämta mallar från Firebase (rätt kollektion)
        try {
          console.log('🔍 Startar mallhämtning från Firebase...');
          console.log('👤 Aktuell användare:', currentUser);
          console.log('🆔 Användar-UID:', currentUser.uid);
          console.log('📧 Användar-email:', currentUser.email);
          
          // Hämta mallar från rätt kollektion: 'checklistTemplates'
          console.log('📚 Försöker läsa från checklistTemplates...');
          const templatesQuery = query(
            collection(db, 'checklistTemplates'),  // ✅ Rätt kollektion!
            where('userId', '==', currentUser.uid)
          );
          
          const templatesSnapshot = await getDocs(templatesQuery);
          console.log('📋 Antal mallar hittade:', templatesSnapshot.docs.length);
          
          const templatesData = templatesSnapshot.docs.map(doc => {
            const data = { id: doc.id, ...doc.data() };
            console.log('✅ Hittad mall:', data.name, 'ID:', data.id, 'Sektioner:', data.sections?.length || 0);
            return data;
          });
          
          setTemplates(templatesData);
          
          // Välj första mallen som standard om det finns några
          if (templatesData.length > 0) {
            setSelectedTemplates([templatesData[0].id]); // Array med första mallen
            setUseQuickStart(false);
            console.log('✅ Valde mall som standard:', templatesData[0].name);
          } else {
            console.log('⚠️ Inga mallar hittades för denna användare');
            console.log('💡 Kontrollera att mallarna har rätt userId:', currentUser.uid);
          }
        } catch (templatesError) {
          console.error('❌ Fel vid hämtning av mallar:', templatesError);
          console.error('📄 Fullständigt fel:', templatesError.message);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Kunde inte ladda data för att skapa kontroll');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customerId, addressId, installationId, currentUser]);

  const buildSectionsFromTemplates = (selectedTemplateIds) => {
    console.log('🔍 DEBUG: buildSectionsFromTemplates anropad med IDs:', selectedTemplateIds);
    const allSections = [];
    
    selectedTemplateIds.forEach(templateId => {
      const template = templates.find(t => t.id === templateId);
      console.log('📋 DEBUG: Hittad mall:', template);
      
      if (template && template.sections) {
        console.log('🗂️ DEBUG: Antal sektioner i mall:', template.sections.length);
        
        template.sections.forEach((section, index) => {
          const sectionName = section.name || section.title || `Sektion ${index + 1}`;
          console.log(`✅ DEBUG: Använder sektionsnamn: "${sectionName}"`);
          
          allSections.push({
            // Spara både det rena namnet OCH det fullständiga namnet
            name: sectionName,                                    // NYTT: Rena sektionsnamnet
            title: `${sectionName} (${template.name})`,          // Fullständiga titeln med mallnamn
            templateName: template.name,                          // NYTT: Mallnamn separat
            items: section.items.map(item => ({
              ...item,
              value: item.type === 'yesno' ? null : 
                    item.type === 'checkbox' ? false : '',
              notes: '',
              images: []
            }))
          });
        });
      }
    });
    
    console.log('🎯 DEBUG: Slutresultat allSections:', allSections);
    return allSections;
  };

  const createQuickStartSections = () => {
    return [
      {
        title: 'Allmän kontroll',
        items: [
          {
            id: 'general-1',
            type: 'yesno',
            label: 'Är anläggningen i gott skick?',
            value: null,
            notes: '',
            images: []
          },
          {
            id: 'general-2',
            type: 'yesno',
            label: 'Finns det några synliga skador?',
            value: null,
            notes: '',
            images: []
          },
          {
            id: 'general-3',
            type: 'text',
            label: 'Övriga kommentarer',
            value: '',
            notes: '',
            images: []
          }
        ]
      }
    ];
  };

  const toggleTemplateSelection = (templateId) => {
    setSelectedTemplates(prev => {
      if (prev.includes(templateId)) {
        // Ta bort mall om den redan är vald
        return prev.filter(id => id !== templateId);
      } else {
        // Lägg till mall om den inte är vald
        return [...prev, templateId];
      }
    });
  };

  const handleCreateInspection = async () => {
    if (!inspectionName.trim()) {
      alert('Ange ett namn för kontrollen');
      return;
    }

    if (!useQuickStart && selectedTemplates.length === 0) {
      alert('Välj minst en mall eller använd snabbstart');
      return;
    }

    try {
      setSaving(true);
      
      let sections = [];
      let templateName = '';
      
      if (useQuickStart) {
        sections = createQuickStartSections();
        templateName = 'Snabbstart';
      } else {
        sections = buildSectionsFromTemplates(selectedTemplates);
        const selectedTemplateNames = selectedTemplates.map(id => {
          const template = templates.find(t => t.id === id);
          return template ? template.name : 'Okänd mall';
        });
        templateName = selectedTemplateNames.join(' + ');
      }
      
      const newInspection = {
        name: inspectionName,
        templateName,
        customerId,
        customerName: customer?.name,
        addressId,
        addressName: address?.street,
        installationId,
        installationName: installation?.name,
        templateId: useQuickStart ? null : selectedTemplates.join(','), // Spara flera template-IDs
        status: 'in-progress',
        sections,
        createdAt: serverTimestamp(),
        userId: currentUser.uid,
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'inspections'), newInspection);
      console.log('✅ Inspection created with ID:', docRef.id);
      
      // Omdirigera till detail-sidan
      navigate(`/customers/${customerId}/addresses/${addressId}/installations/${installationId}/inspections/${docRef.id}`);
      
    } catch (err) {
      console.error('❌ Error creating inspection:', err);
      setError('Kunde inte skapa kontrollen: ' + err.message);
    } finally {
      setSaving(false);
    }
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
          Laddar...
        </span>
      </div>
    );
  }

  if (error || !installation) {
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
            {error || 'Kunde inte ladda data'}
          </h3>
          <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '24px' }}>
            {error || 'Det uppstod ett problem när data skulle laddas.'}
          </p>
          <Link 
            to={`/customers/${customerId}/addresses/${addressId}/installations/${installationId}`}
            style={{
              textDecoration: 'none',
              padding: '12px 24px',
              background: '#f3f4f6',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              fontSize: '14px',
              fontWeight: '500',
              color: '#0066cc',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H6m0 0l6 6m-6-6l6-6"/>
            </svg>
            Gå tillbaka
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: windowWidth > 1024 ? '0 24px' : '0 16px' 
    }}>
      {/* Back Button */}
      <div style={{ marginBottom: '24px' }}>
        <Link 
          to={`/customers/${customerId}/addresses/${addressId}/installations/${installationId}`}
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
          Tillbaka till {installation?.name}
        </Link>
      </div>

      {/* Breadcrumb */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: '#6b7280',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <Link to="/customers" style={{ color: '#0066cc', textDecoration: 'none' }}>Kunder</Link>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9,18 15,12 9,6"/>
        </svg>
        <Link to={`/customers/${customerId}`} style={{ color: '#0066cc', textDecoration: 'none' }}>
          {customer?.name}
        </Link>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9,18 15,12 9,6"/>
        </svg>
        <Link to={`/customers/${customerId}/addresses/${addressId}`} style={{ color: '#0066cc', textDecoration: 'none' }}>
          {address?.street}
        </Link>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9,18 15,12 9,6"/>
        </svg>
        <Link to={`/customers/${customerId}/addresses/${addressId}/installations/${installationId}`} style={{ color: '#0066cc', textDecoration: 'none' }}>
          {installation?.name}
        </Link>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9,18 15,12 9,6"/>
        </svg>
        <span>Ny kontroll</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: windowWidth > 1024 ? '48px' : '32px' }}>
        <h1 style={{ 
          fontSize: windowWidth > 1024 ? '32px' : windowWidth > 768 ? '28px' : '24px',
          fontWeight: 'bold',
          color: '#0066cc',
          margin: 0,
          marginBottom: '8px'
        }}>
          Skapa ny kontroll
        </h1>
        <p style={{ 
          color: '#6b7280',
          fontSize: '16px',
          margin: 0
        }}>
          Skapa en ny kontroll för {installation?.name}
        </p>
      </div>

      {/* Form */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Kontrollnamn */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{
            display: 'block',
            color: '#374151',
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '8px'
          }}>
            Kontrollnamn
          </label>
          <input
            type="text"
            value={inspectionName}
            onChange={(e) => setInspectionName(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#0066cc'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
            placeholder="Ange ett namn för kontrollen"
          />
        </div>

        {/* Mall-val */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{
            display: 'block',
            color: '#374151',
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '16px'
          }}>
            Välj mall ({templates.length} {templates.length === 1 ? 'mall' : 'mallar'} tillgängliga)
          </label>

          {/* Mall-alternativ först om det finns mallar */}
          {templates.length > 0 && (
            <>
              <div
                onClick={() => setUseQuickStart(false)}
                style={{
                  padding: '16px',
                  border: !useQuickStart ? '2px solid #0066cc' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: !useQuickStart ? '#f0f9ff' : 'white'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: '2px solid #0066cc',
                    background: !useQuickStart ? '#0066cc' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {!useQuickStart && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'white'
                      }} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#374151' }}>Använd befintlig mall</div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      Skapa kontroll baserat på en eller flera av dina {templates.length} sparade mallar
                    </div>
                  </div>
                </div>
              </div>

              {!useQuickStart && (
                <div style={{ marginLeft: '32px', marginBottom: '16px' }}>
                  <div style={{ marginBottom: '12px', color: '#374151', fontWeight: '500' }}>
                    Välj mallar att kombinera ({selectedTemplates.length} valda):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {templates.map(template => (
                      <div
                        key={template.id}
                        onClick={() => toggleTemplateSelection(template.id)}
                        style={{
                          padding: '12px 16px',
                          border: selectedTemplates.includes(template.id) ? '2px solid #0066cc' : '1px solid #d1d5db',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          background: selectedTemplates.includes(template.id) ? '#f0f9ff' : 'white',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                      >
                        <div style={{
                          width: '20px',
                          height: '20px',
                          border: '2px solid #0066cc',
                          borderRadius: '4px',
                          background: selectedTemplates.includes(template.id) ? '#0066cc' : 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {selectedTemplates.includes(template.id) && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <polyline points="20,6 9,17 4,12"/>
                            </svg>
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#374151' }}>
                            {template.name}
                          </div>
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>
                            {template.sections?.length || 0} sektioner
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {selectedTemplates.length > 1 && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      background: '#f0f9ff',
                      border: '1px solid #0066cc',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#0066cc'
                    }}>
                      ✅ Du har valt {selectedTemplates.length} mallar som kommer att kombineras i kontrollen
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Snabbstart-alternativ */}
          <div
            onClick={() => setUseQuickStart(true)}
            style={{
              padding: '16px',
              border: useQuickStart ? '2px solid #0066cc' : '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: useQuickStart ? '#f0f9ff' : 'white'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: '2px solid #0066cc',
                background: useQuickStart ? '#0066cc' : 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {useQuickStart && (
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'white'
                  }} />
                )}
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#374151' }}>Snabbstart</div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Kom igång snabbt med grundläggande kontrollfrågor (3 frågor)
                </div>
              </div>
            </div>
          </div>

          {templates.length === 0 && (
            <div style={{
              padding: '16px',
              background: '#fffbeb',
              border: '1px solid #fed7aa',
              borderRadius: '8px',
              color: '#92400e',
              fontSize: '14px',
              marginTop: '16px'
            }}>
              Du har inga sparade mallar ännu. Du kan använda snabbstart för att komma igång.
            </div>
          )}
        </div>

        {/* Knappar */}
        <div style={{ 
          display: 'flex', 
          gap: '12px',
          justifyContent: 'flex-end',
          flexDirection: windowWidth > 480 ? 'row' : 'column'
        }}>
          <Link
            to={`/customers/${customerId}/addresses/${addressId}/installations/${installationId}`}
            style={{
              textDecoration: 'none',
              padding: '12px 24px',
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              textAlign: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f3f4f6';
            }}
          >
            Avbryt
          </Link>
          
          <button
            onClick={handleCreateInspection}
            disabled={saving}
            style={{
              padding: '12px 24px',
              background: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (!saving) e.currentTarget.style.background = '#0052a3';
            }}
            onMouseLeave={(e) => {
              if (!saving) e.currentTarget.style.background = '#0066cc';
            }}
          >
            {saving ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid #ffffff40',
                  borderTop: '2px solid #ffffff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Skapar kontroll...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Skapa kontroll
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default InspectionForm;