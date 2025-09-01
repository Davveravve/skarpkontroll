// src/utils/controlPdfGenerator/utils/imageOptimizer.js - Optimerad bildhantering för PDF

/**
 * Cache för bilddata för att undvika dubbletter
 */
const imageCache = new Map();

/**
 * Ladda flera bilder parallellt med optimerad prestanda
 */
export const loadImagesInParallel = async (imageUrls, progressState) => {
  if (!imageUrls || imageUrls.length === 0) return [];

  console.log(`🚀 Loading ${imageUrls.length} images in parallel...`);
  
  // Begränsa till max 5 parallella requests för att undvika överbelastning
  const MAX_CONCURRENT = 5;
  const results = new Map();
  
  // Dela upp i batches
  const batches = [];
  for (let i = 0; i < imageUrls.length; i += MAX_CONCURRENT) {
    batches.push(imageUrls.slice(i, i + MAX_CONCURRENT));
  }
  
  // Processa varje batch
  for (const batch of batches) {
    const promises = batch.map(async (imageUrl, index) => {
      try {
        const imageData = await loadOptimizedImage(imageUrl);
        
        // Uppdatera progress
        progressState.processedImages++;
        const progressPercent = (progressState.processedImages / progressState.totalImages) * 80; // 80% för images
        progressState.onProgress(
          10 + progressPercent, 
          `Laddar bilder... (${progressState.processedImages}/${progressState.totalImages})`
        );
        
        return { url: imageUrl, data: imageData };
      } catch (error) {
        console.warn('Failed to load image:', imageUrl, error);
        return { url: imageUrl, data: null };
      }
    });
    
    // Vänta på batch completion
    const batchResults = await Promise.all(promises);
    
    // Lagra resultat
    batchResults.forEach(result => {
      results.set(result.url, result.data);
    });
  }
  
  console.log(`✅ Loaded ${results.size} images successfully`);
  return results;
};

/**
 * Ladda och optimera en enskild bild
 */
const loadOptimizedImage = async (url) => {
  // Kontrollera memory cache först
  const cacheKey = url;
  if (imageCache.has(cacheKey)) {
    console.log('📋 Using memory cached image:', url);
    return imageCache.get(cacheKey);
  }

  // Kontrollera localStorage cache för offline-stöd
  try {
    const offlineCacheKey = `cached_image_${btoa(url).substring(0, 50)}`;
    const cachedData = localStorage.getItem(offlineCacheKey);
    if (cachedData) {
      console.log('💾 Using offline cached image:', url);
      const imageData = JSON.parse(cachedData);
      imageCache.set(cacheKey, imageData);
      return imageData;
    }
  } catch (e) {
    console.warn('Could not check offline cache for image:', url);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const timeout = setTimeout(() => {
      reject(new Error('Image load timeout'));
    }, 10000); // 10s timeout
    
    img.onload = () => {
      clearTimeout(timeout);
      
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Optimera bildstorlek för PDF (max 800px bred)
        const maxWidth = 800;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Komprimera mer aggressivt för snabbare PDF
        const quality = img.width > 400 ? 0.7 : 0.8;
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        const imageData = {
          data: dataUrl,
          width: img.width,
          height: img.height,
          scaledWidth: canvas.width,
          scaledHeight: canvas.height
        };
        
        // Cacha resultatet i memory
        imageCache.set(cacheKey, imageData);
        
        // Spara även till localStorage för offline-användning
        try {
          const offlineCacheKey = `cached_image_${btoa(url).substring(0, 50)}`;
          localStorage.setItem(offlineCacheKey, JSON.stringify(imageData));
          console.log('💾 Saved image to offline cache:', url);
        } catch (e) {
          console.warn('Could not save image to offline cache:', e);
        }
        
        resolve(imageData);
        
      } catch (e) {
        clearTimeout(timeout);
        console.warn('Could not process image:', e);
        reject(e);
      }
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Image load failed'));
    };
    
    // Lägg till timestamp för cache-busting
    const urlWithTimestamp = url.includes('?') 
      ? `${url}&t=${Date.now()}` 
      : `${url}?t=${Date.now()}`;
    img.src = urlWithTimestamp;
  });
};

/**
 * Pre-ladda alla bilder innan PDF-rendering
 */
export const preloadAllImages = async (remarks, progressState) => {
  console.log('🎯 Pre-loading all images for PDF...');
  
  // Samla alla unika image URLs
  const allImageUrls = new Set();
  remarks.forEach(remark => {
    if (remark.images && remark.images.length > 0) {
      remark.images.forEach(image => {
        const url = image.url || image.downloadURL;
        if (url) allImageUrls.add(url);
      });
    }
  });
  
  const uniqueUrls = Array.from(allImageUrls);
  console.log(`📷 Found ${uniqueUrls.length} unique images to preload`);
  
  if (uniqueUrls.length === 0) return new Map();
  
  // Ladda alla bilder parallellt
  return await loadImagesInParallel(uniqueUrls, progressState);
};

/**
 * Hämta cached bilddata
 */
export const getCachedImage = (url) => {
  return imageCache.get(url) || null;
};

/**
 * Rensa bildcache
 */
export const clearImageCache = () => {
  imageCache.clear();
  console.log('🧹 Image cache cleared');
};