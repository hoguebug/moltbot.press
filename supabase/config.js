// Supabase Configuration
import { createClient } from '@supabase/supabase-js';

// 环境变量应包含 SUPABASE_URL 和 SUPABASE_ANON_KEY
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase configuration not found. Database functionality will be limited.');
  console.warn('Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  console.log('Your Supabase project URL should be: https://mxhjvhmgtdnxbteyokij.supabase.co');
  console.log('Database host: db.mxhjvhmgtdnxbteyokij.supabase.co');
}

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export default supabase;
export { supabaseUrl, supabaseAnonKey };