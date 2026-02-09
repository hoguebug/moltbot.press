/**
 * API Performance Monitor
 * SPEC: 4.1.1 API优先设计 - API响应时间监控
 * 验收标准: API响应时间 <50ms（P95）
 */

// In-memory performance metrics (for Vercel serverless)
// For production, use a time-series database or monitoring service
const metrics = {
  requests: [],
  maxHistory: 1000 // Keep last 1000 requests
};

/**
 * Record API performance metrics
 */
export function recordMetric(endpoint, method, duration, statusCode) {
  const metric = {
    endpoint,
    method,
    duration, // milliseconds
    statusCode,
    timestamp: Date.now()
  };
  
  metrics.requests.push(metric);
  
  // Keep only last maxHistory requests
  if (metrics.requests.length > metrics.maxHistory) {
    metrics.requests.shift();
  }
  
  return metric;
}

/**
 * Get performance statistics
 */
export function getPerformanceStats(endpoint = null, timeWindow = 60000) {
  const now = Date.now();
  const windowStart = now - timeWindow;
  
  let filtered = metrics.requests.filter(m => m.timestamp >= windowStart);
  
  if (endpoint) {
    filtered = filtered.filter(m => m.endpoint === endpoint);
  }
  
  if (filtered.length === 0) {
    return {
      count: 0,
      avgDuration: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      minDuration: 0,
      maxDuration: 0,
      errorRate: 0
    };
  }
  
  const durations = filtered.map(m => m.duration).sort((a, b) => a - b);
  const errors = filtered.filter(m => m.statusCode >= 400).length;
  
  return {
    count: filtered.length,
    avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    p50: durations[Math.floor(durations.length * 0.5)],
    p95: durations[Math.floor(durations.length * 0.95)],
    p99: durations[Math.floor(durations.length * 0.99)],
    minDuration: durations[0],
    maxDuration: durations[durations.length - 1],
    errorRate: errors / filtered.length
  };
}

/**
 * Performance monitoring middleware
 */
export function performanceMonitor(handler) {
  return async (req, res) => {
    const startTime = Date.now();
    const endpoint = req.url.split('?')[0];
    const method = req.method;
    
    // Override res.json to capture response
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      const duration = Date.now() - startTime;
      recordMetric(endpoint, method, duration, res.statusCode);
      return originalJson(data);
    };
    
    // Override res.send for consistency
    const originalSend = res.send.bind(res);
    res.send = function(data) {
      const duration = Date.now() - startTime;
      recordMetric(endpoint, method, duration, res.statusCode);
      return originalSend(data);
    };
    
    try {
      await handler(req, res);
      
      // If response wasn't sent, record it
      if (!res.headersSent) {
        const duration = Date.now() - startTime;
        recordMetric(endpoint, method, duration, res.statusCode || 200);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      recordMetric(endpoint, method, duration, 500);
      throw error;
    }
  };
}

/**
 * Check if performance meets SPEC requirements
 */
export function checkPerformanceCompliance() {
  const stats = getPerformanceStats();
  
  return {
    compliant: stats.p95 < 50, // P95 < 50ms
    stats: stats,
    requirements: {
      p95: 50, // milliseconds
      availability: 0.999 // 99.9%
    }
  };
}
