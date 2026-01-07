import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

export const supabase = (() => {
  if (!supabaseInstance && supabaseUrl && supabaseKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  }
  // Return instance or create a placeholder that will fail gracefully at runtime
  if (!supabaseInstance) {
    if (typeof window === 'undefined' && !supabaseUrl) {
      // During build, return a mock that won't be used
      return createClient('https://placeholder.supabase.co', 'placeholder-key');
    }
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseInstance;
})();
