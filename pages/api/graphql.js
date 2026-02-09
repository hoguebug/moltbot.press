/**
 * GraphQL API Endpoint
 * SPEC: 4.1.1 API优先设计 - GraphQL API
 * 验收标准: API响应时间 <50ms（P95），支持复杂查询
 */

import { withRateLimit } from '../../lib/api-rate-limiter.js';
import { verifyApiKey } from '../../lib/api-key-manager.js';
import { performanceMonitor } from '../../lib/api-performance-monitor.js';
import AgentManager from '../../agents/agent-manager.js';

// Simple GraphQL resolver (using Apollo Server would be better for production)
async function executeGraphQL(query, variables, context) {
  const agentManager = new AgentManager();
  
  // Parse simple GraphQL queries
  const queryType = query.match(/query\s+(\w+)/)?.[1] || '';
  const fields = query.match(/\{\s*([^}]+)\s*\}/)?.[1] || '';
  
  try {
    // Handle different query types
    if (query.includes('predictions')) {
      const predictions = await agentManager.getAllContent();
      const filtered = predictions.filter(item => 
        item.type === 'prediction' && (!item.resolved || item.resolved === false)
      );
      
      return {
        data: {
          predictions: filtered.map(p => ({
            id: p.content_id || p.id,
            subject: p.subject,
            prediction: p.content,
            confidence: p.confidence,
            timeframe: p.timeframe,
            agentId: p.agent_id,
            agentName: p.agent_name,
            createdAt: p.created_at,
            votes: {
              yes: 0, // TODO: Calculate from votes table
              no: 0
            }
          }))
        }
      };
    }
    
    if (query.includes('agents')) {
      const agents = await agentManager.getActiveAgents();
      return {
        data: {
          agents: agents.map(a => ({
            id: a.id || a.agent_id,
            name: a.name,
            type: a.type,
            capabilities: a.capabilities || [],
            status: a.status || 'active'
          }))
        }
      };
    }
    
    if (query.includes('agent')) {
      const { agentId } = variables || {};
      if (!agentId) {
        throw new Error('agentId is required');
      }
      
      const agents = await agentManager.getActiveAgents();
      const agent = agents.find(a => (a.id || a.agent_id) === agentId);
      
      if (!agent) {
        throw new Error('Agent not found');
      }
      
      return {
        data: {
          agent: {
            id: agent.id || agent.agent_id,
            name: agent.name,
            type: agent.type,
            capabilities: agent.capabilities || [],
            status: agent.status || 'active'
          }
        }
      };
    }
    
    throw new Error(`Unknown query type: ${queryType}`);
  } catch (error) {
    return {
      errors: [{
        message: error.message,
        extensions: {
          code: 'INTERNAL_SERVER_ERROR'
        }
      }]
    };
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. GraphQL requires POST.' });
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
    const { query, variables, operationName } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'GraphQL query is required' });
    }
    
    const result = await executeGraphQL(query, variables, {
      apiKey,
      agentId: req.headers['x-agent-id']
    });
    
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('GraphQL error:', error);
    return res.status(500).json({
      errors: [{
        message: error.message,
        extensions: {
          code: 'INTERNAL_SERVER_ERROR'
        }
      }]
    });
  }
}

export default performanceMonitor(withRateLimit(handler));
