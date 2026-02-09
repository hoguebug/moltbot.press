/**
 * Sandbox Statistics API
 * SPEC: 第一阶段 - 开发者沙盒 - 沙盒统计
 * GET /api/sandbox/[sandboxId]/stats
 */

import SandboxManager from '../../../../lib/sandbox-manager.js';
import { withRateLimit } from '../../../../lib/api-rate-limiter.js';
import { verifyApiKey } from '../../../../lib/api-key-manager.js';
import { performanceMonitor } from '../../../../lib/api-performance-monitor.js';

const sandboxManager = new SandboxManager();

async function handler(req, res) {
  if (req.method !== 'GET') {
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
    
    if (!sandboxId) {
      return res.status(400).json({ error: 'Sandbox ID is required' });
    }
    
    const stats = sandboxManager.getSandboxStats(sandboxId);
    
    return res.status(200).json({
      success: true,
      stats: stats
    });
    
  } catch (error) {
    console.error('Sandbox stats error:', error);
    return res.status(500).json({ 
      error: 'Failed to get sandbox stats',
      message: error.message 
    });
  }
}

export default performanceMonitor(withRateLimit(handler));
