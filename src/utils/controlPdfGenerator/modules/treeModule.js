// src/utils/controlPdfGenerator/modules/treeModule.js - Tree-struktur modul för PDF

import { getRemarksForNode, countRemarksInSubtree } from '../utils/treeUtils';

/**
 * Renderar träd-strukturen med perfekt linje-alignment och anmärkningar
 * @param {Object} pdfState - PDF state objekt
 * @param {Array} tree - Hierarkisk träd-struktur
 * @param {Array} remarks - Array av alla anmärkningar
 * @returns {Promise<number>} - Ny Y-position
 */
export const renderTreeStructure = async (pdfState, tree, remarks, progressState = null, imageCache = null) => {
  const { doc, pageWidth, pageHeight, margins } = pdfState;
  let yPos = pdfState.yPosition;
  
  console.log('Rendering clean tree structure');
  
  // CORPORATE DESIGN SYSTEM
  const design = {
    // Clean Typography
    fonts: {
      sectionHeader: { size: 12, weight: 'bold' },
      locationHeader: { size: 12, weight: 'bold' },  // Större
      areaName: { size: 10, weight: 'bold' },        // Tjockare
      remarkTitle: { size: 8, weight: 'bold' },
      remarkText: { size: 8, weight: 'normal' }
    },
    
    // Corporate Color Palette
    colors: {
      primary: [13, 71, 161],       // Corporate blue
      secondary: [33, 33, 33],      // Dark charcoal
      accent: [255, 152, 0],        // Warning orange
      success: [46, 125, 50],       // Success green
      error: [198, 40, 40],         // Error red
      lightGray: [245, 245, 245],   // Light background
      mediumGray: [158, 158, 158],  // Medium text
      border: [224, 224, 224]       // Borders
    },
    
    // Compact Layout System
    spacing: {
      sectionGap: 8,           // Between main locations (reduced from 15)
      subsectionGap: 4,        // Between areas in location (reduced from 8)
      remarkSection: 6,        // Before remark sections (reduced from 10)
      remarkGap: 4,            // Between individual remarks (reduced from 8)
      indent: 12,              // Standard indentation (reduced from 15)
      cardPadding: 4           // Internal card padding (reduced from 8)
    }
  };
  
  // Ingen header behövs, börja direkt med första noden
  yPos += 5;
  
  // Rendera varje huvudnod (adress/byggnad)
  for (let i = 0; i < tree.length; i++) {
    const rootNode = tree[i];
    
    if (i > 0) {
      yPos += design.spacing.sectionGap;
    }
    
    // Kontrollera sidbrytning
    const estimatedHeight = estimateNodeHeight(rootNode, remarks, design);
    if (yPos + estimatedHeight > pageHeight - margins.bottom - 50) {
      doc.addPage();
      yPos = margins.top + 20;
    }
    
    yPos = await renderCorporateLocationSection(pdfState, rootNode, remarks, yPos, design, imageCache);
  }
  
  return yPos + 20;
};

/**
 * Renderar en corporate location section med professionellt utseende
 */
const renderCorporateLocationSection = async (pdfState, locationNode, remarks, yPos, design, imageCache = null) => {
  const { doc, pageWidth, margins } = pdfState;
  
  // CLEAN LOCATION HEADER - utan cirkel
  doc.setTextColor(...design.colors.secondary);
  doc.setFont('helvetica', design.fonts.locationHeader.weight);
  doc.setFontSize(design.fonts.locationHeader.size);

  doc.text(locationNode.name, margins.left, yPos);
  
  yPos += 12; // Reduced from 18
  
  // Rendera områden under denna location
  if (locationNode.children && locationNode.children.length > 0) {
    for (let i = 0; i < locationNode.children.length; i++) {
      const areaNode = locationNode.children[i];
      const areaRemarks = getRemarksForNode(areaNode.id, remarks);
      
      // Bara visa område om det har anmärkningar eller barn med anmärkningar
      if (areaRemarks.length > 0 || hasRemarksInChildren(areaNode, remarks)) {
        yPos = await renderCorporateAreaSection(pdfState, areaNode, remarks, yPos, design, 1, imageCache);
        
        if (i < locationNode.children.length - 1) {
          yPos += design.spacing.subsectionGap;
        }
      }
    }
  }
  
  // Om location-noden själv har anmärkningar
  const locationRemarks = getRemarksForNode(locationNode.id, remarks);
  if (locationRemarks.length > 0) {
    yPos += design.spacing.remarkSection;
    yPos = await renderCorporateRemarkSection(pdfState, locationRemarks, yPos, design, locationNode.name, 0, imageCache);
  }
  
  return yPos;
};

