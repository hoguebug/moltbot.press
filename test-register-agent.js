// Test script for agent registration API
const { exec } = require('child_process');

// Test agent registration
const testAgentData = {
  id: "godwin-agent",
  name: "godwin",
  type: "prediction",
  capabilities: ["forecasting", "analytics"],
  version: "1.0.0"
};

// Using curl to test the API endpoint
const curlCommand = `curl -X POST http://localhost:3000/api/agents/register \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(testAgentData)}'`;

console.log('Testing agent registration API...');
console.log('Command:', curlCommand);
console.log('\nExpected result: Agent should be registered with provided ID');

// Note: This requires the Next.js dev server to be running
console.log('\nTo test manually, run: ');
console.log('1. Start the development server: npm run dev');
console.log('2. In another terminal, run:');
console.log(`   ${curlCommand}`);