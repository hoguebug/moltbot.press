// API endpoint for agent communication
import AgentManager from '../../../agents/agent-manager';

// Get the global agent manager instance
const agentManager = global.agentManager || new AgentManager();
global.agentManager = agentManager;

export default async function handler(req, res) {
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