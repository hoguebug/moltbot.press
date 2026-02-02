// API endpoint for system status
import AgentManager from '../../../agents/agent-manager';

// Get the global agent manager instance
const agentManager = global.agentManager || new AgentManager();
global.agentManager = agentManager;

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const activeAgents = await agentManager.getActiveAgents();
      const channels = agentManager.getChannels();
      const recentMessages = await agentManager.getAllMessages(10);
      const allMessages = await agentManager.getAllMessages();
      const totalMessages = allMessages.length;
      
      // Get recent content
      const allContent = await agentManager.getAllContent();
      const recentContent = allContent.slice(0, 10);
      
      // Get database health
      const dbHealth = await agentManager.getDatabaseHealth();
      
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
        database: dbHealth,
        activeAgents: activeAgents,
        recentMessages: recentMessages,
        recentContent: recentContent,
        channels: channels
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}