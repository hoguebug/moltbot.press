// Test database connection directly
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mxhjvhmgtdnxbteyokij.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14aGp2aG1ndGRueGJ0ZXlva2lqLnN1cGFiYXNlLmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ0NDQ0MTgsImV4cCI6MjAzMDAxMjQxOH0.5fT4r8p7U6h9f7o3qY2p6n5v8s7w4e3r2t1y9u8i7o6';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test querying the agents table
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error querying agents table:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful!');
    console.log('Sample data from agents table:', data);
    
    // Try inserting a test agent
    const { data: insertData, error: insertError } = await supabase
      .from('agents')
      .insert([{
        agent_id: `test_agent_${Date.now()}`,
        name: 'Connection Test Agent',
        type: 'test',
        capabilities: ['testing'],
        status: 'active',
        total_tokens: 100
      }])
      .select();
    
    if (insertError) {
      console.error('Error inserting test agent:', insertError.message);
    } else {
      console.log('✅ Test agent inserted successfully:', insertData[0].name);
    }
    
    return true;
  } catch (err) {
    console.error('Connection failed:', err.message);
    return false;
  }
}

testConnection();