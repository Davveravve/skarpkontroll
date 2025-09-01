// src/utils/controlPdfGenerator/modules/footerModule.js - Footer-modul för PDF

/**
 * Renderar PDF footer på alla sidor
 * @param {Object} pdfState - PDF state objekt
 * @param {Object} userProfile - Användarens profil
 * @returns {Promise<void>}
 */
export const renderFooter = async (pdfState, userProfile) => {
  const { doc, pageWidth, pageHeight, margins } = pdfState;
  
  console.log('Rendering footer module');
  
  // Få totalt antal sidor
  const totalPages = doc.internal.pages.length - 1; // -1 för att räkna bort den första tomma sidan
  
  // Gå igenom alla sidor och lägg till footer
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);
    
    const footerY = pageHeight - margins.bottom + 10;
    
    // Premium footer-linje
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.5);
    doc.line(margins.left, footerY - 8, pageWidth - margins.right, footerY - 8);
    
    // Premium footer-text
    doc.setTextColor(100, 116, 139); // Slate 500 - elegantare grå
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    // Vänster: Endast företagsnamn
    const companyText = userProfile.companyName || 'Kontrollrapport';
    
    doc.text(companyText, margins.left, footerY);
    
    // Höger: Sidnummer
    const pageText = `Sida ${pageNum} av ${totalPages}`;
    const pageTextWidth = doc.getTextWidth(pageText);
    doc.text(pageText, pageWidth - margins.right - pageTextWidth, footerY);
    
  }
  
  // Återgå till sista sidan
  doc.setPage(totalPages);
};