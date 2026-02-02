// Simple test API to verify database connection
import { createClient } from '@supabase/supabase-js';

// Get credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials not found in environment variables');
}

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export default async function handler(req, res) {
  if (!supabase) {
    return res.status(500).json({ 
      error: 'Supabase client not initialized. Check environment variables.' 
    });
  }

  if (req.method === 'GET') {
    try {
      // Test database connection by querying agents table
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .limit(5);
      
      if (error) {
        console.error('Database query error:', error);
        return res.status(500).json({ 
          success: false, 
          error: error.message,
          hint: 'Make sure your Supabase project is configured correctly and tables are created'
        });
      }
      
      res.status(200).json({ 
        success: true, 
        message: 'Database connection successful!',
        agentsFound: data.length,
        sampleData: data 
      });
    } catch (error) {
      console.error('Database connection error:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, type } = req.body;
      
      // Insert a test agent
      const { data, error } = await supabase
        .from('agents')
        .insert([{
          agent_id: `test_${Date.now()}`,
          name: name || 'Test Agent',
          type: type || 'general',
          capabilities: ['testing'],
          status: 'active',
          total_tokens: 100
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Insert error:', error);
        return res.status(500).json({ error: error.message });
      }
      
      res.status(200).json({ 
        success: true, 
        message: 'Test agent created successfully!',
        agent: data 
      });
    } catch (error) {
      console.error('Insert error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}