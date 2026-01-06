// src/utils/controlPdfGenerator/index.js - Huvudfil för modulär PDF-generering
import jsPDF from 'jspdf';
import { renderHeader } from './modules/headerModule';
import { renderTreeStructure } from './modules/treeModule';
import { renderRemarks } from './modules/remarksModule';
import { renderFooter } from './modules/footerModule';
import { buildNodeTree, getTreeDepth, filterTreeForRemarks } from './utils/treeUtils';
import { preloadAllImages } from './utils/imageOptimizer';

/**
 * Genererar en PDF för en kontroll med tree-struktur
 * @param {Object} control - Kontrolldata
 * @param {Array} nodes - Array av alla noder
 * @param {Array} remarks - Array av alla anmärkningar
 * @param {Object} userProfile - Användarens profil
 * @param {Array} kontrollpunkter - Array av kontrollpunkter
 * @param {string} instructionText - Instruktionstext för kontrollpunkter
 * @returns {Promise<jsPDF>} - PDF dokument
 */
export const generateControlPDF = async (control, nodes, remarks, userProfile = {}, kontrollpunkter = [], instructionText = '', onProgress = null) => {
  try {
    console.log('Starting modular PDF generation for control:', control.name);
    console.log('Kontrollpunkter received:', kontrollpunkter.length, kontrollpunkter);
    console.log('Instruction text received:', instructionText.length, 'characters');
    
    // Skapa PDF med A4-format
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // PDF State - håller koll på position och inställningar
    const pdfState = {
      doc,
      pageWidth,
      pageHeight,
      yPosition: 15, // Reduced top margin
      margins: { left: 14, right: 14, top: 15, bottom: 15 }, // Reduced margins
      fonts: {
        header: { size: 16, weight: 'bold' },
        subheader: { size: 14, weight: 'bold' },
        normal: { size: 10, weight: 'normal' },
        small: { size: 8, weight: 'normal' }
      },
      colors: {
        primary: [0, 102, 204],    // Blå
        secondary: [107, 114, 128], // Grå
        success: [16, 185, 129],   // Grön
        warning: [245, 158, 11],   // Orange
        error: [220, 38, 38],      // Röd
        text: [31, 41, 55]         // Mörk grå
      }
    };
    
    // Bygg träd-struktur från platta noder
    const fullTree = buildNodeTree(nodes);
    
    // Filtrera trädet för att bara visa noder med anmärkningar
    const tree = filterTreeForRemarks(fullTree, remarks);
    const treeDepth = getTreeDepth(tree);
    
    console.log(`📊 Built tree with ${tree.length} root nodes (filtered from ${fullTree.length}), max depth: ${treeDepth}`);
    
    // Räkna totalt antal bilder för progress tracking
    const totalImages = remarks.reduce((total, remark) => total + (remark.images?.length || 0), 0);
    console.log(`📷 Total images to process: ${totalImages}`);
    
    // Progress tracking state
    const progressState = {
      totalImages,
      processedImages: 0,
      onProgress: onProgress || (() => {})
    };
    
    // === PRE-LOAD ALL IMAGES ===
    progressState.onProgress(5, 'Laddar alla bilder...');
    const imageCache = await preloadAllImages(remarks, progressState);
    
    // === MODUL 1: HEADER ===
    progressState.onProgress(90, 'Genererar header...');
    pdfState.yPosition = await renderHeader(pdfState, control, userProfile, kontrollpunkter, instructionText);
    
    // === MODUL 2: TREE STRUCTURE OCH ANMÄRKNINGAR ===
    progressState.onProgress(95, 'Genererar innehåll...');
    pdfState.yPosition = await renderTreeStructure(pdfState, tree, remarks, progressState, imageCache);
    
    // Ingen sammanfattning behövs
    
    // === MODUL 4: FOOTER ===
    await renderFooter(pdfState, userProfile);
    
    console.log('Modular PDF generation completed');
    return doc;
    
  } catch (error) {
    console.error('Error in modular PDF generation:', error);
    throw error;
  }
};