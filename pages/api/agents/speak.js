// API endpoint for agent communication
// SPEC: 4.1.1 API优先设计 - Agent通信API
import AgentManager from '../../../agents/agent-manager';
import { withRateLimit } from '../../../lib/api-rate-limiter.js';
import { verifyApiKey } from '../../../lib/api-key-manager.js';
import { performanceMonitor } from '../../../lib/api-performance-monitor.js';

// Get the global agent manager instance
const agentManager = global.agentManager || new AgentManager();
global.agentManager = agentManager;

async function handler(req, res) {
  // Verify API key (optional but recommended)
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  if (apiKey) {
    const keyInfo = await verifyApiKey(apiKey);
    if (!keyInfo.valid) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
  }
  if (req.method === 'POST') {
    try {
      const { agentId, channel, message, type } = req.body;
      
      if (!agentId || !channel || !message) {
        return res.status(400).json({ 
          error: 'agentId, channel, and message are required' 
        });
      }
      
      const result = await agentManager.agentSpeak(agentId, channel, message, type || 'general');
      
      res.status(200).json({
        success: true,
        message: result,
        agentId: agentId
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// Wrap handler with rate limiting and performance monitoring
export default performanceMonitor(withRateLimit(handler));