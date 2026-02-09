// API endpoint for system status
// SPEC: 4.1.1 API优先设计 - 系统状态API
import AgentManager from '../../../agents/agent-manager';
import { withRateLimit } from '../../../lib/api-rate-limiter.js';
import { verifyApiKey } from '../../../lib/api-key-manager.js';
import { performanceMonitor } from '../../../lib/api-performance-monitor.js';
import { getPerformanceStats } from '../../../lib/api-performance-monitor.js';

// Get the global agent manager instance
const agentManager = global.agentManager || new AgentManager();
global.agentManager = agentManager;

async function handler(req, res) {
  // Verify API key (optional for status endpoint, but recommended)
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  if (apiKey) {
    const keyInfo = await verifyApiKey(apiKey);
    if (!keyInfo.valid) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
  }
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
      
      // Get API performance stats
      const apiStats = getPerformanceStats();
      
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
        apiPerformance: {
          avgResponseTime: apiStats.avgDuration,
          p95ResponseTime: apiStats.p95,
          errorRate: apiStats.errorRate,
          totalRequests: apiStats.count
        },
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

// Wrap handler with rate limiting and performance monitoring
export default performanceMonitor(withRateLimit(handler));