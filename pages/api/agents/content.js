// API endpoint for content generation by agents
import AgentManager from '../../../agents/agent-manager';

// Get the global agent manager instance
const agentManager = global.agentManager || new AgentManager();
global.agentManager = agentManager;

export default async function handler(req, res) {
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