// src/utils/controlPdfGenerator/modules/remarksModule.js - Sammanfattning av anmärkningar

import { groupRemarksByPriority, flattenTreeWithPaths } from '../utils/treeUtils';

/**
 * Renderar sammanfattning av anmärkningar grupperade efter prioritet
 * @param {Object} pdfState - PDF state objekt  
 * @param {Array} remarks - Array av alla anmärkningar
 * @param {Array} tree - Träd-struktur för att hitta sökvägar
 * @returns {Promise<number>} - Ny Y-position
 */
export const renderRemarks = async (pdfState, remarks, tree) => {
  const { doc, pageWidth, pageHeight, margins } = pdfState;
  let yPos = pdfState.yPosition;
  
  console.log('📝 Rendering remarks summary module');
  
  // Gruppera anmärkningar efter prioritet
  const groupedRemarks = groupRemarksByPriority(remarks);
  const flatNodes = flattenTreeWithPaths(tree);
  
  // Kontrollera om vi behöver ny sida för sammanfattningen
  if (yPos > pageHeight - 100) {
    doc.addPage();
    yPos = margins.top;
  }
  
  // === SAMMANFATTNINGS HEADER ===
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 102, 204);
  doc.text('ANMÄRKNINGAR', margins.left, yPos);
  yPos += 15;
  
  // Linje under header
  doc.setDrawColor(0, 102, 204);
  doc.setLineWidth(1);
  doc.line(margins.left, yPos, pageWidth - margins.right, yPos);
  yPos += 10;
  
  // === STATISTIK BOX ===
  const totalRemarks = remarks.length;
  const highPriority = groupedRemarks.A.length;
  const mediumPriority = groupedRemarks.B.length;
  const lowPriority = groupedRemarks.C.length;
  
  // Rita statistik-box
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.rect(margins.left, yPos, pageWidth - margins.left - margins.right, 35);
  
  // Statistik innehåll
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Totalt antal anmärkningar: ${totalRemarks}`, margins.left + 8, yPos + 12);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Prioritetsfördelning
  const statsY = yPos + 24;
  doc.setTextColor(220, 38, 38);  // Röd
  doc.text(`A (Åtgärdas snarast): ${highPriority}`, margins.left + 8, statsY);

  doc.setTextColor(245, 158, 11); // Orange
  doc.text(`B (Bör åtgärdas): ${mediumPriority}`, margins.left + 90, statsY);

  doc.setTextColor(16, 185, 129); // Grön
  doc.text(`C (Notering): ${lowPriority}`, margins.left + 170, statsY);

  yPos += 50;

  // === DETALJERAD LISTA EFTER PRIORITET ===
  const priorities = ['A', 'B', 'C', ''];
  const priorityNames = {
    A: 'ÅTGÄRDAS SNARAST',
    B: 'BÖR ÅTGÄRDAS',
    C: 'NOTERINGAR',
    '': 'ANMÄRKNINGAR UTAN PRIORITET'
  };
  const priorityColors = { 
    A: [220, 38, 38], 
    B: [245, 158, 11], 
    C: [16, 185, 129],
    '': [107, 114, 128] 
  };
  
  for (const priority of priorities) {
    const priorityRemarks = groupedRemarks[priority];
    
    if (priorityRemarks.length === 0) continue;
    
    // Kontrollera sidbrytning
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margins.top;
    }
    
    // Prioritets-header
    doc.setTextColor(...priorityColors[priority]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const headerText = priority ? `${priority} - ${priorityNames[priority]}` : priorityNames[priority];
    doc.text(`${headerText} (${priorityRemarks.length})`, margins.left, yPos);
    yPos += 12;
    
    // Lista anmärkningar för denna prioritet
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    for (const remark of priorityRemarks) {
      // Hitta nod-sökväg för denna anmärkning
      const node = flatNodes.find(n => n.id === remark.nodeId);
      const nodePath = node ? node.pathString : 'Okänd plats';
      
      // Kontrollera sidbrytning
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = margins.top;
      }
      
      // Rita prioritets-indikator
      doc.setFillColor(...priorityColors[priority]);
      doc.rect(margins.left, yPos - 6, 3, 8, 'F');
      
      // Plats (path)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`📍 ${nodePath}`, margins.left + 8, yPos);
      yPos += 8;
      
      // Anmärknings-text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const remarkText = remark.text;
      const textLines = doc.splitTextToSize(remarkText, pageWidth - margins.left - margins.right - 20);
      doc.text(textLines, margins.left + 12, yPos);
      yPos += textLines.length * 4;
      
      // Datum och bilder
      const remarkDate = remark.createdAt 
        ? (remark.createdAt.toDate ? remark.createdAt.toDate() : remark.createdAt)
        : new Date();
      
      doc.setTextColor(107, 114, 128); // Grå
      doc.setFontSize(8);
      let infoText = `Datum: ${remarkDate.toLocaleDateString('sv-SE')}`;
      
      if (remark.images && remark.images.length > 0) {
        infoText += ` • ${remark.images.length} bild(er)`;
      }
      
      doc.text(infoText, margins.left + 12, yPos);
      yPos += 10;
      
      // Separator linje
      doc.setDrawColor(230);
      doc.setLineWidth(0.3);
      doc.line(margins.left + 8, yPos, pageWidth - margins.right - 20, yPos);
      yPos += 8;
      
      doc.setTextColor(0); // Återställ textfärg
    }
    
    yPos += 10; // Extra mellanrum mellan prioritets-grupper
  }
  
  return yPos;
};