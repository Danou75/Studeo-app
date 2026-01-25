import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lpvwipvtwtxmnluqolsd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_uPqvGZ5VY5BYMwM3Gew_rQ_XxZodmAT';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
