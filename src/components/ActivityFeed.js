// src/components/ActivityFeed.js - Team activity feed with clean SVG icons
import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useTeam } from '../contexts/TeamContext';
import './ActivityFeed.css';

// Clean SVG Icons
const Icons = {
  // Activity type icons
  created: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="16"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  ),
  updated: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  deleted: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  exported: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="12" y1="18" x2="12" y2="12"/>
      <line x1="9" y1="15" x2="12" y2="12"/>
      <line x1="15" y1="15" x2="12" y2="12"/>
    </svg>
  ),
  joined: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <line x1="20" y1="8" x2="20" y2="14"/>
      <line x1="23" y1="11" x2="17" y2="11"/>
    </svg>
  ),
  left: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <line x1="23" y1="11" x2="17" y2="11"/>
    </svg>
  ),
  uploaded: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  completed: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),

  // Entity type icons
  customer: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  control: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  remark: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  pdf: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  image: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  ),
  team: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
};

// Get action icon based on action type
const getActionIcon = (action) => {
  return Icons[action] || Icons.created;
};

// Get entity icon based on entity type
const getEntityIcon = (entityType) => {
  return Icons[entityType] || Icons.control;
};

// Get action color class
const getActionColorClass = (action) => {
  switch (action) {
    case 'created': return 'action-created';
    case 'updated': return 'action-updated';
    case 'deleted': return 'action-deleted';
    case 'exported': return 'action-exported';
    case 'completed': return 'action-completed';
    case 'joined': return 'action-joined';
    case 'left': return 'action-left';
    case 'uploaded': return 'action-uploaded';
    default: return 'action-default';
  }
};

// Get action text in Swedish
const getActionText = (action, entityType) => {
  const actions = {
    created: {
      customer: 'skapade kund',
      control: 'skapade kontroll',
      remark: 'lade till anmärkning',
      kontrollpunkt: 'lade till kontrollpunkt',
      default: 'skapade'
    },
    updated: {
      customer: 'uppdaterade kund',
      control: 'uppdaterade kontroll',
      remark: 'ändrade anmärkning',
      default: 'uppdaterade'
    },
    deleted: {
      customer: 'tog bort kund',
      control: 'tog bort kontroll',
      remark: 'tog bort anmärkning',
      default: 'tog bort'
    },
    exported: {
      pdf: 'exporterade PDF',
      default: 'exporterade'
    },
    completed: {
      control: 'slutförde kontroll',
      default: 'slutförde'
    },
    joined: {
      team: 'gick med i teamet',
      default: 'gick med'
    },
    left: {
      team: 'lämnade teamet',
      default: 'lämnade'
    },
    uploaded: {
      image: 'laddade upp bilder',
      default: 'laddade upp'
    }
  };

  const actionTexts = actions[action] || { default: action };
  return actionTexts[entityType] || actionTexts.default;
};

// Format timestamp
const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just nu';
  if (diffMins < 60) return `${diffMins} min sedan`;
  if (diffHours < 24) return `${diffHours} tim sedan`;
  if (diffDays === 1) return 'Igår';
  if (diffDays < 7) return `${diffDays} dagar sedan`;

  return date.toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short'
  });
};

const ActivityFeed = ({ maxItems = 10, showHeader = true }) => {
  const { currentTeam, hasTeam } = useTeam();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      if (!hasTeam || !currentTeam?.id) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'teamLogs'),
          where('teamId', '==', currentTeam.id),
          orderBy('timestamp', 'desc'),
          limit(maxItems)
        );

        const snapshot = await getDocs(q);
        const activityData = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }));

        setActivities(activityData);
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [currentTeam, hasTeam, maxItems]);

  if (!hasTeam) {
    return null;
  }

  if (loading) {
    return (
      <div className="activity-feed">
        {showHeader && (
          <div className="activity-feed-header">
            <h3>Aktivitet</h3>
          </div>
        )}
        <div className="activity-feed-loading">
          <div className="loading-spinner-small"></div>
          <span>Laddar aktivitet...</span>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="activity-feed">
        {showHeader && (
          <div className="activity-feed-header">
            <h3>Aktivitet</h3>
          </div>
        )}
        <div className="activity-feed-empty">
          <div className="empty-icon">
            {Icons.control}
          </div>
          <p>Ingen aktivitet ännu</p>
          <span>Aktivitet från teamet visas här</span>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-feed">
      {showHeader && (
        <div className="activity-feed-header">
          <h3>Aktivitet</h3>
          <span className="activity-count">{activities.length} händelser</span>
        </div>
      )}
      <div className="activity-feed-list">
        {activities.map((activity) => (
          <div key={activity.id} className="activity-item">
            <div className={`activity-icon ${getActionColorClass(activity.action)}`}>
              {getActionIcon(activity.action)}
            </div>
            <div className="activity-content">
              <div className="activity-main">
                <span className="activity-user">{activity.userName}</span>
                <span className="activity-action">
                  {getActionText(activity.action, activity.entityType)}
                </span>
              </div>
              <div className="activity-entity">
                <span className="entity-icon">{getEntityIcon(activity.entityType)}</span>
                <span className="entity-name">{activity.entityName}</span>
                {activity.parentName && (
                  <span className="entity-parent">i {activity.parentName}</span>
                )}
              </div>
              {activity.details && (
                <div className="activity-details">{activity.details}</div>
              )}
            </div>
            <div className="activity-time">
              {formatTimestamp(activity.timestamp)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;
