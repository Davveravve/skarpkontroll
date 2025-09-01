// src/components/NotificationSystem.js - Push notification system
import React, { useState, useEffect } from 'react';

const NotificationSystem = ({ isOnline, syncProgress, pendingOperations = 0 }) => {
  const [notifications, setNotifications] = useState([]);
  const [lastOnlineStatus, setLastOnlineStatus] = useState(isOnline);

  // Handle network status changes
  useEffect(() => {
    if (lastOnlineStatus !== isOnline) {
      if (isOnline) {
        // Just came back online
        if (pendingOperations > 0) {
          addNotification({
            id: Date.now(),
            type: 'success',
            title: 'Återansluten!',
            message: `Synkar ${pendingOperations} väntande operationer...`,
            duration: 4000,
            showProgress: true,
            progress: 0
          });
        } else {
          addNotification({
            id: Date.now(),
            type: 'success',
            title: 'Online igen',
            message: 'Internetanslutning återställd',
            duration: 3000
          });
        }
      } else {
        // Went offline
        addNotification({
          id: Date.now(),
          type: 'warning',
          title: 'Offline-läge',
          message: 'Sparar lokalt, synkar när nätet kommer tillbaka',
          duration: 4000
        });
      }
      setLastOnlineStatus(isOnline);
    }
  }, [isOnline, lastOnlineStatus, pendingOperations]);

  // Handle sync progress updates
  useEffect(() => {
    if (syncProgress && syncProgress.total > 0) {
      updateNotificationProgress(syncProgress);
    }
  }, [syncProgress]);

  const addNotification = (notification) => {
    const notificationWithId = {
      ...notification,
      id: notification.id || Date.now()
    };
    
    setNotifications(prev => {
      // Kolla om notification med detta ID redan existerar
      const existingIndex = prev.findIndex(n => n.id === notificationWithId.id);
      
      if (existingIndex !== -1) {
        // Uppdatera befintlig notification
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...notificationWithId };
        return updated;
      } else {
        // Lägg till ny notification
        return [notificationWithId, ...prev];
      }
    });
    
    if (notificationWithId.duration) {
      setTimeout(() => {
        removeNotification(notificationWithId.id);
      }, notificationWithId.duration);
    }
  };

  const removeNotification = (id) => {
    // Trigga animation först, sedan ta bort efter animation är klar
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, isRemoving: true } : n
    ));
    
    // Ta bort notification efter animation (300ms)
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 300);
  };

  const updateNotificationProgress = (progress) => {
    setNotifications(prev => prev.map(notification => 
      notification.showProgress 
        ? { 
            ...notification, 
            progress: Math.round((progress.completed / progress.total) * 100),
            message: progress.completed === progress.total 
              ? 'Sync slutförd!'
              : `Synkar... ${progress.completed}/${progress.total}`
          }
        : notification
    ));
  };

  // Public method to add custom notifications
  const showNotification = (notification) => {
    addNotification({
      id: Date.now(),
      duration: 3000,
      ...notification
    });
  };

  // Expose method globally for other components
  useEffect(() => {
    window.showNotification = showNotification;
    return () => {
      delete window.showNotification;
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 10000,
      maxWidth: '350px',
      pointerEvents: 'none' // Allow clicks through empty space
    }}>
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={removeNotification}
        />
      ))}
    </div>
  );
};

const NotificationItem = ({ notification, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Slide in animation
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  // Lyssna på isRemoving från parent för att trigga animation vid auto-dismiss
  useEffect(() => {
    if (notification.isRemoving && !isLeaving) {
      setIsLeaving(true);
    }
  }, [notification.isRemoving, isLeaving]);

  const handleRemove = () => {
    setIsLeaving(true);
    setTimeout(() => onRemove(notification.id), 300);
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'error': return '#dc2626';
      case 'info': return '#0ea5e9';
      default: return '#6b7280';
    }
  };

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.15), 0 4px 10px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        borderLeft: `4px solid ${getBackgroundColor()}`,
        transform: isVisible && !isLeaving 
          ? 'translateX(0) scale(1)' 
          : isLeaving 
            ? 'translateX(100%) scale(0.95)' 
            : 'translateX(100%) scale(0.9)',
        opacity: isVisible && !isLeaving ? 1 : 0,
        transition: isLeaving 
          ? 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)' // Smooth fade-out
          : 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Bouncy slide-in
        pointerEvents: 'auto',
        position: 'relative',
        maxWidth: '350px'
      }}
    >
      {/* Close button */}
      <button
        onClick={handleRemove}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'none',
          border: 'none',
          color: '#9ca3af',
          cursor: 'pointer',
          fontSize: '16px',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px'
        }}
        title="Stäng"
      >
        ×
      </button>

      {/* Content */}
      <div style={{ paddingRight: '24px' }}>
        <div style={{
          fontWeight: '600',
          color: '#1f2937',
          fontSize: '14px',
          marginBottom: '4px'
        }}>
          {notification.title}
        </div>
        
        <div style={{
          color: '#6b7280',
          fontSize: '13px',
          lineHeight: '1.4'
        }}>
          {notification.message}
        </div>

        {/* Progress bar */}
        {notification.showProgress && (
          <div style={{
            marginTop: '12px',
            background: '#f3f4f6',
            borderRadius: '6px',
            height: '6px',
            overflow: 'hidden'
          }}>
            <div style={{
              background: getBackgroundColor(),
              height: '100%',
              borderRadius: '6px',
              width: `${notification.progress || 0}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationSystem;