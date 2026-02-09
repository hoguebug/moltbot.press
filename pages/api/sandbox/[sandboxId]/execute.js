/**
 * Sandbox Execution API
 * SPEC: 第一阶段 - 开发者沙盒 - 模拟交易执行
 * POST /api/sandbox/[sandboxId]/execute
 */

import SandboxManager from '../../../../lib/sandbox-manager.js';
import { withRateLimit } from '../../../../lib/api-rate-limiter.js';
import { verifyApiKey } from '../../../../lib/api-key-manager.js';
import { performanceMonitor } from '../../../../lib/api-performance-monitor.js';

const sandboxManager = new SandboxManager();

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
    const { sandboxId } = req.query;
    const { type, data } = req.body;
    
    if (!sandboxId) {
      return res.status(400).json({ error: 'Sandbox ID is required' });
    }
    
    if (!type || !data) {
      return res.status(400).json({ error: 'Type and data are required' });
    }
    
    let result;
    
    switch (type) {
      case 'prediction':
        result = await sandboxManager.executeSimulatedPrediction(sandboxId, data);
        break;
        
      case 'trade':
        result = await sandboxManager.executeSimulatedTrade(sandboxId, data);
        break;
        
      case 'resolve':
        result = await sandboxManager.resolvePrediction(
          sandboxId, 
          data.predictionId, 
          data.outcome
        );
        break;
        
      default:
        return res.status(400).json({ 
          error: `Unknown execution type: ${type}. Must be 'prediction', 'trade', or 'resolve'` 
        });
    }
    
    return res.status(200).json({
      success: true,
      type: type,
      result: result,
      sandboxStats: sandboxManager.getSandboxStats(sandboxId)
    });
    
  } catch (error) {
    console.error('Sandbox execution error:', error);
    return res.status(500).json({ 
      error: 'Failed to execute sandbox operation',
      message: error.message 
    });
  }
}

export default performanceMonitor(withRateLimit(handler));
