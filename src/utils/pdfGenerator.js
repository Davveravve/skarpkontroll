// src/utils/pdfGenerator.js - Enkel och ren PDF-generator
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Funktion för att ladda bild som base64
const loadImageAsBase64 = (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx.drawImage(img, 0, 0);
      
      try {
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        resolve({
          dataURL: dataURL,
          width: img.width,
          height: img.height
        });
      } catch (err) {
        console.error('Error converting image to base64:', err);
        resolve(null);
      }
    };
    
    img.onerror = () => {
      console.error('Error loading image:', url);
      resolve(null);
    };
    
    // Lägg till cache-busting
    const urlWithTimestamp = url.includes('?') 
      ? `${url}&t=${Date.now()}` 
      : `${url}?t=${Date.now()}`;
    img.src = urlWithTimestamp;
  });
};

export const generateInspectionPDF = async (inspection, installation, customer, address, userProfile = null) => {
  try {
    console.log('🎯 Generating simple PDF with data:', { inspection, installation, customer, address });
    
    // Skapa ny PDF med A4-format
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPosition = 20;
    
    // ===== SIDHUVUD =====
    // Enkel företagslogotyp i övre högra hörnet
    const companyName = userProfile?.companyName || 'Stig Olofssons El AB';
    doc.setFillColor(50, 50, 50);
    doc.rect(pageWidth - 79, 10, 73, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(companyName, pageWidth - 42.5, 16, { align: "center" });
    doc.setTextColor(0, 0, 0);
    
    // Huvudrubrik
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Kontrollrapport", 14, yPosition);
    yPosition += 15;
    
    // ===== PROJEKTINFORMATION =====
    // Enkel ruta
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(14, yPosition, pageWidth - 28, 40);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Projektinformation", 16, yPosition + 8);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    // Projektuppgifter
    doc.text(`Kund: ${String(customer?.name || 'Uppgift saknas')}`, 16, yPosition + 16);
    doc.text(`Adress: ${String(address?.street || 'Uppgift saknas')}`, 16, yPosition + 23);
    doc.text(`${String(address?.postalCode || '')} ${String(address?.city || '')}`.trim() || 'Uppgift saknas', 16, yPosition + 30);
    doc.text(`Anläggning: ${String(installation?.name || 'Uppgift saknas')}`, 16, yPosition + 37);
    
    // Datum
    const inspectionDate = inspection.createdAt 
      ? new Date(inspection.createdAt.seconds * 1000).toLocaleDateString('sv-SE')
      : new Date().toLocaleDateString('sv-SE');
    
    doc.text(`Datum: ${inspectionDate}`, pageWidth - 70, yPosition + 16);
    doc.text(`Kontroll: ${String(inspection.name || 'Standardkontroll')}`, pageWidth - 70, yPosition + 23);
    
    yPosition += 55;
    
    // ===== KONTROLLRESULTAT =====
    if (inspection.sections && inspection.sections.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Kontrollresultat", 14, yPosition);
      yPosition += 15;
      
      // Iterera genom sektioner
      for (const [sectionIndex, section] of inspection.sections.entries()) {
        console.log(`📝 Processing section ${sectionIndex}:`, section.name);
        
        // Kontrollera om vi behöver ny sida
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Sektion rubrik
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(`${sectionIndex + 1}. ${String(section.name || 'Namnlös sektion')}`, 14, yPosition);
        yPosition += 10;
        
        // Iterera genom items i sektionen
        if (section.items && section.items.length > 0) {
          for (const [itemIndex, item] of section.items.entries()) {
            console.log(`  ❓ Processing item ${itemIndex}:`, item.label, 'Value:', item.value);
            
            // Kontrollera om vi behöver ny sida
            if (yPosition > pageHeight - 40) {
              doc.addPage();
              yPosition = 20;
            }
            
            // Fråga
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text(`• ${String(item.label || 'Fråga utan text')}`, 20, yPosition);
            yPosition += 6;
            
            // Svar med korrekt logik
            let answerText = '';
            let showAnswer = true; // Flag för om vi ska visa svar-raden
            
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
              if (item.value && String(item.value).trim()) {
                answerText = String(item.value);
              } else {
                showAnswer = false; // Visa inte svar-rad om det inte finns text
              }
            } else {
              if (item.value && String(item.value).trim()) {
                answerText = String(item.value);
              } else {
                showAnswer = false; // Visa inte svar-rad om det inte finns värde
              }
            }
            
            // Visa bara svar om det finns något att visa
            if (showAnswer) {
              doc.text(`  Svar: ${answerText}`, 25, yPosition);
              yPosition += 6;
            }
            
            // Anteckningar om de finns
            if (item.notes && String(item.notes).trim()) {
              doc.text(`  Anteckning: ${String(item.notes)}`, 25, yPosition);
              yPosition += 6;
            }
            
            // Bilder om de finns
            if (item.images && item.images.length > 0) {
              console.log(`  📸 Processing ${item.images.length} images for item ${itemIndex}`);
              
              doc.text(`  Bilder: ${item.images.length} st`, 25, yPosition);
              yPosition += 8;
              
              // Visa bilder i rutnät - större bilder
              const maxImageWidth = 70;  // Ökat från 40 till 70
              const maxImageHeight = 50; // Ökat från 30 till 50
              const imagesPerRow = 2;
              let currentImageInRow = 0;
              let rowStartY = yPosition;
              
              // Ladda och visa bilder (max 6 per fråga)
              for (let i = 0; i < Math.min(item.images.length, 6); i++) {
                try {
                  console.log(`    🖼️ Loading image ${i + 1}:`, item.images[i].url);
                  
                  // Kontrollera om vi behöver ny sida för bilder
                  if (yPosition > pageHeight - maxImageHeight - 20) {
                    doc.addPage();
                    yPosition = 20;
                    currentImageInRow = 0;
                    rowStartY = yPosition;
                  }
                  
                  const imageData = await loadImageAsBase64(item.images[i].url);
                  
                  if (imageData) {
                    console.log(`    ✅ Image ${i + 1} loaded successfully`);
                    
                    // Beräkna bildstorlek med bibehållna proportioner
                    let imgWidth = maxImageWidth;
                    let imgHeight = maxImageHeight;
                    
                    if (imageData.width && imageData.height) {
                      const aspectRatio = imageData.width / imageData.height;
                      
                      if (aspectRatio > maxImageWidth / maxImageHeight) {
                        imgHeight = imgWidth / aspectRatio;
                      } else {
                        imgWidth = imgHeight * aspectRatio;
                      }
                    }
                    
                    // Beräkna position - justerad för större bilder
                    const xPos = 25 + (currentImageInRow * (maxImageWidth + 15)); // Mer spacing mellan bilder
                    
                    // Lägg till bilden
                    doc.addImage(
                      imageData.dataURL, 
                      'JPEG', 
                      xPos, 
                      yPosition, 
                      imgWidth, 
                      imgHeight
                    );
                    
                    // Bildnummer under bilden
                    doc.setFontSize(8);
                    doc.text(`Bild ${i + 1}`, xPos + imgWidth/2, yPosition + imgHeight + 4, { align: 'center' });
                    doc.setFontSize(10);
                    
                    currentImageInRow++;
                    
                    // Ny rad efter 2 bilder
                    if (currentImageInRow >= imagesPerRow) {
                      yPosition += maxImageHeight + 8;
                      currentImageInRow = 0;
                      rowStartY = yPosition;
                    }
                    
                  } else {
                    console.log(`    ❌ Failed to load image ${i + 1}`);
                    
                    // Placeholder för misslyckad bildladdning - större
                    const xPos = 25 + (currentImageInRow * (maxImageWidth + 15));
                    
                    doc.setFillColor(240, 240, 240);
                    doc.rect(xPos, yPosition, maxImageWidth, maxImageHeight, 'F');
                    
                    doc.setFontSize(8);
                    doc.text('Bild kunde inte laddas', xPos + maxImageWidth/2, yPosition + maxImageHeight/2, { align: 'center' });
                    doc.setFontSize(10);
                    
                    currentImageInRow++;
                    if (currentImageInRow >= imagesPerRow) {
                      yPosition += maxImageHeight + 8;
                      currentImageInRow = 0;
                    }
                  }
                } catch (err) {
                  console.error(`Error loading image ${i + 1} for PDF:`, err);
                }
              }
              
              // Justera Y-position om vi har ofullständig rad
              if (currentImageInRow > 0) {
                yPosition += maxImageHeight + 8;
              }
              
              // Visa meddelande om fler bilder finns
              if (item.images.length > 6) {
                doc.setFontSize(8);
                doc.text(`... och ${item.images.length - 6} bilder till`, 25, yPosition);
                doc.setFontSize(10);
                yPosition += 6;
              }
            }
            
            yPosition += 5; // Extra mellanrum mellan frågor
          }
        }
        
        yPosition += 8; // Extra mellanrum mellan sektioner
      }
    }
    
    // ===== SIDNUMMER =====
    const pageCount = doc.internal.getNumberOfPages();
    const currentDate = new Date().toLocaleDateString('sv-SE');
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Kontrollrapport - Sida ${i} av ${pageCount}`, 14, pageHeight - 10);
      doc.text(currentDate, pageWidth - 14, pageHeight - 10, { align: 'right' });
    }
    
    console.log('✅ Simple PDF generation completed successfully');
    return doc;
    
  } catch (err) {
    console.error('❌ Error generating PDF:', err);
    throw new Error(`PDF-generering misslyckades: ${err.message}`);
  }
};