-- Supabase setup för Soeldokumentation projekt
-- Kör dessa SQL-kommandon i Supabase SQL Editor

-- 1. Skapa storage bucket för kontroller
INSERT INTO storage.buckets (id, name, public)
VALUES ('controls', 'controls', true);

-- 2. Sätt up RLS (Row Level Security) policies för controls bucket
CREATE POLICY "Authenticated users can upload images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'controls' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = 'controls'
    );

CREATE POLICY "Users can view images in controls" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'controls'
        AND (storage.foldername(name))[1] = 'controls'
    );

CREATE POLICY "Users can delete their own images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'controls'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = 'controls'
    );

-- 3. Optional: Skapa en tabell för att spåra filuppladdningar
CREATE TABLE IF NOT EXISTS public.image_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    remark_id TEXT,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RLS för image_uploads tabell
ALTER TABLE public.image_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own uploads" ON public.image_uploads
    FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can view their own uploads" ON public.image_uploads
    FOR SELECT USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own uploads" ON public.image_uploads
    FOR DELETE USING (auth.uid() = uploaded_by);