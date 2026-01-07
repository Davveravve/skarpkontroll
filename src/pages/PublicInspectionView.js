// src/pages/PublicInspectionView.js - Publik sida för att visa anmärkningar
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import './PublicInspectionView.css';

const priorityConfig = {
  A: { color: '#dc2626', bg: '#fef2f2', label: 'Åtgärdas snarast' },
  B: { color: '#f59e0b', bg: '#fffbeb', label: 'Bör åtgärdas' },
  C: { color: '#22c55e', bg: '#f0fdf4', label: 'Notering' },
};

const PublicInspectionView = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [control, setControl] = useState(null);
  const [places, setPlaces] = useState([]);
  const [remarks, setRemarks] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    loadInspectionData();
  }, [token]);

  const loadInspectionData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Hitta kontrollen med denna publika token
      const controlsQuery = query(
        collection(db, 'inspections'),
        where('publicToken', '==', token)
      );
      const controlsSnapshot = await getDocs(controlsQuery);

      if (controlsSnapshot.empty) {
        setError('Kunde inte hittas eller länken är ogiltig.');
        setLoading(false);
        return;
      }

      const controlDoc = controlsSnapshot.docs[0];
      const controlData = { id: controlDoc.id, ...controlDoc.data() };
      setControl(controlData);
      setCompanyName(controlData.teamName || controlData.companyName || '');

      // Hämta team-logotyp om teamId finns
      console.log('🖼️ PublicView: controlData.teamId =', controlData.teamId);
      if (controlData.teamId) {
        try {
          const teamDoc = await getDoc(doc(db, 'teams', controlData.teamId));
          console.log('🖼️ PublicView: teamDoc exists =', teamDoc.exists());
          if (teamDoc.exists()) {
            console.log('🖼️ PublicView: team data =', teamDoc.data());
            if (teamDoc.data().logoUrl) {
              console.log('🖼️ PublicView: Setting logoUrl =', teamDoc.data().logoUrl);
              setLogoUrl(teamDoc.data().logoUrl);
            }
          }
        } catch (err) {
          console.error('🖼️ PublicView: Could not load team logo:', err);
        }
      } else {
        console.log('🖼️ PublicView: No teamId on control');
      }

      // Hämta platser
      const placesQuery = query(
        collection(db, 'places'),
        where('inspectionId', '==', controlData.id)
      );
      const placesSnapshot = await getDocs(placesQuery);
      const placesData = placesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPlaces(placesData);

      // Hämta alla anmärkningar för alla platser
      const allRemarks = [];
      for (const place of placesData) {
        const remarksQuery = query(
          collection(db, 'remarks'),
          where('placeId', '==', place.id)
        );
        const remarksSnapshot = await getDocs(remarksQuery);
        remarksSnapshot.docs.forEach(doc => {
          allRemarks.push({
            id: doc.id,
            placeName: place.name,
            ...doc.data()
          });
        });
      }

      // Sortera efter prioritet
      allRemarks.sort((a, b) => {
        const order = { A: 0, B: 1, C: 2 };
        return (order[a.priority] || 3) - (order[b.priority] || 3);
      });

      setRemarks(allRemarks);
      setLoading(false);
    } catch (err) {
      console.error('Error loading inspection:', err);
      setError('Ett fel uppstod vid laddning.');
      setLoading(false);
    }
  };

  // Bygg trädstruktur
  const buildTree = () => {
    const placeMap = new Map();
    const rootPlaces = [];

    places.forEach(p => placeMap.set(p.id, { ...p, children: [] }));
    places.forEach(p => {
      const node = placeMap.get(p.id);
      if (p.parentId && placeMap.has(p.parentId)) {
        placeMap.get(p.parentId).children.push(node);
      } else {
        rootPlaces.push(node);
      }
    });

    return rootPlaces;
  };

  // Hämta anmärkningar för en plats
  const getRemarksForPlace = (placeId) => {
    return remarks.filter(r => r.placeId === placeId);
  };

  // Kolla om en plats har innehåll
  const hasContent = (place) => {
    if (getRemarksForPlace(place.id).length > 0) return true;
    if (place.children) {
      return place.children.some(child => hasContent(child));
    }
    return false;
  };

  // Rendera en plats rekursivt
  const renderPlace = (place, depth = 0) => {
    if (!hasContent(place)) return null;

    const placeRemarks = getRemarksForPlace(place.id);

    return (
      <div key={place.id} className={`place-section depth-${depth}`}>
        <h3 className={`place-title depth-${depth}`}>
          {place.name}
        </h3>

        {placeRemarks.map(remark => (
          <div key={remark.id} className="remark-card">
            <div
              className="remark-priority-bar"
              style={{ backgroundColor: priorityConfig[remark.priority]?.color || '#888' }}
            />
            <div className="remark-content">
              <div className="remark-header">
                <span
                  className="priority-badge"
                  style={{
                    backgroundColor: priorityConfig[remark.priority]?.bg,
                    color: priorityConfig[remark.priority]?.color
                  }}
                >
                  {priorityConfig[remark.priority]?.label || remark.priority}
                </span>
                <span className="remark-location">{place.name}</span>
              </div>
              <p className="remark-text">{remark.text}</p>

              {remark.images && remark.images.length > 0 && (
                <div className="remark-images">
                  {remark.images.map((image, idx) => (
                    <img
                      key={idx}
                      src={image.url || image.remoteUrl}
                      alt={`Bild ${idx + 1}`}
                      className="remark-thumbnail"
                      onClick={() => setSelectedImage(image.url || image.remoteUrl)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {place.children && place.children.map(child => renderPlace(child, depth + 1))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="public-view-container">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Laddar...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="public-view-container">
        <div className="error-state">
          <h2>Kunde inte ladda</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const tree = buildTree();
  const countByPriority = {
    A: remarks.filter(r => r.priority === 'A').length,
    B: remarks.filter(r => r.priority === 'B').length,
    C: remarks.filter(r => r.priority === 'C').length,
  };

  return (
    <div className="public-view-container">
      {/* Header */}
      <header className="public-header">
        <div className="header-content">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={companyName || 'Företagslogotyp'}
              className="company-logo"
            />
          ) : (
            <h1 className="company-name">{companyName || 'Kontrollprotokoll'}</h1>
          )}
          <p className="inspection-name">{control?.name}</p>
          <p className="inspection-date">
            {control?.createdAt?.toDate ?
              control.createdAt.toDate().toLocaleDateString('sv-SE') :
              control?.createdAt ? new Date(control.createdAt).toLocaleDateString('sv-SE') : ''}
          </p>
        </div>
      </header>

      {/* Statistik */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-count">{remarks.length}</span>
          <span className="stat-label">Anmärkningar totalt</span>
        </div>
        {Object.entries(countByPriority).map(([priority, count]) => (
          count > 0 && (
            <div key={priority} className="stat-item">
              <span
                className="stat-count"
                style={{ color: priorityConfig[priority]?.color }}
              >
                {count}
              </span>
              <span className="stat-label">{priorityConfig[priority]?.label}</span>
            </div>
          )
        ))}
      </div>

      {/* Innehåll */}
      <main className="public-content">
        {remarks.length === 0 ? (
          <div className="empty-state">
            <p>Inga anmärkningar registrerade.</p>
          </div>
        ) : (
          <div className="places-container">
            {tree.map(place => renderPlace(place))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="public-footer">
        <p>Genererat med SkarpKontroll</p>
      </footer>

      {/* Bildmodal */}
      {selectedImage && (
        <div className="image-modal-overlay" onClick={() => setSelectedImage(null)}>
          <div className="image-modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setSelectedImage(null)}>×</button>
            <img src={selectedImage} alt="Förstoring" />
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicInspectionView;
