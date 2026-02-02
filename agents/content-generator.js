// Content Generation System for Agents
const fs = require('fs').promises;
const path = require('path');

class ContentGenerator {
  constructor(agentsDir = './agents') {
    this.agentsDir = agentsDir;
    this.contentDir = path.join(agentsDir, 'content');
  }

  // 生成文章
  async generateArticle(agent, topic, length = 'medium') {
    const article = {
      id: `article_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      agentId: agent.id,
      agentName: agent.name,
      topic: topic,
      content: this.createArticleContent(topic, length),
      timestamp: new Date(),
      type: 'article'
    };

    await this.saveContent(article);
    return article;
  }

  // 创建文章内容
  createArticleContent(topic, length) {
    const topics = {
      'AI Predictions': [
        'Recent advances in artificial intelligence have shown remarkable progress...',
        'The future of AI will likely involve more sophisticated neural networks...',
        'Machine learning models are becoming increasingly powerful and accessible...'
      ],
      'Technology Trends': [
        'Emerging technologies are reshaping how we interact with digital systems...',
        'The convergence of AI and IoT is creating new opportunities...',
        'Blockchain technology continues to evolve beyond cryptocurrency applications...'
      ],
      'Market Analysis': [
        'Current market trends indicate a shift towards decentralized solutions...',
        'Consumer behavior is changing rapidly with new technological adoption...',
        'Investment patterns suggest growing interest in sustainable technologies...'
      ]
    };

    const selectedTopic = topics[topic] || topics['AI Predictions'];
    const contentLength = length === 'short' ? 1 : length === 'long' ? 3 : 2;
    
    let content = '';
    for (let i = 0; i < contentLength; i++) {
      content += selectedTopic[i % selectedTopic.length] + ' ';
    }
    
    return content.trim();
  }

  // 做预测
  async makePrediction(agent, subject, timeframe = 'short-term') {
    const prediction = {
      id: `prediction_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      agentId: agent.id,
      agentName: agent.name,
      subject: subject,
      prediction: this.createPrediction(subject, timeframe),
      confidence: Math.floor(Math.random() * 41) + 60, // 60-100%
      timeframe: timeframe,
      timestamp: new Date(),
      type: 'prediction'
    };

    await this.saveContent(prediction);
    return prediction;
  }

  // 创建预测内容
  createPrediction(subject, timeframe) {
    const predictions = {
      'technology': [
        'will experience significant growth in the next decade',
        'is expected to become mainstream within the given timeframe',
        'will undergo fundamental changes driven by new innovations'
      ],
      'market': [
        'will see increased volatility in the specified period',
        'is predicted to stabilize after the initial fluctuations',
        'will likely experience a bullish trend based on current indicators'
      ],
      'ai': [
        'will achieve human-level performance in specific domains',
        'will see widespread adoption across multiple industries',
        'will face regulatory challenges that may slow development'
      ]
    };

    const key = Object.keys(predictions).find(k => subject.toLowerCase().includes(k)) || 'technology';
    const options = predictions[key];
    
    return `${subject} ${options[Math.floor(Math.random() * options.length)]}.`;
  }

  // 保存内容到文件
  async saveContent(content) {
    try {
      await fs.mkdir(this.contentDir, { recursive: true });
      
      const fileName = `${content.type}_${content.id}.json`;
      const filePath = path.join(this.contentDir, fileName);
      
      await fs.writeFile(filePath, JSON.stringify(content, null, 2));
    } catch (error) {
      console.error('Error saving content:', error);
    }
  }

  // 获取所有内容
  async getAllContent() {
    try {
      const files = await fs.readdir(this.contentDir);
      const contents = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.contentDir, file);
          const content = JSON.parse(await fs.readFile(filePath, 'utf8'));
          contents.push(content);
        }
      }
      
      return contents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('Error reading content:', error);
      return [];
    }
  }
}

module.exports = ContentGenerator;