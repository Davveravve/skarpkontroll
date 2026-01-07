// src/utils/controlPdfGenerator/modules/headerModule.js - Header-modul för PDF

// Hjälpfunktion för att ladda bilder från URL (kopierad från huvudfilen)
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
    
    const urlWithTimestamp = url.includes('?') 
      ? `${url}&t=${Date.now()}` 
      : `${url}?t=${Date.now()}`;
    img.src = urlWithTimestamp;
  });
};

/**
 * Renderar PDF header med logotyp, kontrollinfo och kontrollpunkter
 * @param {Object} pdfState - PDF state objekt
 * @param {Object} control - Kontrolldata
 * @param {Object} userProfile - Användarens profil
 * @param {Array} kontrollpunkter - Kontrollpunkter att visa
 * @param {string} instructionText - Instruktionstext för kontrollpunkter
 * @returns {Promise<number>} - Ny Y-position
 */
export const renderHeader = async (pdfState, control, userProfile, kontrollpunkter = [], instructionText = '') => {
  const { doc, pageWidth, margins } = pdfState;
  let yPos = pdfState.yPosition;
  
  console.log('Rendering header module');
  console.log('📋 Header received kontrollpunkter:', kontrollpunkter?.length || 0, kontrollpunkter);
  console.log('📝 Header received instruction text:', instructionText?.length || 0, 'characters');
  
  // ===== LOGOTYP OCH FÖRETAGSINFORMATION =====
  if (userProfile.logoUrl) {
    try {
      console.log('Loading logo:', userProfile.logoUrl);
      const logoImg = await loadImageFromUrl(userProfile.logoUrl);
      
      if (logoImg) {
        // Beräkna logotypens storlek (max 50x30)
        const maxLogoWidth = 50;
        const maxLogoHeight = 30;
        
        const logoAspectRatio = logoImg.width / logoImg.height;
        let logoWidth = maxLogoWidth;
        let logoHeight = maxLogoWidth / logoAspectRatio;
        
        if (logoHeight > maxLogoHeight) {
          logoHeight = maxLogoHeight;
          logoWidth = logoHeight * logoAspectRatio;
        }
        
        // Placera logotypen på höger sida
        const logoX = pageWidth - margins.right - logoWidth;
        doc.addImage(logoImg.data, 'PNG', logoX, yPos, logoWidth, logoHeight);

        // Kontaktinfo under logotypen (INTE företagsnamn - loggan ersätter det)
        const companyInfoX = pageWidth - margins.right;
        let companyInfoY = yPos + logoHeight + 5;

        if (userProfile.phone) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(userProfile.phone, companyInfoX, companyInfoY, { align: 'right' });
          companyInfoY += 5;
        }

        if (userProfile.website) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(userProfile.website, companyInfoX, companyInfoY, { align: 'right' });
        }

        yPos = Math.max(yPos + logoHeight + 12, companyInfoY + 6);
      }
    } catch (logoError) {
      console.warn('Could not load logo:', logoError);
      yPos = renderCompanyInfoOnly(doc, userProfile, yPos, margins);
    }
  } else {
    yPos = renderCompanyInfoOnly(doc, userProfile, yPos, margins);
  }
  
  // ===== BASIC KONTROLLNAMN =====
  
  // Enkelt kontrollnamn - bara text
  doc.setTextColor(33, 33, 33); // Dark charcoal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(control.name || 'Namnlös kontroll', margins.left, yPos);
  
  // Enkel underline
  const titleWidth = doc.getTextWidth(control.name || 'Namnlös kontroll');
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margins.left, yPos + 3, margins.left + titleWidth, yPos + 3);
  
  // Återställ textfärg
  doc.setTextColor(0);
  
  yPos += 18; // Reduced title spacing
  
  // === KONTROLLPUNKTER SEKTION ===
  if (kontrollpunkter.length > 0 || instructionText.trim()) {
    console.log('Rendering kontrollpunkter section:', kontrollpunkter.length, 'items, instruction text:', instructionText.length);
    
    // Header för kontrollpunkter
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('KONTROLLPUNKTER', margins.left, yPos);
    
    yPos += 10; // Reduced kontrollpunkter header spacing
    
    // Visa instruktionstext först (om den finns)
    if (instructionText.trim()) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99); // Gray 600
      
      const instructionLines = doc.splitTextToSize(instructionText.trim(), pageWidth - margins.left - margins.right - 10);
      doc.text(instructionLines, margins.left, yPos);
      yPos += (instructionLines.length * 4) + 8; // Extra mellanrum efter instruktioner
    }
    
    // Lista kontrollpunkter
    if (kontrollpunkter.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81); // Gray 700
      
      kontrollpunkter.forEach((punkt, index) => {
        const bulletText = `${index + 1}. ${punkt.text}`;
        const textLines = doc.splitTextToSize(bulletText, pageWidth - margins.left - margins.right - 20);
        doc.text(textLines, margins.left + 10, yPos);
        yPos += (textLines.length * 4) + 2;
      });
      
      yPos += 10; // Reduced space after kontrollpunkter
    } else if (instructionText.trim()) {
      yPos += 10; // Less space if no kontrollpunkter but has instruction
    }
    
    // Separator line
    doc.setDrawColor(229, 231, 235); // Gray 200
    doc.setLineWidth(0.5);
    doc.line(margins.left, yPos - 8, pageWidth - margins.right, yPos - 8);
    
    yPos += 10;
  }
  
  return yPos;
};

/**
 * Renderar endast företagsinformation utan logotyp
 */
const renderCompanyInfoOnly = (doc, userProfile, yPos, margins) => {
  let currentY = yPos;
  const pageWidth = doc.internal.pageSize.getWidth();
  const companyInfoX = pageWidth - margins.right;
  
  if (userProfile.companyName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(userProfile.companyName, companyInfoX, currentY, { align: 'right' });
    currentY += 8;
  }
  
  if (userProfile.phone) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(userProfile.phone, companyInfoX, currentY, { align: 'right' });
    currentY += 6;
  }
  
  if (userProfile.website) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(userProfile.website, companyInfoX, currentY, { align: 'right' });
    currentY += 6;
  }
  
  return currentY + 15;
};