/**
 * Renderar ett område (som "Källare", "Elcentral") med corporate styling
 */
const renderCorporateAreaSection = async (pdfState, areaNode, remarks, yPos, design, level = 1, imageCache = null) => {
  const { doc, pageWidth, pageHeight, margins } = pdfState;
  const areaRemarks = getRemarksForNode(areaNode.id, remarks);
  
  // Beräkna total höjd för denna area och dess anmärkningar (inkl. bilder)
  if (areaRemarks.length > 0) {
    const estimatedAreaHeight = estimateAreaWithRemarksHeight(areaNode, areaRemarks, design);
    
    // Om det inte finns plats, gör sidbrytning INNAN vi börjar rendera
    if (yPos + estimatedAreaHeight > pageHeight - margins.bottom - 20) {
      doc.addPage();
      yPos = margins.top + 20;
    }
  }
  
  // SIMPLE AREA HEADER - ren text utan prefix
  const indentX = margins.left + (level * 12); // 12px indrag per nivå

  doc.setTextColor(...design.colors.secondary);
  doc.setFont('helvetica', design.fonts.areaName.weight);
  doc.setFontSize(design.fonts.areaName.size);

  doc.text(areaNode.name, indentX, yPos);
  
  yPos += 10; // Reduced from 14
  
  // Rendera anmärkningar för detta område med korrekt indentering
  if (areaRemarks.length > 0) {
    yPos = await renderCorporateRemarkSection(pdfState, areaRemarks, yPos, design, areaNode.name, level, imageCache);
  }
  
  // Rendera barn-noder rekursivt med ökad indentering
  if (areaNode.children && areaNode.children.length > 0) {
    for (const child of areaNode.children) {
      const childRemarks = getRemarksForNode(child.id, remarks);
      if (childRemarks.length > 0 || hasRemarksInChildren(child, remarks)) {
        yPos = await renderCorporateAreaSection(pdfState, child, remarks, yPos, design, level + 1, imageCache);
      }
    }
  }
  
  return yPos;
};

/**
 * Kontrollerar om en nod har anmärkningar i sina barn
 */
const hasRemarksInChildren = (node, remarks) => {
  if (!node.children || node.children.length === 0) return false;
  
  for (const child of node.children) {
    const childRemarks = getRemarksForNode(child.id, remarks);
    if (childRemarks.length > 0) return true;
    if (hasRemarksInChildren(child, remarks)) return true;
  }
  
  return false;
};

/**
 * Renderar corporate-style remark section med bilder
 */
const renderCorporateRemarkSection = async (pdfState, remarks, yPos, design, areaName, level = 1, imageCache = null) => {
  const { doc, pageWidth, pageHeight, margins } = pdfState;
  const remarkIndent = margins.left + (level * 12) + 18; // Samma indrag som areas + 18px för dash och text
  
  for (let i = 0; i < remarks.length; i++) {
    const remark = remarks[i];
    
    // SIMPLE REMARK - bara clean text
    const priorityColor = getCorporatePriorityColor(remark.priority);
    
    // Priority och text på samma rad (om prioritet finns)
    let textIndent = remarkIndent;
    if (remark.priority) {
      doc.setTextColor(...priorityColor);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`[${remark.priority}]`, remarkIndent, yPos);
      textIndent += 15; // Offset för prioritet-text
    }
    
    // Remark text
    const maxTextWidth = pageWidth - textIndent - margins.right - 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const textLines = doc.splitTextToSize(remark.text, maxTextWidth);
    
    doc.setTextColor(...design.colors.secondary);
    doc.text(textLines, textIndent, yPos);
    
    yPos += (textLines.length * 3.5) + 1; // Reduced line spacing
    
    // Images if available - show actual images!
    const hasImages = remark.images && remark.images.length > 0;
    if (hasImages) {
      yPos += 3;
      yPos = await renderActualImages(pdfState, remark.images, yPos, remarkIndent + 20, design, imageCache);
    }
    
    yPos += design.spacing.remarkGap;
  }
  
  return yPos;
};

/**
 * Renderar riktiga bilder i PDF
 */
