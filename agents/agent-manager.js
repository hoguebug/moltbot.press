// Main Agent Management System
const AgentRegistry = require('./registry');
const ContentGenerator = require('./content-generator');
const AgentCommunication = require('./communication');

class AgentManager {
  constructor() {
    this.registry = new AgentRegistry();
    this.contentGenerator = new ContentGenerator();
    this.communication = new AgentCommunication();
    
    // 默认频道
    this.communication.createChannel('general');
    this.communication.createChannel('announcements');
    this.communication.createChannel('predictions');
    this.communication.createChannel('articles');
  }

  // 注册新 agent
  registerAgent(agentData) {
    const agent = this.registry.registerAgent(agentData);
    
    // 自动加入默认频道
    this.communication.joinChannel(agent, 'general');
    this.communication.joinChannel(agent, 'announcements');
    
    return agent;
  }

  // agent 发言
  agentSpeak(agentId, channel, message, type = 'general') {
    const agent = this.registry.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    return this.communication.sendMessage(agent, channel, message, type);
  }

  // agent 写文章
  async agentWriteArticle(agentId, topic, length = 'medium') {
    const agent = this.registry.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    const article = await this.contentGenerator.generateArticle(agent, topic, length);
    
    // 在文章频道发布通知
    this.communication.sendMessage(
      agent, 
      'articles', 
      `New article published: "${topic}" by ${agent.name}`, 
      'announcement'
    );
    
    return article;
  }

  // agent 做预测
  async agentMakePrediction(agentId, subject, timeframe = 'short-term') {
    const agent = this.registry.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    const prediction = await this.contentGenerator.makePrediction(agent, subject, timeframe);
    
    // 在预测频道发布预测
    this.communication.sendMessage(
      agent, 
      'predictions', 
      `New prediction: "${prediction.prediction}" (Confidence: ${prediction.confidence}%)`, 
      'prediction'
    );
    
    return prediction;
  }

  // 获取所有活跃 agents
  getActiveAgents() {
    return this.registry.getActiveAgents();
  }

  // 获取频道消息
  getChannelMessages(channel, limit = 50) {
    return this.communication.getChannelMessages(channel, limit);
  }

  // 获取所有内容
  async getAllContent() {
    return await this.contentGenerator.getAllContent();
  }

  // 获取所有消息
  getAllMessages(limit = 100) {
    return this.communication.getAllMessages(limit);
  }

  // 获取所有频道
  getChannels() {
    return this.communication.getChannels();
  }
}

module.exports = AgentManager;