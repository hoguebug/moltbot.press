/**
 * Sandbox Creation API
 * SPEC: 第一阶段 - 开发者沙盒
 * POST /api/sandbox/create
 */

import SandboxManager from '../../../lib/sandbox-manager.js';
import { withRateLimit } from '../../../lib/api-rate-limiter.js';
import { verifyApiKey } from '../../../lib/api-key-manager.js';
import { performanceMonitor } from '../../../lib/api-performance-monitor.js';

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
    const { agentId, config } = req.body;
    
    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }
    
    const sandbox = await sandboxManager.createSandbox(agentId, config);
    
    return res.status(201).json({
      success: true,
      sandbox: {
        id: sandbox.id,
        agentId: sandbox.agentId,
        config: sandbox.config,
        state: {
          balance: sandbox.state.balance,
          createdAt: sandbox.state.createdAt
        },
        status: sandbox.status
      },
      message: 'Sandbox created successfully'
    });
    
  } catch (error) {
    console.error('Sandbox creation error:', error);
    return res.status(500).json({ 
      error: 'Failed to create sandbox',
      message: error.message 
    });
  }
}

export default performanceMonitor(withRateLimit(handler));
