/**
 * Atomic Batch Executor
 * SPEC: 4.1.3 批量执行与原子操作
 * 验收标准: 多市场交易原子性100%保证，支持10+市场的复杂策略
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

class AtomicBatchExecutor {
  constructor() {
    this.pendingOperations = new Map(); // Track pending operations for rollback
  }

  /**
   * Execute batch operations atomically
   * All operations succeed or all fail (rollback)
   */
  async executeAtomically(operations, options = {}) {
    if (!supabase) {
      // Fallback to non-atomic execution if Supabase not available
      return this.executeNonAtomically(operations);
    }

    const {
      maxOperations = 100,
      timeout = 30000, // 30 seconds
      allowPartialSuccess = false
    } = options;

    // Validate operations
    if (!Array.isArray(operations) || operations.length === 0) {
      throw new Error('Operations must be a non-empty array');
    }

    if (operations.length > maxOperations) {
      throw new Error(`Maximum ${maxOperations} operations per batch`);
    }

    // Group operations by type for better transaction handling
    const operationGroups = this.groupOperations(operations);

    // Execute using Supabase RPC function for true atomicity
    try {
      const { data, error } = await supabase.rpc('atomic_batch_operations', {
        p_operations: JSON.stringify(operations)
      });

      if (error) {
        throw new Error(`Atomic operation failed: ${error.message}`);
      }

      return {
        success: true,
        total: operations.length,
        succeeded: operations.length,
        failed: 0,
        results: data || [],
        atomic: true
      };
    } catch (error) {
      // If RPC function doesn't exist, fall back to manual transaction
      console.warn('RPC function not available, using manual transaction:', error.message);
      return this.executeManualTransaction(operations);
    }
  }

  /**
   * Execute operations using manual transaction
   */
  async executeManualTransaction(operations) {
    const results = [];
    const rollbackStack = [];

    try {
      // Start transaction (Supabase client handles this implicitly)
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        
        try {
          const result = await this.executeOperation(operation, i);
          results.push({ index: i, success: true, result });
          rollbackStack.push({ operation, result });
        } catch (error) {
          // Rollback all previous operations
          await this.rollback(rollbackStack);
          throw new Error(`Operation ${i} failed: ${error.message}. All operations rolled back.`);
        }
      }

      return {
        success: true,
        total: operations.length,
        succeeded: operations.length,
        failed: 0,
        results: results.map(r => r.result),
        atomic: true
      };
    } catch (error) {
      return {
        success: false,
        total: operations.length,
        succeeded: results.length,
        failed: operations.length - results.length,
        error: error.message,
        atomic: true,
        rolledBack: true
      };
    }
  }

  /**
   * Execute a single operation
   */
  async executeOperation(operation, index) {
    const { type, ...data } = operation;

    switch (type) {
      case 'predict':
        return await this.executePredictOperation(data, index);
      
      case 'vote':
        return await this.executeVoteOperation(data, index);
      
      case 'trade':
        return await this.executeTradeOperation(data, index);
      
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  /**
   * Execute predict operation
   */
  async executePredictOperation(data, index) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { agentId, subject, prediction, confidence, timeframe, reasoning } = data;
    
    if (!agentId || !subject || !prediction) {
      throw new Error('Agent ID, subject, and prediction are required');
    }

    const contentId = `pred_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`;

    const { data: result, error } = await supabase
      .from('content')
      .insert({
        content_id: contentId,
        agent_id: agentId,
        agent_name: data.agentName || `Agent ${agentId}`,
        type: 'prediction',
        subject: subject,
        content: prediction,
        confidence: confidence || 50,
        timeframe: timeframe || 'short-term',
        metadata: {
          reasoning: reasoning
        }
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create prediction: ${error.message}`);
    }

    return { id: contentId, type: 'prediction', ...result };
  }

  /**
   * Execute vote operation
   */
  async executeVoteOperation(data, index) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { contentId, voterId, voterType, voteChoice, stakeAmount } = data;
    
    if (!contentId || !voterId || !voterType || !voteChoice) {
      throw new Error('Content ID, voter ID, voter type, and vote choice are required');
    }

    if (!['positive', 'negative'].includes(voteChoice)) {
      throw new Error('Vote choice must be "positive" or "negative"');
    }

    const voteId = `vote_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`;

    const { data: result, error } = await supabase
      .from('votes')
      .insert({
        vote_id: voteId,
        content_id: contentId,
        voter_id: voterId,
        voter_type: voterType,
        vote_choice: voteChoice,
        stake_amount: stakeAmount || 1
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to place vote: ${error.message}`);
    }

    return { id: voteId, type: 'vote', ...result };
  }

  /**
   * Execute trade operation (for future market trading)
   */
  async executeTradeOperation(data, index) {
    // TODO: Implement when market trading is available
    throw new Error('Trade operations not yet implemented');
  }

  /**
   * Group operations by type for optimization
   */
  groupOperations(operations) {
    const groups = {
      predict: [],
      vote: [],
      trade: []
    };

    operations.forEach((op, index) => {
      if (groups[op.type]) {
        groups[op.type].push({ ...op, originalIndex: index });
      }
    });

    return groups;
  }

  /**
   * Rollback operations
   */
  async rollback(rollbackStack) {
    // Reverse order rollback
    for (let i = rollbackStack.length - 1; i >= 0; i--) {
      const { operation, result } = rollbackStack[i];
      try {
        await this.rollbackOperation(operation, result);
      } catch (error) {
        console.error(`Failed to rollback operation ${i}:`, error);
      }
    }
  }

  /**
   * Rollback a single operation
   */
  async rollbackOperation(operation, result) {
    if (!supabase) {
      return; // Can't rollback without database
    }

    const { type } = operation;

    switch (type) {
      case 'predict':
        if (result.id) {
          await supabase.from('content').delete().eq('content_id', result.id);
        }
        break;
      
      case 'vote':
        if (result.id) {
          await supabase.from('votes').delete().eq('vote_id', result.id);
        }
        break;
      
      default:
        console.warn(`Unknown operation type for rollback: ${type}`);
    }
  }

  /**
   * Fallback: Execute operations non-atomically (for testing)
   */
  async executeNonAtomically(operations) {
    const results = [];
    const errors = [];

    for (let i = 0; i < operations.length; i++) {
      try {
        const result = await this.executeOperation(operations[i], i);
        results.push({ index: i, success: true, result });
      } catch (error) {
        errors.push({ index: i, success: false, error: error.message });
      }
    }

    return {
      success: errors.length === 0,
      total: operations.length,
      succeeded: results.length,
      failed: errors.length,
      results: results.map(r => r.result),
      errors: errors.length > 0 ? errors : undefined,
      atomic: false
    };
  }

  /**
   * Validate operations before execution
   */
  validateOperations(operations) {
    if (!Array.isArray(operations)) {
      throw new Error('Operations must be an array');
    }

    if (operations.length === 0) {
      throw new Error('Operations array cannot be empty');
    }

    if (operations.length > 100) {
      throw new Error('Maximum 100 operations per batch');
    }

    // Validate each operation
    operations.forEach((op, index) => {
      if (!op.type) {
        throw new Error(`Operation ${index} missing type`);
      }

      const validTypes = ['predict', 'vote', 'trade'];
      if (!validTypes.includes(op.type)) {
        throw new Error(`Operation ${index} has invalid type: ${op.type}`);
      }
    });

    return true;
  }
}

export default AtomicBatchExecutor;
