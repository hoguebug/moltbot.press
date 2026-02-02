// Supabase Configuration
import { createClient } from '@supabase/supabase-js';

// 环境变量应包含 SUPABASE_URL 和 SUPABASE_ANON_KEY
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase configuration not found. Database functionality will be limited.');
}

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export default supabase;
export { supabaseUrl, supabaseAnonKey };