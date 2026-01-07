// src/utils/controlPdfGenerator.js - Professionellt kontrollprotokoll
// Design: Teknisk rapport-stil med subtil typografi och linjebaserad struktur
import jsPDF from 'jspdf';

// Cache för typsnitt - laddas en gång, återanvänds för alla PDFer
let fontCache = {
  regular: null,
  bold: null
};

// Ladda och registrera Roboto-typsnitt för svenska tecken
const loadSwedishFont = async (doc) => {
  try {
    // Ladda fonts till cache om de inte redan finns
    if (!fontCache.regular) {
      console.log('Laddar Roboto-typsnitt från Google Fonts...');
      const fontUrl = 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf';
      const response = await fetch(fontUrl);
      if (!response.ok) throw new Error('Kunde inte hämta Roboto Regular');
      const arrayBuffer = await response.arrayBuffer();
      fontCache.regular = btoa(
        new Uint8Array(arrayBuffer)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
    }

    if (!fontCache.bold) {
      const boldUrl = 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf';
      const boldResponse = await fetch(boldUrl);
      if (!boldResponse.ok) throw new Error('Kunde inte hämta Roboto Bold');
      const boldBuffer = await boldResponse.arrayBuffer();
      fontCache.bold = btoa(
        new Uint8Array(boldBuffer)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
    }

    // Registrera typsnitten till detta dokument
    doc.addFileToVFS('Roboto-Regular.ttf', fontCache.regular);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');

    doc.addFileToVFS('Roboto-Bold.ttf', fontCache.bold);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

    // Sätt Roboto som default
    doc.setFont('Roboto', 'normal');

    console.log('Roboto-typsnitt registrerade för PDF');
    return true;
  } catch (error) {
    console.error('Kunde inte ladda typsnitt:', error);
    // Fallback till helvetica som fungerar men saknar åäö
    return false;
  }
};

// Professionell färgpalett - subtil och seriös
const colors = {
  // Primärfärger
  black: [33, 33, 33],           // Nästan svart för text
  darkGray: [66, 66, 66],        // Sekundär text
  mediumGray: [117, 117, 117],   // Tertiär text
  lightGray: [189, 189, 189],    // Linjer
  veryLightGray: [245, 245, 245], // Bakgrund
  white: [255, 255, 255],

  // Accentfärger för prioritet (subtila, mörka toner)
  priorityA: [183, 28, 28],      // Mörkröd
  priorityB: [245, 127, 23],     // Mörk orange/amber
  priorityC: [56, 142, 60],      // Mörkgrön

  // Header
  headerBg: [38, 50, 56],        // Mörk blågrå
};

// Prioritetskonfiguration - minimal design
const priorityConfig = {
  A: {
    color: colors.priorityA,
    label: 'A',
    description: 'Åtgärdas snarast'
  },
  B: {
    color: colors.priorityB,
    label: 'B',
    description: 'Bör åtgärdas'
  },
  C: {
    color: colors.priorityC,
    label: 'C',
    description: 'Notering'
  },
};

// Statistik för PDF-generering
let pdfStats = {
  totalImages: 0,
  loadedImages: 0,
  failedImages: 0,
  startTime: 0
};

// Återställ statistik
const resetStats = () => {
  pdfStats = {
    totalImages: 0,
    loadedImages: 0,
    failedImages: 0,
    startTime: Date.now()
  };
};

// Hämta statistik
export const getPdfStats = () => ({ ...pdfStats });

// Ladda logotyp med header-bakgrundsfärg (för transparenta PNG:er)
const loadLogoWithBackground = async (url, bgColor = [38, 50, 56]) => {
  if (!url) return null;

  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);

      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Max storlek för logotyp
          const maxSize = 300;
          let width = img.width;
          let height = img.height;

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Fyll med bakgrundsfärgen FÖRST (för transparenta områden)
          ctx.fillStyle = `rgb(${bgColor[0]}, ${bgColor[1]}, ${bgColor[2]})`;
          ctx.fillRect(0, 0, width, height);

          // Rita logotypen ovanpå
          ctx.drawImage(img, 0, 0, width, height);

          // Använd PNG för bästa kvalitet
          const data = canvas.toDataURL('image/png');
          resolve({ data, width, height });
        } catch (e) {
          reject(e);
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Load failed'));
      };

      img.crossOrigin = 'anonymous';
      img.src = url;
    });
  } catch (e) {
    console.error('Could not load logo:', e);
    return null;
  }
};

