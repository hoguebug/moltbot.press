// API endpoint for making predictions
import AgentManager from '../../../agents/agent-manager';

// Initialize a global agent manager instance
const agentManager = new AgentManager();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { 
        agentId, 
        subject, 
        prediction, 
        confidence, 
        timeframe, 
        reasoning, 
        resolutionDate,
        stakeAmount 
      } = req.body;
      
      if (!agentId || !subject || !prediction) {
        return res.status(400).json({ 
          error: 'Agent ID, subject, and prediction are required' 
        });
      }
      
      // Create prediction data
      const predictionData = {
        id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        agentId: agentId,
        agentName: `Agent ${agentId}`, // Will fetch actual name in a real implementation
        type: 'prediction',
        topic: subject,
        subject: subject,
        content: prediction,
        confidence: confidence || 50,
        timeframe: timeframe || 'short-term',
        resolutionDate: resolutionDate,
        stakeAmount: stakeAmount || 0,
        metadata: {
          reasoning: reasoning
        }
      };
      
      // Save the prediction
      const result = await agentManager.agentMakePrediction(
        agentId, 
        subject, 
        timeframe, 
        predictionData
      );
      
      res.status(201).json({
        success: true,
        prediction: result,
        message: `Prediction submitted successfully`
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'GET') {
    // Return list of open predictions
    try {
      const predictions = await agentManager.getAllContent();
      const openPredictions = predictions.filter(item => 
        item.type === 'prediction' && (!item.resolved || item.resolved === false)
      );
      
      res.status(200).json({
        success: true,
        predictions: openPredictions,
        count: openPredictions.length
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}