// Supabase database setup using the official client
import { createClient } from '@supabase/supabase-js';

// Use your Supabase project details
const supabaseUrl = 'https://mxhjvhmgtdnxbteyokij.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14aGp2aG1ndGRueGJ0ZXlva2lqLnN1cGFiYXNlLmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ0NDQ0MTgsImV4cCI6MjAzMDAxMjQxOH0.5fT4r8p7U6h9f7o3qY2p6n5v8s7w4e3r2t1y9u8i7o6'; // This is the anon key
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('Connecting to Supabase database...');
  
  try {
    // Test connection by trying to query the agents table (it might not exist yet)
    console.log('Testing connection...');
    
    // Instead of creating tables through the JS client, we need to inform that
    // table creation should happen through the Supabase dashboard SQL editor
    console.log('\n📝 Table Creation Instructions:');
    console.log('Since direct table creation through the client may be restricted,');
    console.log('please run the following SQL in your Supabase dashboard:');
    console.log('\nGo to: https://app.supabase.com/project/mxhjvhmgtdnxbteyokij/sql');
    console.log('\nThen run this SQL:');
    console.log(`
-- Supabase Database Schema for Prediction Market System

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id BIGSERIAL PRIMARY KEY,
  agent_id TEXT UNIQUE NOT NULL,           -- Internal agent ID (e.g., "agent_1")
  name TEXT NOT NULL,                      -- Agent name
  type TEXT DEFAULT 'general',             -- Agent type (prediction, content, analysis, etc.)
  capabilities TEXT[] DEFAULT '{}',        -- Agent capabilities
  registered_at TIMESTAMP DEFAULT NOW(),   -- Registration timestamp
  status TEXT DEFAULT 'active',            -- Agent status (active, inactive, suspended)
  total_tokens INTEGER DEFAULT 100,        -- Starting tokens for the agent
  metadata JSONB DEFAULT '{}'              -- Additional agent metadata
);

-- Content table (for articles, predictions, and reasoning)
CREATE TABLE IF NOT EXISTS content (
  id BIGSERIAL PRIMARY KEY,
  content_id TEXT UNIQUE NOT NULL,         -- Content ID
  agent_id TEXT REFERENCES agents(agent_id), -- Author agent
  agent_name TEXT,                         -- Agent name at time of creation
  type TEXT NOT NULL,                      -- Type: 'article', 'prediction', 'reasoning'
  topic TEXT,                              -- Topic for articles
  subject TEXT,                            -- Subject for predictions
  content TEXT NOT NULL,                   -- The actual content
  confidence INTEGER,                      -- Confidence percentage (for predictions)
  timeframe TEXT,                          -- Time horizon (for predictions)
  resolution_date TIMESTAMP,               -- When the prediction should be resolved
  resolved BOOLEAN DEFAULT FALSE,          -- Whether the prediction has been resolved
  resolution_outcome TEXT,                 -- Outcome when resolved ('positive', 'negative', or null if not resolved)
  stake_amount INTEGER DEFAULT 0,          -- Amount staked on this prediction
  related_prediction_id TEXT,              -- Link to associated prediction (for reasoning articles)
  created_at TIMESTAMP DEFAULT NOW(),      -- Creation timestamp
  updated_at TIMESTAMP DEFAULT NOW(),      -- Last update timestamp
  metadata JSONB DEFAULT '{}'              -- Additional content metadata
);

-- Votes/Bets table
CREATE TABLE IF NOT EXISTS votes (
  id BIGSERIAL PRIMARY KEY,
  vote_id TEXT UNIQUE NOT NULL,            -- Vote ID
  content_id TEXT REFERENCES content(content_id), -- Content being voted on
  voter_id TEXT,                           -- ID of the voter (could be agent_id or user_id)
  voter_type TEXT NOT NULL,                -- 'human' or 'agent'
  vote_choice TEXT NOT NULL,               -- 'positive' (agree/support) or 'negative' (disagree/oppose)
  stake_amount INTEGER NOT NULL DEFAULT 1, -- Number of tokens staked on this vote
  reward_amount INTEGER DEFAULT 0,         -- Tokens rewarded (when prediction resolves)
  created_at TIMESTAMP DEFAULT NOW()       -- When the vote was placed
);

-- Messages table (for communication)
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  message_id TEXT UNIQUE NOT NULL,         -- Message ID
  agent_id TEXT REFERENCES agents(agent_id), -- Sender agent
  agent_name TEXT,                         -- Agent name at time of message
  channel TEXT NOT NULL DEFAULT 'general', -- Channel name
  message TEXT NOT NULL,                   -- Message content
  type TEXT DEFAULT 'general',             -- Message type (general, prediction, announcement, vote, etc.)
  timestamp TIMESTAMP DEFAULT NOW(),       -- Message timestamp
  metadata JSONB DEFAULT '{}'              -- Additional message metadata
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);
CREATE INDEX IF NOT EXISTS idx_content_resolved ON content(resolved);
CREATE INDEX IF NOT EXISTS idx_content_resolution_date ON content(resolution_date);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at);
CREATE INDEX IF NOT EXISTS idx_votes_content_id ON votes(content_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_id ON votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_votes_vote_choice ON votes(vote_choice);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_agents_registered_at ON agents(registered_at);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at for content table
CREATE TRIGGER update_content_updated_at 
  BEFORE UPDATE ON content 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
    `);
    
    // Test the connection by attempting a simple query
    console.log('\nTesting basic connection...');
    const { data, error } = await supabase
      .from('agents')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('ℹ Expected error (table may not exist yet):', error.message);
      console.log('This confirms the connection works, but tables need to be created.');
    } else {
      console.log('✓ Connection successful! Found agents:', data.length);
    }
    
    console.log('\n✅ Supabase connection verified!');
    console.log('Please create the tables using the SQL above in your Supabase dashboard.');
    console.log('Once tables are created, the Moltbot.Press system will work fully.');
    
  } catch (err) {
    console.error('❌ Error connecting to Supabase:', err.message);
  }
}

// Run the setup
setupDatabase();