// Optimerad bildladdning - mindre storlek för snabbare PDF
const loadImageFromUrl = async (url, retries = 2) => {
  if (!url) return null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await new Promise((resolve, reject) => {
        const img = new Image();
        const timeout = setTimeout(() => {
          reject(new Error('Timeout'));
        }, 10000); // 10 sekunder timeout

        img.onload = () => {
          clearTimeout(timeout);
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Optimerad storlek för PDF - 400px räcker för bra kvalitet
            const maxSize = 400;
            let width = img.width;
            let height = img.height;

            if (width > maxSize || height > maxSize) {
              if (width > height) {
                height = (height / width) * maxSize;
                width = maxSize;
              } else {
                width = (width / height) * maxSize;
                height = maxSize;
              }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // 75% kvalitet - bra balans mellan storlek och utseende
            const data = canvas.toDataURL('image/jpeg', 0.75);

            // Rensa canvas för att frigöra minne
            canvas.width = 1;
            canvas.height = 1;

            resolve({ data, width, height });
          } catch (e) {
            reject(e);
          }
        };

        img.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Load failed'));
        };

        img.crossOrigin = 'anonymous';
        img.src = url;
      });

      pdfStats.loadedImages++;
      return result;

    } catch (e) {
      if (attempt === retries) {
        console.warn(`Kunde inte ladda bild efter ${retries + 1} försök:`, url);
        pdfStats.failedImages++;
        return null;
      }
      // Vänta lite innan retry
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return null;
};

// Bygg trädstruktur
const buildTree = (places) => {
  const placeMap = new Map();
  const rootPlaces = [];
  const sorted = [...places].sort((a, b) => (a.order || 0) - (b.order || 0));

  sorted.forEach(p => placeMap.set(p.id, { ...p, children: [] }));
  sorted.forEach(p => {
    const node = placeMap.get(p.id);
    if (p.parentId && placeMap.has(p.parentId)) {
      placeMap.get(p.parentId).children.push(node);
    } else {
      rootPlaces.push(node);
    }
  });

  return rootPlaces;
};

// Kontrollera om en nod har innehåll (anmärkningar eller barn med innehåll)
const hasContent = (place, remarksByPlace) => {
  // Har denna nod anmärkningar?
  if (remarksByPlace.has(place.id) && remarksByPlace.get(place.id).length > 0) {
    return true;
  }

  // Har något barn innehåll?
  if (place.children && place.children.length > 0) {
    return place.children.some(child => hasContent(child, remarksByPlace));
  }

  return false;
};

// Filtrera bort tomma noder rekursivt
const filterEmptyNodes = (places, remarksByPlace) => {
  return places
    .filter(place => hasContent(place, remarksByPlace))
    .map(place => ({
      ...place,
      children: place.children ? filterEmptyNodes(place.children, remarksByPlace) : []
    }));
};

