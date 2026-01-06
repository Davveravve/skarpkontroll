// src/components/ImageAnnotation.js - Draw annotations on images
import React, { useRef, useState, useEffect, useCallback } from 'react';
import './ImageAnnotation.css';

const ImageAnnotation = ({
  isOpen,
  onClose,
  imageUrl,
  imageName,
  onSave
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen'); // pen, arrow, circle, rectangle, text
  const [color, setColor] = useState('#ef4444'); // Red default
  const [lineWidth, setLineWidth] = useState(3);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState(null);
  const [saving, setSaving] = useState(false);

  const colors = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#6366F1', // Blue
    '#8b5cf6', // Purple
    '#000000', // Black
    '#ffffff', // White
  ];

  const tools = [
    { id: 'pen', icon: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z', label: 'Penna' },
    { id: 'arrow', icon: 'M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z', label: 'Pil' },
    { id: 'circle', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z', label: 'Cirkel' },
    { id: 'rectangle', icon: 'M3 3h18v18H3V3zm2 2v14h14V5H5z', label: 'Rektangel' },
    { id: 'text', icon: 'M5 4v3h5.5v12h3V7H19V4H5z', label: 'Text' },
  ];

  // Load image onto canvas
  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // Calculate dimensions to fit in viewport
      const maxWidth = window.innerWidth * 0.85;
      const maxHeight = window.innerHeight * 0.7;

      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (maxHeight / height) * width;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // Save initial state
      saveToHistory();
      setImageLoaded(true);
    };

    img.onerror = () => {
      console.error('Failed to load image');
    };

    img.src = imageUrl;
  }, [isOpen, imageUrl]);

  // Save current canvas state to history
  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageData = canvas.toDataURL('image/png');

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(imageData);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // Undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      restoreFromHistory(newIndex);
    }
  };

  // Redo
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      restoreFromHistory(newIndex);
    }
  };

  // Restore canvas from history
  const restoreFromHistory = (index) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };

    img.src = history[index];
  };

  // Get mouse/touch position
  const getPosition = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Start drawing
  const handleMouseDown = (e) => {
    e.preventDefault();
    const pos = getPosition(e);

    if (tool === 'text') {
      setTextPosition(pos);
      return;
    }

    setIsDrawing(true);
    setStartPoint(pos);

    if (tool === 'pen') {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  // Draw
  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPosition(e);

    if (tool === 'pen') {
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    } else {
      // For shapes, restore and preview
      if (history[historyIndex]) {
        restoreFromHistory(historyIndex);
        drawShape(ctx, startPoint, pos, true);
      }
    }
  };

  // End drawing
  const handleMouseUp = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (tool !== 'pen') {
      const pos = getPosition(e);
      if (history[historyIndex]) {
        restoreFromHistory(historyIndex);
      }
      drawShape(ctx, startPoint, pos, false);
    }

    setIsDrawing(false);
    setStartPoint(null);
    saveToHistory();
  };

  // Draw shape
  const drawShape = (ctx, start, end, isPreview) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'arrow') {
      // Draw arrow line
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      // Draw arrowhead
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const headLength = 15;

      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLength * Math.cos(angle - Math.PI / 6),
        end.y - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLength * Math.cos(angle + Math.PI / 6),
        end.y - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    } else if (tool === 'circle') {
      const radius = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
      );
      ctx.beginPath();
      ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (tool === 'rectangle') {
      ctx.beginPath();
      ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
      ctx.stroke();
    }
  };

  // Add text
  const handleAddText = () => {
    if (!textInput.trim() || !textPosition) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.font = `${lineWidth * 6}px Arial`;
    ctx.fillStyle = color;
    ctx.fillText(textInput, textPosition.x, textPosition.y);

    setTextInput('');
    setTextPosition(null);
    saveToHistory();
  };

  // Cancel text input
  const handleCancelText = () => {
    setTextInput('');
    setTextPosition(null);
  };

  // Save annotated image
  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setSaving(true);

    try {
      // Convert canvas to blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png', 1.0);
      });

      if (onSave) {
        await onSave(blob, imageName);
      }

      onClose();
    } catch (error) {
      console.error('Error saving annotated image:', error);
    } finally {
      setSaving(false);
    }
  };

  // Reset to original
  const handleReset = () => {
    if (history.length > 0) {
      setHistoryIndex(0);
      restoreFromHistory(0);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (textPosition) {
          handleCancelText();
        } else {
          onClose();
        }
      } else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, textPosition, historyIndex, history.length]);

  if (!isOpen) return null;

  return (
    <div className="image-annotation-overlay">
      <div className="image-annotation-container" ref={containerRef}>
        {/* Header */}
        <div className="image-annotation-header">
          <h3>Rita på bild</h3>
          <div className="image-annotation-header-actions">
            <button
              className="annotation-btn annotation-btn-icon"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Angra (Ctrl+Z)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7v6h6"/>
                <path d="M3 13c0-4.97 4.03-9 9-9a9 9 0 0 1 6.36 2.64"/>
              </svg>
            </button>
            <button
              className="annotation-btn annotation-btn-icon"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Gör om (Ctrl+Y)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 7v6h-6"/>
                <path d="M21 13c0-4.97-4.03-9-9-9a9 9 0 0 0-6.36 2.64"/>
              </svg>
            </button>
            <button
              className="annotation-btn annotation-btn-secondary"
              onClick={handleReset}
              title="Återställ original"
            >
              Återställ
            </button>
            <button
              className="annotation-btn annotation-btn-secondary"
              onClick={onClose}
            >
              Avbryt
            </button>
            <button
              className="annotation-btn annotation-btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Sparar...' : 'Spara'}
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="image-annotation-toolbar">
          {/* Tools */}
          <div className="annotation-tool-group">
            <span className="annotation-tool-label">Verktyg</span>
            <div className="annotation-tools">
              {tools.map(t => (
                <button
                  key={t.id}
                  className={`annotation-tool-btn ${tool === t.id ? 'active' : ''}`}
                  onClick={() => setTool(t.id)}
                  title={t.label}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d={t.icon} />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="annotation-tool-group">
            <span className="annotation-tool-label">Färg</span>
            <div className="annotation-colors">
              {colors.map(c => (
                <button
                  key={c}
                  className={`annotation-color-btn ${color === c ? 'active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Line width */}
          <div className="annotation-tool-group">
            <span className="annotation-tool-label">Tjocklek</span>
            <div className="annotation-width-slider">
              <input
                type="range"
                min="1"
                max="10"
                value={lineWidth}
                onChange={(e) => setLineWidth(parseInt(e.target.value))}
              />
              <span>{lineWidth}px</span>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="image-annotation-canvas-wrapper">
          {!imageLoaded && (
            <div className="image-annotation-loading">
              <div className="annotation-spinner"></div>
              <p>Laddar bild...</p>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className={`image-annotation-canvas ${tool}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          />
        </div>

        {/* Text input popup */}
        {textPosition && (
          <div
            className="image-annotation-text-popup"
            style={{
              left: textPosition.x + containerRef.current?.querySelector('.image-annotation-canvas-wrapper')?.offsetLeft || 0,
              top: textPosition.y + 180
            }}
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Skriv text..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddText();
                if (e.key === 'Escape') handleCancelText();
              }}
            />
            <button onClick={handleAddText} className="annotation-btn annotation-btn-primary annotation-btn-sm">
              Lägg till
            </button>
            <button onClick={handleCancelText} className="annotation-btn annotation-btn-secondary annotation-btn-sm">
              Avbryt
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageAnnotation;
