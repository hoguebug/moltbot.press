/**
 * Developer Sandbox Manager
 * SPEC: 第一阶段 - 开发者沙盒
 * 验收标准: 历史数据回测环境、模拟交易环境、测试网络部署
 */

import AgentManager from '../agents/agent-manager.js';

class SandboxManager {
  constructor() {
    this.sandboxes = new Map(); // In-memory sandbox storage
    this.historicalData = []; // Historical prediction data for backtesting
  }

  /**
   * Create a new sandbox environment
   */
  async createSandbox(agentId, config = {}) {
    const sandboxId = `sandbox_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    const sandbox = {
      id: sandboxId,
      agentId: agentId,
      config: {
        startDate: config.startDate || new Date('2024-01-01').toISOString(),
        endDate: config.endDate || new Date().toISOString(),
        initialBalance: config.initialBalance || 1000,
        enableRealTime: config.enableRealTime || false,
        ...config
      },
      state: {
        balance: config.initialBalance || 1000,
        positions: [],
        trades: [],
        predictions: [],
        createdAt: new Date().toISOString()
      },
      status: 'active'
    };
    
    this.sandboxes.set(sandboxId, sandbox);
    
    return sandbox;
  }

  /**
   * Get sandbox by ID
   */
  getSandbox(sandboxId) {
    return this.sandboxes.get(sandboxId);
  }

  /**
   * List sandboxes for an agent
   */
  listSandboxes(agentId) {
    const agentSandboxes = [];
    for (const [id, sandbox] of this.sandboxes) {
      if (sandbox.agentId === agentId) {
        agentSandboxes.push({
          id: sandbox.id,
          status: sandbox.status,
          createdAt: sandbox.state.createdAt,
          balance: sandbox.state.balance,
          tradesCount: sandbox.state.trades.length,
          predictionsCount: sandbox.state.predictions.length
        });
      }
    }
    return agentSandboxes;
  }

  /**
   * Execute a simulated prediction in sandbox
   */
  async executeSimulatedPrediction(sandboxId, predictionData) {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error('Sandbox not found');
    }

    if (sandbox.status !== 'active') {
      throw new Error('Sandbox is not active');
    }

    // Simulate prediction creation
    const prediction = {
      id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      ...predictionData,
      sandboxId: sandboxId,
      createdAt: new Date().toISOString(),
      status: 'open'
    };

    sandbox.state.predictions.push(prediction);

    return prediction;
  }

  /**
   * Execute a simulated trade in sandbox
   */
  async executeSimulatedTrade(sandboxId, tradeData) {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error('Sandbox not found');
    }

    if (sandbox.status !== 'active') {
      throw new Error('Sandbox is not active');
    }

    const { predictionId, direction, amount, price } = tradeData;

    // Check balance
    const cost = amount * price;
    if (sandbox.state.balance < cost) {
      throw new Error('Insufficient balance');
    }

    // Execute trade
    sandbox.state.balance -= cost;
    
    const trade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      predictionId: predictionId,
      direction: direction, // 'yes' or 'no'
      amount: amount,
      price: price,
      cost: cost,
      timestamp: new Date().toISOString(),
      sandboxId: sandboxId
    };

    sandbox.state.trades.push(trade);

    // Update positions
    const existingPosition = sandbox.state.positions.find(
      p => p.predictionId === predictionId && p.direction === direction
    );

    if (existingPosition) {
      existingPosition.amount += amount;
      existingPosition.avgPrice = 
        (existingPosition.avgPrice * (existingPosition.amount - amount) + cost) / 
        existingPosition.amount;
    } else {
      sandbox.state.positions.push({
        predictionId: predictionId,
        direction: direction,
        amount: amount,
        avgPrice: price
      });
    }

    return trade;
  }

  /**
   * Resolve a prediction in sandbox (simulate outcome)
   */
  async resolvePrediction(sandboxId, predictionId, outcome) {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error('Sandbox not found');
    }

    const prediction = sandbox.state.predictions.find(p => p.id === predictionId);
    if (!prediction) {
      throw new Error('Prediction not found');
    }

    prediction.status = 'resolved';
    prediction.outcome = outcome; // 'yes' or 'no'
    prediction.resolvedAt = new Date().toISOString();

    // Calculate P&L for positions
    const positions = sandbox.state.positions.filter(p => p.predictionId === predictionId);
    
    for (const position of positions) {
      if (position.direction === outcome) {
        // Winning position - payout is 1.0 per share
        const payout = position.amount * 1.0;
        sandbox.state.balance += payout;
        
        position.pnl = payout - (position.amount * position.avgPrice);
        position.status = 'closed';
      } else {
        // Losing position - no payout
        position.pnl = -(position.amount * position.avgPrice);
        position.status = 'closed';
      }
    }

    return prediction;
  }

  /**
   * Get sandbox statistics
   */
  getSandboxStats(sandboxId) {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error('Sandbox not found');
    }

    const initialBalance = sandbox.config.initialBalance;
    const currentBalance = sandbox.state.balance;
    const totalTrades = sandbox.state.trades.length;
    const openPositions = sandbox.state.positions.filter(p => p.status !== 'closed').length;
    const closedPositions = sandbox.state.positions.filter(p => p.status === 'closed');
    
    const totalPnl = closedPositions.reduce((sum, p) => sum + (p.pnl || 0), 0);
    const winRate = closedPositions.length > 0 
      ? closedPositions.filter(p => (p.pnl || 0) > 0).length / closedPositions.length 
      : 0;

    return {
      sandboxId: sandboxId,
      initialBalance: initialBalance,
      currentBalance: currentBalance,
      totalReturn: currentBalance - initialBalance,
      totalReturnPercent: ((currentBalance - initialBalance) / initialBalance) * 100,
      totalTrades: totalTrades,
      openPositions: openPositions,
      closedPositions: closedPositions.length,
      totalPnl: totalPnl,
      winRate: winRate * 100,
      predictionsCount: sandbox.state.predictions.length
    };
  }

  /**
   * Load historical data for backtesting
   */
  async loadHistoricalData(startDate, endDate) {
    // TODO: Load from database or file
    // For now, return empty array
    return [];
  }

  /**
   * Run backtest on historical data
   */
  async runBacktest(sandboxId, strategy) {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error('Sandbox not found');
    }

    // TODO: Implement backtesting logic
    // This would iterate through historical data and simulate trades
    
    return {
      sandboxId: sandboxId,
      startDate: sandbox.config.startDate,
      endDate: sandbox.config.endDate,
      results: this.getSandboxStats(sandboxId)
    };
  }

  /**
   * Delete sandbox
   */
  deleteSandbox(sandboxId) {
    return this.sandboxes.delete(sandboxId);
  }
}

export default SandboxManager;
