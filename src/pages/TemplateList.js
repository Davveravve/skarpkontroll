import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, getDocs, deleteDoc, doc, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmation } from '../components/ConfirmationProvider';

const TemplateList = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const confirmation = useConfirmation();

  // Responsive hantering - samma som CustomerDetail
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [currentUser]);

  const loadTemplates = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const templatesQuery = query(
        collection(db, 'checklistTemplates'),
        where('userId', '==', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(templatesQuery);
      const templateList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sortera efter namn
      templateList.sort((a, b) => a.name.localeCompare(b.name));
      setTemplates(templateList);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId, templateName) => {
    confirmation.confirm({
      title: 'Ta bort mall',
      message: `Är du säker på att du vill ta bort mallen "${templateName}"? Detta kan inte ångras.`,
      confirmText: 'Ta bort',
      confirmButtonClass: 'danger',
      onConfirm: async () => {
        try {
          setDeleting(templateId);
          await deleteDoc(doc(db, 'checklistTemplates', templateId));
          setTemplates(templates.filter(template => template.id !== templateId));
        } catch (error) {
          console.error('Error deleting template:', error);
        } finally {
          setDeleting(null);
        }
      }
    });
  };

  const getTemplateStats = (template) => {
    const sectionCount = template.sections?.length || 0;
    const itemCount = template.sections?.reduce((total, section) => 
      total + (section.items?.length || 0), 0
    ) || 0;
    
    return { sectionCount, itemCount };
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: windowWidth > 1024 ? '0 24px' : '0 16px'
    }}>
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
            Kontrollmallar
          </h1>
          <p style={{
            color: '#6b7280',
            margin: 0,
            fontSize: '16px'
          }}>
            {templates.length === 0 
              ? 'Inga mallar skapade än' 
              : `${templates.length} ${templates.length === 1 ? 'mall' : 'mallar'} skapad${templates.length === 1 ? '' : 'e'}`}
          </p>
        </div>

        <Link 
          to="/templates/new"
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
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          Skapa ny mall
        </Link>
      </div>

      {/* Sökfunktion - samma stil som andra komponenter */}
      {templates.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ position: 'relative', maxWidth: '400px' }}>
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#9ca3af" 
              strokeWidth="2"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)'
              }}
            >
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Sök mallar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 44px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#0066cc';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            />
          </div>
        </div>
      )}

      {/* Innehåll */}
      {templates.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          color: '#6b7280'
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
            Inga mallar skapade än
          </h3>
          <p style={{ margin: '0 0 24px 0' }}>
            Kom igång genom att skapa din första kontrollmall
          </p>
          <Link 
            to="/templates/new"
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
              gap: '8px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            Skapa din första mall
          </Link>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          color: '#6b7280'
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
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            margin: '0 0 8px 0'
          }}>
            Inga mallar hittades
          </h3>
          <p style={{ margin: '0' }}>
            Inga mallar matchar din sökning. Försök med andra sökord.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${windowWidth > 1024 ? '350px' : '300px'}, 1fr))`,
          gap: '24px'
        }}>
          {filteredTemplates.map((template) => {
            const stats = getTemplateStats(template);
            const isDeleting = deleting === template.id;
            
            return (
              <div 
                key={template.id}
                style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  height: 'fit-content'
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
                {/* Header med ikon och titel - samma som address cards */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #0066cc, #0052a3)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <polyline points="9,18 15,12 9,6"/>
                  </svg>
                </div>

                {/* Mallnamn */}
                <h3 style={{
                  color: '#0066cc',
                  margin: '0 0 8px 0',
                  fontSize: '18px',
                  fontWeight: '600',
                  lineHeight: '1.3'
                }}>
                  {template.name}
                </h3>

                {/* Beskrivning */}
                {template.description && (
                  <p style={{
                    color: '#6b7280',
                    fontSize: '14px',
                    margin: '0 0 16px 0',
                    lineHeight: '1.4'
                  }}>
                    {template.description}
                  </p>
                )}

                {/* Statistik - samma stil som address metadata */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 0',
                  borderTop: '1px solid #f3f4f6',
                  marginTop: 'auto'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#6b7280',
                    fontSize: '14px'
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12l2 2 4-4"/>
                      <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                      <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                    </svg>
                    <span>{stats.sectionCount} sektioner</span>
                  </div>
                  <div style={{
                    padding: '4px 8px',
                    background: '#f3f4f6',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    {stats.itemCount} punkter
                  </div>
                </div>

                {/* Åtgärder - samma stil som andra action buttons */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '16px'
                }}>
                  <Link
                    to={`/templates/${template.id}`}
                    style={{
                      textDecoration: 'none',
                      padding: '8px 12px',
                      background: '#f3f4f6',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                      flex: 1,
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e5e7eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f3f4f6';
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    Visa
                  </Link>

                  <Link
                    to={`/templates/${template.id}/edit`}
                    style={{
                      textDecoration: 'none',
                      padding: '8px 12px',
                      background: '#0066cc',
                      border: '1px solid #0066cc',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                      flex: 1,
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#0052a3';
                      e.currentTarget.style.borderColor = '#0052a3';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#0066cc';
                      e.currentTarget.style.borderColor = '#0066cc';
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Redigera
                  </Link>

                  <button
                    onClick={() => handleDeleteTemplate(template.id, template.name)}
                    disabled={isDeleting}
                    style={{
                      padding: '8px',
                      background: isDeleting ? '#f3f4f6' : '#fee2e2',
                      border: `1px solid ${isDeleting ? '#e5e7eb' : '#fecaca'}`,
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: isDeleting ? '#9ca3af' : '#dc2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isDeleting ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      width: '40px',
                      height: '36px'
                    }}
                    onMouseEnter={(e) => {
                      if (!isDeleting) {
                        e.currentTarget.style.background = '#fecaca';
                        e.currentTarget.style.borderColor = '#f87171';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isDeleting) {
                        e.currentTarget.style.background = '#fee2e2';
                        e.currentTarget.style.borderColor = '#fecaca';
                      }
                    }}
                  >
                    {isDeleting ? (
                      <div style={{
                        width: '14px',
                        height: '14px',
                        border: '2px solid #f3f4f6',
                        borderTop: '2px solid #9ca3af',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TemplateList;