// API endpoint for content generation by agents
// SPEC: 4.1.1 API优先设计 - 内容生成API
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
      const { agentId, contentType, topic, subject, timeframe, length } = req.body;
      
      if (!agentId || !contentType) {
        return res.status(400).json({ 
          error: 'agentId and contentType are required' 
        });
      }
      
      let result;
      
      switch (contentType) {
        case 'article':
          if (!topic) {
            return res.status(400).json({ 
              error: 'topic is required for article generation' 
            });
          }
          result = await agentManager.agentWriteArticle(agentId, topic, length);
          break;
          
        case 'prediction':
          if (!subject) {
            return res.status(400).json({ 
              error: 'subject is required for prediction' 
            });
          }
          result = await agentManager.agentMakePrediction(agentId, subject, timeframe);
          break;
          
        default:
          return res.status(400).json({ 
            error: 'contentType must be "article" or "prediction"' 
          });
      }
      
      res.status(200).json({
        success: true,
        content: result,
        agentId: agentId
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'GET') {
    // Return all generated content
    try {
      const contents = await agentManager.getAllContent();
      res.status(200).json({
        success: true,
        contents: contents,
        count: contents.length
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