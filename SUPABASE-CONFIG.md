# Supabase Konfiguration för Soeldokumentation

Detta dokument beskriver hur du konfigurerar Supabase Storage för bilduppladdning i kontrollsystemet.

## 🔧 Nödvändiga steg:

### 1. Skapa Storage Bucket
Gå till Supabase Dashboard → Storage och skapa en ny bucket:
- **Bucket Name**: `controls`
- **Public Access**: ✅ Enabled (så bilder kan visas direkt)

### 2. Konfigurera Storage Policies
Gå till Supabase Dashboard → Storage → Policies och lägg till följande policies för `controls` bucket:

#### Policy 1: Upload Images
```sql
-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'controls' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'controls'
);
```

#### Policy 2: View Images  
```sql
-- Allow users to view images
CREATE POLICY "Users can view images in controls" ON storage.objects
FOR SELECT USING (
    bucket_id = 'controls'
    AND (storage.foldername(name))[1] = 'controls'
);
```

#### Policy 3: Delete Images
```sql
-- Allow authenticated users to delete images
CREATE POLICY "Users can delete their own images" ON storage.objects
FOR DELETE USING (
    bucket_id = 'controls'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'controls'
);
```

### 3. Kör SQL Setup (Valfritt)
Kör innehållet i `supabase-setup.sql` i Supabase SQL Editor för att:
- Skapa bucket programmatiskt
- Sätta upp alla policies
- Skapa spårningstabell för uppladdningar

### 4. Environment Variables
Se till att följande miljövariabler är konfigurerade i `.env`:

```env
REACT_APP_SUPABASE_URL=din-supabase-url
REACT_APP_SUPABASE_ANON_KEY=din-supabase-anon-key
```

## 📁 File Structure i Supabase Storage

Bilder lagras med följande struktur:
```
controls/
├── {controlId}/
│   └── nodes/
│       └── {nodeId}/
│           ├── timestamp_uuid_filename1.jpg
│           ├── timestamp_uuid_filename2.png
│           └── ...
```

Exempel:
```
controls/kJCDulfx4PysKXYLQa6H/nodes/U7ad8IusEVLHnPBGOIys/1756671889774_8qafusewj_image.jpg
```

## 🔒 Säkerhetsregler

- Endast autentiserade användare kan ladda upp bilder
- Alla kan visa bilder (public bucket)
- Användare kan ta bort sina egna bilder
- Filer organiseras efter kontroll-ID och nod-ID för säkerhet

## 🚀 Användning i koden

Komponenten `ControlImageUploader` hanterar:
- Multi-file upload
- Progress tracking
- Automatisk filnamnssanering
- UUID-baserad namngivning
- Validering av filtyper

## 🛠️ Felsökning

### CORS-problem
Om du får CORS-fel, kontrollera att:
1. Bucket är markerad som "Public"
2. Storage policies är korrekt konfigurerade
3. URL:er är korrekta i environment variables

### Upload-fel
- Kontrollera att användaren är autentiserad
- Verifiera att filstorleken är inom gränser
- Se till att filtypen är tillåten (image/*)

### Visa bilder
Om bilder inte visas:
1. Kontrollera att bucket är public
2. Verifiera att URL:en är korrekt formatterad
3. Testa URL:en direkt i webbläsaren