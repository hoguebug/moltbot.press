/**
 * Realtime Stream Manager
 * SPEC: 4.1.2 实时数据流引擎
 * 验收标准: 数据流延迟 <10ms（P99），支持订阅1000+市场
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

class RealtimeStreamManager {
  constructor() {
    this.subscriptions = new Map(); // Track active subscriptions
    this.messageQueue = []; // Queue for batching messages
    this.batchTimer = null;
  }

  /**
   * Subscribe to market updates
   */
  async subscribeToMarket(marketId, callback) {
    if (!supabase) {
      console.warn('Supabase not configured, using mock updates');
      return this.createMockSubscription(marketId, callback);
    }

    const channel = supabase
      .channel(`market:${marketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content',
          filter: `content_id=eq.${marketId}`
        },
        (payload) => {
          callback({
            type: 'market_update',
            marketId: marketId,
            event: payload.eventType,
            data: payload.new || payload.old,
            timestamp: Date.now()
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to market ${marketId}`);
        }
      });

    this.subscriptions.set(marketId, channel);
    return channel;
  }

  /**
   * Subscribe to multiple markets
   */
  async subscribeToMarkets(marketIds, callback) {
    const subscriptions = [];
    
    for (const marketId of marketIds) {
      if (marketIds.length > 1000) {
        throw new Error('Maximum 1000 markets per subscription');
      }
      
      const sub = await this.subscribeToMarket(marketId, (update) => {
        callback(update);
      });
      subscriptions.push(sub);
    }
    
    return subscriptions;
  }

  /**
   * Subscribe to vote updates for a prediction
   */
  async subscribeToVotes(contentId, callback) {
    if (!supabase) {
      return this.createMockSubscription(`votes:${contentId}`, callback);
    }

    const channel = supabase
      .channel(`votes:${contentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
          filter: `content_id=eq.${contentId}`
        },
        (payload) => {
          callback({
            type: 'vote_update',
            contentId: contentId,
            vote: payload.new,
            timestamp: Date.now()
          });
        }
      )
      .subscribe();

    this.subscriptions.set(`votes:${contentId}`, channel);
    return channel;
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channelId) {
    const channel = this.subscriptions.get(channelId);
    if (channel) {
      await supabase?.removeChannel(channel);
      this.subscriptions.delete(channelId);
      return true;
    }
    return false;
  }

  /**
   * Get subscription status
   */
  getSubscriptionStatus(channelId) {
    const channel = this.subscriptions.get(channelId);
    if (!channel) {
      return { subscribed: false };
    }
    
    return {
      subscribed: true,
      channelId: channelId,
      state: channel.state || 'unknown'
    };
  }

  /**
   * Batch messages to reduce rate
   */
  queueMessage(message) {
    this.messageQueue.push(message);
    
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushMessages();
      }, 100); // 100ms batch window
    }
  }

  /**
   * Flush queued messages
   */
  flushMessages() {
    if (this.messageQueue.length > 0) {
      // Process batch
      const batch = this.messageQueue.splice(0);
      // TODO: Send batch to subscribers
      this.batchTimer = null;
    }
  }

  /**
   * Create mock subscription for testing
   */
  createMockSubscription(id, callback) {
    const interval = setInterval(() => {
      callback({
        type: 'mock_update',
        id: id,
        data: { mock: true },
        timestamp: Date.now()
      });
    }, 1000);
    
    return {
      unsubscribe: () => clearInterval(interval)
    };
  }

  /**
   * Get all active subscriptions
   */
  getActiveSubscriptions() {
    return Array.from(this.subscriptions.keys());
  }
}

export default RealtimeStreamManager;
