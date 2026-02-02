// API endpoint for agent registration
import AgentManager from '../../../agents/agent-manager.js';

export default async function handler(req, res) {
  // Create agent manager instance for this request
  const agentManager = new AgentManager();
  if (req.method === 'POST') {
    try {
      const { id, name, type, capabilities, version, metadata } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Agent name is required' });
      }
      
      const agentData = {
        id: id, // Allow external ID if provided
        name: name,
        type: type || 'general',
        capabilities: capabilities || [],
        version: version,
        metadata: metadata
      };
      
      // If no ID provided, generate one
      if (!agentData.id) {
        agentData.id = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      }
      
      const agent = await agentManager.registerAgent(agentData);
      
      res.status(201).json({
        success: true,
        agent: agent,
        message: `Agent ${agent.name} registered successfully`
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'GET') {
    // Return list of active agents
    const activeAgents = await agentManager.getActiveAgents();
    
    res.status(200).json({
      success: true,
      agents: activeAgents,
      count: activeAgents.length
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}