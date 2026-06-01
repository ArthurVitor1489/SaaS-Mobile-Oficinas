import { createClient } from '@supabase/supabase-js';

// Swaps in public Expo environment variables dynamically
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project-id.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-public-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Persists JWT token securely in device storage
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});
