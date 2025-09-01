// src/pages/Kontrollpunkter.js - Hantera lista över kontrollpunkter
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../services/firebase';

const Kontrollpunkter = () => {
  const { currentUser } = useAuth();
  const [kontrollpunkter, setKontrollpunkter] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [instructionText, setInstructionText] = useState('');
  const [savingInstruction, setSavingInstruction] = useState(false);

  useEffect(() => {
    loadKontrollpunkter();
    loadInstructionText();
  }, [currentUser]);

  const loadKontrollpunkter = async () => {
    if (!currentUser) return;

    try {
      console.log('Loading kontrollpunkter for user:', currentUser.uid);
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
      
      setKontrollpunkter(items);
    } catch (error) {
      console.error('Error loading kontrollpunkter:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInstructionText = async () => {
    if (!currentUser) return;

    try {
      const q = query(
        collection(db, 'settings'),
        where('userId', '==', currentUser.uid),
        where('type', '==', 'kontrollpunkter_instruction')
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setInstructionText(doc.data().text || '');
      }
    } catch (error) {
      console.error('Error loading instruction text:', error);
    }
  };

  const saveInstructionText = async () => {
    if (!currentUser) return;

    setSavingInstruction(true);
    try {
      // Kolla om det redan finns en instruktionstext
      const q = query(
        collection(db, 'settings'),
        where('userId', '==', currentUser.uid),
        where('type', '==', 'kontrollpunkter_instruction')
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Skapa ny
        await addDoc(collection(db, 'settings'), {
          userId: currentUser.uid,
          type: 'kontrollpunkter_instruction',
          text: instructionText.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        // Uppdatera befintlig
        const docId = snapshot.docs[0].id;
        await updateDoc(doc(db, 'settings', docId), {
          text: instructionText.trim(),
          updatedAt: serverTimestamp()
        });
      }
      
      console.log('Instruction text saved successfully');
      alert('Instruktionstext sparad!');
    } catch (error) {
      console.error('Error saving instruction text:', error);
      alert('Kunde inte spara instruktionstext');
    } finally {
      setSavingInstruction(false);
    }
  };

  const addKontrollpunkt = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    try {
      const newOrder = kontrollpunkter.length > 0 
        ? Math.max(...kontrollpunkter.map(k => k.order || 0)) + 1 
        : 1;

      const docRef = await addDoc(collection(db, 'kontrollpunkter'), {
        text: newItem.trim(),
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
      alert('Kunde inte lägga till kontrollpunkt');
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
      alert('Kunde inte uppdatera kontrollpunkt');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const deleteKontrollpunkt = async (id) => {
    if (!window.confirm('Är du säker på att du vill ta bort denna kontrollpunkt?')) return;

    try {
      await deleteDoc(doc(db, 'kontrollpunkter', id));
      setKontrollpunkter(kontrollpunkter.filter(k => k.id !== id));
    } catch (error) {
      console.error('Error deleting kontrollpunkt:', error);
      alert('Kunde inte ta bort kontrollpunkt');
    }
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px'
      }}>
        <div>Laddar kontrollpunkter...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ 
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '8px'
        }}>
          Kontrollpunkter
        </h1>
        <p style={{ 
          color: '#6b7280',
          fontSize: '16px',
          lineHeight: '1.5',
          marginBottom: '16px'
        }}>
          Skapa en lista över vad du kontrollerar. Denna lista visas i PDF-rapporten.
        </p>
        
        {/* Instruktionstext fält */}
        <div style={{ 
          background: 'white',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <label style={{ 
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Instruktionstext (visas före kontrollpunkterna):
          </label>
          <textarea
            value={instructionText}
            onChange={(e) => setInstructionText(e.target.value)}
            placeholder="T.ex. 'Dessa punkter är vad vi går igenom under kontrollen'"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              minHeight: '80px',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
          <button 
            onClick={saveInstructionText}
            disabled={savingInstruction}
            style={{
              marginTop: '12px',
              padding: '8px 16px',
              background: savingInstruction ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: savingInstruction ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {savingInstruction ? 'Sparar...' : 'Spara instruktionstext'}
          </button>
        </div>
      </div>

      {/* Add new kontrollpunkt */}
      <div style={{ 
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        marginBottom: '24px'
      }}>
        <form onSubmit={addKontrollpunkt}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Lägg till en kontrollpunkt..."
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
            <button
              type="submit"
              disabled={!newItem.trim()}
              style={{
                padding: '12px 24px',
                background: newItem.trim() ? '#10b981' : '#9ca3af',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: newItem.trim() ? 'pointer' : 'not-allowed',
                fontWeight: '500',
                transition: 'background 0.2s'
              }}
            >
              Lägg till
            </button>
          </div>
        </form>
      </div>

      {/* Kontrollpunkter list */}
      <div style={{ 
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        {kontrollpunkter.length === 0 ? (
          <div style={{ 
            padding: '48px 24px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <p style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
              Inga kontrollpunkter ännu
            </p>
            <p style={{ fontSize: '14px' }}>
              Lägg till din första kontrollpunkt ovan för att komma igång
            </p>
          </div>
        ) : (
          <div>
            {kontrollpunkter.map((item, index) => (
              <div 
                key={item.id}
                style={{
                  padding: '16px 24px',
                  borderBottom: index < kontrollpunkter.length - 1 ? '1px solid #e5e7eb' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: '#e0f2fe',
                  color: '#0369a1',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  flexShrink: 0
                }}>
                  {index + 1}
                </div>

                {editingId === item.id ? (
                  <div style={{ flex: 1, display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #3b82f6',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                    />
                    <button
                      onClick={saveEdit}
                      style={{
                        padding: '6px 12px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Spara
                    </button>
                    <button
                      onClick={cancelEdit}
                      style={{
                        padding: '6px 12px',
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Avbryt
                    </button>
                  </div>
                ) : (
                  <div style={{ 
                    flex: 1,
                    fontSize: '16px',
                    color: '#1f2937',
                    lineHeight: '1.5'
                  }}>
                    {item.text}
                  </div>
                )}

                {editingId !== item.id && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => startEditing(item.id, item.text)}
                      style={{
                        padding: '6px',
                        background: 'transparent',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: '#6b7280'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#f3f4f6';
                        e.target.style.color = '#374151';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'transparent';
                        e.target.style.color = '#6b7280';
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteKontrollpunkt(item.id)}
                      style={{
                        padding: '6px',
                        background: 'transparent',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: '#dc2626'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#fef2f2';
                        e.target.style.borderColor = '#dc2626';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'transparent';
                        e.target.style.borderColor = '#d1d5db';
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {kontrollpunkter.length > 0 && (
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '8px'
        }}>
          <p style={{ 
            margin: 0,
            fontSize: '14px',
            color: '#0369a1'
          }}>
            💡 Dessa kontrollpunkter kommer att visas överst i alla PDF-rapporter
          </p>
        </div>
      )}
    </div>
  );
};

export default Kontrollpunkter;