// Generera PDF - Professionell teknisk rapport
export const generateControlPDF = async (control, places, allRemarks, userProfile = {}, kontrollpunkter = [], instructionText = '', onProgress, selectedDate = null, publicUrl = null) => {
  // Återställ statistik
  resetStats();

  // Räkna totalt antal bilder
  allRemarks.forEach(r => {
    if (r.images && r.images.length > 0) {
      pdfStats.totalImages += r.images.length;
    }
  });

  console.log(`PDF-generering startad: ${allRemarks.length} anmärkningar, ${pdfStats.totalImages} bilder`);

  // Använd valt datum eller dagens datum
  const pdfDate = selectedDate ? new Date(selectedDate) : new Date();
  const formattedDate = pdfDate.toLocaleDateString('sv-SE');
  const doc = new jsPDF();

  // Ladda svenska typsnitt
  const fontLoaded = await loadSwedishFont(doc);
  if (!fontLoaded) {
    console.warn('Använder standard-typsnitt (helvetica) - svenska tecken kanske inte visas korrekt');
  }
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;
  let pageNum = 1;

  // Skapa remark-map
  const remarksByPlace = new Map();
  allRemarks.forEach(r => {
    const id = r.placeId || r.nodeId;
    if (!remarksByPlace.has(id)) remarksByPlace.set(id, []);
    remarksByPlace.get(id).push(r);
  });

  // Bildcache - rensas efter användning
  const imageCache = new Map();

  // === HJÄLPFUNKTIONER ===

  // Sidfot med sidnummer och linje
  const addPageFooter = () => {
    // Tunn linje
    doc.setDrawColor(...colors.lightGray);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

    // Sidnummer höger
    doc.setFontSize(9);
    doc.setTextColor(...colors.mediumGray);
    doc.setFont('Roboto', 'normal');
    doc.text(`Sida ${pageNum}`, pageWidth - margin, pageHeight - 12, { align: 'right' });

    // Datum vänster
    doc.text(formattedDate, margin, pageHeight - 12);
  };

  const newPage = () => {
    addPageFooter();
    doc.addPage();
    pageNum++;
    return margin + 10;
  };

  // Rita en tunn horisontell linje
  const drawLine = (yPos, indent = margin, width = contentWidth, weight = 0.3) => {
    doc.setDrawColor(...colors.lightGray);
    doc.setLineWidth(weight);
    doc.line(indent, yPos, indent + width, yPos);
  };

  // === FÖRSÄTTSSIDA ===
  if (onProgress) onProgress(5, 'Skapar forsattssida...');

  // Elegant header - mörk, professionell
  doc.setFillColor(...colors.headerBg);
  doc.rect(0, 0, pageWidth, 55, 'F');

  // Logotyp ELLER Företagsnamn (vänster)
  const companyName = userProfile.companyName || control?.teamName || '';
  let logoLoaded = false;

  if (userProfile.logoUrl) {
    try {
      console.log('🖼️ PDF: Loading logo from:', userProfile.logoUrl);
      // Använd loadLogoWithBackground för att fylla transparenta områden med header-färgen
      const logoImg = await loadLogoWithBackground(userProfile.logoUrl, colors.headerBg);

      if (logoImg && logoImg.data) {
        // Beräkna logotypens storlek (max bredd 60, max höjd 35 för att passa i headern)
        const maxLogoWidth = 60;
        const maxLogoHeight = 35;

        const logoAspectRatio = logoImg.width / logoImg.height;
        let logoWidth = maxLogoWidth;
        let logoHeight = logoWidth / logoAspectRatio;

        if (logoHeight > maxLogoHeight) {
          logoHeight = maxLogoHeight;
          logoWidth = logoHeight * logoAspectRatio;
        }

        // Placera logotypen i headern (vänster sida, vertikalt centrerad)
        const logoY = (55 - logoHeight) / 2; // Centrera vertikalt i 55px headern

        // Använd PNG format för att behålla transparens
        doc.addImage(logoImg.data, 'PNG', margin, logoY, logoWidth, logoHeight);
        logoLoaded = true;
        console.log('🖼️ PDF: Logo added successfully!');
      }
    } catch (logoError) {
      console.error('🖼️ PDF: Failed to load logo:', logoError);
    }
  }

  // Om ingen logotyp laddades, visa företagsnamnet istället
  if (!logoLoaded) {
    doc.setTextColor(...colors.white);
    doc.setFontSize(22);
    doc.setFont('Roboto', 'bold');
    doc.text(companyName, margin, 28);
  }

  // Kontrollnamn och datum (höger) - måste vara vit text
  doc.setTextColor(...colors.white);
  doc.setFontSize(11);
  doc.setFont('Roboto', 'bold');
  doc.text(control?.name || '', pageWidth - margin, 24, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(200, 200, 200);
  doc.text(formattedDate, pageWidth - margin, 34, { align: 'right' });

  // Kontaktinfo under företagsnamn
  if (userProfile.phone || userProfile.email) {
    doc.setFontSize(10);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(...colors.white);
    const contactParts = [];
    if (userProfile.phone) contactParts.push(userProfile.phone);
    if (userProfile.email) contactParts.push(userProfile.email);
    doc.text(contactParts.join('  |  '), margin, 38);
  }

  // Publik länk för digital visning
  if (publicUrl) {
    doc.setFontSize(9);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(100, 150, 200);
    doc.textWithLink('Se anmärkningar digitalt', margin, 48, { url: publicUrl });
  }

  y = 65;

  // Kontrollinfo i två kolumner
  doc.setFontSize(10);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(...colors.mediumGray);

  // Vänster kolumn
  doc.text('OBJEKT', margin, y);
  doc.setTextColor(...colors.black);
  doc.setFontSize(12);
  doc.text(control?.name || 'Ej angivet', margin, y + 6);

  // Höger kolumn
  const rightCol = pageWidth / 2 + 10;
  doc.setFontSize(10);
  doc.setTextColor(...colors.mediumGray);
  doc.text('DATUM', rightCol, y);
  doc.setTextColor(...colors.black);
  doc.setFontSize(12);
  doc.text(formattedDate, rightCol, y + 6);

  y += 25;

  // Kontrollant om tillgängligt
  if (userProfile.name) {
    doc.setFontSize(10);
    doc.setTextColor(...colors.mediumGray);
    doc.text('KONTROLLANT', margin, y);
    doc.setTextColor(...colors.black);
    doc.setFontSize(12);
    doc.text(userProfile.name, margin, y + 6);
    y += 25;
  }

  // Instruktionstext
  if (instructionText && instructionText.trim()) {
    y += 10;
    doc.setFontSize(10);
    doc.setTextColor(...colors.darkGray);
    doc.setFont('Roboto', 'normal');
    const instrLines = doc.splitTextToSize(instructionText, contentWidth);
    doc.text(instrLines, margin, y);
    y += instrLines.length * 5 + 15;
  }

  // Kontrollpunkter - ren lista utan boxar
  if (kontrollpunkter && kontrollpunkter.length > 0) {
    if (y > pageHeight - 100) {
      y = newPage();
    }

    doc.setFontSize(11);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(...colors.black);
    doc.text('KONTROLLPUNKTER', margin, y);
    y += 3;
    drawLine(y, margin, 50, 0.5);
    y += 10;

    doc.setFontSize(10);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(...colors.darkGray);

    for (const punkt of kontrollpunkter) {
      if (y > pageHeight - 30) {
        y = newPage();
      }

      // Enkel punkt med streck
      doc.text('—', margin, y);
      doc.text(punkt.name || punkt.text || '', margin + 8, y);
      y += 6;
    }
    y += 10;
  }

  // Prioritetsförklaring längst ner på försättssidan
  const legendY = pageHeight - 45;
  doc.setFontSize(8);
  doc.setTextColor(...colors.mediumGray);
  doc.text('PRIORITETSKLASSNING:', margin, legendY);

  let legendX = margin;
  Object.entries(priorityConfig).forEach(([key, config]) => {
    legendX += 45;
    // Liten cirkel med prioritetsfärg
    doc.setFillColor(...config.color);
    doc.circle(legendX, legendY - 1, 2, 'F');
    doc.setTextColor(...colors.darkGray);
    doc.text(`${key} = ${config.description}`, legendX + 5, legendY);
  });

  addPageFooter();

  // === INNEHÅLLSSIDOR ===
  doc.addPage();
  pageNum++;
  y = margin + 10;

  if (onProgress) onProgress(20, 'Genererar innehall...');

  // Bygg träd och filtrera bort tomma noder
  const tree = buildTree(places);
  const filteredTree = filterEmptyNodes(tree, remarksByPlace);

  // Sidoheader för innehållssidor - borttagen enligt önskemål
  const addContentHeader = () => {
    // Ingen header - mer plats för innehåll
  };

  addContentHeader();

  // Rekursiv funktion för att skriva platser
  const printPlace = async (place, depth = 0, isLast = false) => {
    const placeRemarks = remarksByPlace.get(place.id) || [];
    const hasRemarks = placeRemarks.length > 0;
    const hasChildren = place.children && place.children.length > 0;

    // Indentation baserat på djup
    const baseIndent = margin;
    const indent = baseIndent + (depth * 12);
    const availableWidth = contentWidth - (depth * 12);

    // Beräkna ungefärlig höjd
    let estimatedHeight = 12;
    if (hasRemarks) {
      estimatedHeight += placeRemarks.length * 25;
    }

    // Sidbrytning om det behövs
    if (y > margin + 30 && y + Math.min(estimatedHeight, 60) > pageHeight - 30) {
      y = newPage();
      addContentHeader();
      y = margin + 15;
    }

    // === PLATSRUBRIK ===
    if (depth === 0) {
      // BASNOD - Stor, tydlig rubrik
      y += 8;
      doc.setFontSize(14);
      doc.setFont('Roboto', 'bold');
      doc.setTextColor(...colors.black);
      doc.text(place.name || 'Utan namn', indent, y);
      y += 2;

      // Kraftigare linje under basnod
      doc.setDrawColor(...colors.black);
      doc.setLineWidth(0.8);
      doc.line(indent, y, indent + Math.min(availableWidth, 100), y);
      y += 10;

    } else {
      // UNDERNOD - Tydlig men underordnad
      doc.setFontSize(11);
      doc.setFont('Roboto', 'bold');
      doc.setTextColor(...colors.darkGray);

      doc.text(place.name || 'Utan namn', indent, y);
      y += 8;
    }

    // === ANMÄRKNINGAR ===
    if (hasRemarks) {
      for (const remark of placeRemarks) {
        // Sidbrytning
        if (y > pageHeight - 60) {
          y = newPage();
          addContentHeader();
          y = margin + 15;
        }

        const priority = remark.priority || 'C';
        const config = priorityConfig[priority] || priorityConfig.C;
        const remarkIndent = indent + 4;
        const textWidth = availableWidth - 30;

        // Text
        const text = remark.text || '';
        doc.setFontSize(10);
        const textLines = doc.splitTextToSize(text, textWidth);

        const textHeight = textLines.length * 5;
        let blockHeight = Math.max(textHeight + 4, 12);

        // Beräkna total höjd inklusive bilder för den vertikala linjen
        let totalBlockHeight = blockHeight;
        if (remark.images && remark.images.length > 0) {
          const imgMaxHeight = 38;
          const numImageRows = Math.ceil(remark.images.length / 3);
          totalBlockHeight += numImageRows * (imgMaxHeight + 5) + 5;
        }

        // Spara startposition för linjen
        const lineStartY = y - 2;

        // Prioritetsbokstav - liten, subtil
        doc.setFontSize(8);
        doc.setFont('Roboto', 'bold');
        doc.setTextColor(...config.color);
        doc.text(`[${priority}]`, remarkIndent + 5, y + 2);

        // Anmärkningstext
        doc.setFontSize(10);
        doc.setFont('Roboto', 'normal');
        doc.setTextColor(...colors.black);
        doc.text(textLines, remarkIndent + 18, y + 2);

        y += blockHeight + 4;

        // Bilder - utan ram, till höger om linjen
        if (remark.images && remark.images.length > 0) {
          let imgX = remarkIndent + 8;
          const imgMaxWidth = 50;
          const imgMaxHeight = 38;

          for (const image of remark.images) {
            const imgUrl = image.url || image.remoteUrl;
            if (imgUrl) {
              if (y + imgMaxHeight > pageHeight - 30) {
                // Rita linjen fram till sidbrytning
                doc.setDrawColor(...config.color);
                doc.setLineWidth(1.5);
                doc.line(remarkIndent, lineStartY, remarkIndent, y - 2);

                y = newPage();
                addContentHeader();
                y = margin + 15;
                imgX = remarkIndent + 8;
              }

              let img = imageCache.get(imgUrl);
              if (img === undefined) {
                img = await loadImageFromUrl(imgUrl);
                imageCache.set(imgUrl, img);
              }

              if (img) {
                const ratio = img.width / img.height;
                let imgWidth = imgMaxWidth;
                let imgHeight = imgMaxWidth / ratio;
                if (imgHeight > imgMaxHeight) {
                  imgHeight = imgMaxHeight;
                  imgWidth = imgMaxHeight * ratio;
                }

                // Bara bild, ingen ram
                doc.addImage(img.data, 'JPEG', imgX, y, imgWidth, imgHeight);
                imgX += imgWidth + 8;

                // Ny rad om inte plats
                if (imgX + imgMaxWidth > indent + availableWidth - 10) {
                  imgX = remarkIndent + 8;
                  y += imgMaxHeight + 5;
                }
              }
            }
          }

          // Flytta ner y efter bilderna
          if (imgX > remarkIndent + 8) {
            y += imgMaxHeight + 5;
          }
        }

        // Rita den vertikala linjen hela vägen ner (efter vi vet slutpositionen)
        doc.setDrawColor(...config.color);
        doc.setLineWidth(1.5);
        doc.line(remarkIndent, lineStartY, remarkIndent, y - 5);

        y += 2;
      }
    }

    // Barn (redan filtrerade)
    if (hasChildren) {
      for (let i = 0; i < place.children.length; i++) {
        await printPlace(place.children[i], depth + 1, i === place.children.length - 1);
      }
    }

    // Extra mellanrum efter basnoder
    if (depth === 0 && !isLast) {
      y += 6;
    }
  };

  // Skriv ut alla platser (filtrerade)
  let idx = 0;
  for (let i = 0; i < filteredTree.length; i++) {
    await printPlace(filteredTree[i], 0, i === filteredTree.length - 1);
    idx++;
    if (onProgress) onProgress(20 + (idx / filteredTree.length) * 70, `${idx}/${filteredTree.length}...`);
  }

  // Om inga platser med innehåll
  if (filteredTree.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(...colors.mediumGray);
    doc.setFont('Roboto', 'normal');
    doc.text('Inga anmärkningar registrerade.', margin, y);
  }

  addPageFooter();

  // Rensa bildcache för att frigöra minne
  imageCache.clear();

  // Logga statistik
  const elapsed = ((Date.now() - pdfStats.startTime) / 1000).toFixed(1);
  console.log(`PDF-generering klar på ${elapsed}s: ${pdfStats.loadedImages}/${pdfStats.totalImages} bilder laddade, ${pdfStats.failedImages} misslyckades`);

  if (onProgress) onProgress(100, 'Klar!');

  // Returnera både dokumentet och statistik
  doc.pdfStats = { ...pdfStats, elapsedSeconds: parseFloat(elapsed) };

  return doc;
};

export default { generateControlPDF, getPdfStats };
