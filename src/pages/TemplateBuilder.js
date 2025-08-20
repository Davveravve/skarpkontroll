// src/pages/TemplateBuilder.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmation } from '../components/ConfirmationProvider';
import { v4 as uuidv4 } from 'uuid';

const TemplateBuilder = () => {
  const { templateId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const confirmation = useConfirmation();
  const isEdit = Boolean(templateId);

  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    sections: []
  });
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Responsive hantering
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isEdit && templateId) {
      fetchTemplate();
    }
  }, [isEdit, templateId]);

  const fetchTemplate = async () => {
    try {
      setInitialLoading(true);
      const templateDoc = await getDoc(doc(db, 'checklistTemplates', templateId));
      
      if (templateDoc.exists()) {
        const data = templateDoc.data();
        setTemplateData({
          name: data.name || '',
          description: data.description || '',
          sections: data.sections || []
        });
      } else {
        setError('Mall hittades inte');
      }
    } catch (err) {
      console.error('Error fetching template:', err);
      setError('Kunde inte ladda mall');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleBasicInfoChange = (e) => {
    const { name, value } = e.target;
    setTemplateData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addSection = () => {
    const newSection = {
      id: uuidv4(),
      name: `Sektion ${templateData.sections.length + 1}`,
      description: '',
      items: []
    };

    setTemplateData(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };

  const updateSection = (sectionId, updates) => {
    setTemplateData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    }));
  };

  const deleteSection = async (sectionId) => {
    const section = templateData.sections.find(s => s.id === sectionId);
    
    confirmation.confirm({
      title: 'Ta bort sektion',
      message: `Är du säker på att du vill ta bort sektionen "${section?.name || 'Unnamed'}"? Alla kontrollpunkter i sektionen kommer också att tas bort.`,
      confirmText: 'Ta bort',
      confirmButtonClass: 'danger',
      onConfirm: () => {
        setTemplateData(prev => ({
          ...prev,
          sections: prev.sections.filter(section => section.id !== sectionId)
        }));
      }
    });
  };

  const addItem = (sectionId, type = 'yesno') => {
    const newItem = {
      id: uuidv4(),
      type,
      label: type === 'header' ? 'Ny rubrik' : 'Ny kontrollpunkt',
      required: false,
      allowImages: false
    };

    setTemplateData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, items: [...(section.items || []), newItem] }
          : section
      )
    }));
  };

  const updateItem = (sectionId, itemId, updates) => {
    setTemplateData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map(item =>
                item.id === itemId ? { ...item, ...updates } : item
              )
            }
          : section
      )
    }));
  };

  const deleteItem = async (sectionId, itemId) => {
    const section = templateData.sections.find(s => s.id === sectionId);
    const item = section?.items?.find(i => i.id === itemId);
    
    confirmation.confirm({
      title: 'Ta bort kontrollpunkt',
      message: `Är du säker på att du vill ta bort kontrollpunkten "${item?.label || 'Unnamed'}"?`,
      confirmText: 'Ta bort',
      confirmButtonClass: 'danger',
      onConfirm: () => {
        setTemplateData(prev => ({
          ...prev,
          sections: prev.sections.map(section =>
            section.id === sectionId
              ? {
                  ...section,
                  items: section.items.filter(item => item.id !== itemId)
                }
              : section
          )
        }));
      }
    });
  };

  const handleSave = async () => {
    if (!templateData.name.trim()) {
      setError('Mallnamn är obligatoriskt');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const templatePayload = {
        name: templateData.name.trim(),
        description: templateData.description.trim(),
        sections: templateData.sections,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        updatedAt: serverTimestamp()
      };

      if (isEdit) {
        await updateDoc(doc(db, 'checklistTemplates', templateId), templatePayload);
      } else {
        templatePayload.createdAt = serverTimestamp();
        await addDoc(collection(db, 'checklistTemplates'), templatePayload);
      }

      navigate('/templates');
    } catch (err) {
      console.error('Error saving template:', err);
      setError('Kunde inte spara mallen. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const renderItemBuilder = (sectionId, item) => {
    return (
      <div 
        key={item.id} 
        style={{
          background: '#fafafa',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '12px'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <select
            value={item.type}
            onChange={(e) => updateItem(sectionId, item.id, { type: e.target.value })}
            disabled={loading}
            style={{
              padding: '6px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              background: 'white',
              fontSize: '14px',
              minWidth: '140px'
            }}
          >
            <option value="yesno">Ja/Nej fråga</option>
            <option value="text">Textfält</option>
            <option value="header">Rubrik</option>
          </select>
          
          <button
            onClick={() => deleteItem(sectionId, item.id)}
            disabled={loading}
            style={{
              padding: '6px 8px',
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '12px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#fecaca';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#fee2e2';
              }
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3,6 5,6 21,6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Ta bort
          </button>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '4px'
          }}>
            {item.type === 'header' ? 'Rubriktext' : 'Frågetext'}
          </label>
          <input
            type="text"
            value={item.label}
            onChange={(e) => updateItem(sectionId, item.id, { label: e.target.value })}
            placeholder={item.type === 'header' ? 'Skriv rubrik...' : 'Skriv din fråga...'}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              background: 'white'
            }}
          />
        </div>

        {item.type !== 'header' && (
          <div style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              color: '#374151',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={item.required}
                onChange={(e) => updateItem(sectionId, item.id, { required: e.target.checked })}
                disabled={loading}
                style={{
                  width: '14px',
                  height: '14px'
                }}
              />
              Obligatorisk
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              color: '#374151',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={item.allowImages}
                onChange={(e) => updateItem(sectionId, item.id, { allowImages: e.target.checked })}
                disabled={loading}
                style={{
                  width: '14px',
                  height: '14px'
                }}
              />
              Tillåt bilder
            </label>
          </div>
        )}
      </div>
    );
  };

  if (initialLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid #f3f4f6',
          borderTop: '3px solid #0066cc',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: windowWidth > 1024 ? '0 24px' : '0 16px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: windowWidth > 768 ? 'center' : 'flex-start',
        flexDirection: windowWidth > 768 ? 'row' : 'column',
        gap: windowWidth > 768 ? '0' : '24px',
        marginBottom: '32px'
      }}>
        <div>
          <h1 style={{
            fontSize: windowWidth > 768 ? '32px' : '28px',
            fontWeight: '700',
            margin: '0 0 8px 0',
            color: '#111827'
          }}>
            {isEdit ? 'Redigera mall' : 'Skapa ny mall'}
          </h1>
          <p style={{
            color: '#6b7280',
            margin: 0,
            fontSize: '16px'
          }}>
            {isEdit ? 'Uppdatera din kontrollmall' : 'Skapa en ny mall för dina kontroller'}
          </p>
        </div>
        
        <div style={{
          display: 'flex',
          gap: '12px',
          flexDirection: windowWidth > 480 ? 'row' : 'column'
        }}>
          <button
            onClick={() => navigate('/templates')}
            disabled={loading}
            style={{
              padding: '12px 24px',
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#e5e7eb';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#f3f4f6';
              }
            }}
          >
            Avbryt
          </button>
          
          <button
            onClick={handleSave}
            disabled={loading || !templateData.name.trim()}
            style={{
              padding: '12px 24px',
              background: (loading || !templateData.name.trim()) ? '#9ca3af' : '#0066cc',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: 'white',
              cursor: (loading || !templateData.name.trim()) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!loading && templateData.name.trim()) {
                e.currentTarget.style.background = '#0052a3';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && templateData.name.trim()) {
                e.currentTarget.style.background = '#0066cc';
              }
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                {isEdit ? 'Uppdaterar...' : 'Sparar...'}
              </>
            ) : (
              <>
                {isEdit ? 'Uppdatera mall' : 'Spara mall'}
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626',
          marginBottom: '24px',
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

      {/* Grundläggande information */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '32px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          margin: '0 0 16px 0',
          color: '#111827'
        }}>
          Grundläggande information
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: windowWidth > 768 ? '1fr 1fr' : '1fr',
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
              Mallnamn *
            </label>
            <input
              type="text"
              name="name"
              value={templateData.name}
              onChange={handleBasicInfoChange}
              placeholder="T.ex. Årlig elsäkerhetskontroll"
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'white'
              }}
            />
          </div>

          <div style={{ gridColumn: windowWidth > 768 ? 'span 2' : 'span 1' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Beskrivning
            </label>
            <textarea
              name="description"
              value={templateData.description}
              onChange={handleBasicInfoChange}
              placeholder="Kort beskrivning av vad mallen används till"
              rows="3"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'white',
                resize: 'vertical'
              }}
            />
          </div>
        </div>
      </div>

      {/* Sektioner */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '32px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          margin: '0 0 8px 0',
          color: '#111827'
        }}>
          Kontrollpunkter
        </h2>
        <p style={{
          color: '#6b7280',
          marginBottom: '24px',
          fontSize: '14px'
        }}>
          Organisera dina kontrollpunkter i sektioner
        </p>

        {templateData.sections.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px',
            color: '#6b7280',
            background: '#f9fafb',
            borderRadius: '8px',
            border: '1px dashed #e5e7eb'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: '#f3f4f6',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              margin: '0 0 8px 0'
            }}>
              Inga sektioner ännu
            </h3>
            <p style={{ margin: 0 }}>
              Lägg till din första sektion för att komma igång
            </p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {templateData.sections.map((section, sectionIndex) => (
              <div 
                key={section.id} 
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
              >
                {/* Section Header */}
                <div style={{
                  background: '#f9fafb',
                  padding: '16px 20px',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '16px'
                }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={section.name}
                      onChange={(e) => updateSection(section.id, { name: e.target.value })}
                      placeholder={`Sektion ${sectionIndex + 1}`}
                      disabled={loading}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '16px',
                        fontWeight: '600',
                        background: 'white',
                        marginBottom: '8px'
                      }}
                    />
                    <input
                      type="text"
                      value={section.description || ''}
                      onChange={(e) => updateSection(section.id, { description: e.target.value })}
                      placeholder="Beskrivning av sektionen (valfritt)"
                      disabled={loading}
                      style={{
                        width: '100%',
                        padding: '6px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: 'white',
                        color: '#6b7280'
                      }}
                    />
                  </div>
                  
                  <button
                    onClick={() => deleteSection(section.id)}
                    disabled={loading}
                    style={{
                      padding: '8px',
                      background: '#fee2e2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      color: '#dc2626',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.background = '#fecaca';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.currentTarget.style.background = '#fee2e2';
                      }
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3,6 5,6 21,6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>

                {/* Section Content */}
                <div style={{ padding: '20px' }}>
                  {/* Items */}
                  {section.items && section.items.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      {section.items.map(item => renderItemBuilder(section.id, item))}
                    </div>
                  )}

                  {/* Add Item buttons */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '8px'
                  }}>
                    <button
                      onClick={() => addItem(section.id, 'yesno')}
                      disabled={loading}
                      style={{
                        padding: '12px 16px',
                        background: '#dbeafe',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        color: '#1d4ed8',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.currentTarget.style.background = '#bfdbfe';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) {
                          e.currentTarget.style.background = '#dbeafe';
                        }
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9,11 12,14 22,4"/>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                      </svg>
                      Ja/Nej fråga
                    </button>
                    
                    <button
                      onClick={() => addItem(section.id, 'text')}
                      disabled={loading}
                      style={{
                        padding: '12px 16px',
                        background: '#dcfce7',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px',
                        color: '#15803d',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.currentTarget.style.background = '#bbf7d0';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) {
                          e.currentTarget.style.background = '#dcfce7';
                        }
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                      Textfält
                    </button>
                    
                    <button
                      onClick={() => addItem(section.id, 'header')}
                      disabled={loading}
                      style={{
                        padding: '12px 16px',
                        background: '#fef3c7',
                        border: '1px solid #fde68a',
                        borderRadius: '6px',
                        color: '#d97706',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.currentTarget.style.background = '#fde68a';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) {
                          e.currentTarget.style.background = '#fef3c7';
                        }
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 12h12"/>
                        <path d="M6 20V4"/>
                        <path d="M18 20V4"/>
                      </svg>
                      Rubrik
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Section Button */}
        <div style={{ 
          marginTop: templateData.sections.length > 0 ? '24px' : '16px',
          textAlign: 'center'
        }}>
          <button
            onClick={addSection}
            disabled={loading}
            style={{
              padding: '14px 28px',
              background: '#0066cc',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            Lägg till ny sektion
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateBuilder;