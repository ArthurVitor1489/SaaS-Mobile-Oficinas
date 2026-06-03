import './polyfills';

import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import aesjs from 'aes-js';
import { createClient } from '@supabase/supabase-js';

// Swaps in public Expo environment variables dynamically
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project-id.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-public-key';

// Secure storage adapter for Supabase Auth tokens using expo-secure-store and AsyncStorage.
// To bypass SecureStore's 2048-byte size limit, we store a 256-bit encryption key in SecureStore,
// and use it to encrypt/decrypt the actual session payload stored in AsyncStorage.
class LargeSecureStore {
  private async _getEncryptionKey(): Promise<Uint8Array> {
    let key = await SecureStore.getItemAsync('supabase_encryption_key');
    if (!key) {
      // Generate a random 256-bit AES key using polyfilled crypto
      const newKey = global.crypto.getRandomValues(new Uint8Array(32));
      await SecureStore.setItemAsync('supabase_encryption_key', aesjs.utils.hex.fromBytes(newKey));
      return newKey;
    }
    return aesjs.utils.hex.toBytes(key);
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    
    const encryptionKey = await this._getEncryptionKey();
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(encrypted));
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async setItem(key: string, value: string): Promise<void> {
    const encryptionKey = await this._getEncryptionKey();
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await AsyncStorage.setItem(key, aesjs.utils.hex.fromBytes(encryptedBytes));
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }
}

const ExpoSecureStoreAdapter = new LargeSecureStore();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    persistSession: true, // Persists JWT token securely in device storage
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});
