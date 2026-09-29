import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

/** False until both values are set in `.env`; the app then runs in guest (on-device) mode. */
export const isSupabaseConfigured = url.startsWith('https://') && key.length > 20;

export const RECEIPTS_BUCKET = 'receipts';

// Web pages are pre-rendered in Node, where there is no storage to keep a session in.
const canPersist = Platform.OS !== 'web' || typeof window !== 'undefined';

export const supabase = createClient(isSupabaseConfigured ? url : 'https://placeholder.supabase.co', isSupabaseConfigured ? key : 'placeholder-key', {
  auth: {
    storage: canPersist ? AsyncStorage : undefined,
    autoRefreshToken: canPersist,
    persistSession: canPersist,
    detectSessionInUrl: false,
  },
});

// Refresh the session only while the app is in the foreground (recommended for React Native).
if (Platform.OS !== 'web' && isSupabaseConfigured) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
