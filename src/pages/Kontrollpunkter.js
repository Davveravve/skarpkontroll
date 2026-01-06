// src/pages/Kontrollpunkter.js - Checkpoints management page
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useToast } from '../components/ui/Toast';
import { useConfirmation } from '../components/ConfirmationProvider';
import './Kontrollpunkter.css';

const Kontrollpunkter = () => {
  const { currentUser } = useAuth();
  const { currentTeam, hasTeam } = useTeam();
  const toast = useToast();
  const confirmation = useConfirmation();
  const [kontrollpunkter, setKontrollpunkter] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [instructionText, setInstructionText] = useState('');
  const [savingInstruction, setSavingInstruction] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);

  useEffect(() => {
    if (currentUser && hasTeam && currentTeam?.id) {
      loadKontrollpunkter();
      loadInstructionText();
    } else {
      setLoading(false);
    }
  }, [currentUser, currentTeam, hasTeam]);

  const loadKontrollpunkter = async () => {
    if (!currentUser || !currentTeam?.id) return;

    try {
      const q = query(
        collection(db, 'kontrollpunkter'),
        where('teamId', '==', currentTeam.id)
      );

      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      items.sort((a, b) => (a.order || 0) - (b.order || 0));
      setKontrollpunkter(items);
    } catch (error) {
      console.error('Error loading kontrollpunkter:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInstructionText = async () => {
    if (!currentUser || !currentTeam?.id) return;

    try {
      const q = query(
        collection(db, 'settings'),
        where('teamId', '==', currentTeam.id),
        where('type', '==', 'kontrollpunkter_instruction')
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        setInstructionText(docData.data().text || '');
      }
    } catch (error) {
      console.error('Error loading instruction text:', error);
    }
  };

  const saveInstructionText = async () => {
    if (!currentUser || !currentTeam?.id) return;

    setSavingInstruction(true);
    try {
      const q = query(
        collection(db, 'settings'),
        where('teamId', '==', currentTeam.id),
        where('type', '==', 'kontrollpunkter_instruction')
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        await addDoc(collection(db, 'settings'), {
          teamId: currentTeam.id,
          userId: currentUser.uid,
          type: 'kontrollpunkter_instruction',
          text: instructionText.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        const docId = snapshot.docs[0].id;
        await updateDoc(doc(db, 'settings', docId), {
          text: instructionText.trim(),
          updatedAt: serverTimestamp()
        });
      }

      toast.success('Instruktionstext sparad!');
    } catch (error) {
      console.error('Error saving instruction text:', error);
      toast.error('Kunde inte spara instruktionstext');
    } finally {
      setSavingInstruction(false);
    }
  };

  const addKontrollpunkt = async (e) => {
    e.preventDefault();
    if (!newItem.trim() || !currentTeam?.id) return;

    try {
      const newOrder = kontrollpunkter.length > 0
        ? Math.max(...kontrollpunkter.map(k => k.order || 0)) + 1
        : 1;

      const docRef = await addDoc(collection(db, 'kontrollpunkter'), {
        text: newItem.trim(),
        teamId: currentTeam.id,
        userId: currentUser.uid,
        order: newOrder,
        createdAt: serverTimestamp()
      });

      const newKontrollpunkt = {
        id: docRef.id,
        text: newItem.trim(),
        userId: currentUser.uid,
        order: newOrder,
        createdAt: new Date()
      };

      setKontrollpunkter([...kontrollpunkter, newKontrollpunkt]);
      setNewItem('');
    } catch (error) {
      console.error('Error adding kontrollpunkt:', error);
      toast.error('Kunde inte lägga till kontrollpunkt');
    }
  };

  const startEditing = (id, text) => {
    setEditingId(id);
    setEditingText(text);
  };

  const saveEdit = async () => {
    if (!editingText.trim()) return;

    try {
      await updateDoc(doc(db, 'kontrollpunkter', editingId), {
        text: editingText.trim()
      });

      setKontrollpunkter(kontrollpunkter.map(k =>
        k.id === editingId
          ? { ...k, text: editingText.trim() }
          : k
      ));

      setEditingId(null);
      setEditingText('');
    } catch (error) {
      console.error('Error updating kontrollpunkt:', error);
      toast.error('Kunde inte uppdatera kontrollpunkt');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const deleteKontrollpunkt = async (id) => {
    confirmation.confirm({
      title: 'Ta bort kontrollpunkt',
      message: 'Är du säker på att du vill ta bort denna kontrollpunkt?',
      confirmText: 'Ja, ta bort',
      cancelText: 'Avbryt',
      confirmButtonClass: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'kontrollpunkter', id));
          setKontrollpunkter(kontrollpunkter.filter(k => k.id !== id));
        } catch (error) {
          console.error('Error deleting kontrollpunkt:', error);
          toast.error('Kunde inte ta bort kontrollpunkt');
        }
      }
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    // Add a slight delay to show the dragging state
    setTimeout(() => {
      e.target.closest('.kontrollpunkter-item').classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = (e) => {
    setDraggedItem(null);
    setDragOverItem(null);
    e.target.closest('.kontrollpunkter-item')?.classList.remove('dragging');
  };

  const handleDragOver = (e, item) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedItem && item.id !== draggedItem.id) {
      setDragOverItem(item);
    }
  };

  const handleDragLeave = (e) => {
    // Only clear if we're leaving the item entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverItem(null);
    }
  };

  const handleDrop = async (e, dropTarget) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === dropTarget.id) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const draggedIndex = kontrollpunkter.findIndex(k => k.id === draggedItem.id);
    const dropIndex = kontrollpunkter.findIndex(k => k.id === dropTarget.id);

    if (draggedIndex === -1 || dropIndex === -1) return;

    // Create new array with reordered items
    const newItems = [...kontrollpunkter];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(dropIndex, 0, removed);

    // Update local state immediately for responsiveness
    setKontrollpunkter(newItems);
    setDraggedItem(null);
    setDragOverItem(null);

    // Update order in Firebase
    try {
      const updatePromises = newItems.map((item, index) =>
        updateDoc(doc(db, 'kontrollpunkter', item.id), { order: index + 1 })
      );
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Kunde inte spara ordning');
      // Reload to get correct order
      loadKontrollpunkter();
    }
  };

  if (loading) {
    return (
      <div className="kontrollpunkter">
        <div className="kontrollpunkter-loading">
          <div className="kontrollpunkter-spinner"></div>
          <span>Laddar kontrollpunkter...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="kontrollpunkter">
      {/* Header */}
      <header className="kontrollpunkter-header">
        <div className="kontrollpunkter-header-content">
          <h1 className="kontrollpunkter-title">Kontrollpunkter</h1>
          <p className="kontrollpunkter-subtitle">
            Skapa en lista över vad du kontrollerar. Denna lista visas i PDF-rapporten.
          </p>
        </div>
      </header>

      {/* Instruction Text Card */}
      <div className="kontrollpunkter-card">
        <div className="kontrollpunkter-card-header">
          <h2>Instruktionstext</h2>
          <p>Visas före kontrollpunkterna i PDF-rapporten</p>
        </div>
        <div className="kontrollpunkter-card-body">
          <textarea
            value={instructionText}
            onChange={(e) => setInstructionText(e.target.value)}
            placeholder="T.ex. 'Dessa punkter är vad vi går igenom under kontrollen'"
            className="kontrollpunkter-textarea"
          />
          <button
            onClick={saveInstructionText}
            disabled={savingInstruction}
            className="kontrollpunkter-btn kontrollpunkter-btn--success"
          >
            {savingInstruction ? 'Sparar...' : 'Spara instruktionstext'}
          </button>
        </div>
      </div>

      {/* Add New Card */}
      <div className="kontrollpunkter-card">
        <div className="kontrollpunkter-card-header">
          <h2>Lägg till kontrollpunkt</h2>
          <p>Skapa en ny punkt att kontrollera</p>
        </div>
        <div className="kontrollpunkter-card-body">
          <form onSubmit={addKontrollpunkt} className="kontrollpunkter-add-form">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Lägg till en kontrollpunkt..."
              className="kontrollpunkter-input"
            />
            <button
              type="submit"
              disabled={!newItem.trim()}
              className="kontrollpunkter-btn kontrollpunkter-btn--primary"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Lägg till
            </button>
          </form>
        </div>
      </div>

      {/* List Card */}
      <div className="kontrollpunkter-card">
        <div className="kontrollpunkter-card-header">
          <h2>Dina kontrollpunkter</h2>
          <p>{kontrollpunkter.length} {kontrollpunkter.length === 1 ? 'punkt' : 'punkter'}</p>
        </div>
        <div className="kontrollpunkter-card-body kontrollpunkter-card-body--flush">
          {kontrollpunkter.length === 0 ? (
            <div className="kontrollpunkter-empty">
              <div className="kontrollpunkter-empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              </div>
              <h3>Inga kontrollpunkter ännu</h3>
              <p>Lägg till din första kontrollpunkt ovan för att komma igång</p>
            </div>
          ) : (
            <div className="kontrollpunkter-list">
              {kontrollpunkter.map((item, index) => (
                <div
                  key={item.id}
                  className={`kontrollpunkter-item ${dragOverItem?.id === item.id ? 'drag-over' : ''}`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                  draggable={editingId !== item.id}
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, item)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, item)}
                >
                  <div className="kontrollpunkter-drag-handle" title="Dra för att ändra ordning">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="9" cy="5" r="1"/>
                      <circle cx="9" cy="12" r="1"/>
                      <circle cx="9" cy="19" r="1"/>
                      <circle cx="15" cy="5" r="1"/>
                      <circle cx="15" cy="12" r="1"/>
                      <circle cx="15" cy="19" r="1"/>
                    </svg>
                  </div>
                  <div className="kontrollpunkter-item-number">{index + 1}</div>

                  {editingId === item.id ? (
                    <div className="kontrollpunkter-item-edit">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="kontrollpunkter-input"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        autoFocus
                      />
                      <button onClick={saveEdit} className="kontrollpunkter-btn kontrollpunkter-btn--small kontrollpunkter-btn--success">
                        Spara
                      </button>
                      <button onClick={cancelEdit} className="kontrollpunkter-btn kontrollpunkter-btn--small kontrollpunkter-btn--secondary">
                        Avbryt
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="kontrollpunkter-item-text">{item.text}</div>
                      <div className="kontrollpunkter-item-actions">
                        <button
                          onClick={() => startEditing(item.id, item.text)}
                          className="kontrollpunkter-action-btn"
                          title="Redigera"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteKontrollpunkt(item.id)}
                          className="kontrollpunkter-action-btn kontrollpunkter-action-btn--danger"
                          title="Ta bort"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info Notice */}
      {kontrollpunkter.length > 0 && (
        <div className="kontrollpunkter-notice">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
          </svg>
          Dessa kontrollpunkter kommer att visas överst i alla PDF-rapporter
        </div>
      )}
    </div>
  );
};

export default Kontrollpunkter;
