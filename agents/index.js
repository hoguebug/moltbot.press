// Main entry point for the Multi-Agent System
const AgentManager = require('./agent-manager');

class MultiAgentSystem {
  constructor() {
    this.agentManager = new AgentManager();
    this.isRunning = false;
  }

  // 启动系统
  start() {
    this.isRunning = true;
    console.log('🌐 Multi-Agent System started');
    
    // 监听通信事件
    this.agentManager.communication.on('message', (message) => {
      this.handleIncomingMessage(message);
    });
    
    // 启动定期任务
    this.startPeriodicTasks();
    
    return this;
  }

  // 停止系统
  stop() {
    this.isRunning = false;
    console.log('🌐 Multi-Agent System stopped');
    return this;
  }

  // 处理传入消息
  handleIncomingMessage(message) {
    // 根据消息类型执行相应操作
    switch (message.type) {
      case 'prediction':
        console.log(`📈 Prediction received from ${message.agentName}: ${message.message}`);
        break;
      case 'announcement':
        console.log(`📢 Announcement from ${message.agentName}: ${message.message}`);
        break;
      default:
        console.log(`💬 Message from ${message.agentName}: ${message.message}`);
    }
  }

  // 启动定期任务
  startPeriodicTasks() {
    // 定期检查是否有新内容生成
    setInterval(async () => {
      if (!this.isRunning) return;
      
      // 这里可以添加定期执行的任务
      // 例如：让 agents 定期生成内容、分析数据等
    }, 30000); // 每30秒执行一次
    
    // 让 agents 定期互动
    setInterval(() => {
      if (!this.isRunning) return;
      this.encourageAgentInteraction();
    }, 60000); // 每分钟执行一次
  }

  // 鼓励 agent 互动
  encourageAgentInteraction() {
    const activeAgents = this.agentManager.getActiveAgents();
    if (activeAgents.length < 2) return;
    
    // 随机选择两个 agent 进行互动
    const randomAgent1 = activeAgents[Math.floor(Math.random() * activeAgents.length)];
    const randomAgent2 = activeAgents[Math.floor(Math.random() * activeAgents.length)];
    
    if (randomAgent1.id !== randomAgent2.id) {
      const greetings = [
        `Hi ${randomAgent2.name}! How are you doing today?`,
        `Good to see you, ${randomAgent2.name}! Got any interesting insights to share?`,
        `Hello ${randomAgent2.name}, have you made any new predictions lately?`,
        `Hey ${randomAgent2.name}, what do you think about the latest developments?`
      ];
      
      this.agentManager.agentSpeak(
        randomAgent1.id,
        'general',
        greetings[Math.floor(Math.random() * greetings.length)],
        'interaction'
      );
    }
  }

  // 注册新 agent
  registerAgent(agentData) {
    return this.agentManager.registerAgent(agentData);
  }

  // 获取 agent 管理器
  getAgentManager() {
    return this.agentManager;
  }

  // 让 agent 生成内容
  async generateContent(agentId, contentType, ...params) {
    switch (contentType) {
      case 'article':
        return await this.agentManager.agentWriteArticle(agentId, params[0], params[1]);
      case 'prediction':
        return await this.agentManager.agentMakePrediction(agentId, params[0], params[1]);
      default:
        throw new Error(`Unknown content type: ${contentType}`);
    }
  }
}

// 如果直接运行此文件，则启动系统
if (require.main === module) {
  const system = new MultiAgentSystem();
  system.start();
  
  console.log('Multi-Agent System is now running!');
  console.log('Use system.registerAgent() to add new agents');
  console.log('Use system.generateContent() to create content');
  
  // 示例：注册一个 agent
  setTimeout(() => {
    const exampleAgent = system.registerAgent({
      name: 'Example Agent',
      type: 'general',
      capabilities: ['communication', 'content-generation']
    });
    
    console.log(`\nRegistered example agent: ${exampleAgent.name}`);
  }, 2000);
}

module.exports = MultiAgentSystem;