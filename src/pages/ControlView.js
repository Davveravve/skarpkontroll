// src/pages/ControlView.js - Clean version utan dupliceringar
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { supabase } from '../services/supabase';
import ControlImageUploader from '../components/ControlImageUploader';
import ImageModal from '../components/ImageModal';
// NotificationSystem removed with offline functionality
import { generateControlPDF } from '../utils/controlPdfGenerator';
import { useAuth } from '../contexts/AuthContext';
// Offline functionality removed

const ControlView = () => {
  const { currentUser, userProfile } = useAuth();
  const { controlId } = useParams();

  // State
  const [control, setControl] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [currentNode, setCurrentNode] = useState(null);
  const [remarks, setRemarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Form states
  const [showAddNode, setShowAddNode] = useState(false);
  const [showAddRemark, setShowAddRemark] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [editingNodeName, setEditingNodeName] = useState('');
  const [newNodeName, setNewNodeName] = useState('');
  const [newRemarkText, setNewRemarkText] = useState('');
  const [newRemarkPriority, setNewRemarkPriority] = useState('');
  const [addAsChild, setAddAsChild] = useState(false);
  
  // Edit remark states
  const [editingRemarkId, setEditingRemarkId] = useState(null);
  const [editingRemarkText, setEditingRemarkText] = useState('');
  const [editingRemarkPriority, setEditingRemarkPriority] = useState('');
  const [editingRemarkImages, setEditingRemarkImages] = useState([]);
  const [editingControlName, setEditingControlName] = useState(false);
  const [newControlName, setNewControlName] = useState('');
  const [remarkImages, setRemarkImages] = useState([]);
  const [modalImage, setModalImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [allModalImages, setAllModalImages] = useState([]);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  // Offline functionality completely removed

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Network status tracking removed

  // Load initial data
  useEffect(() => {
    const fetchControlData = async () => {
      if (!currentUser || !controlId) {
        console.error('❌ ControlView: Missing currentUser or controlId');
        console.error('currentUser:', !!currentUser);
        console.error('controlId:', controlId);
        setError('Saknar behörighet eller kontroll-ID');
        setLoading(false);
        return;
      }

      console.log('🔍 ControlView: Loading control data');
      console.log('Control ID:', controlId);
      console.log('User ID:', currentUser.uid);

      try {
        // Hämta kontroll
        console.log('📋 Fetching control document...');
        const controlDoc = await getDoc(doc(db, 'controls', controlId));
        
        console.log('Control document exists:', controlDoc.exists());
        
        if (!controlDoc.exists()) {
          console.error('❌ Control document not found');
          setError('Kontrollen kunde inte hittas');
          setLoading(false);
          return;
        }

        const controlData = { id: controlDoc.id, ...controlDoc.data() };
        console.log('📋 Control data:', controlData);
        
        // Kontrollera ägarskap
        if (controlData.userId !== currentUser.uid) {
          console.error('❌ User does not own this control');
          console.error('Control userId:', controlData.userId);
          console.error('Current user uid:', currentUser.uid);
          setError('Du har inte behörighet att se denna kontroll');
          setLoading(false);
          return;
        }
        
        setControl(controlData);
        console.log('Control loaded successfully');

        // Hämta alla noder för denna kontroll
        console.log('Fetching nodes...');
        const nodesQuery = query(
          collection(db, 'nodes'),
          where('controlId', '==', controlId),
          orderBy('createdAt', 'asc')
        );
        
        const nodesSnapshot = await getDocs(nodesQuery);
        const nodesData = nodesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('📁 Found', nodesData.length, 'nodes');
        console.log('Nodes data:', nodesData);
        
        setNodes(nodesData);

        // Om det finns noder, sätt första som current, annars visa "skapa första nod"
        if (nodesData.length > 0) {
          // Hitta root node (ingen parent) eller första noden
          const rootNode = nodesData.find(node => !node.parentNodeId) || nodesData[0];
          console.log('🌳 Setting root node:', rootNode.name);
          setCurrentNode(rootNode);
          await loadRemarksForNode(rootNode.id);
        } else {
          console.log('No nodes found - will show create first node');
        }

      } catch (err) {
        console.error('❌ ControlView: Error fetching control data:', err);
        console.error('Error message:', err.message);
        console.error('Error code:', err.code);
        setError(`Kunde inte ladda kontrolldata: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchControlData();
  }, [controlId, currentUser]);

  const loadRemarksForNode = async (nodeId) => {
    console.log('Loading remarks for EXACT node:', nodeId);
    try {
      // Temporary: Använd enkel query utan orderBy tills index skapats
      const remarksQuery = query(
        collection(db, 'remarks'),
        where('nodeId', '==', nodeId)
      );
      
      const remarksSnapshot = await getDocs(remarksQuery);
      const remarksData = remarksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sortera lokalt i JavaScript istället
      remarksData.sort((a, b) => {
        const aTime = a.createdAt?.seconds || a.createdAt?.getTime?.() || 0;
        const bTime = b.createdAt?.seconds || b.createdAt?.getTime?.() || 0;
        return bTime - aTime; // Nyaste först
      });
      
      console.log('Found', remarksData.length, 'remarks for THIS node only');
      console.log('Remarks data:', remarksData);
      setRemarks(remarksData);
    } catch (err) {
      console.error('❌ Error loading remarks:', err);
      setRemarks([]);
    }
  };

  // Ny funktion för att hämta ALLA anmärkningar för PDF genom att gå igenom alla noder
  const loadAllRemarksForControl = async (controlNodes) => {
    console.log('Loading ALL remarks for all nodes in control');
    
    try {
      // Skapa en array av alla node-ID:n
      const nodeIds = controlNodes.map(node => node.id);
      
      // Hämta anmärkningar för alla noder parallellt
      const remarkPromises = nodeIds.map(async (nodeId) => {
        const remarksQuery = query(
          collection(db, 'remarks'),
          where('nodeId', '==', nodeId)
        );
        
        const remarksSnapshot = await getDocs(remarksQuery);
        return remarksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      });
      
      const remarksArrays = await Promise.all(remarkPromises);
      const flatRemarks = remarksArrays.flat();
      
      console.log('Found', flatRemarks.length, 'total remarks for ALL nodes');
      return flatRemarks;
    } catch (err) {
      console.error('❌ Error loading all remarks:', err);
      return [];
    }
  };

  // Ny funktion för att hämta kontrollpunkter för PDF
  const loadKontrollpunkter = async () => {
    try {
      console.log('Loading kontrollpunkter for PDF');
      const q = query(
        collection(db, 'kontrollpunkter'),
        where('userId', '==', currentUser.uid)
      );
      
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sortera lokalt efter order
      items.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      console.log('Found', items.length, 'kontrollpunkter');
      return items;
    } catch (error) {
      console.error('Error loading kontrollpunkter:', error);
      return [];
    }
  };

  // Ny funktion för att hämta instruktionstext för PDF
  const loadInstructionText = async () => {
    try {
      console.log('Loading instruction text for PDF');
      const q = query(
        collection(db, 'settings'),
        where('userId', '==', currentUser.uid),
        where('type', '==', 'kontrollpunkter_instruction')
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const text = doc.data().text || '';
        console.log('Found instruction text:', text);
        return text;
      }
      
      console.log('No instruction text found');
      return '';
    } catch (error) {
      console.error('Error loading instruction text:', error);
      return '';
    }
  };

  const handleAddNode = async (e, createAsChild = false) => {
    e.preventDefault();
    if (!newNodeName.trim()) return;

    setSaving(true);
    
    const nodeData = {
      name: newNodeName.trim(),
      controlId,
      parentNodeId: createAsChild && currentNode ? currentNode.id : null,
      level: createAsChild && currentNode ? currentNode.level + 1 : 0,
      hasRemarks: false,
      userId: currentUser.uid
    };
    
    try {
      // Always try online operations (offline mode removed)
        // Try online save first
        const newNode = {
          ...nodeData,
          createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'nodes'), newNode);
        const createdNode = { id: docRef.id, ...newNode, createdAt: new Date() };
        
        setNodes(prev => [...prev, createdNode]);
        
        // Update control with rootNodeId if this is first node
        if (!currentNode && !control.rootNodeId) {
          await updateDoc(doc(db, 'controls', controlId), {
            rootNodeId: docRef.id
          });
          setControl(prev => ({ ...prev, rootNodeId: docRef.id }));
        }
        
        console.log('✅ Node added online successfully');
      
    } catch (error) {
      console.error('❌ Failed to add node:', error);
      alert('Kunde inte lägga till nod. Kontrollera internetanslutning och försök igen.');
    } finally {
      setNewNodeName('');
      setShowAddNode(false);
      setSaving(false);
    }
  };
  
  // Offline save functionality removed

  const handleAddRemark = async (e) => {
    e.preventDefault();
    if (!newRemarkText.trim() || !currentNode) return;

    setSaving(true);
    
    const remarkData = {
      nodeId: currentNode.id,
      text: newRemarkText.trim(),
      priority: newRemarkPriority,
      images: remarkImages,
      userId: currentUser.uid,
      nodeHasRemarks: currentNode.hasRemarks
    };

    try {
      // Always try online operations (offline mode removed)
        // Try online save first
        const newRemark = {
          ...remarkData,
          createdAt: serverTimestamp()
        };
        
        delete newRemark.nodeHasRemarks; // Remove this field before saving to Firestore
        
        const docRef = await addDoc(collection(db, 'remarks'), newRemark);
        
        const createdRemark = { 
          id: docRef.id, 
          ...newRemark,
          createdAt: new Date()
        };
        
        setRemarks(prev => [createdRemark, ...prev]);

        // Update node if it doesn't have remarks yet
        if (!currentNode.hasRemarks) {
          await updateDoc(doc(db, 'nodes', currentNode.id), {
            hasRemarks: true
          });
          
          setCurrentNode(prev => ({ ...prev, hasRemarks: true }));
          setNodes(prev => prev.map(node => 
            node.id === currentNode.id ? { ...node, hasRemarks: true } : node
          ));
        }

        console.log('✅ Remark saved online successfully');
        
        // Reset form on successful online save
        setNewRemarkText('');
        setNewRemarkPriority('');
        setRemarkImages([]);
        setShowAddRemark(false);
        
      
    } catch (error) {
      console.error('❌ Failed to save remark:', error);
      alert('Kunde inte spara anmärkning. Kontrollera internetanslutning och försök igen.');
    } finally {
      setSaving(false);
    }
  };
  
  // Offline remark save functionality removed

  // Start editing a remark
  const startEditRemark = (remark) => {
    setEditingRemarkId(remark.id);
    setEditingRemarkText(remark.text);
    setEditingRemarkPriority(remark.priority || '');
    setEditingRemarkImages(remark.images || []);
    setShowAddRemark(false); // Close add form if open
  };

  // Cancel editing
  const cancelEditRemark = () => {
    setEditingRemarkId(null);
    setEditingRemarkText('');
    setEditingRemarkPriority('');
    setEditingRemarkImages([]);
  };

  // Handle editing a remark
  const handleEditRemark = async (e) => {
    e.preventDefault();
    if (!editingRemarkText.trim() || !editingRemarkId) return;

    setSaving(true);
    
    const updatedRemarkData = {
      id: editingRemarkId,
      text: editingRemarkText.trim(),
      priority: editingRemarkPriority,
      images: editingRemarkImages,
      updatedAt: new Date()
    };

    try {
      // Always try online operations (offline mode removed)
        // Try online update first
        const remarkRef = doc(db, 'remarks', editingRemarkId);
        await updateDoc(remarkRef, {
          text: updatedRemarkData.text,
          priority: updatedRemarkData.priority,
          images: updatedRemarkData.images,
          updatedAt: serverTimestamp()
        });
        
        // Update local state
        setRemarks(prev => prev.map(remark => 
          remark.id === editingRemarkId 
            ? { ...remark, ...updatedRemarkData }
            : remark
        ));

        console.log('✅ Remark updated online successfully');
        
        // Reset form on successful online save
        cancelEditRemark();
        
      
    } catch (error) {
      // Handle offline or failed online update
      console.log('💾 Updating remark offline:', error.message);
      
      const success = await updateRemarkOffline(updatedRemarkData);
      
      if (success) {
        // Reset form after successful offline save
        cancelEditRemark();
        
        // Show user-friendly offline message
        // Online check removed - always try operation
        console.log('✅ Remark updated successfully');
    } finally {
      setSaving(false);
    }
  };

  // Save edited remark offline
  const updateRemarkOffline = async (updatedRemarkData) => {
    try {
      // Update local UI immediately
      setRemarks(prev => prev.map(remark => 
        remark.id === updatedRemarkData.id 
          ? { ...remark, ...updatedRemarkData, status: 'offline' }
          : remark
      ));

      console.error('❌ Failed to update remark');
      alert('Kunde inte uppdatera anmärkning. Kontrollera internetanslutning.');
      return false;
      
    } catch (error) {
      console.error('❌ Failed to update remark offline:', error);
      return false;
    }
  };

  const navigateToNode = async (node) => {
    if (node.id === currentNode?.id) return;
    
    setCurrentNode(node);
    await loadRemarksForNode(node.id);
  };

  const getNodePath = (node) => {
    if (!node) return [];
    
    const path = [node];
    let currentNodeInPath = node;
    
    // Bygg path genom att följa parent-kedjan
    while (currentNodeInPath.parentNodeId) {
      const parent = nodes.find(n => n.id === currentNodeInPath.parentNodeId);
      if (parent) {
        path.unshift(parent);
        currentNodeInPath = parent;
      } else {
        break;
      }
    }
    
    return path;
  };

  const getChildNodes = (parentNodeId) => {
    return nodes.filter(node => node.parentNodeId === parentNodeId);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'A': return '#dc2626'; // Röd
      case 'B': return '#f59e0b'; // Orange  
      case 'C': return '#10b981'; // Grön
      default: return '#6b7280'; // Grå
    }
  };

  const getPriorityBg = (priority) => {
    switch (priority) {
      case 'A': return '#fef2f2'; // Ljusröd
      case 'B': return '#fffbeb'; // Ljusorange
      case 'C': return '#f0fdf4'; // Ljusgrön
      default: return '#f9fafb'; // Ljusgrå
    }
  };

  const handleDeleteNode = async (nodeId, nodeName) => {
    if (!window.confirm(`Är du säker på att du vill ta bort noden "${nodeName}"? Detta tar också bort alla undernoder och anmärkningar.`)) {
      return;
    }

    setSaving(true);
    
    try {
      // Find all child nodes recursively for UI updates
      const findAllChildNodes = (parentId, allNodes) => {
        const children = allNodes.filter(n => n.parentNodeId === parentId);
        let allChildren = [...children];
        children.forEach(child => {
          allChildren = [...allChildren, ...findAllChildNodes(child.id, allNodes)];
        });
        return allChildren;
      };

      const childNodes = findAllChildNodes(nodeId, nodes);
      const allNodesToDelete = [nodeId, ...childNodes.map(n => n.id)];
      
      // Always try online operations (offline mode removed)
        // Online deletion
        for (const nId of allNodesToDelete) {
          const remarksQuery = query(collection(db, 'remarks'), where('nodeId', '==', nId));
          const remarksSnapshot = await getDocs(remarksQuery);
          for (const remarkDoc of remarksSnapshot.docs) {
            await deleteDoc(doc(db, 'remarks', remarkDoc.id));
          }
        }

        for (const nId of allNodesToDelete) {
          await deleteDoc(doc(db, 'nodes', nId));
        }
        
        console.log('✅ Node deleted online successfully');
      } else {
        // Offline deletion - queue operations
        console.error('❌ Failed to delete nodes');
        alert('Kunde inte ta bort noder. Kontrollera internetanslutning.');
      }

      // Update local UI immediately
      const remainingNodes = nodes.filter(n => !allNodesToDelete.includes(n.id));
      setNodes(remainingNodes);

      // Handle current node change
      if (nodeId === currentNode?.id) {
        if (remainingNodes.length > 0) {
          const newCurrent = remainingNodes.find(n => !n.parentNodeId) || remainingNodes[0];
          setCurrentNode(newCurrent);
          await loadRemarksForNode(newCurrent.id);
        } else {
          setCurrentNode(null);
          setRemarks([]);
        }
      }

    } catch (err) {
      console.error('Error deleting node:', err);
      alert('Kunde inte ta bort nod');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRemark = async (remarkId) => {
    if (!window.confirm('Är du säker på att du vill ta bort denna anmärkning?')) {
      return;
    }

    try {
      // Always try online operations (offline mode removed)
        // Online deletion
        await deleteDoc(doc(db, 'remarks', remarkId));
        
        // Check if node still has remarks
        const remainingRemarks = remarks.filter(r => r.id !== remarkId);
        if (remainingRemarks.length === 0 && currentNode.hasRemarks) {
          await updateDoc(doc(db, 'nodes', currentNode.id), {
            hasRemarks: false
          });
          
          setCurrentNode(prev => ({ ...prev, hasRemarks: false }));
          setNodes(prev => prev.map(node => 
            node.id === currentNode.id ? { ...node, hasRemarks: false } : node
          ));
        }
        
        console.log('✅ Remark deleted online successfully');
      } else {
        console.error('❌ Failed to delete remark');
        alert('Kunde inte ta bort anmärkning. Kontrollera internetanslutning.');
        
        // Remove individual offline alerts
      }
      
      // Update local UI immediately
      setRemarks(prev => prev.filter(r => r.id !== remarkId));
      
    } catch (err) {
      console.error('Error deleting remark:', err);
      alert('Kunde inte ta bort anmärkning');
    }
  };

  const handleEditNodeName = async (nodeId) => {
    if (!editingNodeName.trim()) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'nodes', nodeId), {
        name: editingNodeName.trim(),
        updatedAt: serverTimestamp()
      });

      // Uppdatera local state
      setNodes(prev => prev.map(node => 
        node.id === nodeId ? { ...node, name: editingNodeName.trim() } : node
      ));

      if (currentNode?.id === nodeId) {
        setCurrentNode(prev => ({ ...prev, name: editingNodeName.trim() }));
      }

      setEditingNodeId(null);
      setEditingNodeName('');
    } catch (err) {
      console.error('Error updating node name:', err);
      alert('Kunde inte uppdatera nodnamn');
    } finally {
      setSaving(false);
    }
  };

  const handleEditControlName = async () => {
    if (!newControlName.trim()) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'controls', controlId), {
        name: newControlName.trim(),
        updatedAt: serverTimestamp()
      });

      // Uppdatera local state
      setControl(prev => ({ ...prev, name: newControlName.trim() }));
      setEditingControlName(false);
      setNewControlName('');
    } catch (err) {
      console.error('Error updating control name:', err);
      alert('Kunde inte uppdatera kontrollnamn');
    } finally {
      setSaving(false);
    }
  };

  const toggleControlStatus = async () => {
    if (!control) return;

    setSaving(true);
    try {
      const newStatus = control.status === 'completed' ? 'active' : 'completed';
      
      await updateDoc(doc(db, 'controls', controlId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      // Uppdatera local state
      setControl(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error('Error updating control status:', err);
      alert('Kunde inte uppdatera kontrollstatus');
    } finally {
      setSaving(false);
    }
  };

  const handleImagesUploaded = (uploadedImages) => {
    console.log('Images uploaded:', uploadedImages);
    // Only add images if we're in add remark mode (showAddRemark is true)
    if (showAddRemark) {
      setRemarkImages(prev => [...prev, ...uploadedImages]);
    }
  };

  const deleteSupabaseImage = async (image) => {
    try {
      const path = image.path || `controls/${controlId}/nodes/${currentNode?.id}/${image.fileName}`;
      const { error } = await supabase.storage
        .from('controls')
        .remove([path]);
      
      if (error) {
        console.error('Error deleting image:', error);
      } else {
        console.log('Image deleted successfully from Supabase:', path);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      // Inte kritiskt fel - fortsätt ändå
    }
  };

  const openImageModal = (image, allImages = [], imageIndex = 0) => {
    setModalImage(image);
    setAllModalImages(allImages);
    setModalImageIndex(imageIndex);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setModalImage(null);
    setAllModalImages([]);
    setModalImageIndex(0);
  };

  const handleGeneratePDF = async () => {
    if (!control || !nodes.length) {
      alert('Ingen kontrolldata att generera PDF från');
      return;
    }

    setGeneratingPDF(true);
    
    // Skapa unik ID för denna PDF-generation så vi kan uppdatera samma notification
    const pdfNotificationId = `pdf-generation-${Date.now()}`;
    
    // Visa progress notification
    if (window.showNotification) {
      window.showNotification({
        id: pdfNotificationId,
        type: 'info',
        title: 'Genererar PDF',
        message: 'Förbereder dokument...',
        showProgress: true,
        progress: 10,
        duration: null
      });
    }
    
    try {
      console.log('Starting PDF generation for control:', control.name);
      
      // Hämta ALLA anmärkningar för alla noder i kontrollen
      if (window.showNotification) {
        window.showNotification({
          id: pdfNotificationId,
          type: 'info',
          title: 'Genererar PDF',
          message: 'Laddar anmärkningar...',
          showProgress: true,
          progress: 25,
          duration: null
        });
      }
      
      const allRemarks = await loadAllRemarksForControl(nodes);
      
      // Hämta kontrollpunkter och instruktionstext
      if (window.showNotification) {
        window.showNotification({
          id: pdfNotificationId,
          type: 'info',
          title: 'Genererar PDF',
          message: 'Laddar kontrollpunkter...',
          showProgress: true,
          progress: 40,
          duration: null
        });
      }
      
      const kontrollpunkter = await loadKontrollpunkter();
      const instructionText = await loadInstructionText();
      
      console.log('Data:', { 
        nodes: nodes.length, 
        allRemarks: allRemarks.length,
        kontrollpunkter: kontrollpunkter.length,
        instructionText: instructionText.length,
        currentNodeRemarks: remarks.length,
        userProfile: !!currentUser?.userProfile 
      });

      // Hämta användarens profil från AuthContext - använd userProfile från context
      const pdfUserProfile = {
        companyName: userProfile?.companyName || currentUser?.displayName || 'Okänt företag',
        phone: userProfile?.phone || '',
        website: userProfile?.website || '',
        logoUrl: userProfile?.logoUrl || null
      };

      console.log('User profile for PDF:', {
        companyName: pdfUserProfile.companyName,
        hasLogo: !!pdfUserProfile.logoUrl,
        logoUrl: pdfUserProfile.logoUrl,
        rawUserProfile: userProfile
      });

      // Progress callback för PDF-generering
      const onProgress = (progress, message) => {
        if (window.showNotification) {
          window.showNotification({
            id: pdfNotificationId,
            type: 'info',
            title: 'Genererar PDF',
            message,
            showProgress: true,
            progress: Math.min(100, 60 + progress * 0.35), // 60-95% för PDF generation
            duration: null
          });
        }
      };

      // Generera PDF med den nya modulära generatorn - använd ALLA anmärkningar, kontrollpunkter och instruktionstext
      const pdfDoc = await generateControlPDF(control, nodes, allRemarks, pdfUserProfile, kontrollpunkter, instructionText, onProgress);
      
      // Slutför progress
      if (window.showNotification) {
        window.showNotification({
          id: pdfNotificationId,
          type: 'info',
          title: 'Genererar PDF',
          message: 'Sparar dokument...',
          showProgress: true,
          progress: 95,
          duration: null
        });
      }
      
      // Skapa filnamn baserat på kontrollnamn och datum
      const date = new Date().toLocaleDateString('sv-SE').replace(/\//g, '-');
      const fileName = `${control.name.replace(/[^a-zA-Z0-9\-_]/g, '_')}_${date}.pdf`;
      
      // Spara PDF
      pdfDoc.save(fileName);
      
      console.log('PDF generated successfully:', fileName);
      
      // Visa success notification och auto-dismiss efter 5 sekunder
      if (window.showNotification) {
        window.showNotification({
          id: pdfNotificationId,
          type: 'success',
          title: 'PDF klar!',
          message: `${fileName} har laddats ner`,
          showProgress: true,
          progress: 100,
          duration: 5000 // Auto-dismiss efter 5 sekunder
        });
      }
      
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      
      // Visa error notification (uppdatera samma notification)
      if (window.showNotification) {
        window.showNotification({
          id: pdfNotificationId,
          type: 'error',
          title: 'PDF-fel',
          message: `Kunde inte generera PDF: ${error.message}`,
          showProgress: false,
          duration: 7000 // Lite längre för error
        });
      } else {
        alert(`Kunde inte generera PDF: ${error.message}`);
      }
    } finally {
      setGeneratingPDF(false);
    }
  };


  const handleDeleteImageFromRemark = async (remarkId, imageIndex, image) => {
    if (!window.confirm('Är du säker på att du vill ta bort denna bild?')) {
      return;
    }

    try {
      // Ta bort från Supabase Storage
      await deleteSupabaseImage(image);
      
      // Uppdatera anmärkningen i Firestore
      const remark = remarks.find(r => r.id === remarkId);
      if (remark) {
        const updatedImages = remark.images.filter((_, index) => index !== imageIndex);
        
        await updateDoc(doc(db, 'remarks', remarkId), {
          images: updatedImages,
          updatedAt: serverTimestamp()
        });

        // Uppdatera lokal state
        setRemarks(prev => prev.map(r => 
          r.id === remarkId 
            ? { ...r, images: updatedImages }
            : r
        ));
      }
    } catch (error) {
      console.error('Error deleting image from remark:', error);
      alert('Kunde inte ta bort bild');
    }
  };

  if (loading) {
    return (
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: windowWidth > 768 ? '40px 24px' : '20px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #0066cc',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <span style={{ marginLeft: '16px', color: '#6b7280', fontSize: '16px' }}>
          Laddar kontroll...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: windowWidth > 768 ? '40px 24px' : '20px 16px'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '48px',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ color: '#dc2626', marginBottom: '16px' }}>{error}</h3>
          <Link to="/customers" style={{ color: '#0066cc', textDecoration: 'none' }}>
            ← Tillbaka till kunder
          </Link>
        </div>
      </div>
    );
  }

  const nodePath = currentNode ? getNodePath(currentNode) : [];
  const childNodes = currentNode ? getChildNodes(currentNode.id) : getChildNodes(null);

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: windowWidth > 768 ? '24px' : '16px',
      background: '#f8fafc',
      minHeight: '100vh'
    }}>
      {/* CSS */}
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
        padding: windowWidth > 768 ? '24px' : '20px',
        marginBottom: '20px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <Link 
              to={`/customers/${control?.customerId}`}
              style={{
                color: '#6b7280',
                textDecoration: 'none',
                fontSize: '14px',
                display: 'block',
                marginBottom: '8px'
              }}
            >
              ← {control?.customerName}
            </Link>
            {editingControlName ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flex: 1
              }}>
                <input
                  type="text"
                  value={newControlName}
                  onChange={(e) => setNewControlName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleEditControlName()}
                  style={{
                    fontSize: windowWidth > 768 ? '28px' : '24px',
                    fontWeight: 'bold',
                    color: '#1f2937',
                    border: '2px solid #0066cc',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    flex: 1,
                    background: 'white'
                  }}
                  autoFocus
                />
                <button
                  onClick={handleEditControlName}
                  disabled={saving || !newControlName.trim()}
                  style={{
                    padding: '6px 12px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Spara
                </button>
                <button
                  onClick={() => {
                    setEditingControlName(false);
                    setNewControlName('');
                  }}
                  style={{
                    padding: '6px 12px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Avbryt
                </button>
              </div>
            ) : (
              <h1 
                style={{
                  fontSize: windowWidth > 768 ? '28px' : '24px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  margin: 0,
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setEditingControlName(true);
                  setNewControlName(control?.name || '');
                }}
                title="Klicka för att redigera kontrollnamn"
              >
                {control?.name}
              </h1>
            )}
          </div>
          
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={handleGeneratePDF}
              disabled={generatingPDF || !nodes.length}
              style={{
                padding: '8px 16px',
                background: generatingPDF || !nodes.length ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: generatingPDF || !nodes.length ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title={!nodes.length ? 'Inga noder att exportera' : 'Exportera kontroll som PDF'}
            >
              {generatingPDF ? (
                <>
                  <span>⏳</span>
                  Genererar...
                </>
              ) : (
                <>
                  Exportera PDF
                </>
              )}
            </button>
            
            <button 
              onClick={toggleControlStatus}
              style={{
                padding: '6px 12px',
                background: control?.status === 'completed' ? '#10b981' : '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title="Klicka för att ändra status"
            >
              {control?.status === 'completed' ? 'Slutförd' : 'Aktiv'}
            </button>
            
            {/* Offline status indicator removed */}
          </div>
        </div>
      </div>

      {/* Om inga noder finns - Skapa första noden */}
      {nodes.length === 0 && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: windowWidth > 768 ? '48px' : '32px',
          textAlign: 'center',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
          border: '1px solid #e2e8f0'
        }}>
          <h2 style={{ fontSize: '24px', color: '#1f2937', marginBottom: '16px' }}>
            Välkommen till din nya kontroll!
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '32px', fontSize: '16px' }}>
            Börja med att skapa din första nod - det kan vara byggnadens namn, ett rum eller område.
          </p>
          
          {!showAddNode ? (
            <button
              onClick={() => {
                setShowAddNode(true);
                setAddAsChild(false);
              }}
              style={{
                background: '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '16px 32px',
                fontSize: '18px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(0, 102, 204, 0.25)'
              }}
            >
              + Skapa första nod
            </button>
          ) : (
            <form onSubmit={(e) => handleAddNode(e, false)} style={{ maxWidth: '400px', margin: '0 auto' }}>
              <input
                type="text"
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                placeholder="T.ex. Barnhusgatan 24, Entréhall, Källare..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  marginBottom: '16px',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddNode(false);
                    setNewNodeName('');
                  }}
                  style={{
                    padding: '12px 24px',
                    background: '#f8fafc',
                    color: '#64748b',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={saving || !newNodeName.trim()}
                  style={{
                    padding: '12px 24px',
                    background: saving || !newNodeName.trim() ? '#9ca3af' : '#0066cc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: saving || !newNodeName.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? 'Skapar...' : 'Skapa'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Main Content - om vi har noder */}
      {nodes.length > 0 && (
        <div>
          {/* Navigation Card för alla skärmstorlekar */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: windowWidth > 768 ? '24px' : '16px',
            marginBottom: '20px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                Navigering
              </h3>
              <button
                onClick={() => {
                  setShowAddNode(true);
                  setAddAsChild(false);
                }}
                style={{
                  padding: '6px 12px',
                  background: '#f0f9ff',
                  color: '#0066cc',
                  border: '2px solid #bae6fd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500'
                }}
              >
                + Huvudnod
              </button>
            </div>
            
            {/* Navigation tree - scrollbar på mobil */}
            <div style={{
              maxHeight: windowWidth <= 768 ? '200px' : 'none',
              overflowY: windowWidth <= 768 ? 'auto' : 'visible',
              paddingRight: windowWidth <= 768 ? '4px' : '0'
            }}>
              {nodes.filter(n => !n.parentNodeId).map(rootNode => (
                <NodeTreeItem 
                  key={rootNode.id} 
                  node={rootNode} 
                  nodes={nodes}
                  currentNode={currentNode}
                  onNavigate={navigateToNode}
                  level={0}
                />
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <div>
            {/* Breadcrumb */}
            {nodePath.length > 0 && (
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: windowWidth > 768 ? '16px' : '12px',
                marginBottom: '16px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  {nodePath.map((node, index) => (
                    <React.Fragment key={node.id}>
                      <button
                        onClick={() => navigateToNode(node)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: index === nodePath.length - 1 ? '#0066cc' : '#6b7280',
                          fontWeight: index === nodePath.length - 1 ? '600' : 'normal',
                          cursor: 'pointer',
                          fontSize: windowWidth <= 768 ? '12px' : '14px',
                          padding: '4px 2px',
                          minHeight: windowWidth <= 768 ? '32px' : 'auto'
                        }}
                      >
                        {windowWidth <= 480 && node.name.length > 15 
                          ? `${node.name.substring(0, 15)}...` 
                          : node.name
                        }
                      </button>
                      {index < nodePath.length - 1 && (
                        <span style={{ color: '#9ca3af', fontSize: windowWidth <= 768 ? '12px' : '14px' }}>→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Current Node Content */}
            {currentNode && (
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: windowWidth > 768 ? '24px' : '20px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '24px',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}>
                  {editingNodeId === currentNode.id ? (
                    <div style={{ 
                      width: '100%',
                      maxWidth: '100%',
                      display: windowWidth <= 768 ? 'block' : 'flex',
                      gap: '8px'
                    }}>
                      <input
                        type="text"
                        value={editingNodeName}
                        onChange={(e) => setEditingNodeName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleEditNodeName(currentNode.id)}
                        style={{
                          fontSize: windowWidth <= 768 ? '16px' : '20px',
                          fontWeight: 'bold',
                          color: '#1f2937',
                          border: '2px solid #0066cc',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          width: windowWidth <= 768 ? '100%' : 'auto',
                          flex: windowWidth <= 768 ? 'none' : 1,
                          marginBottom: windowWidth <= 768 ? '8px' : '0',
                          boxSizing: 'border-box'
                        }}
                        autoFocus
                      />
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        justifyContent: windowWidth <= 768 ? 'flex-end' : 'flex-start'
                      }}>
                        <button
                          onClick={() => handleEditNodeName(currentNode.id)}
                          disabled={saving || !editingNodeName.trim()}
                          style={{
                            padding: '8px 12px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Spara
                        </button>
                        <button
                          onClick={() => {
                            setEditingNodeId(null);
                            setEditingNodeName('');
                          }}
                          style={{
                            padding: '8px 12px',
                            background: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Avbryt
                        </button>
                      </div>
                    </div>
                  ) : (
                    <h2 
                      style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#1f2937',
                        margin: 0,
                        cursor: 'pointer',
                        flex: 1
                      }}
                      onClick={() => {
                        setEditingNodeId(currentNode.id);
                        setEditingNodeName(currentNode.name);
                      }}
                      title="Klicka för att redigera namn"
                    >
                      {currentNode.name}
                    </h2>
                  )}

                  <div style={{ 
                    display: 'flex', 
                    gap: windowWidth <= 768 ? '6px' : '8px',
                    flexWrap: windowWidth <= 480 ? 'wrap' : 'nowrap'
                  }}>
                    <button
                      onClick={() => {
                        setShowAddNode(true);
                        setAddAsChild(true); // Lägg till som barn till current node
                      }}
                      style={{
                        padding: windowWidth <= 768 ? '6px 12px' : '8px 16px',
                        background: '#f0f9ff',
                        color: '#0066cc',
                        border: '2px solid #bae6fd',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: windowWidth <= 768 ? '12px' : '14px',
                        fontWeight: '500',
                        minWidth: windowWidth <= 480 ? '80px' : 'auto'
                      }}
                    >
                      + Undernod
                    </button>
                    
                    <button
                      onClick={() => setShowAddRemark(true)}
                      style={{
                        padding: windowWidth <= 768 ? '6px 12px' : '8px 16px',
                        background: '#0066cc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: windowWidth <= 768 ? '12px' : '14px',
                        fontWeight: '500',
                        minWidth: windowWidth <= 480 ? '100px' : 'auto'
                      }}
                    >
                      + Anmärkning
                    </button>

                    <button
                      onClick={() => handleDeleteNode(currentNode.id, currentNode.name)}
                      disabled={saving}
                      style={{
                        padding: windowWidth <= 768 ? '6px 12px' : '8px 16px',
                        background: '#fef2f2',
                        color: '#dc2626',
                        border: '2px solid #fecaca',
                        borderRadius: '8px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: windowWidth <= 768 ? '12px' : '14px',
                        fontWeight: '500',
                        minWidth: windowWidth <= 480 ? '70px' : 'auto'
                      }}
                    >
                      Ta bort
                    </button>
                  </div>
                </div>

                {/* Child nodes */}
                {childNodes.length > 0 && (
                  <div style={{ marginBottom: '32px' }}>
                    <h4 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#4b5563',
                      marginBottom: '12px'
                    }}>
                      Undernoder:
                    </h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: windowWidth > 768 
                        ? 'repeat(auto-fill, minmax(200px, 1fr))' 
                        : windowWidth > 480 
                          ? 'repeat(2, 1fr)' 
                          : '1fr',
                      gap: windowWidth <= 768 ? '6px' : '8px'
                    }}>
                      {childNodes.map(node => (
                        <button
                          key={node.id}
                          onClick={() => navigateToNode(node)}
                          style={{
                            padding: windowWidth <= 768 ? '10px 12px' : '12px 16px',
                            background: '#f8fafc',
                            color: '#1f2937',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s',
                            position: 'relative',
                            fontSize: windowWidth <= 768 ? '13px' : '14px',
                            minHeight: windowWidth <= 480 ? '44px' : 'auto',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          {node.name}
                          {node.hasRemarks && (
                            <span style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              width: '8px',
                              height: '8px',
                              background: '#f59e0b',
                              borderRadius: '50%'
                            }} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remarks */}
                <div>
                  <h4 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#4b5563',
                    marginBottom: '16px'
                  }}>
                    Anmärkningar ({remarks.length}):
                  </h4>

                  {remarks.length === 0 ? (
                    <p style={{
                      color: '#9ca3af',
                      fontStyle: 'italic',
                      textAlign: 'center',
                      padding: '32px'
                    }}>
                      Inga anmärkningar för denna nod. Klicka på "+ Anmärkning" för att lägga till en.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {remarks.map(remark => (
                        <div
                          key={remark.id}
                          style={{
                            padding: '16px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            borderLeft: `4px solid ${remark.priority ? getPriorityColor(remark.priority) : '#e2e8f0'}`,
                            position: 'relative'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '8px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {remark.priority && (
                                <span style={{
                                  fontSize: '12px',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  background: getPriorityBg(remark.priority),
                                  color: getPriorityColor(remark.priority),
                                  fontWeight: '600'
                                }}>
                                  Prioritet {remark.priority}
                                </span>
                              )}
                              {remark.status === 'offline' && (
                                <span style={{
                                  fontSize: '10px',
                                  padding: '1px 6px',
                                  borderRadius: '3px',
                                  background: '#fef3c7',
                                  color: '#92400e',
                                  fontWeight: '600'
                                }}>
                                  OFFLINE
                                </span>
                              )}
                              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                {remark.createdAt?.toDate?.()?.toLocaleString('sv-SE') || 
                                 remark.createdAt?.toLocaleString?.('sv-SE') || 'Nu'}
                              </span>
                            </div>
                            
                            <button
                              onClick={() => startEditRemark(remark)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#0066cc',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                marginRight: '8px'
                              }}
                              title="Redigera anmärkning"
                            >
                              Redigera
                            </button>
                            <button
                              onClick={() => handleDeleteRemark(remark.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#dc2626',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}
                              title="Ta bort anmärkning"
                            >
                              Ta bort
                            </button>
                          </div>
                          <p style={{ color: '#1f2937', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                            {remark.text}
                          </p>
                          
                          {/* Visa bilder om de finns */}
                          {remark.images && remark.images.length > 0 && (
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: windowWidth <= 768 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                              gap: '8px',
                              marginTop: '12px',
                              width: '100%',
                              overflow: 'hidden'
                            }}>
                              {remark.images.map((image, imageIndex) => (
                                <div key={imageIndex} style={{ position: 'relative' }}>
                                  <img
                                    src={image.url}
                                    alt={image.originalName || 'Uppladdad bild'}
                                    style={{
                                      width: '100%',
                                      maxWidth: '100%',
                                      height: '80px',
                                      objectFit: 'cover',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      display: 'block'
                                    }}
                                    onClick={() => openImageModal(image, remark.images, imageIndex)}
                                    title={`Klicka för att öppna ${image.originalName || 'bild'} i full storlek`}
                                  />
                                  <button
                                    onClick={() => handleDeleteImageFromRemark(remark.id, imageIndex, image)}
                                    style={{
                                      position: 'absolute',
                                      top: '2px',
                                      right: '2px',
                                      background: 'rgba(220, 38, 38, 0.8)',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '50%',
                                      width: '20px',
                                      height: '20px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                    title="Ta bort bild"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Node Modal */}
      {showAddNode && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '100%'
          }}>
            <h3 style={{ marginBottom: '20px', fontSize: '20px', color: '#1f2937' }}>
              {addAsChild ? 'Lägg till undernod' : 'Lägg till huvudnod'}
            </h3>
            
            {currentNode && addAsChild && (
              <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
                Skapar undernod till: <strong>{currentNode.name}</strong>
              </p>
            )}
            
            {!addAsChild && (
              <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
                Skapar ny huvudnod på toppnivå
              </p>
            )}

            <form onSubmit={(e) => handleAddNode(e, addAsChild)}>
              <input
                type="text"
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                placeholder="Namn på nod (t.ex. Källare, Elcentral, Rum 101...)"
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  marginBottom: '20px',
                  boxSizing: 'border-box'
                }}
              />
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddNode(false);
                    setNewNodeName('');
                  }}
                  style={{
                    padding: '12px 24px',
                    background: '#f8fafc',
                    color: '#64748b',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={saving || !newNodeName.trim()}
                  style={{
                    padding: '12px 24px',
                    background: saving || !newNodeName.trim() ? '#9ca3af' : '#0066cc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: saving || !newNodeName.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? 'Skapar...' : 'Skapa nod'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Remark Modal */}
      {showAddRemark && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '600px',
            width: '100%'
          }}>
            <h3 style={{ marginBottom: '20px', fontSize: '20px', color: '#1f2937' }}>
              Ny anmärkning
            </h3>
            
            {currentNode && (
              <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
                Anmärkning för: <strong>{currentNode.name}</strong>
              </p>
            )}

            <form onSubmit={handleAddRemark}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Prioritet (valfritt):
                </label>
                <select
                  value={newRemarkPriority}
                  onChange={(e) => setNewRemarkPriority(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    width: '150px'
                  }}
                >
                  <option value="">
                    Ingen prioritet
                  </option>
                  <option value="A">A - Hög prioritet</option>
                  <option value="B">B - Medel prioritet</option>
                  <option value="C">C - Låg prioritet</option>
                </select>
              </div>

              <textarea
                value={newRemarkText}
                onChange={(e) => setNewRemarkText(e.target.value)}
                placeholder="Beskriv anmärkningen... (t.ex. Fuktskador vid fönster, Slitage på golv, Defekt belysning)"
                autoFocus
                rows="4"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  marginBottom: '20px',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />

              <ControlImageUploader
                controlId={controlId}
                nodeId={currentNode?.id}
                onImagesUploaded={handleImagesUploaded}
                disabled={saving}
              />
              
              {/* Visa redan valda bilder */}
              {remarkImages.length > 0 && (
                <div style={{
                  marginBottom: '20px',
                  padding: '12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  background: '#f8fafc'
                }}>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Valda bilder ({remarkImages.length}):
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: windowWidth <= 768 ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
                    gap: '8px',
                    width: '100%',
                    overflow: 'hidden'
                  }}>
                    {remarkImages.map((image, index) => (
                      <div key={index} style={{ position: 'relative' }}>
                        <img
                          src={image.url}
                          alt={image.originalName}
                          style={{
                            width: '100%',
                            maxWidth: '100%',
                            height: '60px',
                            objectFit: 'cover',
                            borderRadius: '4px',
                            display: 'block'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setRemarkImages(prev => prev.filter((_, i) => i !== index));
                          }}
                          style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            background: 'rgba(220, 38, 38, 0.8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            fontSize: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddRemark(false);
                    setNewRemarkText('');
                    setNewRemarkPriority('');
                    setRemarkImages([]);
                  }}
                  style={{
                    padding: '12px 24px',
                    background: '#f8fafc',
                    color: '#64748b',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={saving || !newRemarkText.trim()}
                  style={{
                    padding: '12px 24px',
                    background: saving || !newRemarkText.trim() ? '#9ca3af' : '#0066cc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: saving || !newRemarkText.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? 'Sparar...' : 'Spara anmärkning'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Remark Modal */}
      {editingRemarkId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '600px',
            width: '100%'
          }}>
            <h3 style={{ marginBottom: '20px', fontSize: '20px', color: '#1f2937' }}>
              Redigera anmärkning
            </h3>
            
            {currentNode && (
              <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
                Anmärkning för: <strong>{currentNode.name}</strong>
              </p>
            )}

            <form onSubmit={handleEditRemark}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Prioritet (valfritt):
                </label>
                <select
                  value={editingRemarkPriority}
                  onChange={(e) => setEditingRemarkPriority(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    width: '150px'
                  }}
                >
                  <option value="">
                    Ingen prioritet
                  </option>
                  <option value="A">A - Hög prioritet</option>
                  <option value="B">B - Medel prioritet</option>
                  <option value="C">C - Låg prioritet</option>
                </select>
              </div>

              <textarea
                value={editingRemarkText}
                onChange={(e) => setEditingRemarkText(e.target.value)}
                placeholder="Beskriv anmärkningen... (t.ex. Fuktskador vid fönster, Slitage på golv, Defekt belysning)"
                autoFocus
                rows="4"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  marginBottom: '20px',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />

              <ControlImageUploader
                controlId={controlId}
                nodeId={currentNode?.id}
                onImagesUploaded={(newImages) => {
                  setEditingRemarkImages(prev => [...prev, ...newImages]);
                }}
                disabled={saving}
              />
              
              {/* Visa redan valda bilder för redigering */}
              {editingRemarkImages.length > 0 && (
                <div style={{
                  marginBottom: '20px',
                  padding: '12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  background: '#f8fafc'
                }}>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Valda bilder ({editingRemarkImages.length}):
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: '8px'
                  }}>
                    {editingRemarkImages.map((image, index) => (
                      <div key={index} style={{ position: 'relative' }}>
                        <img
                          src={image.url}
                          alt={image.originalName}
                          style={{
                            width: '100%',
                            maxWidth: '100%',
                            height: '60px',
                            objectFit: 'cover',
                            borderRadius: '4px',
                            display: 'block'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRemarkImages(prev => prev.filter((_, i) => i !== index));
                          }}
                          style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            background: 'rgba(220, 38, 38, 0.8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            fontSize: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={cancelEditRemark}
                  style={{
                    padding: '12px 24px',
                    background: '#f8fafc',
                    color: '#64748b',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={saving || !editingRemarkText.trim()}
                  style={{
                    padding: '12px 24px',
                    background: saving || !editingRemarkText.trim() ? '#9ca3af' : '#0066cc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: saving || !editingRemarkText.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? 'Sparar...' : 'Uppdatera anmärkning'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Modal */}
      <ImageModal
        isOpen={showImageModal}
        onClose={closeImageModal}
        image={modalImage}
        allImages={allModalImages}
        currentIndex={modalImageIndex}
      />

      {/* Notification system removed with offline functionality */}
    </div>
  );
};

// Helper component för node tree rendering
const NodeTreeItem = ({ node, nodes, currentNode, onNavigate, level }) => {
  const [expanded, setExpanded] = useState(true);
  const children = nodes.filter(n => n.parentNodeId === node.id);
  const hasChildren = children.length > 0;

  return (
    <div style={{ marginLeft: `${level * 16}px` }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          borderRadius: '6px',
          background: currentNode?.id === node.id ? '#f0f9ff' : 'transparent',
          border: '2px solid transparent',
          cursor: 'pointer',
          marginBottom: '4px'
        }}
        onClick={() => onNavigate(node)}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              marginRight: '4px',
              color: '#6b7280',
              fontSize: '12px',
              padding: '2px'
            }}
          >
            {expanded ? '▼' : '▶'}
          </button>
        )}
        
        <span style={{
          fontSize: '14px',
          color: currentNode?.id === node.id ? '#0066cc' : '#1f2937',
          fontWeight: currentNode?.id === node.id ? '600' : 'normal',
          flex: 1
        }}>
          {node.name}
        </span>
        
        {node.hasRemarks && (
          <span style={{
            width: '6px',
            height: '6px',
            background: '#f59e0b',
            borderRadius: '50%',
            marginLeft: '4px'
          }} />
        )}
      </div>
      
      {hasChildren && expanded && (
        <div>
          {children.map(child => (
            <NodeTreeItem
              key={child.id}
              node={child}
              nodes={nodes}
              currentNode={currentNode}
              onNavigate={onNavigate}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ControlView;