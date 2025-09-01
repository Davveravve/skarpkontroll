// src/utils/offlineManager.js - Offline support för dålig täckning
export class OfflineManager {
  constructor() {
    this.pendingOperations = JSON.parse(localStorage.getItem('pendingOperations') || '[]');
    this.processedOperations = new Set(JSON.parse(localStorage.getItem('processedOperations') || '[]'));
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.syncProgress = { completed: 0, total: 0 };
    this.listeners = [];
    
    // Lyssna på nätverksstatus
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  // Lägg till listener för progress updates
  addProgressListener(callback) {
    this.listeners.push(callback);
  }

  // Meddela alla listeners om progress
  notifyProgress() {
    this.listeners.forEach(callback => callback(this.syncProgress, this.pendingOperations.length));
  }

  // Spara operation för senare sync
  queueOperation(operation) {
    // Förhindra dubbletter baserat på operation type + specifika data
    let operationKey;
    
    switch (operation.type) {
      case 'saveRemark':
        operationKey = `${operation.type}_${operation.remarkData?.nodeId}_${operation.remarkData?.text}_${operation.remarkData?.priority}`;
        break;
      case 'uploadImage':
        operationKey = `${operation.type}_${operation.imageData?.fileName}`;
        break;
      case 'updateNode':
        operationKey = `${operation.type}_${operation.nodeId}_${JSON.stringify(operation.updates)}`;
        break;
      default:
        operationKey = `${operation.type}_${JSON.stringify(operation)}`;
    }
    
    if (this.processedOperations.has(operationKey)) {
      console.log('Skipping duplicate operation:', operationKey);
      return null;
    }

    const queuedOp = {
      id: Date.now(),
      key: operationKey,
      timestamp: new Date().toISOString(),
      ...operation
    };
    
    this.pendingOperations.push(queuedOp);
    this.processedOperations.add(operationKey);
    
    localStorage.setItem('pendingOperations', JSON.stringify(this.pendingOperations));
    localStorage.setItem('processedOperations', JSON.stringify([...this.processedOperations]));
    
    // Försök synka direkt om online
    if (this.isOnline && !this.syncInProgress) {
      this.processPendingOperations();
    }
    
    return queuedOp.id;
  }

  // Processa väntande operationer när nätet kommer tillbaka
  async processPendingOperations() {
    if (!this.isOnline || this.pendingOperations.length === 0 || this.syncInProgress) return;
    
    this.syncInProgress = true;
    this.syncProgress = { completed: 0, total: this.pendingOperations.length };
    
    console.log('🔄 Processing', this.pendingOperations.length, 'pending operations');
    
    // Visa notification
    if (window.showNotification) {
      window.showNotification({
        type: 'info',
        title: 'Synkar offline-data',
        message: `Synkar ${this.pendingOperations.length} operationer...`,
        showProgress: true,
        progress: 0,
        duration: null
      });
    }
    
    this.notifyProgress();
    
    const remaining = [];
    const retryable = [];
    let consecutiveFailures = 0;
    
    for (const op of this.pendingOperations) {
      try {
        await this.executeOperation(op);
        console.log('✅ Synced operation:', op.type, op.id);
        this.syncProgress.completed++;
        this.notifyProgress();
        consecutiveFailures = 0; // Reset failure counter on success
        
        // Update UI för remarks som synkades
        if (op.type === 'saveRemark' && op.tempId && window.updateRemarkAfterSync) {
          window.updateRemarkAfterSync(op.tempId, { synced: true });
        }
        
      } catch (error) {
        console.error('❌ Failed to sync operation:', error.message, op.type, op.id);
        
        // Klassificera fel för bättre hantering
        const isRetryable = this.isRetryableError(error);
        
        if (isRetryable && (op.retryCount || 0) < 3) {
          const retryOp = { ...op, retryCount: (op.retryCount || 0) + 1 };
          retryable.push(retryOp);
          console.log(`🔄 Will retry operation ${retryOp.type} (attempt ${retryOp.retryCount + 1}/3)`);
        } else {
          // Permanent failure eller max retries nått
          remaining.push(op);
          console.log(`💀 Permanent failure for operation ${op.type}:`, error.message);
        }
        
        consecutiveFailures++;
        
        // Om för många failures i rad, pausa för att undvika spam
        if (consecutiveFailures >= 3) {
          console.log('⏸️ Too many consecutive failures, pausing sync...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      // Progressiv delay baserat på antal failures
      const delay = Math.min(100 + (consecutiveFailures * 200), 1000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Sätt tillbaka retry-bara operationer först för nästa försök
    this.pendingOperations = [...retryable, ...remaining];
    localStorage.setItem('pendingOperations', JSON.stringify(this.pendingOperations));
    
    this.syncInProgress = false;
    
    // Uppdatera final progress
    const totalSynced = this.syncProgress.completed;
    this.syncProgress.completed = totalSynced;
    this.notifyProgress();
    
    // Visa slutresultat med mer detaljerad info
    if (window.showNotification) {
      if (totalSynced > 0) {
        const message = retryable.length > 0 
          ? `${totalSynced} synkade, ${retryable.length} kommer försökas igen, ${remaining.length} permanenta fel`
          : `${totalSynced} operationer synkade framgångsrikt${remaining.length > 0 ? `, ${remaining.length} fel` : ''}`;
          
        window.showNotification({
          type: remaining.length === 0 ? 'success' : 'warning',
          title: 'Sync slutförd',
          message,
          duration: 4000
        });
      } else if (this.pendingOperations.length > 0) {
        window.showNotification({
          type: 'error',
          title: 'Sync misslyckades',
          message: `${this.pendingOperations.length} operationer kommer försökas igen senare`,
          duration: 5000
        });
      }
    }
    
    // Uppdatera timestamp för senaste sync-försök
    localStorage.setItem('lastSync', new Date().toISOString());
  }

  async executeOperation(operation) {
    // Validera operation först
    if (!operation || !operation.type) {
      throw new Error('Invalid operation: missing type');
    }
    
    // Lägg till timeout för operationer
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout after 30 seconds')), 30000);
    });
    
    try {
      const { db } = await import('../services/firebase');
      const { supabase } = await import('../services/supabase');
      const { collection, addDoc, updateDoc, doc, serverTimestamp, getDocs, query, where, deleteDoc } = await import('firebase/firestore');
      
      const operationPromise = (async () => {
        switch (operation.type) {
          case 'saveRemark':
            return await this.executeSaveRemark(operation, { db, collection, addDoc, updateDoc, doc, serverTimestamp });
          case 'uploadImage':
            return await this.executeUploadImage(operation, { supabase });
          case 'updateNode':
            return await this.executeUpdateNode(operation, { db, updateDoc, doc, serverTimestamp });
          case 'deleteRemark':
            return await this.executeDeleteRemark(operation, { db, doc, deleteDoc });
          case 'updateRemark':
            return await this.executeUpdateRemark(operation, { db, updateDoc, doc, serverTimestamp });
          case 'addNode':
            return await this.executeAddNode(operation, { db, collection, addDoc, serverTimestamp });
          case 'deleteNode':
            return await this.executeDeleteNode(operation, { db, doc, collection, getDocs, query, where, deleteDoc });
          default:
            throw new Error(`Unknown operation type: ${operation.type}`);
        }
      })();
      
      // Race between operation and timeout
      return await Promise.race([operationPromise, timeoutPromise]);
      
    } catch (error) {
      // Förbättra felmeddelanden
      const enhancedError = new Error(`Failed to execute ${operation.type}: ${error.message}`);
      enhancedError.originalError = error;
      enhancedError.operation = operation;
      throw enhancedError;
    }
  }

  async executeSaveRemark(operation, { db, collection, addDoc, updateDoc, doc, serverTimestamp }) {
    const { remarkData } = operation;
    
    const newRemark = {
      nodeId: remarkData.nodeId,
      text: remarkData.text,
      priority: remarkData.priority,
      images: remarkData.images || [],
      createdAt: serverTimestamp(),
      userId: remarkData.userId
    };

    const docRef = await addDoc(collection(db, 'remarks'), newRemark);
    
    if (!remarkData.nodeHasRemarks) {
      await updateDoc(doc(db, 'nodes', remarkData.nodeId), {
        hasRemarks: true
      });
    }
    
    return { id: docRef.id, ...newRemark };
  }

  async executeUploadImage(operation, { supabase }) {
    const { imageData } = operation;
    
    // Förbättrat blob-återställning från cache
    let uploadBlob = imageData.blob;
    if (!uploadBlob) {
      const cachedData = this.getCachedImage(imageData.fileName);
      if (cachedData) {
        try {
          // Convert base64 back to blob with proper type
          const response = await fetch(cachedData);
          uploadBlob = await response.blob();
        } catch (error) {
          throw new Error(`Failed to restore blob from cache: ${error.message}`);
        }
      } else {
        throw new Error(`Image blob not found in cache: ${imageData.fileName}`);
      }
    }
    
    // Upload med retry-logik
    let lastError;
    const maxRetries = 2;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Uploading ${imageData.fileName} (attempt ${attempt + 1}/${maxRetries + 1})`);
        
        const { error } = await supabase.storage
          .from('controls')
          .upload(imageData.filePath, uploadBlob, {
            cacheControl: '3600',
            upsert: attempt > 0, // Allow upsert på retry
          });

        if (error) {
          lastError = error;
          
          // Vissa fel är permanent, avbryt direkt
          if (error.message.includes('already exists') && attempt === 0) {
            console.log('File already exists, trying with upsert...');
            continue;
          }
          
          if (error.message.includes('invalid') || error.message.includes('permission')) {
            throw new Error('Permanent upload error: ' + error.message);
          }
          
          // Vänta lite mellan retries
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
        } else {
          // Uppladdning lyckades
          const { data: urlData } = supabase.storage
            .from('controls')
            .getPublicUrl(imageData.filePath);

          // Rensa från cache efter lyckad uppladdning
          localStorage.removeItem(`cached_image_${imageData.fileName}`);
          console.log(`✅ Successfully uploaded and removed from cache: ${imageData.fileName}`);

          return {
            url: urlData.publicUrl,
            fileName: imageData.fileName,
            originalName: imageData.originalName || imageData.fileName,
            size: imageData.size,
            type: imageData.type,
            path: imageData.filePath,
            uploadedAt: new Date().toISOString()
          };
        }
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          console.warn(`Upload attempt ${attempt + 1} failed:`, error.message);
          await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
        }
      }
    }
    
    throw new Error(`Upload failed after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  async executeUpdateNode(operation, { db, updateDoc, doc, serverTimestamp }) {
    const { nodeId, updates } = operation;
    
    await updateDoc(doc(db, 'nodes', nodeId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  }

  async executeUpdateRemark(operation, { db, updateDoc, doc, serverTimestamp }) {
    const { remarkId, updates } = operation;
    
    await updateDoc(doc(db, 'remarks', remarkId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  }

  handleOnline() {
    console.log('🌐 Network connection restored');
    this.isOnline = true;
    this.processPendingOperations();
  }

  handleOffline() {
    console.log('📶 Network connection lost - switching to offline mode');
    this.isOnline = false;
  }

  // Förbättrad cachehantering för bilder
  async cacheImage(imageBlob, imageName, metadata = {}) {
    try {
      // Kontrollera localStorage-utrymme
      const storageQuota = await this.getStorageQuota();
      if (storageQuota && storageQuota.usage / storageQuota.quota > 0.8) {
        console.warn('Storage quota nearly full, cleaning up old images');
        this.cleanupOldImages();
      }
      
      const base64 = await this.blobToBase64(imageBlob);
      const cached = {
        data: base64,
        timestamp: Date.now(),
        name: imageName,
        size: imageBlob.size || base64.length,
        type: imageBlob.type || 'image/jpeg',
        metadata: {
          controlId: metadata.controlId,
          nodeId: metadata.nodeId,
          originalName: metadata.originalName,
          ...metadata
        }
      };
      
      localStorage.setItem(`cached_image_${imageName}`, JSON.stringify(cached));
      
      // Håll koll på totala cachestorleken
      this.updateCacheSize(base64.length, 'add');
      
      console.log(`📦 Cached image ${imageName} (${this.formatBytes(base64.length)})`);
      return true;
    } catch (error) {
      console.error('Error caching image:', error);
      
      // Om localStorage är fullt, försök rensa och försök igen
      if (error.name === 'QuotaExceededError') {
        console.log('Storage quota exceeded, cleaning up...');
        this.cleanupOldImages(0.5); // Rensa 50% av gamla bilder
        
        try {
          const base64 = await this.blobToBase64(imageBlob);
          const cached = { data: base64, timestamp: Date.now(), name: imageName };
          localStorage.setItem(`cached_image_${imageName}`, JSON.stringify(cached));
          return true;
        } catch (retryError) {
          console.error('Failed to cache after cleanup:', retryError);
          return false;
        }
      }
      return false;
    }
  }

  getCachedImage(imageName) {
    try {
      const cached = localStorage.getItem(`cached_image_${imageName}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dagar istället för 24 timmar
        
        if (Date.now() - parsed.timestamp < maxAge) {
          // Uppdatera access timestamp för LRU
          parsed.lastAccessed = Date.now();
          localStorage.setItem(`cached_image_${imageName}`, JSON.stringify(parsed));
          return parsed.data;
        } else {
          // Ta bort gamla bilder automatiskt
          localStorage.removeItem(`cached_image_${imageName}`);
          console.log(`🗑️ Removed expired cached image: ${imageName}`);
        }
      }
    } catch (error) {
      console.error('Error getting cached image:', error);
      // Ta bort korrupt cache-entry
      localStorage.removeItem(`cached_image_${imageName}`);
    }
    return null;
  }

  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  // Nya hjälpfunktioner för cache-hantering
  async getStorageQuota() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        return await navigator.storage.estimate();
      } catch (error) {
        console.warn('Could not estimate storage:', error);
      }
    }
    return null;
  }
  
  cleanupOldImages(percentageToRemove = 0.3) {
    try {
      const imageKeys = Object.keys(localStorage).filter(key => key.startsWith('cached_image_'));
      
      if (imageKeys.length === 0) return;
      
      // Sortera efter timestamp (äldsta först)
      const imagesWithData = imageKeys.map(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          return { key, timestamp: data.timestamp, lastAccessed: data.lastAccessed || data.timestamp };
        } catch {
          return null;
        }
      }).filter(Boolean);
      
      // Sortera efter senast använd (LRU)
      imagesWithData.sort((a, b) => a.lastAccessed - b.lastAccessed);
      
      const toRemove = Math.ceil(imagesWithData.length * percentageToRemove);
      const removed = [];
      
      for (let i = 0; i < toRemove && i < imagesWithData.length; i++) {
        localStorage.removeItem(imagesWithData[i].key);
        removed.push(imagesWithData[i].key);
      }
      
      console.log(`🧹 Cleaned up ${removed.length} old cached images:`, removed);
      
    } catch (error) {
      console.error('Error cleaning up images:', error);
    }
  }
  
  updateCacheSize(sizeChange, operation) {
    try {
      const currentSize = parseInt(localStorage.getItem('cache_total_size') || '0');
      const newSize = operation === 'add' ? currentSize + sizeChange : Math.max(0, currentSize - sizeChange);
      localStorage.setItem('cache_total_size', newSize.toString());
    } catch (error) {
      console.warn('Could not update cache size:', error);
    }
  }
  
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  getCacheStats() {
    const imageKeys = Object.keys(localStorage).filter(key => key.startsWith('cached_image_'));
    const totalSize = parseInt(localStorage.getItem('cache_total_size') || '0');
    
    return {
      totalImages: imageKeys.length,
      totalSize: this.formatBytes(totalSize),
      rawSize: totalSize
    };
  }

  // Hjälpfunktion för att avgöra om ett fel kan försökas igen
  isRetryableError(error) {
    const retryableMessages = [
      'network',
      'timeout',
      'connection',
      'unavailable',
      'temporary',
      'rate limit',
      'server error',
      '503',
      '502',
      '504'
    ];
    
    const message = error.message?.toLowerCase() || '';
    return retryableMessages.some(msg => message.includes(msg));
  }
  
  // Lägg till stöd för nya operationstyper
  async executeDeleteRemark(operation, { db, doc, deleteDoc }) {
    const { remarkId } = operation;
    if (!remarkId) throw new Error('Missing remarkId for delete operation');
    
    await deleteDoc(doc(db, 'remarks', remarkId));
    return { success: true, remarkId };
  }
  
  async executeAddNode(operation, { db, collection, addDoc, serverTimestamp }) {
    const { nodeData } = operation;
    if (!nodeData) throw new Error('Missing nodeData for add node operation');
    
    const newNode = {
      ...nodeData,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'nodes'), newNode);
    return { id: docRef.id, ...newNode };
  }
  
  async executeDeleteNode(operation, { db, doc, deleteDoc, collection, getDocs, query, where }) {
    const { nodeId } = operation;
    if (!nodeId) throw new Error('Missing nodeId for delete operation');
    
    // Delete associated remarks first
    const remarksQuery = query(collection(db, 'remarks'), where('nodeId', '==', nodeId));
    const remarksSnapshot = await getDocs(remarksQuery);
    
    for (const remarkDoc of remarksSnapshot.docs) {
      await deleteDoc(doc(db, 'remarks', remarkDoc.id));
    }
    
    // Delete the node
    await deleteDoc(doc(db, 'nodes', nodeId));
    return { success: true, nodeId };
  }
  
  // Rensa gamla operationer som är för gamla
  cleanupOldOperations() {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dagar
    const now = Date.now();
    
    const validOps = this.pendingOperations.filter(op => {
      const opTime = new Date(op.timestamp).getTime();
      return (now - opTime) < maxAge;
    });
    
    if (validOps.length !== this.pendingOperations.length) {
      console.log(`🧹 Cleaned up ${this.pendingOperations.length - validOps.length} old operations`);
      this.pendingOperations = validOps;
      localStorage.setItem('pendingOperations', JSON.stringify(this.pendingOperations));
    }
  }
  
  // Status för UI
  getStatus() {
    this.cleanupOldOperations(); // Rensa gamla ops när status hämtas
    
    return {
      isOnline: this.isOnline,
      pendingOperations: this.pendingOperations.length,
      syncInProgress: this.syncInProgress,
      syncProgress: this.syncProgress,
      lastSync: localStorage.getItem('lastSync'),
      failedOperations: this.pendingOperations.filter(op => (op.retryCount || 0) >= 3).length,
      retryableOperations: this.pendingOperations.filter(op => (op.retryCount || 0) < 3).length
    };
  }
}

export const offlineManager = new OfflineManager();

// Gör offlineManager tillgänglig globalt för service worker
if (typeof window !== 'undefined') {
  window.offlineManager = offlineManager;
}