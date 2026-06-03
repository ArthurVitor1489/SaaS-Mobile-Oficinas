import './polyfills';

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Swaps in public Expo environment variables dynamically
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project-id.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-public-key';

// Secure storage adapter for Supabase Auth tokens using expo-secure-store
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    persistSession: true, // Persists JWT token securely in device storage
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});
