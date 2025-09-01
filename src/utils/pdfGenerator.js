// src/utils/pdfGenerator.js - Komplett PDF-generator med logotypstöd
import jsPDF from 'jspdf';

// Hjälpfunktion för att ladda bilder från URL
const loadImageFromUrl = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const dataUrl = canvas.toDataURL('image/png');
        resolve({
          data: dataUrl,
          width: img.width,
          height: img.height
        });
      } catch (e) {
        console.warn('Could not process image:', e);
        reject(e);
      }
    };
    
    img.onerror = () => reject(new Error('Could not load image'));
    
    // Lägg till cache-busting för att undvika CORS-problem
    const urlWithTimestamp = url.includes('?') 
      ? `${url}&t=${Date.now()}` 
      : `${url}?t=${Date.now()}`;
    img.src = urlWithTimestamp;
  });
};

export const generateInspectionPDF = async (inspection, installation, customer, address, userProfile = {}) => {
  try {
    console.log('🎯 Generating PDF with user profile:', userProfile);
    
    // Skapa ny PDF med A4-format
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;
    
    // ===== HEADER MED LOGOTYP OCH FÖRETAGSINFO =====
    
    // Ladda och lägg till logotyp om den finns
    if (userProfile.logoUrl) {
      try {
        console.log('🏢 Laddar logotyp från:', userProfile.logoUrl);
        const logoImg = await loadImageFromUrl(userProfile.logoUrl);
        
        if (logoImg) {
          // Beräkna logotypens storlek (max 50x25)
          const maxLogoWidth = 50;
          const maxLogoHeight = 25;
          
          const logoAspectRatio = logoImg.width / logoImg.height;
          let logoWidth = maxLogoWidth;
          let logoHeight = maxLogoWidth / logoAspectRatio;
          
          if (logoHeight > maxLogoHeight) {
            logoHeight = maxLogoHeight;
            logoWidth = logoHeight * logoAspectRatio;
          }
          
          // Placera logotypen i övre vänstra hörnet
          doc.addImage(logoImg.data, 'PNG', 14, yPosition, logoWidth, logoHeight);
          
          // Företagsinformation till höger om logotypen (vertikal centrering)
          const logoMiddleY = yPosition + (logoHeight / 2);
          let companyInfoY = logoMiddleY - 8; // Starta lite ovanför mitten
          
          
          if (userProfile.website) {
            doc.text(userProfile.website, 14 + logoWidth + 10, companyInfoY);
            companyInfoY += 5;
          }
          
          if (userProfile.organizationNumber) {
            doc.text(`Org.nr: ${userProfile.organizationNumber}`, 14 + logoWidth + 10, companyInfoY);
          }
          
          yPosition = Math.max(yPosition + logoHeight + 15, companyInfoY + 10);
          console.log('✅ Logotyp och företagsinfo tillagd i PDF');
        }
      } catch (logoError) {
        console.warn('⚠️ Kunde inte ladda logotyp för PDF:', logoError);
        yPosition = 35;
      }
    } else {
      // Om ingen logotyp finns, bara företagsinfo
      if (userProfile.companyName) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(userProfile.companyName, 14, yPosition);
        yPosition += 8;
      }
      
      if (userProfile.phone) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`${userProfile.phone}`, 14, yPosition);
        yPosition += 6;
      }
      
      yPosition += 10;
    }
    
    // Linje under header
    doc.setDrawColor(200);
    doc.line(14, yPosition, pageWidth - 14, yPosition);
    yPosition += 15;
    
    // ===== INFO BOX =====
    
    // Full bredd info box
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(14, yPosition, pageWidth - 28, 50);
    
    // Innehåll i info box
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Kontrollrapport", 16, yPosition + 10);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    // Vänster kolumn - kundinfo utan prefixer
    doc.text(`${customer?.name || 'Uppgift saknas'}`, 16, yPosition + 22);
    
    // Adress utan prefix
    if (address?.street) {
      doc.text(`${address.street}`, 16, yPosition + 30);
    }
    if (address?.postalCode || address?.city) {
      doc.text(`${address?.postalCode || ''} ${address?.city || ''}`.trim(), 16, yPosition + 38);
    }
    
    // Anläggning utan prefix
    if (installation?.name) {
      doc.text(`${installation.name}`, 16, yPosition + 46);
    }
    
    // Höger kolumn - datum och kontroll (INUTI boxen)
    const inspectionDate = inspection.createdAt 
      ? new Date(inspection.createdAt.seconds * 1000).toLocaleDateString('sv-SE')
      : new Date().toLocaleDateString('sv-SE');
    
    doc.text(`Datum: ${inspectionDate}`, pageWidth - 70, yPosition + 22);
    
    // Kontrollnamn med radbrytning om för långt
    const maxControlNameWidth = 65;
    const controlText = `${inspection?.name || 'Kontroll'}`;
    const controlLines = doc.splitTextToSize(controlText, maxControlNameWidth);
    doc.text(controlLines, pageWidth - 70, yPosition + 30)
    
    yPosition += 65;
    
    // ===== KONTROLLRESULTAT =====
    if (inspection.sections && inspection.sections.length > 0) {
      
      // Lägg till alla bilder först för att ha en cache
      const imageCache = {};
      const uniqueImages = [];
      
      // Samla alla unika bilder
      inspection.sections.forEach((section, sectionIndex) => {
        if (section.items) {
          section.items.forEach((item, itemIndex) => {
            if (item.images && Array.isArray(item.images)) {
              item.images.forEach((img, imgIndex) => {
                const key = `${sectionIndex}_${itemIndex}_${imgIndex}`;
                if (img.url && !uniqueImages.some(ui => ui.url === img.url)) {
                  uniqueImages.push({ ...img, key });
                }
              });
            }
          });
        }
      });
      
      // Ladda alla bilder i bakgrunden
      try {
        const loadPromises = uniqueImages.map(async img => {
          try {
            const imageData = await loadImageFromUrl(img.url);
            if (imageData) {
              imageCache[img.key] = imageData;
            }
          } catch (err) {
            console.error(`Kunde inte ladda bild: ${img.url}`, err);
          }
        });
        
        await Promise.all(loadPromises);
        console.log(`✅ Laddade ${Object.keys(imageCache).length} av ${uniqueImages.length} bilder`);
      } catch (err) {
        console.error('Fel vid bildladdning:', err);
      }
      
      // Maximal bredd och höjd för bilder
      const maxImageWidth = 120;
      const maxImageHeight = 90;
      
      // Iterera genom sektioner
      for (const [sectionIndex, section] of inspection.sections.entries()) {
        console.log(`📝 Processing section ${sectionIndex}:`, section.name || section.title);
        
        // Kontrollera om vi behöver ny sida
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Sektion rubrik
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(`${sectionIndex + 1}. ${String(section.name || section.title || 'Namnlös sektion')}`, 14, yPosition);
        yPosition += 12;
        
        // Iterera genom items i sektionen
        if (section.items && section.items.length > 0) {
          for (const [itemIndex, item] of section.items.entries()) {
            console.log(`  ❓ Processing item ${itemIndex}:`, item.label, 'Value:', item.value);
            
            // Beräkna space som behövs för denna item (inklusive bilder)
            const hasImages = Array.isArray(item.images) && item.images.length > 0;
            const estimatedHeight = item.type === 'header' ? 12 : 15;
            const imageHeight = hasImages ? Math.min(maxImageHeight, 50 * item.images.length) : 0;
            const totalItemHeight = estimatedHeight + imageHeight + (item.notes ? 8 : 0);
            
            // Kontrollera om vi behöver ny sida
            if (yPosition + totalItemHeight > pageHeight - 30) {
              doc.addPage();
              yPosition = 20;
            }
            
            // Hantera olika frågetyper
            if (item.type === 'header') {
              // Rubrik
              doc.setFont("helvetica", "bold");
              doc.setFontSize(12);
              doc.text(`${String(item.label || 'Rubrik utan text')}`, 20, yPosition);
              yPosition += 12;
            } else {
              // Vanlig fråga
              doc.setFont("helvetica", "normal");
              doc.setFontSize(10);
              doc.text(`• ${String(item.label || 'Fråga utan text')}`, 20, yPosition);
              yPosition += 8;
              
              // Svar
              let answerText = '';
              
              if (item.type === 'yesno') {
                if (item.value === true) {
                  answerText = 'Ja';
                } else if (item.value === false) {
                  answerText = 'Nej';
                } else {
                  answerText = 'Ej besvarad';
                }
              } else if (item.type === 'checkbox') {
                answerText = item.value === true ? 'Markerad' : 'Ej markerad';
              } else if (item.type === 'text') {
                answerText = item.value ? String(item.value).substring(0, 200) : 'Inget svar';
                if (item.value && item.value.length > 200) {
                  answerText += '...';
                }
              }
              
              if (answerText) {
                doc.setFont("helvetica", "italic");
                doc.setFontSize(9);
                doc.text(`   Svar: ${answerText}`, 20, yPosition);
                yPosition += 7;
              }
              
              // Anteckningar
              if (item.notes) {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.text(`   Anteckning: ${String(item.notes).substring(0, 150)}`, 20, yPosition);
                yPosition += 8;
              }
              
              // Bilder
              if (hasImages) {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.text(`   Bilder (${item.images.length}):`, 20, yPosition);
                yPosition += 6;
                
                let imageX = 25;
                let imageY = yPosition;
                const imagesPerRow = Math.floor((pageWidth - 50) / (maxImageWidth + 10));
                let imageCount = 0;
                
                for (const [imgIndex, image] of item.images.entries()) {
                  const imageKey = `${sectionIndex}_${itemIndex}_${imgIndex}`;
                  const cachedImage = imageCache[imageKey];
                  
                  if (cachedImage) {
                    try {
                      // Beräkna bildstorlek
                      const aspectRatio = cachedImage.width / cachedImage.height;
                      let imgWidth = Math.min(maxImageWidth, cachedImage.width);
                      let imgHeight = imgWidth / aspectRatio;
                      
                      if (imgHeight > maxImageHeight) {
                        imgHeight = maxImageHeight;
                        imgWidth = imgHeight * aspectRatio;
                      }
                      
                      // Kontrollera om bilden får plats på sidan
                      if (imageY + imgHeight > pageHeight - 30) {
                        doc.addPage();
                        imageY = 20;
                        imageX = 25;
                        imageCount = 0;
                      }
                      
                      // Lägg till bild
                      doc.addImage(cachedImage.data, 'PNG', imageX, imageY, imgWidth, imgHeight);
                      
                      // Bildtext
                      doc.setFont("helvetica", "normal");
                      doc.setFontSize(8);
                      const truncatedName = image.name.length > 15 ? 
                        image.name.substring(0, 12) + '...' : 
                        image.name;
                      doc.text(truncatedName, imageX, imageY + imgHeight + 5);
                      
                      // Uppdatera position för nästa bild
                      imageCount++;
                      if (imageCount >= imagesPerRow) {
                        imageX = 25;
                        imageY += imgHeight + 15;
                        imageCount = 0;
                      } else {
                        imageX += imgWidth + 10;
                      }
                    } catch (imgError) {
                      console.error('Fel vid tillägg av bild i PDF:', imgError);
                    }
                  }
                }
                
                // Uppdatera yPosition efter alla bilder
                if (imageCount > 0) {
                  // Vi har bilder på den sista raden
                  const lastRowHeight = Math.max(...item.images.slice(-imageCount).map(img => {
                    const key = `${sectionIndex}_${itemIndex}_${item.images.indexOf(img)}`;
                    const cached = imageCache[key];
                    if (cached) {
                      const aspectRatio = cached.width / cached.height;
                      let imgWidth = Math.min(maxImageWidth, cached.width);
                      let imgHeight = imgWidth / aspectRatio;
                      return Math.min(imgHeight, maxImageHeight);
                    }
                    return 0;
                  }));
                  yPosition = imageY + lastRowHeight + 15;
                } else {
                  yPosition = imageY;
                }
              }
              
              yPosition += 5; // Extra mellanrum mellan frågor
            }
          }
        }
        
        yPosition += 10; // Extra mellanrum mellan sektioner
      }
    }
    
    // ===== SIDFOT =====
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = pageHeight - 30;
    } else {
      yPosition = pageHeight - 30;
    }
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100);
    
    const footerText = userProfile.companyName ? 
      `${userProfile.companyName} - ${new Date().toLocaleDateString('sv-SE')}` :
      `Kontrollrapport genererad ${new Date().toLocaleDateString('sv-SE')}`;
    
    doc.text(footerText, pageWidth / 2, yPosition, { align: 'center' });
    
    console.log('✅ PDF-generering slutförd');
    return doc;
    
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw error;
  }
};