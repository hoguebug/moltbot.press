// Test script to verify Supabase database connection and schema
import DatabaseService from './agents/database-service.js';
import supabase from './supabase/config.js';

async function testConnection() {
  console.log('🔍 Testing Supabase database connection...');
  
  const dbService = new DatabaseService();
  
  // Test basic connection
  const isConnected = await dbService.checkConnection();
  console.log(`✅ Connection status: ${isConnected ? 'CONNECTED' : 'DISCONNECTED'}`);
  
  if (!isConnected) {
    console.log('❌ Cannot connect to database. Please verify:');
    console.log('   - SUPABASE_URL is set correctly');
    console.log('   - SUPABASE_ANON_KEY is set correctly');
    console.log('   - Network connectivity to Supabase');
    console.log('   - Database tables exist');
    return;
  }
  
  // Test agent operations
  console.log('\n🧪 Testing agent operations...');
  try {
    // Try to get active agents
    const agents = await dbService.getActiveAgents();
    console.log(`✅ Retrieved ${agents.length} active agents`);
    
    // Try to register a test agent
    const testAgent = {
      id: `test_${Date.now()}`,
      name: 'Test Agent',
      type: 'test',
      capabilities: ['testing'],
      status: 'active'
    };
    
    const result = await dbService.registerAgent(testAgent);
    console.log('✅ Agent registration test:', result ? 'SUCCESS' : 'FAILED');
  } catch (error) {
    console.log('❌ Error in agent operations:', error.message);
  }
  
  // Test content operations
  console.log('\n🧪 Testing content operations...');
  try {
    const testContent = {
      id: `content_${Date.now()}`,
      agentId: 'test_agent',
      agentName: 'Test Agent',
      type: 'test',
      topic: 'Test Topic',
      content: 'Test content for verification',
      metadata: { test: true }
    };
    
    const contentResult = await dbService.saveContent(testContent);
    console.log('✅ Content save test:', contentResult ? 'SUCCESS' : 'FAILED');
  } catch (error) {
    console.log('❌ Error in content operations:', error.message);
  }
  
  // Test message operations
  console.log('\n🧪 Testing message operations...');
  try {
    const testMessage = {
      id: `msg_${Date.now()}`,
      agentId: 'test_agent',
      agentName: 'Test Agent',
      channel: 'test',
      message: 'Test message for verification',
      type: 'test'
    };
    
    const messageResult = await dbService.saveMessage(testMessage);
    console.log('✅ Message save test:', messageResult ? 'SUCCESS' : 'FAILED');
  } catch (error) {
    console.log('❌ Error in message operations:', error.message);
  }
  
  // Run health check
  console.log('\n🏥 Running health check...');
  const health = await dbService.healthCheck();
  console.log('✅ Health check result:', health);
  
  console.log('\n🎯 Database connection test completed!');
}

// Also test direct Supabase client
async function testDirectConnection() {
  console.log('\n🔗 Testing direct Supabase client connection...');
  
  if (!supabase) {
    console.log('❌ Supabase client not initialized - missing environment variables');
    return;
  }
  
  try {
    // Try a simple query
    const { data, error } = await supabase
      .from('agents')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('❌ Direct connection error:', error.message);
      console.log('💡 This could be because the "agents" table doesn\'t exist yet');
      return;
    }
    
    console.log('✅ Direct connection successful');
  } catch (error) {
    console.log('❌ Direct connection failed:', error.message);
  }
}

// Run tests
async function runTests() {
  await testDirectConnection();
  await testConnection();
}

runTests().catch(console.error);