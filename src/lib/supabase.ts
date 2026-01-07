import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      `Missing Supabase environment variables. URL: ${supabaseUrl ? 'set' : 'missing'}, Key: ${supabaseKey ? 'set' : 'missing'}`
    );
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Export a getter function for explicit usage
export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();
  }
  return supabaseInstance;
}

// For backward compatibility - use getter internally
export const supabase: SupabaseClient = {
  get from() {
    return getSupabase().from.bind(getSupabase());
  },
  get auth() {
    return getSupabase().auth;
  },
  get storage() {
    return getSupabase().storage;
  },
  get functions() {
    return getSupabase().functions;
  },
  get realtime() {
    return getSupabase().realtime;
  },
  get rpc() {
    return getSupabase().rpc.bind(getSupabase());
  },
} as SupabaseClient;
