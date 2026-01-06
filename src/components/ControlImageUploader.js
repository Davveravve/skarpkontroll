// src/components/ControlImageUploader.js - Firebase Storage version
import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';
import { useTeam } from '../contexts/TeamContext';
import { v4 as uuidv4 } from 'uuid';

const ControlImageUploader = ({ controlId, nodeId, onImagesUploaded, disabled = false }) => {
  const { currentTeam } = useTeam();
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  // Komprimera bild for snabbare uppladdning
  const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Beräkna ny storlek
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        // Rita komprimerad bild
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Konvertera till blob
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const uploadFiles = async (files) => {
    if (!files.length || !controlId || !nodeId) return;
    if (!currentTeam?.id) {
      alert('Du måste vara med i ett team för att ladda upp bilder');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    const uploadedImages = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validera filtyp
        if (!file.type.startsWith('image/')) {
          console.warn('Skipping non-image file:', file.name);
          continue;
        }

        // Komprimera stor bild för bättre prestanda
        let uploadFile = file;
        if (file.size > 500000) { // > 500KB
          console.log('Compressing large image:', file.name);
          uploadFile = await compressImage(file);
        }

        // Skapa unikt filnamn
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${timestamp}_${uuidv4()}_${sanitizedName}`;
        // Storage path: teams/{teamId}/controls/{controlId}/nodes/{nodeId}/{fileName}
        const filePath = `teams/${currentTeam.id}/controls/${controlId}/nodes/${nodeId}/${fileName}`;

        console.log('Uploading image to Firebase Storage:', fileName);

        // Ladda upp till Firebase Storage
        const storageRef = ref(storage, filePath);
        await uploadBytes(storageRef, uploadFile);

        // Hämta publik URL
        const downloadURL = await getDownloadURL(storageRef);

        const imageData = {
          url: downloadURL,
          fileName: fileName,
          originalName: file.name,
          size: file.size,
          type: file.type,
          path: filePath,
          uploadedAt: new Date(),
          controlId: controlId,
          nodeId: nodeId
        };

        uploadedImages.push(imageData);

        // Uppdatera progress
        setUploadProgress(((i + 1) / files.length) * 100);
        console.log('Image uploaded successfully:', fileName);
      }

      console.log('All images uploaded:', uploadedImages);

      // Anropa callback med alla uppladdade bilder
      if (onImagesUploaded && uploadedImages.length > 0) {
        onImagesUploaded(uploadedImages);
      }

      // Rensa filer
      setSelectedFiles([]);

    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Uppladdning misslyckades: ' + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{
        display: 'block',
        fontSize: '14px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '8px'
      }}>
        Bilder (valfritt):
      </label>

      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        style={{
          width: '100%',
          padding: '12px',
          border: '2px dashed #d1d5db',
          borderRadius: '8px',
          background: disabled ? '#f3f4f6' : '#f8fafc',
          fontSize: '14px',
          marginBottom: '8px',
          cursor: disabled || uploading ? 'not-allowed' : 'pointer'
        }}
      />

      {uploading && (
        <div style={{
          marginBottom: '8px',
          padding: '12px',
          background: '#e0f2fe',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#0277bd',
          border: '1px solid #bae6fd'
        }}>
          <div style={{ marginBottom: '6px' }}>
            Laddar upp bilder... {Math.round(uploadProgress)}%
          </div>
          <div style={{
            background: '#f0f9ff',
            borderRadius: '4px',
            height: '6px',
            overflow: 'hidden'
          }}>
            <div style={{
              background: '#0ea5e9',
              height: '100%',
              width: `${uploadProgress}%`,
              transition: 'width 0.3s ease',
              borderRadius: '4px'
            }} />
          </div>
        </div>
      )}

      {selectedFiles.length > 0 && !uploading && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginTop: '8px'
        }}>
          {selectedFiles.map((file, index) => (
            <div key={index} style={{
              display: 'flex',
              alignItems: 'center',
              padding: '4px 8px',
              background: '#e5e7eb',
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              <span>{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                style={{
                  marginLeft: '4px',
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ControlImageUploader;
