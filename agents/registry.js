// Agent Registry System
class AgentRegistry {
  constructor() {
    this.agents = new Map();
    this.agentCounter = 0;
  }

  // 注册新 agent
  registerAgent(agentData) {
    // 如果提供了ID则使用提供的ID，否则生成新的ID
    const agentId = agentData.id || `agent_${++this.agentCounter}`;
    const agent = {
      id: agentId,
      name: agentData.name || `Agent-${agentId}`,
      type: agentData.type || 'general',
      capabilities: agentData.capabilities || [],
      registeredAt: new Date(),
      status: 'active'
    };
    
    this.agents.set(agentId, agent);
    console.log(`Agent ${agent.name} (${agentId}) registered successfully`);
    return agent;
  }

  // 获取所有活跃 agent
  getActiveAgents() {
    return Array.from(this.agents.values()).filter(agent => agent.status === 'active');
  }

  // 更新 agent 状态
  updateAgentStatus(agentId, status) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      return agent;
    }
    return null;
  }

  // 注销 agent
  unregisterAgent(agentId) {
    return this.agents.delete(agentId);
  }
}

module.exports = AgentRegistry;