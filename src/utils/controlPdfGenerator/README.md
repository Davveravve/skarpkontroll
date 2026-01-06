# Modulär PDF-generator för Kontroller

Denna modulära PDF-generator skapar välformaterade rapporter från kontroll-data med tree-struktur och visuella linjer.

## 🏗️ Arkitektur

### Huvudfil
- `index.js` - Huvudorkestrering och export

### Moduler
- `modules/headerModule.js` - Logotyp, företagsinfo, kontrollinfo-box
- `modules/treeModule.js` - Träd-struktur med linjer och anmärkningar  
- `modules/remarksModule.js` - Sammanfattning grupperad efter prioritet
- `modules/footerModule.js` - Sidnummer, företagsinfo, datum

### Utilities
- `utils/treeUtils.js` - Verktyg för träd-hantering och data-bearbetning

## 🎨 Design-principer

### Tree-struktur med linjer
- **Huvudnoder** (adresser): Blå text, bold, extra mellanrum
- **Undernoder**: Normal text med indrag och linjer
- **Visuella linjer**: Grå linjer som kopplar noder hierarkiskt
- **Anmärknings-indikatorer**: Färgade rutor baserat på prioritet

### Responsiv layout
- Automatisk sidbrytning
- Estimering av nod-höjder för bättre placering
- Mellanrum mellan huvudnoder för tydlighet

## 📋 Användning

```javascript
import { generateControlPDF } from './controlPdfGenerator';

const control = {
  name: 'Vinterkontroll 2024',
  customerName: 'Exempel AB',
  createdAt: { seconds: Date.now()/1000 },
  status: 'active'
};

const nodes = [
  { id: '1', name: 'Barnhusgatan 24', parentNodeId: null, level: 0 },
  { id: '2', name: 'Källare', parentNodeId: '1', level: 1 },
  { id: '3', name: 'Elcentral', parentNodeId: '2', level: 2 }
];

const remarks = [
  {
    id: 'r1',
    nodeId: '3', 
    text: 'Fuktskador på elcentral',
    priority: 'A',
    images: [],
    createdAt: new Date()
  }
];

const userProfile = {
  companyName: 'Min Firma AB',
  logoUrl: 'https://example.com/logo.png',
  phone: '08-123 456',
  website: 'www.minfirma.se'
};

// Generera PDF
const pdfDoc = await generateControlPDF(control, nodes, remarks, userProfile);

// Spara eller visa
pdfDoc.save('kontroll-rapport.pdf');
```

## 🔧 Funktioner

### Tree-rendering
- Hierarkisk struktur med visuella linjer
- Automatisk indrag baserat på djup-nivå
- Färgkodning: Blå huvudnoder, svarta undernoder
- Anmärknings-räknare per nod

### Anmärknings-hantering
- Inline-anmärkningar under varje nod
- Prioritets-färger: A=Röd, B=Orange, C=Grön
- Detaljerad sammanfattning efter prioritet
- Sökvägar för att lokalisera anmärkningar

### Layout-optimering
- Intelligenta sidbrytningar
- Extra mellanrum mellan huvudnoder
- Responsiv text-hantering
- Automatic höjd-estimering

## 🎯 Design-mål

1. **Tydlighet**: Lätt att se hierarkier och anmärknings-platser
2. **Professionalitet**: Ren layout med företagsbranding
3. **Skalbarhet**: Hanterar stora träd-strukturer
4. **Modularitet**: Lätt att anpassa och utöka enskilda komponenter

## 🚀 Framtida förbättringar

- Bild-integration i anmärkningar
- Konfigurerbar färg-tema
- Export till olika format
- Mallar för olika kontroll-typer
- Digital signering