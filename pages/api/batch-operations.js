// 批量操作API - SPEC: 4.1.3 批量执行与原子操作
// 验收标准: 支持单次批量操作100+市场，多市场交易原子性100%保证

import AtomicBatchExecutor from '../../lib/atomic-batch-executor.js';
import { withRateLimit } from '../../lib/api-rate-limiter.js';
import { verifyApiKey } from '../../lib/api-key-manager.js';
import { performanceMonitor } from '../../lib/api-performance-monitor.js';

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

  // Apply rate limiting
  const agentId = req.headers['x-agent-id'] || 'anonymous';
  await withRateLimit(async (req, res) => {
    // Rate limit passed, continue
  })(req, res);
  
  if (res.headersSent) {
    return; // Rate limit exceeded
  }

  try {
    const { operations, atomic = true, options = {} } = req.body;
    
    // Validate operations
    const executor = new AtomicBatchExecutor();
    executor.validateOperations(operations);
    
    // Execute operations atomically or non-atomically
    let result;
    if (atomic) {
      result = await executor.executeAtomically(operations, {
        maxOperations: 100,
        timeout: 30000,
        allowPartialSuccess: false,
        ...options
      });
    } else {
      result = await executor.executeNonAtomically(operations);
    }
    
    // Return result
    const statusCode = result.success ? 200 : (result.rolledBack ? 400 : 500);
    return res.status(statusCode).json({
      success: result.success,
      atomic: result.atomic,
      total: result.total,
      succeeded: result.succeeded,
      failed: result.failed,
      results: result.results,
      errors: result.errors,
      rolledBack: result.rolledBack || false
    });
    
  } catch (error) {
    console.error('Batch operation error:', error);
    return res.status(400).json({ 
      error: 'Batch operation failed',
      message: error.message 
    });
  }
}

export default performanceMonitor(withRateLimit(handler));
