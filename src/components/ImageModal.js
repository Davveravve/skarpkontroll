import React, { useState, useEffect } from 'react';

const ImageModal = ({ isOpen, onClose, image, allImages = [], currentIndex = 0 }) => {
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveIndex(currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    if (isOpen) {
      // Disable body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable body scroll when modal is closed
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleKeyPress = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowLeft' && activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
      setLoading(true);
    } else if (e.key === 'ArrowRight' && activeIndex < allImages.length - 1) {
      setActiveIndex(activeIndex + 1);
      setLoading(true);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [isOpen, activeIndex, allImages.length]);

  if (!isOpen) return null;

  const currentImage = allImages.length > 0 ? allImages[activeIndex] : image;
  const hasMultipleImages = allImages.length > 1;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        cursor: 'pointer'
      }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(255, 255, 255, 0.2)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          fontSize: '20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001
        }}
        title="Stäng (Esc)"
      >
        ×
      </button>

      {/* Navigation buttons */}
      {hasMultipleImages && activeIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveIndex(activeIndex - 1);
            setLoading(true);
          }}
          style={{
            position: 'absolute',
            left: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001
          }}
          title="Föregående bild (←)"
        >
          ←
        </button>
      )}

      {hasMultipleImages && activeIndex < allImages.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveIndex(activeIndex + 1);
            setLoading(true);
          }}
          style={{
            position: 'absolute',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001
          }}
          title="Nästa bild (→)"
        >
          →
        </button>
      )}

      {/* Image container */}
      <div
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading spinner */}
        {loading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontSize: '18px'
          }}>
            Laddar...
          </div>
        )}

        {/* Main image */}
        <img
          src={currentImage?.url || currentImage?.remoteUrl || currentImage?.downloadURL}
          alt={currentImage?.originalName || 'Bild'}
          style={{
            maxWidth: '100%',
            maxHeight: 'calc(90vh - 80px)',
            objectFit: 'contain',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
            opacity: loading ? 0 : 1,
            transition: 'opacity 0.2s'
          }}
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
        />

        {/* Image info */}
        <div style={{
          marginTop: '16px',
          textAlign: 'center',
          color: 'white',
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '8px 16px',
          borderRadius: '6px',
          fontSize: '14px'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
            {currentImage?.originalName}
          </div>
          {hasMultipleImages && (
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              {activeIndex + 1} av {allImages.length}
            </div>
          )}
          {currentImage?.size && (
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              {(currentImage.size / 1024 / 1024).toFixed(2)} MB
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail strip for multiple images */}
      {hasMultipleImages && allImages.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px',
          maxWidth: '80vw',
          overflowX: 'auto',
          padding: '8px',
          background: 'rgba(0, 0, 0, 0.5)',
          borderRadius: '8px'
        }}>
          {allImages.map((img, index) => (
            <img
              key={index}
              src={img.url || img.remoteUrl || img.downloadURL}
              alt={img.originalName}
              style={{
                width: '60px',
                height: '60px',
                objectFit: 'cover',
                borderRadius: '4px',
                cursor: 'pointer',
                border: index === activeIndex ? '2px solid white' : '2px solid transparent',
                opacity: index === activeIndex ? 1 : 0.7,
                transition: 'all 0.2s'
              }}
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex(index);
                setLoading(true);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageModal;