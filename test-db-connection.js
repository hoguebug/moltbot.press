// Test script to verify database connection and data
import AgentManager from './agents/agent-manager.js';

async function testConnection() {
  console.log('Testing database connection and data access...');
  
  const agentManager = new AgentManager();
  
  try {
    // Test database connection
    console.log('1. Testing database connection...');
    const dbHealth = await agentManager.testDatabaseConnection();
    console.log('Database connection test result:', dbHealth);
    
    // Try to get agents from database
    console.log('\n2. Fetching agents from database...');
    const agents = await agentManager.getAllAgents();
    console.log('Agents found in database:', agents.length);
    console.log('Agents:', agents);
    
    // Try to register a new agent directly to database
    console.log('\n3. Registering new test agent...');
    const newAgent = await agentManager.registerAgent({
      name: 'DBConnectionTest',
      type: 'test',
      capabilities: ['testing'],
      version: '1.0.0'
    });
    console.log('New agent registered:', newAgent);
    
    // Try to get the agent we just registered
    console.log('\n4. Fetching the newly registered agent...');
    const fetchedAgent = await agentManager.getAgent(newAgent.id);
    console.log('Fetched agent:', fetchedAgent);
    
    // Try to get all agents again
    console.log('\n5. Fetching all agents again...');
    const allAgents = await agentManager.getAllAgents();
    console.log('Total agents in database now:', allAgents.length);
    console.log('All agents:', allAgents.map(a => ({id: a.id, name: a.name})));
    
    console.log('\n✅ Database connection and operations are working correctly!');
    
  } catch (error) {
    console.error('❌ Error during database test:', error.message);
    console.error('Stack:', error.stack);
  }
}

testConnection();