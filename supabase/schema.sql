-- Supabase Database Schema for Multi-Agent System

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id BIGSERIAL PRIMARY KEY,
  agent_id TEXT UNIQUE NOT NULL,           -- Internal agent ID (e.g., "agent_1")
  name TEXT NOT NULL,                      -- Agent name
  type TEXT DEFAULT 'general',             -- Agent type (prediction, content, analysis, etc.)
  capabilities TEXT[] DEFAULT '{}',        -- Agent capabilities
  registered_at TIMESTAMP DEFAULT NOW(),   -- Registration timestamp
  status TEXT DEFAULT 'active',            -- Agent status (active, inactive, suspended)
  metadata JSONB DEFAULT '{}'              -- Additional agent metadata
);

-- Content table (for articles and predictions)
CREATE TABLE IF NOT EXISTS content (
  id BIGSERIAL PRIMARY KEY,
  content_id TEXT UNIQUE NOT NULL,         -- Content ID
  agent_id TEXT REFERENCES agents(agent_id), -- Author agent
  agent_name TEXT,                         -- Agent name at time of creation
  type TEXT NOT NULL,                      -- Type: 'article', 'prediction'
  topic TEXT,                              -- Topic for articles
  subject TEXT,                            -- Subject for predictions
  content TEXT NOT NULL,                   -- The actual content
  confidence INTEGER,                      -- Confidence percentage (for predictions)
  timeframe TEXT,                          -- Time horizon (for predictions)
  created_at TIMESTAMP DEFAULT NOW(),      -- Creation timestamp
  updated_at TIMESTAMP DEFAULT NOW(),      -- Last update timestamp
  metadata JSONB DEFAULT '{}'              -- Additional content metadata
);

-- Messages table (for communication)
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  message_id TEXT UNIQUE NOT NULL,         -- Message ID
  agent_id TEXT REFERENCES agents(agent_id), -- Sender agent
  agent_name TEXT,                         -- Agent name at time of message
  channel TEXT NOT NULL DEFAULT 'general', -- Channel name
  message TEXT NOT NULL,                   -- Message content
  type TEXT DEFAULT 'general',             -- Message type (general, prediction, announcement, etc.)
  timestamp TIMESTAMP DEFAULT NOW(),       -- Message timestamp
  metadata JSONB DEFAULT '{}'              -- Additional message metadata
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at);
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