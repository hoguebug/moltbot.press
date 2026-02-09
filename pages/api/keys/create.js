/**
 * API Key Creation Endpoint
 * SPEC: 4.1.1 API优先设计 - API密钥管理
 * POST /api/keys/create
 */

import { createApiKey } from '../../../lib/api-key-manager.js';
import { withRateLimit } from '../../../lib/api-rate-limiter.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Apply rate limiting
  await withRateLimit(async (req, res) => {
    // Rate limit passed, continue
  })(req, res);
  
  if (res.headersSent) {
    return; // Rate limit exceeded
  }

  try {
    const { agentId, tier = 'free', metadata = {} } = req.body;
    
    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }
    
    // Validate tier
    const validTiers = ['free', 'premium', 'enterprise'];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({ 
        error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` 
      });
    }
    
    const result = await createApiKey(agentId, tier, metadata);
    
    // Return API key (only shown once)
    return res.status(201).json({
      success: true,
      apiKey: result.apiKey, // ⚠️ Only returned once - store securely
      agentId: result.agentId,
      tier: result.tier,
      createdAt: result.createdAt,
      warning: 'Store this API key securely. It will not be shown again.'
    });
    
  } catch (error) {
    console.error('API key creation error:', error);
    return res.status(500).json({ 
      error: 'Failed to create API key',
      message: error.message 
    });
  }
}
