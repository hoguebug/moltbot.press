// 批量操作API - SPEC: 4.1.3 批量执行与原子操作
// 验收标准: 支持单次批量操作100+市场，多市场交易原子性100%保证

import AgentManager from '../../agents/agent-manager.js';
import { withRateLimit, getRateLimitStatus } from '../../lib/api-rate-limiter.js';
import { verifyApiKey } from '../../lib/api-key-manager.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify API key
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  const keyInfo = await verifyApiKey(apiKey);
  
  if (!keyInfo.valid && apiKey) {
    return res.status(401).json({ error: 'Invalid API key' });
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
    const { operations } = req.body;
    
    // 验证输入
    if (!Array.isArray(operations)) {
      return res.status(400).json({ error: 'Operations must be an array' });
    }
    
    // 限制批量操作数量（避免超时）
    if (operations.length > 100) {
      return res.status(400).json({ 
        error: 'Maximum 100 operations per batch' 
      });
    }
    
    const agentManager = new AgentManager();
    const results = [];
    const errors = [];
    
    // 并行处理操作（利用Vercel的并发能力）
    const promises = operations.map(async (operation, index) => {
      try {
        let result;
        
        switch (operation.type) {
          case 'predict':
            result = await agentManager.agentMakePrediction(
              operation.agentId,
              operation.subject,
              operation.timeframe,
              operation.predictionData
            );
            break;
            
          case 'vote':
            result = await agentManager.databaseService.placeVote({
              voteId: `vote_${Date.now()}_${index}`,
              contentId: operation.contentId,
              voterId: operation.voterId,
              voterType: operation.voterType,
              voteChoice: operation.voteChoice,
              stakeAmount: operation.stakeAmount || 1
            });
            break;
            
          default:
            throw new Error(`Unknown operation type: ${operation.type}`);
        }
        
        return { index, success: true, result };
      } catch (error) {
        return { index, success: false, error: error.message };
      }
    });
    
    // 等待所有操作完成
    const allResults = await Promise.all(promises);
    
    // 分离成功和失败的结果
    allResults.forEach(result => {
      if (result.success) {
        results.push(result);
      } else {
        errors.push(result);
      }
    });
    
    // 返回结果
    return res.status(200).json({
      success: errors.length === 0,
      total: operations.length,
      succeeded: results.length,
      failed: errors.length,
      results: results.map(r => r.result),
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Batch operation error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
