// Simple test to verify imports work
import supabase from './supabase/config.js';

console.log('Supabase client imported:', !!supabase);

if (supabase) {
  console.log('Testing basic connection...');
  
  supabase.from('agents')
    .select('id')
    .limit(1)
    .then(result => {
      console.log('Query result:', result);
    })
    .catch(error => {
      console.log('Query error (expected if table doesn\'t exist):', error.message);
    });
} else {
  console.log('No supabase client - check environment variables');
}