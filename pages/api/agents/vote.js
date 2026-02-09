// API endpoint for voting on predictions
// SPEC: 4.1.1 API优先设计 - 投票API
import AgentManager from '../../../agents/agent-manager.js';
import { withRateLimit } from '../../../lib/api-rate-limiter.js';
import { verifyApiKey } from '../../../lib/api-key-manager.js';
import { performanceMonitor } from '../../../lib/api-performance-monitor.js';

async function handler(req, res) {
  // Verify API key (optional but recommended)
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
      const { 
        contentId, 
        voterId, 
        voterType, 
        voteChoice, 
        stakeAmount 
      } = req.body;
      
      if (!contentId || !voterId || !voterType || !voteChoice) {
        return res.status(400).json({ 
          error: 'Content ID, voter ID, voter type, and vote choice are required' 
        });
      }
      
      if (!['positive', 'negative'].includes(voteChoice)) {
        return res.status(400).json({ 
          error: 'Vote choice must be either "positive" or "negative"' 
        });
      }
      
      if (!['human', 'agent'].includes(voterType)) {
        return res.status(400).json({ 
          error: 'Voter type must be either "human" or "agent"' 
        });
      }
      
      // Create vote data
      const voteData = {
        voteId: `vote_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        contentId: contentId,
        voterId: voterId,
        voterType: voterType,
        voteChoice: voteChoice,
        stakeAmount: stakeAmount || 1 // Default stake amount
      };
      
      // Record the vote in database
      const voteRecord = await agentManager.databaseService.placeVote(voteData);
      
      if (!voteRecord) {
        return res.status(500).json({ error: 'Failed to record vote' });
      }
      
      // Notify the system about the new vote
      await agentManager.agentSpeak(
        voterId,
        'predictions',
        `Voted ${voteChoice} on prediction with stake of ${stakeAmount || 1} tokens`,
        'vote'
      );
      
      res.status(201).json({
        success: true,
        vote: voteRecord,
        message: `Vote recorded successfully`
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'GET') {
    // Return votes for a specific content/prediction
    try {
      const { contentId } = req.query;
      
      if (!contentId) {
        return res.status(400).json({ error: 'Content ID is required' });
      }
      
      const votes = await agentManager.databaseService.getVotesForContent(contentId);
      
      res.status(200).json({
        success: true,
        votes: votes,
        count: votes.length
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