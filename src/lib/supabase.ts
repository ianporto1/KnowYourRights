import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create client - will use empty strings during build which is fine
// as the client won't actually be called during static generation
export const supabase = createClient(supabaseUrl, supabaseKey);
