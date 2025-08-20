// src/pages/TemplateDetail.js
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmation } from '../components/ConfirmationProvider';

const TemplateDetail = () => {
  const { templateId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const confirmation = useConfirmation();
  
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Responsive hantering - samma som CustomerDetail
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchTemplate();
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const templateDoc = await getDoc(doc(db, 'checklistTemplates', templateId));
      
      if (templateDoc.exists()) {
        setTemplate({ id: templateDoc.id, ...templateDoc.data() });
      } else {
        setError('Mall hittades inte');
      }
    } catch (err) {
      console.error('Error fetching template:', err);
      setError('Kunde inte ladda mall');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    confirmation.confirm({
      title: 'Ta bort mall',
      message: `Är du säker på att du vill ta bort mallen "${template.name}"? Detta kan inte ångras.`,
      confirmText: 'Ta bort',
      confirmButtonClass: 'danger',
      onConfirm: async () => {
        try {
          setDeleting(true);
          await deleteDoc(doc(db, 'checklistTemplates', templateId));
          navigate('/templates');
        } catch (err) {
          console.error('Error deleting template:', err);
        } finally {
          setDeleting(false);
        }
      }
    });
  };

  const getItemTypeLabel = (type) => {
    const labels = {
      'yesno': 'Ja/Nej',
      'text': 'Text',
      'header': 'Rubrik'
    };
    return labels[type] || type;
  };

  const renderPreviewItem = (item) => {
    switch (item.type) {
      case 'header':
        return (
          <h4 style={{ 
            fontSize: '18px', 
            fontWeight: '600',
            color: '#111827',
            margin: 0,
            lineHeight: '1.3'
          }}>
            {item.label}
          </h4>
        );
      
      case 'yesno':
        return (
          <div>
            <p style={{ 
              margin: '0 0 12px 0', 
              fontWeight: '500',
              color: '#374151',
              fontSize: '14px'
            }}>
              {item.label}
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                style={{
                  padding: '6px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  background: '#f9fafb',
                  fontSize: '13px',
                  cursor: 'default',
                  color: '#6b7280'
                }}
                disabled
              >
                Ja
              </button>
              <button 
                style={{
                  padding: '6px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  background: '#f9fafb',
                  fontSize: '13px',
                  cursor: 'default',
                  color: '#6b7280'
                }}
                disabled
              >
                Nej
              </button>
            </div>
          </div>
        );
      
      case 'text':
        return (
          <div>
            <p style={{ 
              margin: '0 0 12px 0', 
              fontWeight: '500',
              color: '#374151',
              fontSize: '14px'
            }}>
              {item.label}
            </p>
            <input
              type="text"
              placeholder="Textfält..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                background: '#f9fafb',
                fontSize: '14px',
                color: '#6b7280'
              }}
              disabled
            />
          </div>
        );
      
      default:
        return <p style={{ margin: 0, color: '#6b7280' }}>{item.label}</p>;
    }
  };

  if (loading) {
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
          background: '#fee2e2',
          borderRadius: '12px',
          border: '1px solid #fecaca',
          color: '#dc2626'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: '#fecaca',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            margin: '0 0 8px 0'
          }}>
            Fel
          </h3>
          <p style={{ margin: '0 0 24px 0' }}>{error}</p>
          <Link 
            to="/templates"
            style={{
              textDecoration: 'none',
              padding: '12px 24px',
              background: '#0066cc',
              color: 'white',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Tillbaka till mallar
          </Link>
        </div>
      </div>
    );
  }

  if (!template) {
    return null;
  }

  const totalItems = template.sections?.reduce((total, section) => 
    total + (section.items?.length || 0), 0
  ) || 0;

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: windowWidth > 1024 ? '0 24px' : '0 16px'
    }}>
      {/* Back Button - samma stil som AddressDetail */}
      <div style={{ marginBottom: '24px' }}>
        <Link 
          to="/templates"
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
          Tillbaka till mallar
        </Link>
      </div>

      {/* Header - samma stil som CustomerDetail */}
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
            {template.name}
          </h1>
          <p style={{
            color: '#6b7280',
            margin: 0,
            fontSize: '16px'
          }}>
            Förhandsvisning av kontrollmall
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          flexDirection: windowWidth > 480 ? 'row' : 'column'
        }}>
          <Link 
            to={`/templates/${templateId}/edit`}
            style={{
              textDecoration: 'none',
              padding: '12px 24px',
              background: '#0066cc',
              color: 'white',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              border: 'none'
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
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Redigera
          </Link>

          <button 
            onClick={handleDelete}
            disabled={deleting}
            style={{
              padding: '12px 24px',
              background: deleting ? '#f3f4f6' : '#fee2e2',
              border: `1px solid ${deleting ? '#e5e7eb' : '#fecaca'}`,
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: deleting ? '#9ca3af' : '#dc2626',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: deleting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!deleting) {
                e.currentTarget.style.background = '#fecaca';
                e.currentTarget.style.borderColor = '#f87171';
              }
            }}
            onMouseLeave={(e) => {
              if (!deleting) {
                e.currentTarget.style.background = '#fee2e2';
                e.currentTarget.style.borderColor = '#fecaca';
              }
            }}
          >
            {deleting ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #f3f4f6',
                  borderTop: '2px solid #9ca3af',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Tar bort...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3,6 5,6 21,6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                Ta bort
              </>
            )}
          </button>
        </div>
      </div>

      {/* Template metadata - samma stil som address info */}
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
          Mallinformation
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px',
          padding: '16px',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div>
            <label style={{ 
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: '#6b7280',
              marginBottom: '4px'
            }}>
              Totalt antal punkter
            </label>
            <span style={{ 
              fontSize: '16px', 
              fontWeight: '600',
              color: '#111827'
            }}>
              {totalItems}
            </span>
          </div>
          
          <div>
            <label style={{ 
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: '#6b7280',
              marginBottom: '4px'
            }}>
              Antal sektioner
            </label>
            <span style={{ 
              fontSize: '16px', 
              fontWeight: '600',
              color: '#111827'
            }}>
              {template.sections?.length || 0}
            </span>
          </div>

          <div>
            <label style={{ 
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: '#6b7280',
              marginBottom: '4px'
            }}>
              Skapare
            </label>
            <span style={{ 
              fontSize: '16px',
              color: '#111827'
            }}>
              {template.userEmail || 'Okänd'}
            </span>
          </div>
        </div>

        {template.description && (
          <div style={{ marginTop: '16px' }}>
            <label style={{ 
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: '#6b7280',
              marginBottom: '4px'
            }}>
              Beskrivning
            </label>
            <p style={{
              margin: 0,
              color: '#374151',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              {template.description}
            </p>
          </div>
        )}
      </div>

      {/* Template sections preview */}
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
          Förhandsvisning
        </h2>
        
        {!template.sections || template.sections.length === 0 ? (
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
            <p style={{ margin: 0, fontSize: '16px' }}>Inga sektioner i denna mall</p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {template.sections.map((section, sectionIndex) => (
              <div 
                key={section.id || sectionIndex}
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
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#111827'
                  }}>
                    {section.name}
                  </h3>
                  {section.description && (
                    <p style={{
                      margin: '4px 0 0 0',
                      color: '#6b7280',
                      fontSize: '14px'
                    }}>
                      {section.description}
                    </p>
                  )}
                </div>

                {/* Section Items */}
                <div style={{ padding: '20px' }}>
                  {!section.items || section.items.length === 0 ? (
                    <div style={{
                      padding: '24px',
                      textAlign: 'center',
                      color: '#6b7280',
                      background: '#f9fafb',
                      borderRadius: '6px',
                      border: '1px dashed #e5e7eb'
                    }}>
                      <p style={{ margin: 0 }}>Inga punkter i denna sektion</p>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}>
                      {section.items.map((item, itemIndex) => (
                        <div 
                          key={item.id || itemIndex} 
                          style={{
                            padding: '16px',
                            background: '#fafafa',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px'
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
                            <span style={{
                              padding: '4px 8px',
                              background: '#e5e7eb',
                              color: '#374151',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}>
                              {getItemTypeLabel(item.type)}
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {item.required && (
                                <span style={{
                                  padding: '4px 8px',
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '500'
                                }}>
                                  Obligatorisk
                                </span>
                              )}
                              {item.allowImages && (
                                <span style={{
                                  padding: '4px 8px',
                                  background: '#dbeafe',
                                  color: '#1d4ed8',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '500'
                                }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <polyline points="21,15 16,10 5,21"/>
                                  </svg>
                                  Bilder
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            {renderPreviewItem(item)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateDetail;