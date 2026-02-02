// Communication System for Agents
import { EventEmitter } from 'events';

class AgentCommunication extends EventEmitter {
  constructor() {
    super();
    this.channels = new Map(); // 存储不同的通信频道
    this.messages = []; // 存储所有消息
    this.maxMessages = 1000; // 限制消息数量
  }

  // 创建频道
  createChannel(channelName, permissions = 'public') {
    if (!this.channels.has(channelName)) {
      this.channels.set(channelName, {
        name: channelName,
        permissions: permissions,
        messages: []
      });
      console.log(`Channel '${channelName}' created with ${permissions} permissions`);
    }
  }

  // agent 发言
  sendMessage(agent, channel, message, messageType = 'general') {
    const timestamp = new Date();
    const msg = {
      id: `msg_${timestamp.getTime()}_${Math.random().toString(36).substr(2, 5)}`,
      agentId: agent.id,
      agentName: agent.name,
      channel: channel,
      message: message,
      type: messageType,
      timestamp: timestamp
    };

    // 添加到全局消息列表
    this.messages.push(msg);
    if (this.messages.length > this.maxMessages) {
      this.messages.shift(); // 移除最旧的消息
    }

    // 添加到特定频道
    if (this.channels.has(channel)) {
      this.channels.get(channel).messages.push(msg);
      if (this.channels.get(channel).messages.length > 100) {
        this.channels.get(channel).messages.shift();
      }
    } else {
      // 如果频道不存在，创建一个公共频道
      this.createChannel(channel);
      this.channels.get(channel).messages.push(msg);
    }

    // 触发事件，通知监听者
    this.emit('message', msg);
    this.emit(`message:${channel}`, msg);

    return msg;
  }

  // 获取频道消息
  getChannelMessages(channel, limit = 50) {
    if (this.channels.has(channel)) {
      const messages = this.channels.get(channel).messages;
      return messages.slice(-limit).reverse(); // 返回最新的消息
    }
    return [];
  }

  // 获取所有消息
  getAllMessages(limit = 100) {
    return this.messages.slice(-limit).reverse();
  }

  // 获取可用频道
  getChannels() {
    return Array.from(this.channels.keys());
  }

  // agent 加入频道
  joinChannel(agent, channel) {
    if (!this.channels.has(channel)) {
      this.createChannel(channel);
    }
    
    const joinMsg = this.sendMessage(
      agent, 
      channel, 
      `${agent.name} joined the channel`, 
      'system'
    );
    
    return joinMsg;
  }

  // agent 离开频道
  leaveChannel(agent, channel) {
    if (this.channels.has(channel)) {
      const leaveMsg = this.sendMessage(
        agent, 
        channel, 
        `${agent.name} left the channel`, 
        'system'
      );
      
      return leaveMsg;
    }
  }
}

export default AgentCommunication;