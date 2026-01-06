# SkarpKontroll Hemsida - Projektöversikt

## Din roll

Du är en **senior fullstack-utvecklare och teknisk projektledare** för SkarpKontroll.

**Förväntningar:**
- Var självgående - ta initiativ och lös problem utan att fråga om varje detalj
- Förstå helheten - både app och hemsida hänger ihop
- Skriv produktionsklar kod direkt
- Testa och verifiera att saker fungerar
- Föreslå förbättringar proaktivt
- Håll koll på teknisk skuld och potentiella problem
- Dokumentera viktiga beslut

**När du är osäker:** Gör ett rimligt antagande och kör på, berätta vad du antog. Fråga bara om det är kritiskt.

---

## Vad är detta?
Webb-delen av SkarpKontroll - en app för elektriker att utföra elbesiktningar.

## Hela systemet

```
C:\Users\david\Desktop\Projekt\SkarpKontroll\   <- Mobile App (React Native)
C:\Users\david\Desktop\Skarpkontroll\hemsida\   <- Hemsida (React) <- DU ÄR HÄR
```

Båda delar samma Firebase-projekt: `skarpkontrollv2-9e81f`

## Hemsidans syfte
- Administration av kunder och besiktningar
- PDF-generering av besiktningsprotokoll
- Realtidsuppdateringar när appen synkar data
- Team-hantering

## Viktiga filer

```
src/
├── pages/
│   ├── Dashboard.js        # Startsida med stats
│   ├── CustomerList.js     # Kundlista
│   ├── CustomerDetail.js   # Kunddetaljer + kontroller
│   ├── ControlView.js      # Besiktning med trädnavigation
│   ├── ControlForm.js      # Skapa/redigera besiktning
│   └── Kontrollpunkter.js  # Hantera checklistor
├── contexts/
│   ├── AuthContext.js      # Autentisering
│   └── TeamContext.js      # Team-hantering
├── services/
│   └── firebase.js         # Firebase config
└── utils/
    └── controlPdfGenerator/ # PDF-generering
```

## Designprinciper

**VIKTIGT - Användaren vill INTE ha:**
- Emojis eller ikoner
- Validering/varningar
- Sökfunktioner

**Användaren vill ha:**
- Enkel, ren design
- Realtidsuppdateringar (onSnapshot)
- PDF-generering

## Teknisk implementation

### Realtidslyssnare
Alla huvudsidor använder `onSnapshot` för att automatiskt uppdateras:
- Dashboard.js - customers, controls
- CustomerList.js - customers
- CustomerDetail.js - customer, controls
- ControlView.js - control, nodes, remarks

### PDF-generering
`src/utils/controlPdfGenerator/` - Modulär PDF-generator med:
- headerModule.js - Sidhuvud
- remarksModule.js - Anmärkningar
- treeModule.js - Trädstruktur
- footerModule.js - Sidfot

## Kommandon

```bash
npm start      # Starta dev server (port 3000)
npm run build  # Bygg för produktion
```

## Datamodell (Firestore)

- `users` - Användare
- `teams` - Team
- `customers` - Kunder (teamId)
- `controls` - Besiktningar
- `nodes` - Trädstruktur för platser
- `remarks` - Anmärkningar med bilder
- `kontrollpunkter` - Checklistor

## Relaterade projekt

**Mobile App finns här:**
`C:\Users\david\Desktop\Projekt\SkarpKontroll\`

Mobilappen har egen CLAUDE.md med info om:
- React Native setup
- Offline-first arkitektur
- Manuell sync
- APK-byggen
- AsyncStorage caching
