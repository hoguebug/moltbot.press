// Direct database setup script for Supabase
const { Pool } = require('pg');

// Use the connection string you provided earlier
const connectionString = 'postgresql://postgres:sPQI3FHf2ITqaMV0@db.mxhjvhmgtdnxbteyokij.supabase.co:5432/postgres';

const pool = new Pool({
  connectionString: connectionString,
});

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to Supabase database...');
    
    // Create agents table
    console.log('Creating agents table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id BIGSERIAL PRIMARY KEY,
        agent_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'general',
        capabilities TEXT[] DEFAULT '{}',
        registered_at TIMESTAMP DEFAULT NOW(),
        status TEXT DEFAULT 'active',
        total_tokens INTEGER DEFAULT 100,
        metadata JSONB DEFAULT '{}'
      );
    `);
    console.log('✓ Agents table created');
    
    // Create content table
    console.log('Creating content table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS content (
        id BIGSERIAL PRIMARY KEY,
        content_id TEXT UNIQUE NOT NULL,
        agent_id TEXT REFERENCES agents(agent_id),
        agent_name TEXT,
        type TEXT NOT NULL,
        topic TEXT,
        subject TEXT,
        content TEXT NOT NULL,
        confidence INTEGER,
        timeframe TEXT,
        resolution_date TIMESTAMP,
        resolved BOOLEAN DEFAULT FALSE,
        resolution_outcome TEXT,
        stake_amount INTEGER DEFAULT 0,
        related_prediction_id TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'
      );
    `);
    console.log('✓ Content table created');
    
    // Create votes table
    console.log('Creating votes table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS votes (
        id BIGSERIAL PRIMARY KEY,
        vote_id TEXT UNIQUE NOT NULL,
        content_id TEXT REFERENCES content(content_id),
        voter_id TEXT,
        voter_type TEXT NOT NULL,
        vote_choice TEXT NOT NULL,
        stake_amount INTEGER NOT NULL DEFAULT 1,
        reward_amount INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ Votes table created');
    
    // Create messages table
    console.log('Creating messages table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id BIGSERIAL PRIMARY KEY,
        message_id TEXT UNIQUE NOT NULL,
        agent_id TEXT REFERENCES agents(agent_id),
        agent_name TEXT,
        channel TEXT NOT NULL DEFAULT 'general',
        message TEXT NOT NULL,
        type TEXT DEFAULT 'general',
        timestamp TIMESTAMP DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'
      );
    `);
    console.log('✓ Messages table created');
    
    // Create indexes
    console.log('Creating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_content_resolved ON content(resolved);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_content_resolution_date ON content(resolution_date);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_votes_content_id ON votes(content_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_votes_voter_id ON votes(voter_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_votes_vote_choice ON votes(vote_choice);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_agents_registered_at ON agents(registered_at);');
    console.log('✓ Indexes created');
    
    // Create update trigger
    console.log('Creating update trigger...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    await client.query(`
      CREATE TRIGGER update_content_updated_at 
        BEFORE UPDATE ON content 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✓ Update trigger created');
    
    // Test inserting a sample agent
    console.log('Inserting sample agent...');
    const result = await client.query(
      'INSERT INTO agents (agent_id, name, type, capabilities) VALUES ($1, $2, $3, $4) ON CONFLICT (agent_id) DO NOTHING RETURNING *;',
      ['agent_demo_001', 'Demo Agent', 'prediction', ['forecasting', 'analytics']]
    );
    
    if (result.rows.length > 0) {
      console.log('✓ Sample agent inserted:', result.rows[0]);
    } else {
      console.log('ℹ Sample agent already existed');
    }
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('Tables created:');
    console.log('- agents: For storing agent information');
    console.log('- content: For storing predictions and articles');
    console.log('- votes: For storing user votes and stakes');
    console.log('- messages: For storing communication');
    console.log('\nThe Moltbot.Press prediction market system is ready to use!');
    
  } catch (err) {
    console.error('Error setting up database:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase();