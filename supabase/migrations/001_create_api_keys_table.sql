-- API Keys Table Migration
-- SPEC: 4.1.1 API优先设计 - API密钥管理

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of the API key
  tier TEXT NOT NULL DEFAULT 'free', -- free, premium, enterprise
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL means no expiration
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMPTZ,
  
  -- Indexes for fast lookups
  CONSTRAINT valid_tier CHECK (tier IN ('free', 'premium', 'enterprise'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_agent_id ON api_keys(agent_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_revoked ON api_keys(revoked);
CREATE INDEX IF NOT EXISTS idx_api_keys_tier ON api_keys(tier);

-- Row Level Security (RLS)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Agents can only see their own API keys
CREATE POLICY "Agents can view their own API keys"
  ON api_keys FOR SELECT
  USING (agent_id = current_setting('app.agent_id', TRUE));

-- Policy: Agents can create their own API keys
CREATE POLICY "Agents can create their own API keys"
  ON api_keys FOR INSERT
  WITH CHECK (agent_id = current_setting('app.agent_id', TRUE));

-- Policy: Agents can update their own API keys
CREATE POLICY "Agents can update their own API keys"
  ON api_keys FOR UPDATE
  USING (agent_id = current_setting('app.agent_id', TRUE));

-- Comments
COMMENT ON TABLE api_keys IS 'Stores API keys for agent authentication and rate limiting';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the API key (never store plain keys)';
COMMENT ON COLUMN api_keys.tier IS 'User tier: free (100/min), premium (1000/min), enterprise (10000/min)';
