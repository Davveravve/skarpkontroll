// src/components/ConfirmationModal.js
import React from 'react';

const ConfirmationModal = ({ 
  isOpen, 
  title, 
  message, 
  confirmText = 'Ja, ta bort', 
  cancelText = 'Avbryt', 
  confirmButtonClass = 'danger', 
  onConfirm, 
  onCancel 
}) => {
  if (!isOpen) return null;

  const getIconAndColors = () => {
    switch (confirmButtonClass) {
      case 'danger':
        return {
          iconBg: '#fee2e2',
          iconColor: '#dc2626',
          confirmBg: '#dc2626',
          confirmHover: '#b91c1c',
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          )
        };
      case 'warning':
        return {
          iconBg: '#fef3c7',
          iconColor: '#f59e0b',
          confirmBg: '#f59e0b',
          confirmHover: '#d97706',
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          )
        };
      default:
        return {
          iconBg: '#dbeafe',
          iconColor: '#6366F1',
          confirmBg: '#6366F1',
          confirmHover: '#4F46E5',
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4"/>
              <path d="M12 8h.01"/>
            </svg>
          )
        };
    }
  };

  const { iconBg, iconColor, confirmBg, confirmHover, icon } = getIconAndColors();

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        animation: 'fadeIn 0.2s ease'
      }}
      onClick={onCancel}
    >
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideIn {
            from { 
              opacity: 0;
              transform: scale(0.9) translateY(-20px);
            }
            to { 
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
        `}
      </style>
      
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          animation: 'slideIn 0.2s ease',
          border: '1px solid #e5e7eb'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div style={{
          width: '56px',
          height: '56px',
          backgroundColor: iconBg,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: iconColor
        }}>
          {icon}
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827',
          textAlign: 'center',
          margin: '0 0 12px 0',
          lineHeight: '1.3'
        }}>
          {title}
        </h3>

        {/* Message */}
        <p style={{
          fontSize: '15px',
          color: '#6b7280',
          textAlign: 'center',
          margin: '0 0 32px 0',
          lineHeight: '1.5'
        }}>
          {message}
        </p>

        {/* Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '12px 24px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '100px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
              e.currentTarget.style.borderColor = '#9ca3af';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
          >
            {cancelText}
          </button>
          
          <button
            onClick={onConfirm}
            style={{
              padding: '12px 24px',
              backgroundColor: confirmBg,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '100px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = confirmHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = confirmBg;
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;