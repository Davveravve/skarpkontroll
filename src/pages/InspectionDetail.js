// src/pages/InspectionDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmation } from '../components/ConfirmationProvider';
import { generateInspectionPDF } from '../utils/pdfGenerator';
import { supabase } from '../services/supabase';
import { v4 as uuidv4 } from 'uuid';

const InspectionDetail = () => {
  const { currentUser, userProfile } = useAuth();
  const { customerId, addressId, installationId, inspectionId } = useParams();
  const navigate = useNavigate();
  const confirmation = useConfirmation();
  
  // State variables
  const [inspection, setInspection] = useState(null);
  const [installation, setInstallation] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [activeImageModal, setActiveImageModal] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [uploadingImages, setUploadingImages] = useState({});

  // Sektionshantering
  const [editingSection, setEditingSection] = useState(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [showAddSectionForm, setShowAddSectionForm] = useState(false);
  const [activeSectionForNewItem, setActiveSectionForNewItem] = useState(null);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemType, setNewItemType] = useState('yesno');

  // Mobile responsiveness helper
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main data fetching useEffect
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        setError('Du måste vara inloggad för att visa kontroller');
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Fetching inspection with ID:', inspectionId);

        // Hämta kontroll först
        const inspectionDoc = await getDoc(doc(db, 'inspections', inspectionId));
        
        if (!inspectionDoc.exists()) {
          console.error('❌ Inspection document does not exist:', inspectionId);
          setError('Kontrollen hittades inte');
          setLoading(false);
          return;
        }
        
        console.log('✅ Inspection found');
        const inspectionData = { id: inspectionDoc.id, ...inspectionDoc.data() };
        
        // Säkerställ att varje item har en egen images-array
        if (inspectionData.sections) {
          inspectionData.sections.forEach((section, sectionIndex) => {
            if (section.items) {
              section.items.forEach((item, itemIndex) => {
                if (!Array.isArray(item.images)) {
                  item.images = [];
                }
              });
            }
          });
        }
        
        setInspection(inspectionData);
        setEditedName(inspectionData.name || inspectionData.templateName || '');

        // Hämta relaterad information parallellt
        const fetchPromises = [
          getDoc(doc(db, 'customers', customerId)).catch(err => {
            console.error('❌ Error fetching customer:', err);
            return null;
          }),
          getDoc(doc(db, 'addresses', addressId)).catch(err => {
            console.error('❌ Error fetching address:', err);
            return null;
          }),
          getDoc(doc(db, 'installations', installationId)).catch(err => {
            console.error('❌ Error fetching installation:', err);
            return null;
          })
        ];

        const [customerDoc, addressDoc, installationDoc] = await Promise.all(fetchPromises);

        if (customerDoc && customerDoc.exists()) {
          setCustomer({ id: customerDoc.id, ...customerDoc.data() });
        }
        
        if (addressDoc && addressDoc.exists()) {
          setAddress({ id: addressDoc.id, ...addressDoc.data() });
        }
        
        if (installationDoc && installationDoc.exists()) {
          setInstallation({ id: installationDoc.id, ...installationDoc.data() });
        }

        console.log('✅ All data fetched successfully');

      } catch (err) {
        console.error('❌ Critical error fetching inspection data:', err);
        if (err.code === 'permission-denied') {
          setError('Du har inte behörighet att visa denna kontroll');
        } else if (err.code === 'unavailable') {
          setError('Tjänsten är för tillfället otillgänglig. Försök igen senare.');
        } else {
          setError(`Kunde inte ladda kontrollinformation: ${err.message || 'Okänt fel'}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customerId, addressId, installationId, inspectionId, currentUser]);

  // Handler functions
  const handleItemChange = async (sectionIndex, itemIndex, field, value) => {
    const updatedInspection = { ...inspection };
    updatedInspection.sections[sectionIndex].items[itemIndex][field] = value;
    setInspection(updatedInspection);
    
    // Autosave after a short delay
    await saveInspection(updatedInspection);
  };

  const saveInspection = async (inspectionData = inspection) => {
    try {
      await updateDoc(doc(db, 'inspections', inspectionId), {
        sections: inspectionData.sections,
        name: inspectionData.name,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error saving inspection:', err);
      setError('Kunde inte spara ändringar');
    }
  };

  // Sektionshantering funktioner
  const handleEditSectionName = async (sectionIndex, newName) => {
    if (!newName.trim()) {
      alert('Sektionsnamnet kan inte vara tomt');
      return;
    }

    const updatedInspection = { ...inspection };
    updatedInspection.sections[sectionIndex].name = newName.trim();
    setInspection(updatedInspection);
    setEditingSection(null);
    
    await saveInspection(updatedInspection);
  };

  const addNewSection = async () => {
    if (!newSectionName.trim()) {
      alert('Ange ett namn för sektionen');
      return;
    }
    
    const updatedInspection = { ...inspection };
    
    // Säkerställ att sections array finns
    if (!updatedInspection.sections) {
      updatedInspection.sections = [];
    }
    
    const newSection = {
      name: newSectionName.trim(),
      items: []
    };
    
    updatedInspection.sections.push(newSection);
    setInspection(updatedInspection);
    
    // Återställ formuläret
    setNewSectionName('');
    setShowAddSectionForm(false);
    
    // Spara direkt
    await saveInspection(updatedInspection);
  };

  const removeSection = async (sectionIndex) => {
    confirmation.confirm({
      title: 'Ta bort sektion',
      message: 'Är du säker på att du vill ta bort denna sektion och alla dess frågor?',
      onConfirm: async () => {
        const updatedInspection = { ...inspection };
        
        // Ta bort bilder från storage för alla items i sektionen
        const section = updatedInspection.sections[sectionIndex];
        if (section.items) {
          for (const item of section.items) {
            if (item.images && Array.isArray(item.images)) {
              for (const image of item.images) {
                if (image.path) {
                  try {
                    await supabase.storage.from('inspections').remove([image.path]);
                  } catch (err) {
                    console.error('Error deleting image from storage:', err);
                  }
                }
              }
            }
          }
        }
        
        updatedInspection.sections.splice(sectionIndex, 1);
        setInspection(updatedInspection);
        await saveInspection(updatedInspection);
      }
    });
  };

  const addNewItem = async (targetSectionIndex = null) => {
    if (!newItemLabel.trim()) {
      alert('Ange en frågetext');
      return;
    }
    
    // Använd målsektionen eller den aktiva sektionen
    const sectionIndex = targetSectionIndex !== null ? targetSectionIndex : activeSectionForNewItem;
    
    if (sectionIndex === null || sectionIndex === undefined) {
      alert('Välj en sektion att lägga till frågan i');
      return;
    }
    
    const updatedInspection = { ...inspection };
    
    const newItem = {
      id: uuidv4(),
      type: newItemType,
      label: newItemLabel.trim(),
      required: false,
      allowImages: true,
      value: newItemType === 'yesno' ? null : 
             newItemType === 'checkbox' ? false : '',
      notes: '',
      images: []
    };
    
    // Säkerställ att sektionen har en items array
    if (!Array.isArray(updatedInspection.sections[sectionIndex].items)) {
      updatedInspection.sections[sectionIndex].items = [];
    }
    
    updatedInspection.sections[sectionIndex].items.push(newItem);
    setInspection(updatedInspection);
    
    // Återställ formuläret
    setNewItemLabel('');
    setNewItemType('yesno');
    setActiveSectionForNewItem(null);
    
    // Spara direkt
    await saveInspection(updatedInspection);
  };

  const removeItem = async (sectionIndex, itemIndex) => {
    confirmation.confirm({
      title: 'Ta bort fråga',
      message: 'Är du säker på att du vill ta bort denna fråga?',
      onConfirm: async () => {
        const updatedInspection = { ...inspection };
        
        // Ta bort bilder från storage först
        const item = updatedInspection.sections[sectionIndex].items[itemIndex];
        if (item.images && Array.isArray(item.images)) {
          for (const image of item.images) {
            if (image.path) {
              try {
                await supabase.storage.from('inspections').remove([image.path]);
              } catch (err) {
                console.error('Error deleting image from storage:', err);
              }
            }
          }
        }
        
        // Ta bort frågan från arrayen
        updatedInspection.sections[sectionIndex].items.splice(itemIndex, 1);
        setInspection(updatedInspection);
        await saveInspection(updatedInspection);
      }
    });
  };

  const handleMarkComplete = async () => {
    if (!inspection || inspection.status === 'completed') return;
    
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'inspections', inspectionId), {
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      setInspection(prev => ({ ...prev, status: 'completed' }));
      setEditMode(false);
    } catch (err) {
      console.error('Error completing inspection:', err);
      setError('Kunde inte slutföra kontrollen');
    } finally {
      setUpdating(false);
    }
  };

  const handleReopen = async () => {
    if (!inspection || inspection.status !== 'completed') return;
    
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'inspections', inspectionId), {
        status: 'in-progress',
        completedAt: null,
        updatedAt: serverTimestamp()
      });
      
      setInspection(prev => ({ ...prev, status: 'in-progress', completedAt: null }));
    } catch (err) {
      console.error('Error reopening inspection:', err);
      setError('Kunde inte återöppna kontrollen');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = () => {
    confirmation.confirm({
      title: 'Ta bort kontroll',
      message: 'Är du säker på att du vill ta bort denna kontroll? Detta kan inte ångras.',
      onConfirm: async () => {
        setUpdating(true);
        try {
          await deleteDoc(doc(db, 'inspections', inspectionId));
          navigate(`/customers/${customerId}/addresses/${addressId}/installations/${installationId}`);
        } catch (err) {
          console.error('Error deleting inspection:', err);
          setError('Kunde inte ta bort kontrollen');
          setUpdating(false);
        }
      }
    });
  };

  const handleSaveName = async () => {
    const nameToSave = editedName.trim();
    if (!nameToSave) {
      alert('Kontrollnamnet kan inte vara tomt');
      return;
    }
    
    setSaving(true);
    try {
      await updateDoc(doc(db, 'inspections', inspectionId), {
        name: nameToSave,
        updatedAt: serverTimestamp()
      });
      
      setInspection(prev => ({ ...prev, name: nameToSave }));
      setEditingName(false);
    } catch (err) {
      console.error('Error updating inspection name:', err);
      setError('Kunde inte uppdatera namnet');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (sectionIndex, itemIndex, file) => {
    const uploadKey = `${sectionIndex}-${itemIndex}`;
    setUploadingImages(prev => ({ ...prev, [uploadKey]: true }));
    
    try {
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `img_${timestamp}.${fileExt}`;
      const filePath = `inspections/${inspectionId}/${sectionIndex}/${itemIndex}/${fileName}`;
      
      // Upload to Supabase
      const { data, error: uploadError } = await supabase.storage
        .from('inspections')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('inspections')
        .getPublicUrl(filePath);
      
      const imageData = {
        url: urlData.publicUrl,
        name: file.name,
        type: file.type,
        size: file.size,
        path: filePath,
        timestamp: timestamp,
        uniqueId: `${sectionIndex}_${itemIndex}_${timestamp}`
      };
      
      // Update inspection state
      const updatedInspection = { ...inspection };
      if (!Array.isArray(updatedInspection.sections[sectionIndex].items[itemIndex].images)) {
        updatedInspection.sections[sectionIndex].items[itemIndex].images = [];
      }
      
      updatedInspection.sections[sectionIndex].items[itemIndex].images.push(imageData);
      setInspection(updatedInspection);
      
      // Save to Firestore
      await saveInspection(updatedInspection);
      
    } catch (err) {
      console.error('Error uploading image:', err);
      alert(`Kunde inte ladda upp bild: ${err.message}`);
    } finally {
      setUploadingImages(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  const handleDeleteImage = async (sectionIndex, itemIndex, imageIndex) => {
    try {
      const updatedInspection = { ...inspection };
      const images = updatedInspection.sections[sectionIndex].items[itemIndex].images;
      const imageToDelete = images[imageIndex];
      
      // Delete from storage
      if (imageToDelete.path) {
        await supabase.storage.from('inspections').remove([imageToDelete.path]);
      }
      
      // Remove from state
      images.splice(imageIndex, 1);
      setInspection(updatedInspection);
      setActiveImageModal(null);
      
      // Save to Firestore
      await saveInspection(updatedInspection);
      
    } catch (err) {
      console.error('Error deleting image:', err);
      setError('Kunde inte ta bort bilden');
    }
  };

  const generatePDF = async () => {
    if (!inspection || !installation || !customer || !address) {
      alert('Kunde inte generera PDF: Data saknas');
      return;
    }
    
    setGeneratingPdf(true);
    
    try {
      // Skicka med userProfile från useAuth hook (som redan finns längst upp i komponenten)
      const doc = await generateInspectionPDF(inspection, installation, customer, address, userProfile);
      
      if (doc) {
        // Skapa professionellt filnamn
        const customerName = customer.name.replace(/[^a-zA-Z0-9\-_]/g, '_');
        const installationName = installation.name.replace(/[^a-zA-Z0-9\-_]/g, '_');
        const currentDate = new Date().toISOString().split('T')[0];
        const fileName = `Kontrollrapport_${customerName}_${installationName}_${currentDate}.pdf`;
        
        doc.save(fileName);
        
        // Bekräftelse
        alert('PDF-rapport har genererats och laddats ner!');
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Ett fel uppstod när PDF-dokumentet skulle skapas: ' + err.message);
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Image Modal Component
  const ImageModal = ({ image, onClose, onDelete }) => {
    if (!image) return null;

    return (
      <div 
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: '1000',
          padding: windowWidth <= 480 ? '10px' : '20px',
          boxSizing: 'border-box',
          overflowX: 'hidden',
          overflowY: 'auto'
        }}
        onClick={onClose}
      >
        <div 
          style={{
            background: 'white',
            borderRadius: '12px',
            width: windowWidth <= 480 ? 'calc(100vw - 20px)' : '90vw',
            maxWidth: windowWidth <= 480 ? 'calc(100vw - 20px)' : '90vw',
            maxHeight: windowWidth <= 480 ? 'calc(100vh - 20px)' : '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            margin: '0 auto',
            boxSizing: 'border-box'
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{
            padding: windowWidth <= 480 ? '12px' : '16px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ 
              margin: '0', 
              fontSize: windowWidth <= 480 ? '16px' : '18px', 
              fontWeight: '600',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              marginRight: '10px'
            }}>
              {image.name}
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: windowWidth <= 480 ? '20px' : '24px',
                cursor: 'pointer',
                padding: '4px',
                minWidth: '32px',
                minHeight: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>
          
          <div style={{ 
            padding: windowWidth <= 480 ? '12px' : '16px', 
            textAlign: 'center',
            flex: 1,
            overflow: 'auto'
          }}>
            <img 
              src={image.url} 
              alt={image.name}
              style={{
                maxWidth: '100%',
                maxHeight: windowWidth <= 480 ? '60vh' : '70vh',
                objectFit: 'contain'
              }}
            />
          </div>
          
          <div style={{
            padding: windowWidth <= 480 ? '12px' : '16px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: windowWidth <= 480 ? '8px' : '12px',
            justifyContent: 'flex-end',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => window.open(image.url, '_blank')}
              style={{
                padding: windowWidth <= 480 ? '10px 14px' : '8px 16px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: windowWidth <= 480 ? '13px' : '14px',
                cursor: 'pointer',
                minHeight: '44px',
                whiteSpace: 'nowrap'
              }}
            >
              {windowWidth <= 480 ? 'Öppna' : 'Öppna i nytt fönster'}
            </button>
            {onDelete && (
              <button
                onClick={onDelete}
                style={{
                  padding: windowWidth <= 480 ? '10px 14px' : '8px 16px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: windowWidth <= 480 ? '13px' : '14px',
                  cursor: 'pointer',
                  minHeight: '44px',
                  whiteSpace: 'nowrap'
                }}
              >
                Ta bort bild
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '50vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #f3f4f6',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>Laddar kontroll...</p>
      </div>
    );
  }

  // Error state
  if (error || !inspection) {
    return (
      <div style={{
        maxWidth: '800px',
        margin: '40px auto',
        padding: windowWidth <= 480 ? '20px' : '32px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: '#fee2e2',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <span style={{ fontSize: '24px', color: '#dc2626' }}>⚠</span>
        </div>
        <h2 style={{ 
          fontSize: windowWidth <= 480 ? '20px' : '24px', 
          fontWeight: '600', 
          color: '#111827', 
          marginBottom: '8px' 
        }}>
          {error || 'Kontrollen hittades inte'}
        </h2>
        <p style={{ 
          color: '#6b7280', 
          fontSize: windowWidth <= 480 ? '14px' : '16px', 
          marginBottom: '24px',
          lineHeight: '1.5'
        }}>
          {error || 'Den kontroll du söker efter finns inte eller har tagits bort.'}
        </p>
        <Link 
          to={`/customers/${customerId}/addresses/${addressId}/installations/${installationId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: windowWidth <= 480 ? '14px 20px' : '12px 24px',
            background: '#3b82f6',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: windowWidth <= 480 ? '13px' : '14px',
            fontWeight: '500',
            minHeight: '44px'
          }}
        >
          ← Tillbaka till installation
        </Link>
      </div>
    );
  }

  const isCompleted = inspection.status === 'completed';

  // Main component render
  return (
    <div style={{
      width: '100%',
      maxWidth: windowWidth <= 768 ? '100vw' : '1200px',
      margin: '0 auto',
      padding: windowWidth <= 768 ? '16px' : '24px',
      background: '#f8fafc',
      minHeight: '100vh',
      boxSizing: 'border-box',
      overflowX: 'hidden'
    }}>
      {/* CSS för spinner och mobile optimizations */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          /* Mobile Centering och Layout Fix */
          @media (max-width: 768px) {
            body {
              overflow-x: hidden !important;
            }
            
            * {
              box-sizing: border-box !important;
            }
          }
          
          @media (max-width: 480px) {
            button {
              min-height: 44px !important;
              min-width: 44px !important;
              box-sizing: border-box !important;
            }
            
            input, textarea, select {
              font-size: 16px !important;
              width: 100% !important;
              max-width: 100% !important;
              box-sizing: border-box !important;
            }
            
            .modal-content {
              margin: 10px !important;
              max-width: calc(100vw - 20px) !important;
              width: calc(100vw - 20px) !important;
              box-sizing: border-box !important;
            }
          }
          
          @media (max-width: 360px) {
            .button-group {
              flex-direction: column !important;
            }
            
            .button-group button {
              width: 100% !important;
              margin-bottom: 8px !important;
              box-sizing: border-box !important;
            }
            
            .button-group button:last-child {
              margin-bottom: 0 !important;
            }
          }
        `}
      </style>

      {/* Header Card */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: windowWidth <= 768 ? '20px' : '32px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: windowWidth <= 768 ? '16px' : '24px' }}>
          <Link 
            to={`/customers/${customerId}/addresses/${addressId}/installations/${installationId}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#3b82f6',
              textDecoration: 'none',
              fontSize: windowWidth <= 768 ? '12px' : '14px',
              fontWeight: '500'
            }}
          >
            ← Tillbaka till installation
          </Link>
        </div>

        {/* Title Section */}
        <div style={{ marginBottom: '24px' }}>
          {editingName ? (
            <div style={{ 
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                style={{
                  fontSize: windowWidth <= 768 ? '24px' : '32px',
                  fontWeight: '700',
                  border: '2px solid #3b82f6',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  width: '100%',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                autoFocus
              />
              <div style={{ 
                display: 'flex', 
                gap: '8px',
                flexWrap: 'wrap',
                flexDirection: windowWidth <= 360 ? 'column-reverse' : 'row'
              }}>
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  style={{
                    padding: windowWidth <= 480 ? '12px 16px' : '8px 16px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    flex: windowWidth <= 480 ? '1' : 'none',
                    minHeight: '44px',
                    width: windowWidth <= 360 ? '100%' : 'auto'
                  }}
                >
                  {saving ? 'Sparar...' : 'Spara'}
                </button>
                <button
                  onClick={() => {
                    setEditedName(inspection.name || inspection.templateName || '');
                    setEditingName(false);
                  }}
                  style={{
                    padding: windowWidth <= 480 ? '12px 16px' : '8px 16px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    flex: windowWidth <= 480 ? '1' : 'none',
                    minHeight: '44px',
                    width: windowWidth <= 360 ? '100%' : 'auto'
                  }}
                >
                  Avbryt
                </button>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '16px' }}>
              <h1 
                style={{
                  fontSize: windowWidth <= 768 ? '24px' : '32px',
                  fontWeight: '700',
                  color: '#111827',
                  margin: '0 0 8px 0',
                  cursor: !isCompleted ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  lineHeight: '1.2',
                  wordBreak: 'break-word'
                }}
                onClick={() => !isCompleted && setEditingName(true)}
                title={!isCompleted ? 'Klicka för att redigera namn' : ''}
              >
                {inspection.name || inspection.templateName || 'Namnlös kontroll'}
                {!isCompleted && (
                  <span style={{ fontSize: '16px', opacity: '0.5' }}>✏️</span>
                )}
              </h1>
              
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '500',
                background: isCompleted ? '#dcfce7' : '#fef3c7',
                color: isCompleted ? '#166534' : '#92400e'
              }}>
                {isCompleted ? 'Slutförd' : 'Pågående'}
              </div>
            </div>
          )}

          {/* Action Buttons - Mobile Responsive */}
          <div className="button-group" style={{ 
            display: 'flex', 
            gap: windowWidth <= 480 ? '6px' : '8px',
            flexWrap: 'wrap',
            alignItems: 'center',
            flexDirection: windowWidth <= 360 ? 'column' : 'row',
            width: windowWidth <= 360 ? '100%' : 'auto'
          }}>
            <button
              onClick={generatePDF}
              disabled={generatingPdf}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: windowWidth <= 360 ? '12px' : windowWidth <= 480 ? '8px 10px' : '12px 20px',
                background: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: windowWidth <= 480 ? '12px' : '14px',
                fontWeight: '500',
                cursor: generatingPdf ? 'not-allowed' : 'pointer',
                minWidth: 'fit-content',
                whiteSpace: 'nowrap',
                width: windowWidth <= 360 ? '100%' : 'auto',
                justifyContent: 'center',
                minHeight: '44px'
              }}
            >
              {generatingPdf ? 'Skapar...' : windowWidth <= 480 ? 'PDF' : 'Generera PDF'}
            </button>

            {!editMode && !isCompleted && (
              <button
                onClick={() => setEditMode(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: windowWidth <= 360 ? '12px' : windowWidth <= 480 ? '8px 10px' : '12px 20px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: windowWidth <= 480 ? '12px' : '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minWidth: 'fit-content',
                  whiteSpace: 'nowrap',
                  width: windowWidth <= 360 ? '100%' : 'auto',
                  justifyContent: 'center',
                  minHeight: '44px'
                }}
              >
                {windowWidth <= 480 ? 'Redigera' : 'Redigera kontroll'}
              </button>
            )}

            {editMode && (
              <button
                onClick={() => setEditMode(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: windowWidth <= 360 ? '12px' : windowWidth <= 480 ? '8px 10px' : '12px 20px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: windowWidth <= 480 ? '12px' : '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minWidth: 'fit-content',
                  whiteSpace: 'nowrap',
                  width: windowWidth <= 360 ? '100%' : 'auto',
                  justifyContent: 'center',
                  minHeight: '44px'
                }}
              >
                {windowWidth <= 480 ? 'Visa' : 'Visa läge'}
              </button>
            )}

            {!isCompleted ? (
              <button
                onClick={handleMarkComplete}
                disabled={updating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: windowWidth <= 360 ? '12px' : windowWidth <= 480 ? '8px 10px' : '12px 20px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: windowWidth <= 480 ? '12px' : '14px',
                  fontWeight: '500',
                  cursor: updating ? 'not-allowed' : 'pointer',
                  minWidth: 'fit-content',
                  whiteSpace: 'nowrap',
                  width: windowWidth <= 360 ? '100%' : 'auto',
                  justifyContent: 'center',
                  minHeight: '44px'
                }}
              >
                {updating ? 'Slutför...' : windowWidth <= 360 ? 'Slutför' : windowWidth <= 480 ? 'Slutför' : 'Markera slutförd'}
              </button>
            ) : (
              <button
                onClick={handleReopen}
                disabled={updating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: windowWidth <= 360 ? '12px' : windowWidth <= 480 ? '8px 10px' : '12px 20px',
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: windowWidth <= 480 ? '12px' : '14px',
                  fontWeight: '500',
                  cursor: updating ? 'not-allowed' : 'pointer',
                  minWidth: 'fit-content',
                  whiteSpace: 'nowrap',
                  width: windowWidth <= 360 ? '100%' : 'auto',
                  justifyContent: 'center',
                  minHeight: '44px'
                }}
              >
                {updating ? 'Återöppnar...' : 'Återöppna'}
              </button>
            )}

            <button
              onClick={handleDelete}
              disabled={updating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: windowWidth <= 360 ? '12px' : windowWidth <= 480 ? '8px 10px' : '12px 20px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: windowWidth <= 480 ? '12px' : '14px',
                fontWeight: '500',
                cursor: updating ? 'not-allowed' : 'pointer',
                minWidth: 'fit-content',
                whiteSpace: 'nowrap',
                width: windowWidth <= 360 ? '100%' : 'auto',
                justifyContent: 'center',
                minHeight: '44px'
              }}
            >
              Ta bort
            </button>
          </div>
        </div>

        {/* Info Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: windowWidth <= 768 ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '12px',
          padding: '16px',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <div>
            <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Kund</span>
            <p style={{ 
              fontSize: windowWidth <= 480 ? '14px' : '16px', 
              fontWeight: '600', 
              color: '#111827', 
              margin: '4px 0 0',
              wordBreak: 'break-word'
            }}>
              {customer?.name || 'Okänd kund'}
            </p>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Adress</span>
            <p style={{ 
              fontSize: windowWidth <= 480 ? '14px' : '16px', 
              fontWeight: '600', 
              color: '#111827', 
              margin: '4px 0 0',
              wordBreak: 'break-word'
            }}>
              {address?.street || 'Okänd adress'}
            </p>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Installation</span>
            <p style={{ 
              fontSize: windowWidth <= 480 ? '14px' : '16px', 
              fontWeight: '600', 
              color: '#111827', 
              margin: '4px 0 0',
              wordBreak: 'break-word'
            }}>
              {installation?.name || 'Okänd installation'}
            </p>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Skapad</span>
            <p style={{ 
              fontSize: windowWidth <= 480 ? '14px' : '16px', 
              fontWeight: '600', 
              color: '#111827', 
              margin: '4px 0 0'
            }}>
              {inspection.createdAt?.seconds ? 
                new Date(inspection.createdAt.seconds * 1000).toLocaleDateString('sv-SE') : 
                'Okänt datum'
              }
            </p>
          </div>
        </div>
      </div>

{/* Sections */}
      {inspection.sections && inspection.sections.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {inspection.sections.map((section, sectionIndex) => (
            <div 
              key={sectionIndex}
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: windowWidth <= 480 ? '20px' : '32px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e2e8f0',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box'
              }}
            >
              {/* Sektion rubrik med redigeringsmöjlighet */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: windowWidth <= 768 ? 'flex-start' : 'center',
                flexDirection: windowWidth <= 768 ? 'column' : 'row',
                gap: windowWidth <= 768 ? '16px' : '0',
                marginBottom: '24px',
                paddingBottom: '12px',
                borderBottom: '2px solid #e2e8f0'
              }}>
                {editingSection === sectionIndex ? (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: windowWidth <= 480 ? '8px' : '12px', 
                    flex: 1,
                    flexDirection: windowWidth <= 480 ? 'column' : 'row',
                    width: '100%'
                  }}>
                    <input
                      type="text"
                      value={section.name || section.title}
                      onChange={(e) => {
                        const updatedInspection = { ...inspection };
                        updatedInspection.sections[sectionIndex].name = e.target.value;
                        setInspection(updatedInspection);
                      }}
                      style={{
                        fontSize: windowWidth <= 480 ? '20px' : '24px',
                        fontWeight: '600',
                        border: '2px solid #3b82f6',
                        borderRadius: '8px',
                        padding: windowWidth <= 480 ? '10px' : '8px 12px',
                        flex: 1,
                        outline: 'none',
                        width: windowWidth <= 480 ? '100%' : 'auto',
                        boxSizing: 'border-box'
                      }}
                      autoFocus
                    />
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      width: windowWidth <= 480 ? '100%' : 'auto'
                    }}>
                      <button
                        onClick={() => {
                          handleEditSectionName(sectionIndex, section.name);
                        }}
                        style={{
                          padding: windowWidth <= 480 ? '12px 16px' : '8px 16px',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          flex: windowWidth <= 480 ? '1' : 'none',
                          minHeight: '44px'
                        }}
                      >
                        Spara
                      </button>
                      <button
                        onClick={() => setEditingSection(null)}
                        style={{
                          padding: windowWidth <= 480 ? '12px 16px' : '8px 16px',
                          background: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          flex: windowWidth <= 480 ? '1' : 'none',
                          minHeight: '44px'
                        }}
                      >
                        Avbryt
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 
                      style={{
                        fontSize: windowWidth <= 480 ? '20px' : '24px',
                        fontWeight: '600',
                        color: '#111827',
                        margin: '0',
                        cursor: editMode ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        wordBreak: 'break-word',
                        flex: 1
                      }}
                      onClick={() => editMode && setEditingSection(sectionIndex)}
                      title={editMode ? 'Klicka för att redigera sektionsnamn' : ''}
                    >
                      {section.name}
                      {editMode && (
                        <span style={{ fontSize: '16px', opacity: '0.5' }}>✏️</span>
                      )}
                    </h2>
                    
                    {editMode && (
                      <div style={{ 
                        display: 'flex', 
                        gap: windowWidth <= 480 ? '4px' : '8px',
                        flexWrap: 'wrap',
                        justifyContent: windowWidth <= 480 ? 'center' : 'flex-end',
                        width: windowWidth <= 768 ? '100%' : 'auto'
                      }}>
                        <button
                          onClick={() => setActiveSectionForNewItem(
                            activeSectionForNewItem === sectionIndex ? null : sectionIndex
                          )}
                          style={{
                            padding: windowWidth <= 480 ? '6px 8px' : '6px 12px',
                            background: activeSectionForNewItem === sectionIndex ? '#10b981' : '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: windowWidth <= 480 ? '11px' : '12px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            minHeight: '36px'
                          }}
                        >
                          {activeSectionForNewItem === sectionIndex ? 'Avbryt' : windowWidth <= 480 ? '+ Fråga' : 'Lägg till fråga'}
                        </button>
                        
                        <button
                          onClick={() => removeSection(sectionIndex)}
                          style={{
                            padding: windowWidth <= 480 ? '6px 8px' : '6px 12px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: windowWidth <= 480 ? '11px' : '12px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            minHeight: '36px'
                          }}
                        >
                          {windowWidth <= 480 ? 'Ta bort' : 'Ta bort sektion'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {/* Formulär för att lägga till ny fråga i denna sektion */}
              {activeSectionForNewItem === sectionIndex && (
                <div style={{
                  background: '#f0f9ff',
                  border: '2px solid #0ea5e9',
                  borderRadius: '12px',
                  padding: windowWidth <= 480 ? '16px' : '20px',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ 
                    margin: '0 0 16px 0', 
                    color: '#0369a1',
                    fontSize: windowWidth <= 480 ? '16px' : '18px'
                  }}>
                    {windowWidth <= 480 ? 'Ny fråga' : `Lägg till ny fråga i "${section.name}"`}
                  </h4>
                  
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: windowWidth <= 480 ? '10px' : '12px' 
                  }}>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '4px', 
                        fontWeight: '500',
                        fontSize: windowWidth <= 480 ? '13px' : '14px'
                      }}>
                        Frågetext:
                      </label>
                      <input
                        type="text"
                        value={newItemLabel}
                        onChange={(e) => setNewItemLabel(e.target.value)}
                        placeholder="Ange din fråga här..."
                        style={{
                          width: '100%',
                          padding: windowWidth <= 480 ? '12px' : '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: windowWidth <= 480 ? '16px' : '14px',
                          boxSizing: 'border-box',
                          minHeight: '44px'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '4px', 
                        fontWeight: '500',
                        fontSize: windowWidth <= 480 ? '13px' : '14px'
                      }}>
                        Frågetyp:
                      </label>
                      <select
                        value={newItemType}
                        onChange={(e) => setNewItemType(e.target.value)}
                        style={{
                          width: '100%',
                          padding: windowWidth <= 480 ? '12px' : '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: windowWidth <= 480 ? '16px' : '14px',
                          boxSizing: 'border-box',
                          minHeight: '44px'
                        }}
                      >
                        <option value="yesno">Ja/Nej fråga</option>
                        <option value="checkbox">Kryssruta</option>
                        <option value="text">Textfält</option>
                      </select>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      gap: windowWidth <= 480 ? '6px' : '8px',
                      justifyContent: 'flex-end',
                      flexDirection: windowWidth <= 360 ? 'column-reverse' : 'row'
                    }}>
                      <button
                        onClick={() => setActiveSectionForNewItem(null)}
                        style={{
                          padding: windowWidth <= 480 ? '12px' : '8px 16px',
                          background: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: windowWidth <= 480 ? '13px' : '14px',
                          cursor: 'pointer',
                          width: windowWidth <= 360 ? '100%' : 'auto',
                          minHeight: '44px'
                        }}
                      >
                        Avbryt
                      </button>
                      <button
                        onClick={() => addNewItem(sectionIndex)}
                        style={{
                          padding: windowWidth <= 480 ? '12px' : '8px 16px',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: windowWidth <= 480 ? '13px' : '14px',
                          cursor: 'pointer',
                          width: windowWidth <= 360 ? '100%' : 'auto',
                          minHeight: '44px'
                        }}
                      >
                        Lägg till fråga
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Items i sektionen */}
              {section.items && section.items.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {section.items.map((item, itemIndex) => {
                    const uploadKey = `${sectionIndex}-${itemIndex}`;
                    const isUploading = uploadingImages[uploadKey];
                    
                    return (
                      <div 
                        key={itemIndex}
                        style={{
                          padding: windowWidth <= 480 ? '20px' : '24px',
                          background: '#f8fafc',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          position: 'relative'
                        }}
                      >
                        {/* Edit/Delete buttons for items */}
                        {editMode && (
                          <div style={{
                            position: 'absolute',
                            top: windowWidth <= 480 ? '8px' : '12px',
                            right: windowWidth <= 480 ? '8px' : '12px',
                            display: 'flex',
                            gap: '8px'
                          }}>
                            <button
                              onClick={() => removeItem(sectionIndex, itemIndex)}
                              style={{
                                padding: windowWidth <= 480 ? '6px 8px' : '4px 8px',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: windowWidth <= 480 ? '10px' : '12px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                minHeight: '32px',
                                minWidth: '32px'
                              }}
                              title="Ta bort fråga"
                            >
                              {windowWidth <= 480 ? '×' : 'Ta bort'}
                            </button>
                          </div>
                        )}

                        {/* Question Label */}
                        <div style={{
                          fontSize: windowWidth <= 480 ? '16px' : '18px',
                          fontWeight: '600',
                          color: '#111827',
                          marginBottom: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          paddingRight: editMode ? (windowWidth <= 480 ? '50px' : '80px') : '0'
                        }}>
                          {editMode ? (
                            <input
                              type="text"
                              value={item.label}
                              onChange={(e) => {
                                const updatedInspection = { ...inspection };
                                updatedInspection.sections[sectionIndex].items[itemIndex].label = e.target.value;
                                setInspection(updatedInspection);
                              }}
                              onBlur={() => saveInspection()}
                              style={{
                                fontSize: windowWidth <= 480 ? '16px' : '18px',
                                fontWeight: '600',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                padding: windowWidth <= 480 ? '8px' : '4px 8px',
                                background: 'white',
                                flex: 1,
                                boxSizing: 'border-box',
                                minHeight: '44px'
                              }}
                            />
                          ) : (
                            item.label
                          )}
                          {item.required && (
                            <span style={{ color: '#ef4444', fontSize: '16px' }}>*</span>
                          )}
                        </div>

                        {/* Answer Input/Display */}
                        <div style={{ marginBottom: '16px' }}>
                          {item.type === 'yesno' && (
                            <div style={{ 
                              display: 'flex', 
                              gap: windowWidth <= 480 ? '8px' : '12px', 
                              flexWrap: 'wrap' 
                            }}>
                              {editMode ? (
                                <>
                                  <button
                                    onClick={() => handleItemChange(sectionIndex, itemIndex, 'value', true)}
                                    style={{
                                      padding: windowWidth <= 480 ? '12px 20px' : '12px 24px',
                                      border: '2px solid',
                                      borderColor: item.value === true ? '#10b981' : '#e2e8f0',
                                      background: item.value === true ? '#10b981' : 'white',
                                      color: item.value === true ? 'white' : '#374151',
                                      borderRadius: '8px',
                                      fontSize: windowWidth <= 480 ? '13px' : '14px',
                                      fontWeight: '500',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      transition: 'all 0.2s ease',
                                      minHeight: '44px',
                                      minWidth: windowWidth <= 480 ? '80px' : '100px'
                                    }}
                                  >
                                    Ja
                                  </button>
                                  <button
                                    onClick={() => handleItemChange(sectionIndex, itemIndex, 'value', false)}
                                    style={{
                                      padding: windowWidth <= 480 ? '12px 20px' : '12px 24px',
                                      border: '2px solid',
                                      borderColor: item.value === false ? '#ef4444' : '#e2e8f0',
                                      background: item.value === false ? '#ef4444' : 'white',
                                      color: item.value === false ? 'white' : '#374151',
                                      borderRadius: '8px',
                                      fontSize: windowWidth <= 480 ? '13px' : '14px',
                                      fontWeight: '500',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      transition: 'all 0.2s ease',
                                      minHeight: '44px',
                                      minWidth: windowWidth <= 480 ? '80px' : '100px'
                                    }}
                                  >
                                    Nej
                                  </button>
                                </>
                              ) : (
                                <div style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: windowWidth <= 480 ? '10px 16px' : '12px 20px',
                                  borderRadius: '8px',
                                  fontSize: windowWidth <= 480 ? '14px' : '16px',
                                  fontWeight: '600',
                                  background: item.value === true ? '#dcfce7' : 
                                           item.value === false ? '#fee2e2' : '#f3f4f6',
                                  color: item.value === true ? '#166534' : 
                                         item.value === false ? '#dc2626' : '#6b7280'
                                }}>
                                  {item.value === true ? 'Ja' : 
                                   item.value === false ? 'Nej' : 
                                   'Ej besvarad'}
                                </div>
                              )}
                            </div>
                          )}

                          {item.type === 'checkbox' && (
                            <div>
                              {editMode ? (
                                <label style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  cursor: 'pointer',
                                  fontSize: windowWidth <= 480 ? '14px' : '16px',
                                  fontWeight: '500',
                                  padding: windowWidth <= 480 ? '10px' : '12px',
                                  background: 'white',
                                  borderRadius: '8px',
                                  border: '2px solid #e2e8f0',
                                  transition: 'all 0.2s ease',
                                  minHeight: '44px'
                                }}>
                                  <input
                                    type="checkbox"
                                    checked={item.value || false}
                                    onChange={(e) => handleItemChange(sectionIndex, itemIndex, 'value', e.target.checked)}
                                    style={{
                                      width: '20px',
                                      height: '20px',
                                      cursor: 'pointer',
                                      accentColor: '#3b82f6'
                                    }}
                                  />
                                  {item.value ? 'Markerad' : 'Ej markerad'}
                                </label>
                              ) : (
                                <div style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: windowWidth <= 480 ? '10px 16px' : '12px 20px',
                                  borderRadius: '8px',
                                  fontSize: windowWidth <= 480 ? '14px' : '16px',
                                  fontWeight: '600',
                                  background: item.value ? '#dcfce7' : '#f3f4f6',
                                  color: item.value ? '#166534' : '#6b7280'
                                }}>
                                  {item.value ? 'Markerad' : 'Ej markerad'}
                                </div>
                              )}
                            </div>
                          )}

                          {item.type === 'text' && (
                            <div>
                              {editMode ? (
                                <textarea
                                  value={item.value || ''}
                                  onChange={(e) => handleItemChange(sectionIndex, itemIndex, 'value', e.target.value)}
                                  placeholder="Skriv ditt svar här..."
                                  style={{
                                    width: '100%',
                                    minHeight: windowWidth <= 480 ? '80px' : '100px',
                                    padding: windowWidth <= 480 ? '12px' : '16px',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: windowWidth <= 480 ? '16px' : '14px',
                                    fontFamily: 'inherit',
                                    outline: 'none',
                                    resize: 'vertical',
                                    transition: 'border-color 0.2s ease',
                                    boxSizing: 'border-box'
                                  }}
                                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                />
                              ) : (
                                <div style={{
                                  padding: windowWidth <= 480 ? '12px 16px' : '16px 20px',
                                  background: item.value ? 'white' : '#f3f4f6',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '8px',
                                  fontSize: windowWidth <= 480 ? '13px' : '14px',
                                  color: item.value ? '#111827' : '#6b7280',
                                  fontStyle: item.value ? 'normal' : 'italic',
                                  minHeight: '60px',
                                  whiteSpace: 'pre-wrap'
                                }}>
                                  {item.value || 'Inget svar angivet'}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Notes Section */}
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{
                            display: 'block',
                            fontSize: windowWidth <= 480 ? '13px' : '14px',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '8px'
                          }}>
                            Anteckningar (valfritt)
                          </label>
                          {editMode ? (
                            <textarea
                              value={item.notes || ''}
                              onChange={(e) => handleItemChange(sectionIndex, itemIndex, 'notes', e.target.value)}
                              placeholder="Lägg till anteckningar..."
                              style={{
                                width: '100%',
                                minHeight: windowWidth <= 480 ? '60px' : '80px',
                                padding: windowWidth <= 480 ? '10px' : '12px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: windowWidth <= 480 ? '16px' : '14px',
                                fontFamily: 'inherit',
                                outline: 'none',
                                resize: 'vertical',
                                transition: 'border-color 0.2s ease',
                                boxSizing: 'border-box'
                              }}
                              onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            />
                          ) : (
                            item.notes && (
                              <div style={{
                                padding: windowWidth <= 480 ? '10px 12px' : '12px 16px',
                                background: '#fef7cd',
                                border: '1px solid #fed7aa',
                                borderRadius: '8px',
                                fontSize: windowWidth <= 480 ? '13px' : '14px',
                                color: '#92400e',
                                marginTop: '8px'
                              }}>
                                <strong>Anteckning:</strong> {item.notes}
                              </div>
                            )
                          )}
                        </div>

                        {/* Images Section */}
                        <div>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '12px',
                            flexDirection: windowWidth <= 480 ? 'column' : 'row',
                            gap: windowWidth <= 480 ? '12px' : '0'
                          }}>
                            <label style={{
                              fontSize: windowWidth <= 480 ? '13px' : '14px',
                              fontWeight: '500',
                              color: '#374151',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              Bilder 
                              {item.images && item.images.length > 0 && (
                                <span style={{
                                  background: '#3b82f6',
                                  color: 'white',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: windowWidth <= 480 ? '11px' : '12px',
                                  fontWeight: '600'
                                }}>
                                  {item.images.length}
                                </span>
                              )}
                            </label>
                            
                            {editMode && (
                              <div style={{ position: 'relative' }}>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                      handleImageUpload(sectionIndex, itemIndex, file);
                                      e.target.value = '';
                                    }
                                  }}
                                  style={{ display: 'none' }}
                                  id={`file-input-${sectionIndex}-${itemIndex}`}
                                />
                                <label
                                  htmlFor={`file-input-${sectionIndex}-${itemIndex}`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: windowWidth <= 480 ? '4px' : '8px',
                                    padding: windowWidth <= 480 ? '8px 12px' : '8px 16px',
                                    background: isUploading ? '#6b7280' : '#3b82f6',
                                    color: 'white',
                                    borderRadius: '6px',
                                    fontSize: windowWidth <= 480 ? '12px' : '14px',
                                    fontWeight: '500',
                                    cursor: isUploading ? 'not-allowed' : 'pointer',
                                    opacity: isUploading ? 0.7 : 1,
                                    transition: 'all 0.2s ease',
                                    whiteSpace: 'nowrap',
                                    minHeight: '36px'
                                  }}
                                >
                                  {isUploading ? 'Laddar...' : windowWidth <= 480 ? '+ Bild' : 'Lägg till bild'}
                                </label>
                              </div>
                            )}
                          </div>

                          {/* Image Gallery */}
                          {item.images && item.images.length > 0 && (
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: windowWidth <= 480 ? 'repeat(auto-fill, minmax(140px, 1fr))' : 'repeat(auto-fill, minmax(180px, 1fr))',
                              gap: windowWidth <= 480 ? '12px' : '16px',
                              marginTop: '12px',
                              width: '100%',
                              maxWidth: '100%',
                              overflow: 'hidden'
                            }}>
                              {item.images.map((image, imageIndex) => (
                                <div
                                  key={image.uniqueId || imageIndex}
                                  style={{
                                    position: 'relative',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    border: '1px solid #e2e8f0',
                                    background: 'white',
                                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.02)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                                  }}
                                >
                                  <img
                                    src={image.url}
                                    alt={`Bild ${imageIndex + 1}`}
                                    style={{
                                      width: '100%',
                                      height: windowWidth <= 480 ? '140px' : '180px',
                                      objectFit: 'cover',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => setActiveImageModal({
                                      image,
                                      sectionIndex,
                                      itemIndex,
                                      imageIndex
                                    })}
                                  />
                                  
                                  {editMode && (
                                    <button
                                      onClick={() => handleDeleteImage(sectionIndex, itemIndex, imageIndex)}
                                      style={{
                                        position: 'absolute',
                                        top: '8px',
                                        right: '8px',
                                        width: windowWidth <= 480 ? '28px' : '32px',
                                        height: windowWidth <= 480 ? '28px' : '32px',
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '50%',
                                        fontSize: windowWidth <= 480 ? '16px' : '18px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                                        transition: 'all 0.2s ease'
                                      }}
                                      title="Ta bort bild"
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#dc2626';
                                        e.currentTarget.style.transform = 'scale(1.1)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#ef4444';
                                        e.currentTarget.style.transform = 'scale(1)';
                                      }}
                                    >
                                      ×
                                    </button>
                                  )}
                                  
                                  <div style={{
                                    position: 'absolute',
                                    bottom: '0',
                                    left: '0',
                                    right: '0',
                                    background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.8))',
                                    color: 'white',
                                    padding: windowWidth <= 480 ? '8px 6px 6px' : '12px 8px 8px',
                                    fontSize: windowWidth <= 480 ? '10px' : '12px',
                                    fontWeight: '500',
                                    textAlign: 'center'
                                  }}>
                                    {image.name.length > (windowWidth <= 480 ? 15 : 20) ? 
                                      `${image.name.substring(0, windowWidth <= 480 ? 12 : 17)}...` : 
                                      image.name
                                    }
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* No images message */}
                          {(!item.images || item.images.length === 0) && !editMode && (
                            <div style={{
                              textAlign: 'center',
                              padding: windowWidth <= 480 ? '20px' : '24px',
                              color: '#9ca3af',
                              fontSize: windowWidth <= 480 ? '13px' : '14px',
                              fontStyle: 'italic'
                            }}>
                              Inga bilder tillagda
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: windowWidth <= 480 ? '30px' : '40px',
                  color: '#6b7280',
                  fontSize: windowWidth <= 480 ? '14px' : '16px'
                }}>
                  {editMode ? 'Inga frågor finns än. Klicka på "Lägg till fråga" för att börja.' : 'Inga frågor finns i denna sektion'}
                </div>
              )}
            </div>
          ))}
          
          {/* Lägg till ny sektion knapp */}
          {editMode && (
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: windowWidth <= 480 ? '20px' : '32px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              border: '2px dashed #d1d5db',
              textAlign: 'center'
            }}>
              {showAddSectionForm ? (
                <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                  <h3 style={{ 
                    margin: '0 0 16px 0', 
                    color: '#374151',
                    fontSize: windowWidth <= 480 ? '18px' : '20px'
                  }}>
                    Lägg till ny sektion
                  </h3>
                  
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: windowWidth <= 480 ? '10px' : '12px' 
                  }}>
                    <input
                      type="text"
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      placeholder="Ange sektionsnamn..."
                      style={{
                        width: '100%',
                        padding: windowWidth <= 480 ? '12px' : '12px',
                        border: '2px solid #3b82f6',
                        borderRadius: '8px',
                        fontSize: windowWidth <= 480 ? '16px' : '16px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        minHeight: '44px'
                      }}
                      autoFocus
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addNewSection();
                        }
                      }}
                    />
                    
                    <div style={{ 
                      display: 'flex', 
                      gap: windowWidth <= 480 ? '6px' : '8px',
                      justifyContent: 'center',
                      flexDirection: windowWidth <= 360 ? 'column-reverse' : 'row'
                    }}>
                      <button
                        onClick={() => {
                          setShowAddSectionForm(false);
                          setNewSectionName('');
                        }}
                        style={{
                          padding: windowWidth <= 480 ? '12px 16px' : '10px 20px',
                          background: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: windowWidth <= 480 ? '13px' : '14px',
                          cursor: 'pointer',
                          width: windowWidth <= 360 ? '100%' : 'auto',
                          minHeight: '44px'
                        }}
                      >
                        Avbryt
                      </button>
                      <button
                        onClick={addNewSection}
                        disabled={!newSectionName.trim()}
                        style={{
                          padding: windowWidth <= 480 ? '12px 16px' : '10px 20px',
                          background: newSectionName.trim() ? '#10b981' : '#9ca3af',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: windowWidth <= 480 ? '13px' : '14px',
                          cursor: newSectionName.trim() ? 'pointer' : 'not-allowed',
                          width: windowWidth <= 360 ? '100%' : 'auto',
                          minHeight: '44px'
                        }}
                      >
                        Skapa sektion
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddSectionForm(true)}
                  style={{
                    padding: windowWidth <= 480 ? '14px 20px' : '16px 32px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: windowWidth <= 480 ? '14px' : '16px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: '0 auto',
                    minHeight: '44px'
                  }}
                >
                  <span style={{ fontSize: windowWidth <= 480 ? '16px' : '20px' }}>+</span>
                  {windowWidth <= 480 ? 'Ny sektion' : 'Lägg till ny sektion'}
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        // Tom sektion vy
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: windowWidth <= 480 ? '32px 20px' : '48px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box'
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
            <span style={{ fontSize: '24px', color: '#9ca3af' }}>📋</span>
          </div>
          <h3 style={{
            fontSize: windowWidth <= 480 ? '18px' : '20px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '8px'
          }}>
            Inga sektioner hittades
          </h3>
          <p style={{ 
            color: '#6b7280', 
            fontSize: windowWidth <= 480 ? '14px' : '16px', 
            marginBottom: '24px',
            lineHeight: '1.5'
          }}>
            {editMode ? 'Börja genom att skapa en ny sektion med frågor.' : 'Denna kontroll innehåller inga sektioner än.'}
          </p>
          
          {editMode && (
            <button
              onClick={() => setShowAddSectionForm(true)}
              style={{
                padding: windowWidth <= 480 ? '12px 20px' : '12px 24px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: windowWidth <= 480 ? '14px' : '16px',
                fontWeight: '500',
                cursor: 'pointer',
                minHeight: '44px'
              }}
            >
              Skapa första sektionen
            </button>
          )}
        </div>
      )}

      {/* Image Modal */}
      {activeImageModal && (
        <ImageModal
          image={activeImageModal.image}
          onClose={() => setActiveImageModal(null)}
          onDelete={editMode ? () => {
            handleDeleteImage(
              activeImageModal.sectionIndex,
              activeImageModal.itemIndex,
              activeImageModal.imageIndex
            );
          } : null}
        />
      )}
    </div>
  );
};

export default InspectionDetail;