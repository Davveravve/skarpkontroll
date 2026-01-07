// src/pages/ControlView.js - Clean version utan dupliceringar
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import ControlImageUploader from '../components/ControlImageUploader';
import ImageModal from '../components/ImageModal';
import ImageAnnotation from '../components/ImageAnnotation';
import { generateControlPDF } from '../utils/controlPdfGenerator';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import { useToast } from '../components/ui/Toast';
import { useConfirmation } from '../components/ConfirmationProvider';
import { createTeamLogger } from '../services/teamLogger';
import { naturalCompare, sortByOrder } from '../utils/sorting';
import './ControlView.css';

const ControlView = () => {
  const { currentUser, userProfile } = useAuth();
  const { currentTeam, hasTeam } = useTeam();
  const toast = useToast();
  const confirmation = useConfirmation();
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
  const [pdfProgress, setPdfProgress] = useState({ percent: 0, message: '', error: null });

  // PDF datum modal
  const [showPdfDateModal, setShowPdfDateModal] = useState(false);
  const [pdfDate, setPdfDate] = useState(new Date().toISOString().split('T')[0]);

  // Publik länk
  const [publicToken, setPublicToken] = useState(null);

  // Annotation state
  const [showAnnotation, setShowAnnotation] = useState(false);
  const [annotationImage, setAnnotationImage] = useState(null);
  const [annotationRemarkId, setAnnotationRemarkId] = useState(null);
  const [annotationImageIndex, setAnnotationImageIndex] = useState(null);

  // Team logger for activity tracking
  const logger = useMemo(() => {
    if (!currentTeam?.id || !currentUser?.uid) return null;
    return createTeamLogger({
      teamId: currentTeam.id,
      userId: currentUser.uid,
      userName: userProfile?.companyName || currentUser.email?.split('@')[0] || 'Anonym'
    });
  }, [currentTeam?.id, currentUser?.uid, currentUser?.email, userProfile?.companyName]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Network status tracking removed

  // Load initial data med realtidslyssnare
  useEffect(() => {
    if (!currentUser || !controlId) {
      console.error('ControlView: Missing currentUser or controlId');
      setError('Saknar behörighet eller kontroll-ID');
      setLoading(false);
      return;
    }

    console.log('🔍 ControlView: Setting up realtime listeners');

    // Realtidslyssnare för kontroll
    const controlRef = doc(db, 'inspections', controlId);
    const unsubscribeControl = onSnapshot(controlRef, (controlDoc) => {
      if (!controlDoc.exists()) {
        console.error('Control document not found');
        setError('Kontrollen kunde inte hittas');
        setLoading(false);
        return;
      }

      const controlData = { id: controlDoc.id, ...controlDoc.data() };

      // Kontrollera team-ägarskap
      if (!hasTeam || controlData.teamId !== currentTeam?.id) {
        console.error('User team does not match control team');
        setError('Du har inte behörighet att se denna kontroll');
        setLoading(false);
        return;
      }

      setControl(controlData);
      setPublicToken(controlData.publicToken || null);
      console.log('Control updated:', controlData.name);
    }, (err) => {
      console.error('Error listening to control:', err);
      setError(`Kunde inte ladda kontrolldata: ${err.message}`);
      setLoading(false);
    });

    // Realtidslyssnare för platser
    const placesQuery = query(
      collection(db, 'places'),
      where('inspectionId', '==', controlId)
    );

    let isFirstNodesLoad = true;
    const unsubscribeNodes = onSnapshot(placesQuery, async (snapshot) => {
      const nodesData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));

      // Sortera med naturlig sortering (a2 < a10 < a17)
      nodesData.sort((a, b) => {
        const orderA = a.order ?? 999999;
        const orderB = b.order ?? 999999;
        if (orderA !== orderB) return orderA - orderB;
        return naturalCompare(a.name || '', b.name || '');
      });

      console.log('📁 Places updated:', nodesData.length, 'places');
      setNodes(nodesData);

      // Vid första laddningen, sätt initial node
      if (isFirstNodesLoad && nodesData.length > 0) {
        const rootNode = nodesData.find(node => !node.parentId) || nodesData[0];
        console.log('🌳 Setting root node:', rootNode.name);
        setCurrentNode(rootNode);
        isFirstNodesLoad = false;
      }

      setLoading(false);
    }, (err) => {
      console.error('Error listening to places:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      // Visa felet för användaren om det är ett index-problem
      if (err.code === 'failed-precondition') {
        setError('Firestore-index saknas. Kontakta administratören.');
      }
      setLoading(false);
    });

    // Cleanup
    return () => {
      unsubscribeControl();
      unsubscribeNodes();
    };
  }, [controlId, currentUser, currentTeam, hasTeam]);

  // Realtidslyssnare för remarks när currentNode ändras
  useEffect(() => {
    if (!currentNode?.id) {
      setRemarks([]);
      return;
    }

    console.log('Setting up remarks listener for node:', currentNode.id);

    const remarksQuery = query(
      collection(db, 'remarks'),
      where('placeId', '==', currentNode.id)
    );

    const unsubscribe = onSnapshot(remarksQuery, (snapshot) => {
      const remarksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sortera lokalt - nyaste först
      remarksData.sort((a, b) => {
        const aTime = a.createdAt?.seconds || a.createdAt?.getTime?.() || 0;
        const bTime = b.createdAt?.seconds || b.createdAt?.getTime?.() || 0;
        return bTime - aTime;
      });

      console.log('Remarks updated:', remarksData.length, 'for node', currentNode.name);
      setRemarks(remarksData);
    }, (err) => {
      console.error('Error listening to remarks:', err);
      setRemarks([]);
    });

    return () => unsubscribe();
  }, [currentNode?.id]);

  const loadRemarksForNode = async (nodeId) => {
    // Denna funktion behålls för bakåtkompatibilitet men remarks laddas nu via useEffect ovan
    console.log('loadRemarksForNode called for:', nodeId);
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
          where('placeId', '==', nodeId)
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
      console.error('Error loading all remarks:', err);
      return [];
    }
  };

  // Ny funktion för att hämta kontrollpunkter för PDF
  const loadKontrollpunkter = async () => {
    try {
      console.log('Loading kontrollpunkter for PDF');
      const q = query(
        collection(db, 'kontrollpunkter'),
        where('teamId', '==', currentTeam?.id)
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
        where('teamId', '==', currentTeam?.id),
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

    // Validate teamId exists for sync
    if (!currentTeam?.id) {
      toast.error('Team saknas. Logga ut och in igen.');
      return;
    }

    setSaving(true);

    const nodeData = {
      name: newNodeName.trim(),
      inspectionId: controlId,
      teamId: currentTeam.id,
      parentId: createAsChild && currentNode ? currentNode.id : null,
      order: nodes.filter(n => n.parentId === (createAsChild && currentNode ? currentNode.id : null)).length,
      hasRemarks: false,
      userId: currentUser.uid,
      createdBy: currentUser.uid
    };
    
    try {
      // Always try online operations (offline mode removed)
        // Try online save first
        const newNode = {
          ...nodeData,
          createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'places'), newNode);
        const createdNode = { id: docRef.id, ...newNode, createdAt: new Date() };
        
        setNodes(prev => [...prev, createdNode]);
        
        // Update control with rootNodeId if this is first node
        if (!currentNode && !control.rootNodeId) {
          await updateDoc(doc(db, 'inspections', controlId), {
            rootNodeId: docRef.id
          });
          setControl(prev => ({ ...prev, rootNodeId: docRef.id }));
        }
        
        console.log('Node added online successfully');
      
    } catch (error) {
      console.error('Failed to add node:', error);
      toast.error('Kunde inte lägga till nod. Kontrollera internetanslutning och försök igen.');
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

    // Validate teamId exists for sync
    if (!currentTeam?.id) {
      toast.error('Team saknas. Logga ut och in igen.');
      return;
    }

    setSaving(true);

    const remarkData = {
      placeId: currentNode.id,
      teamId: currentTeam.id,
      text: newRemarkText.trim(),
      priority: newRemarkPriority,
      images: remarkImages,
      userId: currentUser.uid,
      createdBy: currentUser.uid,
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
          await updateDoc(doc(db, 'places', currentNode.id), {
            hasRemarks: true
          });
          
          setCurrentNode(prev => ({ ...prev, hasRemarks: true }));
          setNodes(prev => prev.map(node => 
            node.id === currentNode.id ? { ...node, hasRemarks: true } : node
          ));
        }

        console.log('Remark saved online successfully');
        
        // Reset form on successful online save
        setNewRemarkText('');
        setNewRemarkPriority('');
        setRemarkImages([]);
        setShowAddRemark(false);
        
      
    } catch (error) {
      console.error('Failed to save remark:', error);
      toast.error('Kunde inte spara anmärkning. Kontrollera internetanslutning och försök igen.');
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

      console.log('Remark updated online successfully');

      // Reset form on successful save
      cancelEditRemark();

    } catch (error) {
      console.error('Failed to update remark:', error);
      toast.error('Kunde inte uppdatera anmärkning. Kontrollera internetanslutning.');
    } finally {
      setSaving(false);
    }
  };

  const navigateToNode = (node) => {
    if (node.id === currentNode?.id) return;
    setCurrentNode(node);
    // Remarks laddas automatiskt via useEffect när currentNode ändras
  };

  const getNodePath = (node) => {
    if (!node) return [];
    
    const path = [node];
    let currentNodeInPath = node;
    
    // Bygg path genom att följa parent-kedjan
    while (currentNodeInPath.parentId) {
      const parent = nodes.find(n => n.id === currentNodeInPath.parentId);
      if (parent) {
        path.unshift(parent);
        currentNodeInPath = parent;
      } else {
        break;
      }
    }
    
    return path;
  };

  const getChildNodes = (parentId) => {
    return nodes.filter(node => node.parentId === parentId);
  };

  const handleDeleteNode = async (nodeId, nodeName) => {
    confirmation.confirm({
      title: 'Ta bort nod',
      message: `Är du säker på att du vill ta bort "${nodeName}"? Detta tar också bort alla undernoder och anmärkningar.`,
      confirmText: 'Ja, ta bort',
      cancelText: 'Avbryt',
      confirmButtonClass: 'danger',
      onConfirm: async () => {
        setSaving(true);

        try {
          // Find all child nodes recursively for UI updates
          const findAllChildNodes = (parentId, allNodes) => {
            const children = allNodes.filter(n => n.parentId === parentId);
            let allChildren = [...children];
            children.forEach(child => {
              allChildren = [...allChildren, ...findAllChildNodes(child.id, allNodes)];
            });
            return allChildren;
          };

          const childNodes = findAllChildNodes(nodeId, nodes);
          const allNodesToDelete = [nodeId, ...childNodes.map(n => n.id)];

          // Online deletion
          for (const nId of allNodesToDelete) {
            const remarksQuery = query(collection(db, 'remarks'), where('placeId', '==', nId));
            const remarksSnapshot = await getDocs(remarksQuery);
            for (const remarkDoc of remarksSnapshot.docs) {
              await deleteDoc(doc(db, 'remarks', remarkDoc.id));
            }
          }

          for (const nId of allNodesToDelete) {
            await deleteDoc(doc(db, 'places', nId));
          }

          console.log('Node deleted online successfully');

          // Update local UI immediately
          const remainingNodes = nodes.filter(n => !allNodesToDelete.includes(n.id));
          setNodes(remainingNodes);

          // Handle current node change
          if (nodeId === currentNode?.id) {
            if (remainingNodes.length > 0) {
              const newCurrent = remainingNodes.find(n => !n.parentId) || remainingNodes[0];
              setCurrentNode(newCurrent);
              await loadRemarksForNode(newCurrent.id);
            } else {
              setCurrentNode(null);
              setRemarks([]);
            }
          }

        } catch (err) {
          console.error('Error deleting node:', err);
          toast.error('Kunde inte ta bort nod');
        } finally {
          setSaving(false);
        }
      }
    });
  };

  const handleDeleteRemark = async (remarkId) => {
    confirmation.confirm({
      title: 'Ta bort anmärkning',
      message: 'Är du säker på att du vill ta bort denna anmärkning?',
      confirmText: 'Ja, ta bort',
      cancelText: 'Avbryt',
      confirmButtonClass: 'danger',
      onConfirm: async () => {
        try {
          // Online deletion
          await deleteDoc(doc(db, 'remarks', remarkId));

          // Check if node still has remarks
          const remainingRemarks = remarks.filter(r => r.id !== remarkId);
          if (remainingRemarks.length === 0 && currentNode.hasRemarks) {
            await updateDoc(doc(db, 'places', currentNode.id), {
              hasRemarks: false
            });

            setCurrentNode(prev => ({ ...prev, hasRemarks: false }));
            setNodes(prev => prev.map(node =>
              node.id === currentNode.id ? { ...node, hasRemarks: false } : node
            ));
          }

          console.log('Remark deleted online successfully');

          // Update local UI immediately
          setRemarks(prev => prev.filter(r => r.id !== remarkId));

        } catch (err) {
          console.error('Error deleting remark:', err);
          toast.error('Kunde inte ta bort anmärkning');
        }
      }
    });
  };

  const handleEditNodeName = async (nodeId) => {
    if (!editingNodeName.trim()) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'places', nodeId), {
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
      toast.error('Kunde inte uppdatera nodnamn');
    } finally {
      setSaving(false);
    }
  };

  const handleEditControlName = async () => {
    if (!newControlName.trim()) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'inspections', controlId), {
        name: newControlName.trim(),
        updatedAt: serverTimestamp()
      });

      // Uppdatera local state
      setControl(prev => ({ ...prev, name: newControlName.trim() }));
      setEditingControlName(false);
      setNewControlName('');
    } catch (err) {
      console.error('Error updating control name:', err);
      toast.error('Kunde inte uppdatera kontrollnamn');
    } finally {
      setSaving(false);
    }
  };

  const toggleControlStatus = async () => {
    if (!control) return;

    setSaving(true);
    try {
      const newStatus = control.status === 'completed' ? 'active' : 'completed';

      await updateDoc(doc(db, 'inspections', controlId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      // Uppdatera local state
      setControl(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error('Error updating control status:', err);
      toast.error('Kunde inte uppdatera kontrollstatus');
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

  const deleteStorageImage = async (image) => {
    try {
      if (!image.path) {
        console.warn('No path for image, skipping storage deletion');
        return;
      }

      const imageRef = ref(storage, image.path);
      await deleteObject(imageRef);
      console.log('Image deleted successfully from Firebase Storage:', image.path);
    } catch (error) {
      console.error('Error deleting image from storage:', error);
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

  // Open annotation editor
  const openAnnotation = (image, remarkId, imageIndex) => {
    setAnnotationImage(image);
    setAnnotationRemarkId(remarkId);
    setAnnotationImageIndex(imageIndex);
    setShowAnnotation(true);
  };

  // Save annotated image
  const handleSaveAnnotation = async (blob, originalName) => {
    if (!annotationRemarkId || annotationImageIndex === null) return;

    try {
      // Upload the annotated image to Firebase Storage
      const timestamp = Date.now();
      const fileName = `annotated_${timestamp}_${originalName || 'image.png'}`;
      const storagePath = `teams/${currentTeam?.id}/controls/${controlId}/remarks/${annotationRemarkId}/${fileName}`;

      const imageRef = ref(storage, storagePath);
      const { uploadBytes, getDownloadURL } = await import('firebase/storage');
      await uploadBytes(imageRef, blob);
      const downloadUrl = await getDownloadURL(imageRef);

      // Update the remark with the new annotated image
      const remark = remarks.find(r => r.id === annotationRemarkId);
      if (remark) {
        const updatedImages = [...(remark.images || [])];
        updatedImages[annotationImageIndex] = {
          url: downloadUrl,
          path: storagePath,
          originalName: fileName,
          annotated: true
        };

        await updateDoc(doc(db, 'remarks', annotationRemarkId), {
          images: updatedImages,
          updatedAt: serverTimestamp()
        });

        // Update local state
        setRemarks(prev => prev.map(r =>
          r.id === annotationRemarkId
            ? { ...r, images: updatedImages }
            : r
        ));

        toast.success('Annoterad bild sparad');
      }
    } catch (error) {
      console.error('Error saving annotated image:', error);
      toast.error('Kunde inte spara annoterad bild');
    }

    // Close annotation modal
    setShowAnnotation(false);
    setAnnotationImage(null);
    setAnnotationRemarkId(null);
    setAnnotationImageIndex(null);
  };

  // Generera publik delningslänk
  const generatePublicLink = async () => {
    if (publicToken) return; // Redan genererad

    try {
      // Skapa unik token
      const token = `${controlId.substring(0, 8)}-${Date.now().toString(36)}`;

      // Spara till Firebase
      const controlRef = doc(db, 'inspections', controlId);
      await updateDoc(controlRef, {
        publicToken: token,
        teamName: currentTeam?.name || ''
      });

      setPublicToken(token);
      toast.success('Publik länk skapad!');
    } catch (error) {
      console.error('Error generating public link:', error);
      toast.error('Kunde inte skapa publik länk');
    }
  };

  // Hämta publik URL
  const getPublicUrl = () => {
    if (!publicToken) return null;
    const baseUrl = window.location.origin;
    return `${baseUrl}/view/${publicToken}`;
  };

  // Öppna datumväljare innan PDF genereras
  const handleGeneratePDF = () => {
    setPdfDate(new Date().toISOString().split('T')[0]);
    setShowPdfDateModal(true);
  };

  // Faktiskt generera PDF efter datum valts
  const doGeneratePDF = async () => {
    setShowPdfDateModal(false);
    if (!control || !nodes.length) {
      toast.error('Ingen kontrolldata att generera PDF från');
      return;
    }

    setGeneratingPDF(true);
    setPdfProgress({ percent: 0, message: 'Förbereder...', error: null });

    try {
      console.log('Starting PDF generation for control:', control.name);

      // Hämta ALLA anmärkningar för alla noder i kontrollen
      setPdfProgress({ percent: 10, message: 'Laddar anmärkningar...', error: null });
      const allRemarks = await loadAllRemarksForControl(nodes);

      // Räkna bilder
      let totalImages = 0;
      allRemarks.forEach(r => {
        if (r.images && r.images.length > 0) totalImages += r.images.length;
      });

      // Hämta kontrollpunkter och instruktionstext
      setPdfProgress({ percent: 20, message: 'Laddar kontrollpunkter...', error: null });
      const kontrollpunkter = await loadKontrollpunkter();
      const instructionText = await loadInstructionText();

      console.log('Data:', {
        nodes: nodes.length,
        allRemarks: allRemarks.length,
        totalImages,
        kontrollpunkter: kontrollpunkter.length
      });

      // Hämta profil för PDF - prioritera team-logga över användarens
      console.log('🖼️ PDF Logo Debug:', {
        teamLogoUrl: currentTeam?.logoUrl,
        userLogoUrl: userProfile?.logoUrl,
        currentTeam: currentTeam
      });

      const pdfUserProfile = {
        companyName: userProfile?.companyName || currentTeam?.name || currentUser?.displayName || '',
        phone: userProfile?.phone || '',
        website: userProfile?.website || '',
        logoUrl: currentTeam?.logoUrl || userProfile?.logoUrl || null
      };

      console.log('🖼️ Final pdfUserProfile:', pdfUserProfile);

      // Progress callback för PDF-generering
      const onProgress = (progress, message) => {
        const totalProgress = 30 + (progress * 0.65); // 30-95%
        setPdfProgress({
          percent: Math.min(95, totalProgress),
          message: totalImages > 0 ? `Genererar PDF... (${totalImages} bilder)` : 'Genererar PDF...',
          error: null
        });
      };

      // Generera PDF
      setPdfProgress({ percent: 30, message: totalImages > 0 ? `Laddar ${totalImages} bilder...` : 'Genererar PDF...', error: null });
      const pdfDoc = await generateControlPDF(control, nodes, allRemarks, pdfUserProfile, kontrollpunkter, instructionText, onProgress, pdfDate, getPublicUrl());

      // Hämta statistik
      const stats = pdfDoc.pdfStats || {};

      setPdfProgress({ percent: 95, message: 'Sparar PDF...', error: null });

      // Skapa filnamn
      const date = new Date().toLocaleDateString('sv-SE').replace(/\//g, '-');
      const fileName = `${control.name.replace(/[^a-zA-Z0-9\-_]/g, '_')}_${date}.pdf`;

      // Spara PDF
      pdfDoc.save(fileName);

      // Log PDF export
      if (logger) {
        logger.pdfExported(control.name);
      }

      console.log('PDF generated successfully:', fileName, stats);

      // Visa resultat med statistik
      let successMessage = `${fileName} har laddats ner`;
      if (stats.totalImages > 0) {
        successMessage += ` (${stats.loadedImages}/${stats.totalImages} bilder`;
        if (stats.failedImages > 0) {
          successMessage += `, ${stats.failedImages} kunde inte laddas`;
        }
        successMessage += `, ${stats.elapsedSeconds}s)`;
      }

      setPdfProgress({ percent: 100, message: successMessage, error: null });

      // Ingen auto-stängning - användaren stänger manuellt med X

    } catch (error) {
      console.error('Error generating PDF:', error);
      setPdfProgress({
        percent: 0,
        message: '',
        error: `Kunde inte generera PDF: ${error.message}`
      });
      // Behåll modalen öppen vid fel så användaren ser meddelandet
    }
  };


  const handleDeleteImageFromRemark = async (remarkId, imageIndex, image) => {
    confirmation.confirm({
      title: 'Ta bort bild',
      message: 'Är du säker på att du vill ta bort denna bild?',
      confirmText: 'Ja, ta bort',
      cancelText: 'Avbryt',
      confirmButtonClass: 'danger',
      onConfirm: async () => {
        try {
          // Ta bort från Firebase Storage
          await deleteStorageImage(image);

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
          toast.error('Kunde inte ta bort bild');
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="control-view">
        <div className="cv-loading">
          <div className="cv-spinner"></div>
          <span>Laddar kontroll...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="control-view">
        <div className="cv-card" style={{ textAlign: 'center', padding: '48px' }}>
          <h3 style={{ color: '#dc2626', marginBottom: '16px' }}>{error}</h3>
          <Link to="/customers" className="cv-btn cv-btn--primary">
            ← Tillbaka till kunder
          </Link>
        </div>
      </div>
    );
  }

  const nodePath = currentNode ? getNodePath(currentNode) : [];
  const childNodes = currentNode ? getChildNodes(currentNode.id) : getChildNodes(null);

  return (
    <div className="control-view">
      {/* Header */}
      <div className="cv-card" style={{ marginBottom: '20px' }}>
        <div className="cv-header">
          <div className="cv-header-left">
            <Link
              to={`/customers/${control?.customerId}`}
              className="cv-btn cv-btn--ghost cv-btn--sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              {control?.customerName}
            </Link>
          </div>
          <div>
            {editingControlName ? (
              <div className="cv-inline-edit">
                <input
                  type="text"
                  value={newControlName}
                  onChange={(e) => setNewControlName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleEditControlName()}
                  className="cv-inline-input"
                  autoFocus
                />
                <button
                  onClick={handleEditControlName}
                  disabled={saving || !newControlName.trim()}
                  className="cv-btn cv-btn--success cv-btn--sm"
                >
                  Spara
                </button>
                <button
                  onClick={() => {
                    setEditingControlName(false);
                    setNewControlName('');
                  }}
                  className="cv-btn cv-btn--secondary cv-btn--sm"
                >
                  Avbryt
                </button>
              </div>
            ) : (
              <h1
                className="cv-title"
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

          <div className="cv-header-actions">
            <button
              onClick={handleGeneratePDF}
              disabled={generatingPDF || !nodes.length}
              className="cv-btn cv-btn--success"
              title={!nodes.length ? 'Inga noder att exportera' : 'Exportera kontroll som PDF'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
              {generatingPDF ? 'Genererar...' : 'Exportera PDF'}
            </button>

            <span
              className={`cv-status-badge ${control?.status === 'completed' ? 'cv-status-badge--completed' : 'cv-status-badge--active'}`}
              onClick={toggleControlStatus}
              style={{ cursor: 'pointer' }}
              title="Klicka för att ändra status"
            >
              {control?.status === 'completed' ? 'Slutförd' : 'Aktiv'}
            </span>
          </div>
        </div>
      </div>

      {/* Om inga noder finns - Skapa första noden */}
      {nodes.length === 0 && (
        <div className="cv-card">
          <div className="cv-empty">
            <div className="cv-empty-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3 className="cv-empty-title">Välkommen till din nya kontroll!</h3>
            <p className="cv-empty-text">
              Börja med att skapa din första nod - det kan vara byggnadens namn, ett rum eller område.
            </p>

            {!showAddNode ? (
              <button
                onClick={() => {
                  setShowAddNode(true);
                  setAddAsChild(false);
                }}
                className="cv-btn cv-btn--primary"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Skapa första nod
              </button>
            ) : (
              <form onSubmit={(e) => handleAddNode(e, false)} style={{ maxWidth: '400px', margin: '0 auto' }}>
                <div className="cv-form-group">
                  <input
                    type="text"
                    value={newNodeName}
                    onChange={(e) => setNewNodeName(e.target.value)}
                    placeholder="T.ex. Barnhusgatan 24, Entréhall, Källare..."
                    className="cv-input"
                    autoFocus
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddNode(false);
                      setNewNodeName('');
                    }}
                    className="cv-btn cv-btn--secondary"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !newNodeName.trim()}
                    className="cv-btn cv-btn--primary"
                  >
                    {saving ? 'Skapar...' : 'Skapa'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Main Content - om vi har noder */}
      {nodes.length > 0 && (
        <div className="cv-content" style={{ display: 'block' }}>
          {/* Navigation Card */}
          <div className="cv-card cv-sidebar" style={{ marginBottom: '20px', position: 'relative', top: 'auto' }}>
            <div className="cv-card-header" style={{ border: 'none', padding: '0 0 16px 0' }}>
              <h3 className="cv-sidebar-title" style={{ margin: 0 }}>Navigering</h3>
              <button
                onClick={() => {
                  setShowAddNode(true);
                  setAddAsChild(false);
                }}
                className="cv-btn cv-btn--secondary cv-btn--sm"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Huvudnod
              </button>
            </div>

            {/* Navigation tree */}
            <div style={{ maxHeight: windowWidth <= 768 ? '200px' : 'none', overflowY: windowWidth <= 768 ? 'auto' : 'visible' }}>
              {nodes.filter(n => !n.parentId).map(rootNode => (
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
          <div className="cv-main">
            {/* Breadcrumb */}
            {nodePath.length > 0 && (
              <div className="cv-card" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  {nodePath.map((node, index) => (
                    <React.Fragment key={node.id}>
                      <button
                        onClick={() => navigateToNode(node)}
                        className={`cv-btn cv-btn--ghost cv-btn--sm ${index === nodePath.length - 1 ? 'active' : ''}`}
                        style={{
                          color: index === nodePath.length - 1 ? '#6366F1' : '#64748b',
                          fontWeight: index === nodePath.length - 1 ? '600' : 'normal'
                        }}
                      >
                        {windowWidth <= 480 && node.name.length > 15
                          ? `${node.name.substring(0, 15)}...`
                          : node.name
                        }
                      </button>
                      {index < nodePath.length - 1 && (
                        <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Current Node Content */}
            {currentNode && (
              <div className="cv-node-card">
                <div className="cv-card-header" style={{ padding: '0 0 20px 0', border: 'none' }}>
                  {editingNodeId === currentNode.id ? (
                    <div className="cv-inline-edit" style={{ width: '100%' }}>
                      <input
                        type="text"
                        value={editingNodeName}
                        onChange={(e) => setEditingNodeName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleEditNodeName(currentNode.id)}
                        className="cv-inline-input"
                        autoFocus
                      />
                      <button
                        onClick={() => handleEditNodeName(currentNode.id)}
                        disabled={saving || !editingNodeName.trim()}
                        className="cv-btn cv-btn--success cv-btn--sm"
                      >
                        Spara
                      </button>
                      <button
                        onClick={() => {
                          setEditingNodeId(null);
                          setEditingNodeName('');
                        }}
                        className="cv-btn cv-btn--secondary cv-btn--sm"
                      >
                        Avbryt
                      </button>
                    </div>
                  ) : (
                    <h2
                      className="cv-node-title"
                      onClick={() => {
                        setEditingNodeId(currentNode.id);
                        setEditingNodeName(currentNode.name);
                      }}
                      title="Klicka för att redigera namn"
                      style={{ cursor: 'pointer', flex: 1 }}
                    >
                      {currentNode.name}
                    </h2>
                  )}

                  <div className="cv-header-actions">
                    <button
                      onClick={() => {
                        setShowAddNode(true);
                        setAddAsChild(true);
                      }}
                      className="cv-btn cv-btn--secondary"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Undernod
                    </button>

                    <button
                      onClick={() => setShowAddRemark(true)}
                      className="cv-btn cv-btn--primary"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Anmärkning
                    </button>

                    <button
                      onClick={() => handleDeleteNode(currentNode.id, currentNode.name)}
                      disabled={saving}
                      className="cv-btn cv-btn--danger"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                      Ta bort
                    </button>
                  </div>
                </div>

                {/* Child nodes */}
                {childNodes.length > 0 && (
                  <div className="cv-subnodes">
                    <h4 className="cv-subnodes-title">Undernoder</h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: windowWidth > 768
                        ? 'repeat(auto-fill, minmax(200px, 1fr))'
                        : windowWidth > 480
                          ? 'repeat(2, 1fr)'
                          : '1fr',
                      gap: '8px'
                    }}>
                      {childNodes.map(node => (
                        <div
                          key={node.id}
                          className="cv-subnode-item"
                          onClick={() => navigateToNode(node)}
                        >
                          <span className="cv-subnode-name">{node.name}</span>
                          <span className="cv-subnode-arrow">
                            {node.hasRemarks && (
                              <span style={{
                                width: '8px',
                                height: '8px',
                                background: '#f59e0b',
                                borderRadius: '50%',
                                display: 'inline-block',
                                marginRight: '8px'
                              }} />
                            )}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="9 18 15 12 9 6"/>
                            </svg>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remarks */}
                <div className="cv-remarks">
                  <h4 className="cv-remarks-title">Anmärkningar ({remarks.length})</h4>

                  {remarks.length === 0 ? (
                    <div className="cv-empty" style={{ padding: '32px' }}>
                      <p className="cv-empty-text" style={{ margin: 0 }}>
                        Inga anmärkningar för denna nod. Klicka på "+ Anmärkning" för att lägga till en.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {remarks.map(remark => (
                        <div
                          key={remark.id}
                          className={`cv-remark-card ${remark.priority ? `cv-remark-card--priority-${remark.priority}` : ''}`}
                        >
                          <div className="cv-remark-header">
                            {remark.priority && (
                              <span className={`cv-remark-priority cv-remark-priority--${remark.priority}`}>
                                Prioritet {remark.priority}
                              </span>
                            )}
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              {remark.createdAt?.toDate?.()?.toLocaleString('sv-SE') ||
                               remark.createdAt?.toLocaleString?.('sv-SE') || 'Nu'}
                            </span>
                          </div>

                          <div className="cv-remark-actions">
                            <button
                              onClick={() => startEditRemark(remark)}
                              className="cv-btn cv-btn--ghost cv-btn--sm"
                              title="Redigera anmärkning"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteRemark(remark.id)}
                              className="cv-btn cv-btn--ghost cv-btn--sm"
                              style={{ color: '#dc2626' }}
                              title="Ta bort anmärkning"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </button>
                          </div>

                          <p className="cv-remark-text">{remark.text}</p>

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
                                    src={image.url || image.remoteUrl}
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
                                  {/* Rita-knapp */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openAnnotation(image, remark.id, imageIndex);
                                    }}
                                    style={{
                                      position: 'absolute',
                                      top: '2px',
                                      left: '2px',
                                      background: 'rgba(59, 130, 246, 0.9)',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      padding: '2px 6px',
                                      cursor: 'pointer',
                                      fontSize: '10px',
                                      fontWeight: '600',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '2px'
                                    }}
                                    title="Rita på bilden"
                                  >
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M12 19l7-7 3 3-7 7-3-3z"/>
                                      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                                    </svg>
                                    Rita
                                  </button>
                                  {/* Annoterad badge */}
                                  {image.annotated && (
                                    <span style={{
                                      position: 'absolute',
                                      bottom: '2px',
                                      left: '2px',
                                      background: 'rgba(16, 185, 129, 0.9)',
                                      color: 'white',
                                      padding: '1px 4px',
                                      borderRadius: '3px',
                                      fontSize: '9px',
                                      fontWeight: '600'
                                    }}>
                                      Annoterad
                                    </span>
                                  )}
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
        <div className="cv-modal-overlay">
          <div className="cv-modal">
            <div className="cv-modal-header">
              <h3 className="cv-modal-title">
                {addAsChild ? 'Lägg till undernod' : 'Lägg till huvudnod'}
              </h3>
              <button
                onClick={() => {
                  setShowAddNode(false);
                  setNewNodeName('');
                }}
                className="cv-modal-close"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 1L13 13M1 13L13 1" />
                </svg>
              </button>
            </div>

            <div className="cv-modal-body">
              {currentNode && addAsChild && (
                <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '14px' }}>
                  Skapar undernod till: <strong>{currentNode.name}</strong>
                </p>
              )}

              {!addAsChild && (
                <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '14px' }}>
                  Skapar ny huvudnod på toppnivå
                </p>
              )}

              <form onSubmit={(e) => handleAddNode(e, addAsChild)}>
                <div className="cv-form-group">
                  <label className="cv-label">Nodnamn</label>
                  <input
                    type="text"
                    value={newNodeName}
                    onChange={(e) => setNewNodeName(e.target.value)}
                    placeholder="T.ex. Källare, Elcentral, Rum 101..."
                    className="cv-input"
                    autoFocus
                  />
                </div>

                <div className="cv-modal-footer" style={{ padding: '16px 0 0 0' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddNode(false);
                      setNewNodeName('');
                    }}
                    className="cv-btn cv-btn--secondary"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !newNodeName.trim()}
                    className="cv-btn cv-btn--primary"
                  >
                    {saving ? 'Skapar...' : 'Skapa nod'}
                  </button>
                </div>
              </form>
            </div>
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
                  <option value="A">A - Åtgärdas snarast</option>
                  <option value="B">B - Bör åtgärdas</option>
                  <option value="C">C - Notering</option>
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
                          src={image.url || image.remoteUrl}
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
                    background: saving || !newRemarkText.trim() ? '#9ca3af' : '#6366F1',
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
                  <option value="A">A - Åtgärdas snarast</option>
                  <option value="B">B - Bör åtgärdas</option>
                  <option value="C">C - Notering</option>
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
                          src={image.url || image.remoteUrl}
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
                    background: saving || !editingRemarkText.trim() ? '#9ca3af' : '#6366F1',
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

      {/* Image Annotation Modal */}
      <ImageAnnotation
        isOpen={showAnnotation}
        onClose={() => {
          setShowAnnotation(false);
          setAnnotationImage(null);
          setAnnotationRemarkId(null);
          setAnnotationImageIndex(null);
        }}
        imageUrl={annotationImage?.url || annotationImage?.remoteUrl}
        imageName={annotationImage?.originalName}
        onSave={handleSaveAnnotation}
      />

      {/* PDF Datumväljare Modal */}
      {showPdfDateModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
              Generera PDF
            </h3>

            {/* Datum */}
            <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>
              Datum för protokollet:
            </p>
            <input
              type="date"
              value={pdfDate}
              onChange={(e) => setPdfDate(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                marginBottom: '20px',
                boxSizing: 'border-box'
              }}
            />

            {/* Publik länk */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <p style={{ margin: '0 0 8px 0', color: '#475569', fontSize: '13px', fontWeight: '500' }}>
                Digital visning för kunder:
              </p>
              {publicToken ? (
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '8px 12px'
                  }}>
                    <span style={{ flex: 1, fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {getPublicUrl()}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(getPublicUrl());
                        toast.success('Länk kopierad!');
                      }}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      Kopiera
                    </button>
                  </div>
                  <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                    Länken inkluderas automatiskt i PDF:en
                  </p>
                </div>
              ) : (
                <button
                  onClick={generatePublicLink}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: '#4f46e5',
                    cursor: 'pointer'
                  }}
                >
                  + Skapa delningslänk
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowPdfDateModal(false)}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Avbryt
              </button>
              <button
                onClick={doGeneratePDF}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Generera PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Generering Loading Modal */}
      {generatingPDF && (
        <div className="cv-modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="cv-pdf-modal">
            {/* Stäng-knapp (X) */}
            <button
              onClick={() => {
                setGeneratingPDF(false);
                setPdfProgress({ percent: 0, message: '', error: null });
              }}
              className="cv-pdf-close"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 1L13 13M1 13L13 1" />
              </svg>
            </button>

            {/* Ikon/Spinner */}
            {pdfProgress.error ? (
              <div className="cv-pdf-icon cv-pdf-icon--error">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9L9 15M9 9L15 15" />
                </svg>
              </div>
            ) : pdfProgress.percent === 100 ? (
              <div className="cv-pdf-icon cv-pdf-icon--success">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17L4 12" />
                </svg>
              </div>
            ) : (
              <div className="cv-pdf-icon cv-pdf-icon--loading" />
            )}

            {/* Titel */}
            <h3 className={`cv-pdf-title ${pdfProgress.error ? 'cv-pdf-title--error' : pdfProgress.percent === 100 ? 'cv-pdf-title--success' : ''}`}>
              {pdfProgress.error ? 'Fel vid generering' : pdfProgress.percent === 100 ? 'PDF klar!' : 'Genererar PDF'}
            </h3>

            {/* Meddelande */}
            <p className="cv-pdf-message" style={{ color: pdfProgress.error ? '#dc2626' : '#64748b' }}>
              {pdfProgress.error || pdfProgress.message}
            </p>

            {/* Progress bar */}
            {!pdfProgress.error && pdfProgress.percent < 100 && (
              <>
                <div className="cv-pdf-progress">
                  <div className="cv-pdf-progress-bar" style={{ width: `${pdfProgress.percent}%` }} />
                </div>
                <span className="cv-pdf-percent">{Math.round(pdfProgress.percent)}%</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Notification system removed with offline functionality */}
    </div>
  );
};

// Helper component för node tree rendering
const NodeTreeItem = ({ node, nodes, currentNode, onNavigate, level }) => {
  const [expanded, setExpanded] = useState(true);
  const children = nodes.filter(n => n.parentId === node.id);
  const hasChildren = children.length > 0;
  const isActive = currentNode?.id === node.id;

  return (
    <div style={{ marginLeft: `${level * 16}px` }}>
      <div
        className={`cv-tree-item ${isActive ? 'cv-tree-item--active' : ''}`}
        onClick={() => onNavigate(node)}
      >
        {hasChildren && (
          <span
            className="cv-tree-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
            >
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
        )}

        <span style={{ flex: 1 }}>{node.name}</span>

        {node.hasRemarks && (
          <span style={{
            width: '6px',
            height: '6px',
            background: '#f59e0b',
            borderRadius: '50%',
            marginLeft: '4px',
            flexShrink: 0
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