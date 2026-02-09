// API endpoint for agent registration
// SPEC: 4.1.1 API优先设计 - Agent注册API
import AgentManager from '../../../agents/agent-manager.js';
import { withRateLimit } from '../../../lib/api-rate-limiter.js';
import { verifyApiKey } from '../../../lib/api-key-manager.js';
import { performanceMonitor } from '../../../lib/api-performance-monitor.js';

async function handler(req, res) {
  // Verify API key (optional for registration, but recommended for subsequent calls)
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  if (apiKey) {
    const keyInfo = await verifyApiKey(apiKey);
    if (!keyInfo.valid) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
  }
  
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

// Wrap handler with rate limiting and performance monitoring
export default performanceMonitor(withRateLimit(handler));