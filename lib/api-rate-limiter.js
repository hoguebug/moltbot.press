/**
 * API Rate Limiter Middleware
 * SPEC: 4.1.1 API优先设计 - API限频系统
 * 验收标准: 专业级用户 >1000次/分钟
 */

// In-memory rate limiter (for Vercel serverless)
// For production, use Redis or Cloudflare KV
const rateLimitStore = new Map();

/**
 * Rate limit configuration by user tier
 */
const RATE_LIMITS = {
  free: 100,        // 100 requests/minute
  premium: 1000,    // 1000 requests/minute
  enterprise: 10000 // 10000 requests/minute
};

/**
 * Get user tier from API key or default to 'free'
 */
async function getUserTier(apiKey) {
  if (!apiKey) return 'free';
  
  // TODO: Query database for API key tier
  // For now, check if it's a premium key format
  if (apiKey.startsWith('prem_')) return 'premium';
  if (apiKey.startsWith('ent_')) return 'enterprise';
  
  return 'free';
}

/**
 * Rate limiter middleware
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 */
export async function rateLimiter(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  const agentId = req.headers['x-agent-id'] || 'anonymous';
  
  // Get user tier
  const tier = await getUserTier(apiKey);
  const limit = RATE_LIMITS[tier];
  
  // Current minute timestamp
  const minute = Math.floor(Date.now() / 60000);
  const key = `${agentId}:${minute}`;
  
  // Get current count
  let count = rateLimitStore.get(key) || 0;
  
  // Check limit
  if (count >= limit) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      limit: limit,
      remaining: 0,
      resetAt: (minute + 1) * 60000,
      tier: tier
    });
  }
  
  // Increment count
  rateLimitStore.set(key, count + 1);
  
  // Clean up old entries (older than 2 minutes)
  const twoMinutesAgo = minute - 2;
  for (const [storeKey] of rateLimitStore) {
    const keyMinute = parseInt(storeKey.split(':')[1]);
    if (keyMinute < twoMinutesAgo) {
      rateLimitStore.delete(storeKey);
    }
  }
  
  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', limit.toString());
  res.setHeader('X-RateLimit-Remaining', (limit - count - 1).toString());
  res.setHeader('X-RateLimit-Reset', ((minute + 1) * 60000).toString());
  res.setHeader('X-RateLimit-Tier', tier);
  
  if (next) {
    next();
  }
}

/**
 * Rate limiter wrapper for Next.js API routes
 */
export function withRateLimit(handler) {
  return async (req, res) => {
    // Apply rate limiting
    await rateLimiter(req, res);
    
    // If rate limit passed, continue to handler
    if (!res.headersSent) {
      return handler(req, res);
    }
  };
}

/**
 * Get rate limit status for an agent
 */
export async function getRateLimitStatus(agentId, apiKey) {
  const tier = await getUserTier(apiKey);
  const limit = RATE_LIMITS[tier];
  const minute = Math.floor(Date.now() / 60000);
  const key = `${agentId}:${minute}`;
  const count = rateLimitStore.get(key) || 0;
  
  return {
    tier,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt: (minute + 1) * 60000
  };
}
