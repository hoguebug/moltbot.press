// API endpoint for system status
import AgentManager from '../../../agents/agent-manager';

// Get the global agent manager instance
const agentManager = global.agentManager || new AgentManager();
global.agentManager = agentManager;

export default function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const activeAgents = agentManager.getActiveAgents();
      const channels = agentManager.getChannels();
      const recentMessages = agentManager.getAllMessages(10);
      const totalMessages = agentManager.getAllMessages().length;
      
      // Get recent content
      agentManager.getAllContent().then(allContent => {
        const recentContent = allContent.slice(0, 10);
        
        res.status(200).json({
          success: true,
          status: 'running',
          timestamp: new Date().toISOString(),
          stats: {
            activeAgents: activeAgents.length,
            totalMessages: totalMessages,
            channels: channels.length,
            totalContent: allContent.length
          },
          activeAgents: activeAgents,
          recentMessages: recentMessages,
          recentContent: recentContent,
          channels: channels
        });
      }).catch(error => {
        res.status(500).json({ error: error.message });
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}