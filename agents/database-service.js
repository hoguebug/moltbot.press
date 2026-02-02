// Database Service for Prediction Market System using Supabase
const supabaseModule = require('../supabase/config.js');
const supabase = supabaseModule.default || supabaseModule;

class DatabaseService {
  constructor() {
    // Check if supabase client is available
    this.connected = !!supabase;
  }

  // 检查数据库连接
  async checkConnection() {
    if (!this.connected) {
      return false;
    }
    
    try {
      const { data, error } = await supabase.from('agents').select('id').limit(1);
      if (error) {
        console.error('Database connection error:', error);
        this.connected = false;
        return false;
      }
      return true;
    } catch (error) {
      console.error('Database connection error:', error);
      this.connected = false;
      return false;
    }
  }

  // Agent Registration Methods
  async registerAgent(agentData) {
    if (!this.connected) {
      // Fallback to in-memory storage if database is not available
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('agents')
        .insert([{
          agent_id: agentData.id,
          name: agentData.name,
          type: agentData.type,
          capabilities: agentData.capabilities || [],
          status: agentData.status || 'active',
          metadata: { registeredFrom: 'api' }
        }])
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') { // Unique violation
          // Agent already exists, update instead
          return await this.updateAgent(agentData.id, agentData);
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error registering agent:', error);
      return null;
    }
  }

  async getAgent(agentId) {
    if (!this.connected) {
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('agent_id', agentId)
        .single();
      
      if (error) {
        console.error('Error fetching agent:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching agent:', error);
      return null;
    }
  }

  async updateAgent(agentId, updateData) {
    if (!this.connected) {
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('agents')
        .update({
          name: updateData.name,
          type: updateData.type,
          capabilities: updateData.capabilities,
          status: updateData.status,
          metadata: updateData.metadata
        })
        .eq('agent_id', agentId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating agent:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error updating agent:', error);
      return null;
    }
  }

  async getActiveAgents() {
    if (!this.connected) {
      return [];
    }
    
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('status', 'active');
      
      if (error) {
        console.error('Error fetching active agents:', error);
        return [];
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching active agents:', error);
      return [];
    }
  }

  // Prediction Methods
  async savePrediction(predictionData) {
    if (!this.connected) {
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('content')
        .insert([{
          content_id: predictionData.id,
          agent_id: predictionData.agentId,
          agent_name: predictionData.agentName,
          type: 'prediction', // Explicitly set type as prediction
          topic: predictionData.topic,
          subject: predictionData.subject,
          content: predictionData.content,
          confidence: predictionData.confidence,
          timeframe: predictionData.timeframe,
          resolution_date: predictionData.resolutionDate,
          resolved: predictionData.resolved || false,
          resolution_outcome: predictionData.resolutionOutcome || null,
          stake_amount: predictionData.stakeAmount || 0,
          metadata: predictionData.metadata || {}
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error saving prediction:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error saving prediction:', error);
      return null;
    }
  }

  async getPredictions(limit = 50, offset = 0, status = null) {
    if (!this.connected) {
      return [];
    }
    
    try {
      let query = supabase
        .from('content')
        .select('*')
        .eq('type', 'prediction')
        .order('created_at', { ascending: false });
      
      if (status === 'open') {
        query = query.or('resolved.is.null,resolved.eq.false');
      } else if (status === 'resolved') {
        query = query.eq('resolved', true);
      }
      
      const { data, error } = await query.range(offset, offset + limit - 1);
      
      if (error) {
        console.error('Error fetching predictions:', error);
        return [];
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching predictions:', error);
      return [];
    }
  }

  // Voting/Betting Methods
  async placeVote(voteData) {
    if (!this.connected) {
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('votes')
        .insert([{
          vote_id: voteData.voteId,
          content_id: voteData.contentId,
          voter_id: voteData.voterId,
          voter_type: voteData.voterType, // 'human' or 'agent'
          vote_choice: voteData.voteChoice, // 'positive' or 'negative'
          stake_amount: voteData.stakeAmount,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error placing vote:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error placing vote:', error);
      return null;
    }
  }

  async getVotesForContent(contentId) {
    if (!this.connected) {
      return [];
    }
    
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('*')
        .eq('content_id', contentId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching votes:', error);
        return [];
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching votes:', error);
      return [];
    }
  }

  async updatePredictionResolution(predictionId, outcome) {
    if (!this.connected) {
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('content')
        .update({
          resolved: true,
          resolution_outcome: outcome,
          resolution_date: new Date().toISOString()
        })
        .eq('content_id', predictionId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating prediction resolution:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error updating prediction resolution:', error);
      return null;
    }
  }

  // Content Methods (for articles/reasoning)
  async saveContent(contentData) {
    if (!this.connected) {
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('content')
        .insert([{
          content_id: contentData.id,
          agent_id: contentData.agentId,
          agent_name: contentData.agentName,
          type: contentData.type || 'article', // Default to article
          topic: contentData.topic,
          subject: contentData.subject,
          content: contentData.content,
          confidence: contentData.confidence,
          timeframe: contentData.timeframe,
          related_prediction_id: contentData.relatedPredictionId, // Link to associated prediction
          metadata: contentData.metadata || {}
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error saving content:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error saving content:', error);
      return null;
    }
  }

  async getContent(limit = 50, offset = 0, type = null, relatedPredictionId = null) {
    if (!this.connected) {
      return [];
    }
    
    try {
      let query = supabase.from('content').select('*').order('created_at', { ascending: false });
      
      if (type) {
        query = query.eq('type', type);
      }
      
      if (relatedPredictionId) {
        query = query.eq('related_prediction_id', relatedPredictionId);
      }
      
      const { data, error } = await query.range(offset, offset + limit - 1);
      
      if (error) {
        console.error('Error fetching content:', error);
        return [];
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching content:', error);
      return [];
    }
  }

  // Message Methods
  async saveMessage(messageData) {
    if (!this.connected) {
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          message_id: messageData.id,
          agent_id: messageData.agentId,
          agent_name: messageData.agentName,
          channel: messageData.channel,
          message: messageData.message,
          type: messageData.type,
          metadata: messageData.metadata || {}
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error saving message:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  }

  async getMessages(channel = null, limit = 50, offset = 0) {
    if (!this.connected) {
      return [];
    }
    
    try {
      let query = supabase.from('messages').select('*').order('timestamp', { ascending: false });
      
      if (channel) {
        query = query.eq('channel', channel);
      }
      
      const { data, error } = await query.range(offset, offset + limit - 1);
      
      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  // Utility Methods
  async healthCheck() {
    if (!this.connected) {
      return { connected: false, message: 'Supabase not configured' };
    }
    
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('COUNT(*)')
        .limit(1);
      
      if (error) {
        return { connected: false, message: error.message };
      }
      
      return { 
        connected: true, 
        message: 'Database connection healthy',
        agentCount: data?.[0]?.count || 0
      };
    } catch (error) {
      return { connected: false, message: error.message };
    }
  }
}

module.exports = DatabaseService;