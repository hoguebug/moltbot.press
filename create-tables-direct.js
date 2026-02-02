// Script to directly create tables in Supabase using PostgreSQL connection
import { Client } from 'pg';

// 使用您提供的连接字符串
const connectionString = 'postgresql://postgres:sPQI3FHf2ITqaMV0@db.mxhjvhmgtdnxbteyokij.supabase.co:5432/postgres';

async function createTables() {
  const client = new Client({
    connectionString: connectionString
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // 创建 agents 表
    console.log('Creating agents table...');
    await client.query(`
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
    `);
    console.log('✅ Agents table created');

    // 创建 content 表
    console.log('Creating content table...');
    await client.query(`
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
    `);
    console.log('✅ Content table created');

    // 创建 messages 表
    console.log('Creating messages table...');
    await client.query(`
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
    `);
    console.log('✅ Messages table created');

    // 创建索引
    console.log('Creating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_agents_registered_at ON agents(registered_at);');
    console.log('✅ Indexes created');

    // 创建更新时间戳函数和触发器
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
    console.log('✅ Update trigger created');

    console.log('\n🎉 All tables and indexes created successfully!');
    console.log('Now when you deploy to Vercel with the environment variables set, the application will work correctly.');

  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

createTables();