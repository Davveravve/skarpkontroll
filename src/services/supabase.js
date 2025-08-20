// src/supabase.js - Lägg denna kod här
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// Lägg till felhantering
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.')
  console.error('REACT_APP_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
  console.error('REACT_APP_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')