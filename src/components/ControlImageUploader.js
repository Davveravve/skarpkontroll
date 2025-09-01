import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { v4 as uuidv4 } from 'uuid';
import { offlineManager } from '../utils/offlineManager';

const ControlImageUploader = ({ controlId, nodeId, onImagesUploaded, disabled = false }) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Lyssna på nätverksstatus
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  // Komprimera bild för snabbare uppladdning
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
        const filePath = `controls/${controlId}/nodes/${nodeId}/${fileName}`;

        console.log('Processing image:', fileName, 'Online:', navigator.onLine);

        // Om offline, spara direkt lokalt
        if (!navigator.onLine) {
          console.log('📱 Offline mode - saving image locally');
          
          const offlineImage = {
            id: uuidv4(),
            fileName,
            originalName: file.name,
            filePath,
            blob: uploadFile,
            createdAt: new Date(),
            status: 'offline'
          };
          
          // Cacha bilden lokalt med metadata
          await offlineManager.cacheImage(uploadFile, fileName, {
            controlId,
            nodeId,
            originalName: file.name
          });
          
          // Lägg till i offline-kö
          offlineManager.queueOperation({
            type: 'uploadImage',
            imageData: offlineImage,
            controlId,
            nodeId
          });
          
          // Lägg till som offline bild i UI
          uploadedImages.push({
            id: offlineImage.id,
            fileName: offlineImage.fileName,
            originalName: file.name,
            url: URL.createObjectURL(uploadFile),
            status: 'offline',
            downloadURL: null,
            size: uploadFile.size || file.size,
            type: file.type,
            path: filePath
          });
          
          console.log('✅ Image saved offline for later sync');
          setUploadProgress(((i + 1) / files.length) * 100);
          continue;
        }

        // Online - försök ladda upp
        console.log('🌐 Online mode - uploading to Supabase');

        // Ladda upp med timeout för dålig täckning
        const uploadPromise = supabase.storage
          .from('controls')
          .upload(filePath, uploadFile, {
            cacheControl: '3600',
            upsert: false,
          });

        // 30 sekunder timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout')), 30000)
        );

        const { error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]);

        if (uploadError || uploadError?.message === 'Upload timeout') {
          console.warn('Upload failed, saving offline:', uploadError?.message);
          
          // Spara offline för senare sync
          const offlineImage = {
            id: uuidv4(),
            fileName,
            originalName: file.name,
            filePath,
            blob: uploadFile,
            createdAt: new Date(),
            status: 'offline'
          };
          
          // Cacha bilden lokalt med metadata
          await offlineManager.cacheImage(uploadFile, fileName, {
            controlId,
            nodeId,
            originalName: file.name
          });
          
          // Lägg till i offline-kö
          offlineManager.queueOperation({
            type: 'uploadImage',
            imageData: offlineImage,
            controlId,
            nodeId
          });
          
          // Lägg till som "pending" bild i UI
          uploadedImages.push({
            id: offlineImage.id,
            fileName: offlineImage.fileName,
            originalName: file.name,
            url: URL.createObjectURL(uploadFile), // Temporär lokal URL
            status: 'offline',
            downloadURL: null,
            size: uploadFile.size || file.size,
            type: file.type,
            path: filePath
          });
          
          console.log('✅ Image saved offline, will sync when online');
          setUploadProgress(((i + 1) / files.length) * 100);
          continue;
        }

        // Få publik URL
        const { data: urlData } = supabase.storage
          .from('controls')
          .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;

        const imageData = {
          url: publicUrl,
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
      
      // Offline-vänligt felmeddelande
      if (!navigator.onLine) {
        alert('Ingen internetanslutning. Bilderna sparas offline och synkas automatiskt när du får täckning igen.');
      } else {
        alert('Uppladdning misslyckades: ' + error.message);
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
      
      // Ta bort denna - hanteras i finally-blocket
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
          border: `2px dashed ${!isOnline ? '#f59e0b' : '#d1d5db'}`,
          borderRadius: '8px',
          background: disabled ? '#f3f4f6' : !isOnline ? '#fef3c7' : '#f8fafc',
          fontSize: '14px',
          marginBottom: '8px',
          cursor: disabled || uploading ? 'not-allowed' : 'pointer'
        }}
      />
      
      {/* Offline-indikator */}
      {!isOnline && (
        <div style={{
          marginBottom: '8px',
          padding: '8px 12px',
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#92400e'
        }}>
          Offline-läge: Bilder sparas lokalt och synkas när nätet kommer tillbaka
        </div>
      )}
      
      {uploading && (
        <div style={{
          marginBottom: '8px',
          padding: '12px',
          background: isOnline ? '#e0f2fe' : '#fef3c7',
          borderRadius: '8px',
          fontSize: '14px',
          color: isOnline ? '#0277bd' : '#92400e',
          border: `1px solid ${isOnline ? '#bae6fd' : '#f59e0b'}`
        }}>
          <div style={{ marginBottom: '6px' }}>
            {isOnline ? 'Laddar upp bilder...' : 'Sparar bilder offline...'} {Math.round(uploadProgress)}%
          </div>
          <div style={{
            background: isOnline ? '#f0f9ff' : '#fffbeb',
            borderRadius: '4px',
            height: '6px',
            overflow: 'hidden'
          }}>
            <div style={{
              background: isOnline ? '#0ea5e9' : '#f59e0b',
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
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ControlImageUploader;