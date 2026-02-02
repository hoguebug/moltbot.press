// Main Agent Management System with Database Support
const AgentRegistry = require('./registry');
const ContentGenerator = require('./content-generator');
const AgentCommunication = require('./communication');
const DatabaseService = require('./database-service');

class AgentManager {
  constructor() {
    this.registry = new AgentRegistry();
    this.contentGenerator = new ContentGenerator();
    this.communication = new AgentCommunication();
    this.databaseService = new DatabaseService();
    
    // 默认频道
    this.communication.createChannel('general');
    this.communication.createChannel('announcements');
    this.communication.createChannel('predictions');
    this.communication.createChannel('articles');
    
    // 初始化数据库连接
    this.initDatabase();
  }

  async initDatabase() {
    try {
      const connected = await this.databaseService.checkConnection();
      if (connected) {
        console.log('✅ Database connection established');
      } else {
        console.log('⚠️  Database connection failed, using in-memory fallback');
      }
    } catch (error) {
      console.log('⚠️  Database connection failed, using in-memory fallback');
    }
  }

  // 注册新 agent
  async registerAgent(agentData) {
    // 先尝试注册到数据库
    const dbResult = await this.databaseService.registerAgent(agentData);
    
    // 同时维护内存中的注册
    const agent = this.registry.registerAgent(agentData);
    
    // 自动加入默认频道
    this.communication.joinChannel(agent, 'general');
    this.communication.joinChannel(agent, 'announcements');
    
    return agent;
  }

  // agent 发言
  async agentSpeak(agentId, channel, message, type = 'general') {
    const agent = this.registry.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    const msg = this.communication.sendMessage(agent, channel, message, type);
    
    // 同时保存到数据库
    await this.databaseService.saveMessage(msg);
    
    return msg;
  }

  // agent 写文章
  async agentWriteArticle(agentId, topic, length = 'medium') {
    const agent = this.registry.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    const article = await this.contentGenerator.generateArticle(agent, topic, length);
    
    // 在文章频道发布通知
    await this.agentSpeak(
      agentId, 
      'articles', 
      `New article published: "${topic}" by ${agent.name}`, 
      'announcement'
    );
    
    // 保存到数据库
    await this.databaseService.saveContent(article);
    
    return article;
  }

  // agent 偽预测
  async agentMakePrediction(agentId, subject, timeframe = 'short-term') {
    const agent = this.registry.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    const prediction = await this.contentGenerator.makePrediction(agent, subject, timeframe);
    
    // 在预测频道发布预测
    await this.agentSpeak(
      agentId, 
      'predictions', 
      `New prediction: "${prediction.prediction}" (Confidence: ${prediction.confidence}%)`, 
      'prediction'
    );
    
    // 保存到数据库
    await this.databaseService.saveContent(prediction);
    
    return prediction;
  }

  // 获取所有活跃 agents (优先从数据库获取)
  async getActiveAgents() {
    try {
      const dbAgents = await this.databaseService.getActiveAgents();
      if (dbAgents && dbAgents.length > 0) {
        return dbAgents;
      }
    } catch (error) {
      console.error('Error fetching agents from database:', error);
    }
    
    // Fallback to in-memory registry
    return this.registry.getActiveAgents();
  }

  // 获取频道消息
  async getChannelMessages(channel, limit = 50) {
    // 尝试从数据库获取消息
    try {
      const dbMessages = await this.databaseService.getMessages(channel, limit);
      if (dbMessages && dbMessages.length > 0) {
        return dbMessages;
      }
    } catch (error) {
      console.error('Error fetching messages from database:', error);
    }
    
    // Fallback to in-memory communication
    return this.communication.getChannelMessages(channel, limit);
  }

  // 获取所有内容
  async getAllContent() {
    try {
      return await this.databaseService.getContent();
    } catch (error) {
      console.error('Error fetching content from database:', error);
      // Fallback to in-memory content generator
      return await this.contentGenerator.getAllContent();
    }
  }

  // 获取所有消息
  async getAllMessages(limit = 100) {
    try {
      return await this.databaseService.getMessages(null, limit);
    } catch (error) {
      console.error('Error fetching messages from database:', error);
      // Fallback to in-memory communication
      return this.communication.getAllMessages(limit);
    }
  }

  // 获取所有频道
  getChannels() {
    return this.communication.getChannels();
  }

  // 获取数据库健康状态
  async getDatabaseHealth() {
    return await this.databaseService.healthCheck();
  }
}

module.exports = AgentManager;