const renderActualImages = async (pdfState, images, yPos, xPos, design, imageCache = null) => {
  const { doc, pageWidth, pageHeight, margins } = pdfState;
  
  if (!images || images.length === 0) return yPos;
  
  // Ingen text header - bara visa bilderna direkt
  // yPos += 5; // Mindre spacing
  
  // Rendera varje bild - använd cachade bilder för snabbhet
  for (let i = 0; i < Math.min(images.length, 3); i++) { // Max 3 bilder per anmärkning
    const image = images[i];
    
    const imageUrl = image.url || image.downloadURL;
    if (!imageUrl) continue;
    
    // Hämta från cache istället för att ladda igen
    let cachedImage = null;
    if (imageCache) {
      cachedImage = imageCache.get(imageUrl);
    }
    
    if (cachedImage) {
      try {
        // Beräkna bildstorlek (max 80x60)
        const maxWidth = 80;
        const maxHeight = 60;
        
        const aspectRatio = cachedImage.width / cachedImage.height;
        let imgWidth = maxWidth;
        let imgHeight = maxWidth / aspectRatio;
        
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = maxHeight * aspectRatio;
        }
        
        // Rita bilden från cache
        doc.addImage(cachedImage.data, 'JPEG', xPos, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 3; // Reduced spacing after images
        
      } catch (error) {
        console.warn('Could not render cached image:', error);
        // Fallback
        doc.setFillColor(...design.colors.lightGray);
        doc.rect(xPos, yPos, 60, 40, 'F');
        doc.setTextColor(...design.colors.mediumGray);
        doc.setFontSize(8);
        doc.text('Bild ej tillgänglig', xPos + 5, yPos + 22);
        yPos += 45;
      }
    } else {
      // Fallback om ingen cache finns
      console.warn('Image not found in cache:', imageUrl);
      doc.setFillColor(...design.colors.lightGray);
      doc.rect(xPos, yPos, 60, 40, 'F');
      doc.setTextColor(...design.colors.mediumGray);
      doc.setFontSize(8);
      doc.text('Bild ej tillgänglig', xPos + 5, yPos + 22);
      yPos += 45;
    }
  }
  
  // Om fler än 3 bilder
  if (images.length > 3) {
    doc.setTextColor(...design.colors.mediumGray);
    doc.setFontSize(7);
    doc.text(`... och ${images.length - 3} bilder till`, xPos, yPos);
    yPos += 10;
  }
  
  return yPos + 3; // Reduced final spacing
};

// Gamla loadImageFromUrl funktionen har ersatts av imageOptimizer för bättre prestanda

/**
 * Hämtar corporate färg för prioritet
 */
const getCorporatePriorityColor = (priority) => {
  switch (priority) {
    case 'A': return [198, 40, 40];    // Error red
    case 'B': return [255, 152, 0];    // Warning orange  
    case 'C': return [46, 125, 50];    // Success green
    case '':
    case null:
    case undefined:
    default: return [158, 158, 158];   // Medium gray
  }
};

/**
 * Hämtar kompakt prioritetstext
 */
const getPriorityText = (priority) => {
  switch (priority) {
    case 'A': return 'ÅTGÄRDAS';
    case 'B': return 'BÖR ÅTGÄRDAS';
    case 'C': return 'NOTERING';
    default: return '';
  }
};

/**
 * Estimerar höjden för en area med dess anmärkningar och bilder
 */
const estimateAreaWithRemarksHeight = (areaNode, areaRemarks, design) => {
  let totalHeight = 10; // Area header höjd
  
  // Beräkna höjd för varje anmärkning
  areaRemarks.forEach(remark => {
    // Text höjd (grov uppskattning)
    const textLines = Math.ceil(remark.text.length / 80); // ~80 tecken per rad
    totalHeight += (textLines * 3.5) + 1; // Line spacing
    
    // Bild höjd om bilder finns
    if (remark.images && remark.images.length > 0) {
      const imageCount = Math.min(remark.images.length, 3); // Max 3 bilder visas
      totalHeight += (imageCount * 60) + (imageCount * 3); // 60px per bild + 3px spacing
      totalHeight += 3; // Extra spacing efter bilder
    }
    
    totalHeight += design.spacing.remarkGap; // Spacing mellan anmärkningar
  });
  
  return totalHeight + 20; // Extra marginal
};

/**
 * Estimerar höjden som en nod kommer att ta
 */
const estimateNodeHeight = (node, remarks, design) => {
  const nodeRemarks = getRemarksForNode(node.id, remarks);
  let height = 25; // Bas-höjd för nod
  
  // Lägg till höjd för anmärkningar (mer exakt beräkning)
  height += nodeRemarks.length * 25; // Premium anmärknings-boxar tar mer plats
  
  // Lägg till höjd för barn rekursivt
  if (node.children) {
    node.children.forEach(child => {
      height += estimateNodeHeight(child, remarks, design);
    });
  }
  
  return height;
};

/**
 * Få färg för prioritet
 */
const getPriorityColor = (priority) => {
  switch (priority) {
    case 'A': return [220, 38, 38];   // Röd
    case 'B': return [245, 158, 11];  // Orange
    case 'C': return [16, 185, 129];  // Grön
    default: return [107, 114, 128];  // Grå
  }
};