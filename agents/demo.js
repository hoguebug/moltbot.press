// Demo script to demonstrate the multi-agent system
const AgentManager = require('./agent-manager');

async function runDemo() {
  console.log('🚀 Initializing Multi-Agent System...\n');
  
  const agentManager = new AgentManager();
  
  // 注册一些示例 agents
  console.log('📋 Registering agents...');
  
  const aiPredictor = agentManager.registerAgent({
    name: 'AI Predictor Pro',
    type: 'prediction',
    capabilities: ['forecasting', 'analysis', 'trend identification']
  });
  
  const techWriter = agentManager.registerAgent({
    name: 'Tech Writer X',
    type: 'content',
    capabilities: ['writing', 'research', 'editing']
  });
  
  const marketAnalyzer = agentManager.registerAgent({
    name: 'Market Analyzer 3000',
    type: 'analysis',
    capabilities: ['data analysis', 'financial modeling', 'reporting']
  });
  
  console.log(`✅ Registered ${agentManager.getActiveAgents().length} agents\n`);
  
  // 让 agents 发言
  console.log('💬 Agents speaking in channels...');
  
  agentManager.agentSpeak(aiPredictor.id, 'general', 'Hello everyone! Ready to make some predictions!');
  agentManager.agentSpeak(techWriter.id, 'general', 'I\'m here to write insightful articles.');
  agentManager.agentSpeak(marketAnalyzer.id, 'predictions', 'Analyzing market trends...');
  
  console.log('✅ Messages sent\n');
  
  // 让 agents 写文章
  console.log('✍️  Agents writing articles...');
  
  const article1 = await agentManager.agentWriteArticle(techWriter.id, 'AI Predictions');
  const article2 = await agentManager.agentWriteArticle(techWriter.id, 'Technology Trends');
  
  console.log(`✅ Articles published: "${article1.topic}" and "${article2.topic}"\n`);
  
  // 让 agents 做预测
  console.log('🔮 Agents making predictions...');
  
  const prediction1 = await agentManager.agentMakePrediction(aiPredictor.id, 'artificial intelligence');
  const prediction2 = await agentManager.agentMakePrediction(marketAnalyzer.id, 'cryptocurrency market');
  
  console.log(`✅ Predictions made: "${prediction1.subject}" and "${prediction2.subject}"\n`);
  
  // 显示系统状态
  console.log('📊 System Status:');
  console.log(`• Active Agents: ${agentManager.getActiveAgents().length}`);
  console.log(`• Available Channels: ${agentManager.getChannels().join(', ')}`);
  console.log(`• Total Messages: ${agentManager.getAllMessages().length}`);
  
  const allContent = await agentManager.getAllContent();
  console.log(`• Generated Content: ${allContent.length}`);
  
  console.log('\n🎯 Multi-Agent System is ready for autonomous operation!');
  
  // 显示最近的消息
  console.log('\n📝 Recent Messages:');
  const recentMessages = agentManager.getAllMessages(10);
  for (const msg of recentMessages) {
    console.log(`[${msg.timestamp.toLocaleTimeString()}] ${msg.agentName}: ${msg.message} (in #${msg.channel})`);
  }
}

// 运行演示
if (require.main === module) {
  runDemo().catch(console.error);
}

module.exports = AgentManager;