/**
 * API Performance Statistics Endpoint
 * SPEC: 4.1.1 API优先设计 - API性能监控
 * GET /api/performance/stats
 */

import { getPerformanceStats, checkPerformanceCompliance } from '../../../lib/api-performance-monitor.js';
import { withRateLimit } from '../../../lib/api-rate-limiter.js';
import { performanceMonitor } from '../../../lib/api-performance-monitor.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { endpoint, window = '60000' } = req.query;
    const timeWindow = parseInt(window);
    
    const stats = getPerformanceStats(endpoint || null, timeWindow);
    const compliance = checkPerformanceCompliance();
    
    return res.status(200).json({
      success: true,
      stats: {
        ...stats,
        timeWindow: timeWindow,
        endpoint: endpoint || 'all'
      },
      compliance: compliance,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Performance stats error:', error);
    return res.status(500).json({ 
      error: 'Failed to get performance stats',
      message: error.message 
    });
  }
}

export default performanceMonitor(withRateLimit(handler));
