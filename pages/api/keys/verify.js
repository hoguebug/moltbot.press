/**
 * API Key Verification Endpoint
 * SPEC: 4.1.1 API优先设计 - API密钥验证
 * POST /api/keys/verify
 */

import { verifyApiKey } from '../../../lib/api-key-manager.js';
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
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }
    
    const result = await verifyApiKey(apiKey);
    
    if (!result.valid) {
      return res.status(401).json({
        valid: false,
        reason: result.reason || 'invalid',
        tier: 'free'
      });
    }
    
    return res.status(200).json({
      valid: true,
      tier: result.tier,
      agentId: result.agentId
    });
    
  } catch (error) {
    console.error('API key verification error:', error);
    return res.status(500).json({ 
      error: 'Failed to verify API key',
      message: error.message 
    });
  }
}
