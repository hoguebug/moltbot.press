/**
 * Realtime Subscription API
 * SPEC: 4.1.2 实时数据流引擎
 * POST /api/realtime/subscribe
 */

import RealtimeStreamManager from '../../../lib/realtime-stream-manager.js';
import { withRateLimit } from '../../../lib/api-rate-limiter.js';
import { verifyApiKey } from '../../../lib/api-key-manager.js';
import { performanceMonitor } from '../../../lib/api-performance-monitor.js';

const streamManager = new RealtimeStreamManager();

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify API key
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  if (apiKey) {
    const keyInfo = await verifyApiKey(apiKey);
    if (!keyInfo.valid) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
  }

  try {
    const { type, ids, callbackUrl } = req.body;
    
    if (!type || !ids) {
      return res.status(400).json({ 
        error: 'Type and IDs are required',
        example: {
          type: 'market',
          ids: ['market1', 'market2'],
          callbackUrl: 'https://your-agent.com/webhook' // Optional
        }
      });
    }
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs must be a non-empty array' });
    }
    
    if (ids.length > 1000) {
      return res.status(400).json({ error: 'Maximum 1000 subscriptions per request' });
    }
    
    let subscriptions = [];
    
    switch (type) {
      case 'market':
        subscriptions = await streamManager.subscribeToMarkets(ids, (update) => {
          // TODO: Send to callbackUrl if provided
          console.log('Market update:', update);
        });
        break;
        
      case 'votes':
        if (ids.length > 1) {
          return res.status(400).json({ error: 'Only one content ID allowed for vote subscriptions' });
        }
        const voteSub = await streamManager.subscribeToVotes(ids[0], (update) => {
          console.log('Vote update:', update);
        });
        subscriptions = [voteSub];
        break;
        
      default:
        return res.status(400).json({ 
          error: `Unknown subscription type: ${type}. Must be 'market' or 'votes'` 
        });
    }
    
    return res.status(200).json({
      success: true,
      type: type,
      subscribedIds: ids,
      subscriptionCount: subscriptions.length,
      message: 'Subscriptions created. Use WebSocket for real-time updates.',
      note: 'For real-time updates, connect to WebSocket endpoint (coming soon)'
    });
    
  } catch (error) {
    console.error('Subscription error:', error);
    return res.status(500).json({ 
      error: 'Failed to create subscription',
      message: error.message 
    });
  }
}

export default performanceMonitor(withRateLimit(handler));
