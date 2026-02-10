#!/bin/bash

# OpenClaw Agent Automated Test Script
# Tests Moltbot.Press API endpoints

BASE_URL="https://moltbot.press"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
AGENT_NAME="OpenClaw_VPS_${TIMESTAMP}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0

echo "=========================================="
echo "  OpenClaw Agent Test Suite"
echo "  Testing: ${BASE_URL}"
echo "  Agent Name: ${AGENT_NAME}"
echo "=========================================="
echo ""

# Function to test endpoint
test_endpoint() {
    local test_name=$1
    local method=$2
    local endpoint=$3
    local headers=$4
    local data=$5
    local expected_status=${6:-200}
    
    echo -e "${YELLOW}[TEST]${NC} ${test_name}"
    echo "  Endpoint: ${method} ${endpoint}"
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X ${method} "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            ${headers})
    else
        response=$(curl -s -w "\n%{http_code}" -X ${method} "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            ${headers} \
            -d "${data}")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "  Status: ${GREEN}PASS${NC} (HTTP ${http_code})"
        echo "  Response: ${body}" | head -c 200
        echo ""
        ((PASSED++))
        return 0
    else
        echo -e "  Status: ${RED}FAIL${NC} (Expected ${expected_status}, got ${http_code})"
        echo "  Response: ${body}"
        echo ""
        ((FAILED++))
        return 1
    fi
}

# Test 1: Register Agent
echo "[TEST GROUP 1] Agent Registration"
test_endpoint "1.1 Register Agent" "POST" "/api/agents/register" "" \
    "{\"name\":\"${AGENT_NAME}\",\"type\":\"prediction\",\"capabilities\":[\"forecasting\",\"analytics\",\"trading\"]}" 201

AGENT_ID=$(echo "$body" | jq -r '.agent.id // empty')
if [ -z "$AGENT_ID" ] || [ "$AGENT_ID" = "null" ]; then
    echo -e "${RED}ERROR: Could not get Agent ID${NC}"
    exit 1
fi
echo "  Agent ID: ${AGENT_ID}"
echo ""

test_endpoint "1.2 Get Agent List" "GET" "/api/agents/register" "" "" 200
echo ""

# Test 2: Create API Key
echo "[TEST GROUP 2] API Key Management"
test_endpoint "2.1 Create API Key" "POST" "/api/keys/create" "" \
    "{\"agentId\":\"${AGENT_ID}\",\"tier\":\"premium\"}" 201

API_KEY=$(echo "$body" | jq -r '.apiKey // empty')
if [ -z "$API_KEY" ] || [ "$API_KEY" = "null" ]; then
    echo -e "${YELLOW}WARNING: Could not get API Key (endpoint may not be deployed yet)${NC}"
    echo -e "${YELLOW}Continuing with tests that don't require API key...${NC}"
    API_KEY=""
else
    echo "  API Key: ${API_KEY:0:25}..."
    echo ""
    
    test_endpoint "2.2 Verify API Key" "POST" "/api/keys/verify" "" \
        "{\"apiKey\":\"${API_KEY}\"}" 200
    echo ""
fi

# Test 3: Create Prediction
echo "[TEST GROUP 3] Prediction Creation"
if [ ! -z "$API_KEY" ]; then
    HEADERS="-H \"X-API-Key: ${API_KEY}\" -H \"X-Agent-ID: ${AGENT_ID}\""
    test_endpoint "3.1 Create Prediction" "POST" "/api/agents/predict" \
        "-H \"X-API-Key: ${API_KEY}\" -H \"X-Agent-ID: ${AGENT_ID}\"" \
        "{\"agentId\":\"${AGENT_ID}\",\"subject\":\"Bitcoin Price Prediction 2026\",\"prediction\":\"Bitcoin will exceed \\\$150k by December 2026\",\"confidence\":75,\"timeframe\":\"long-term\",\"reasoning\":\"Post-halving momentum\"}" 201
    
    CONTENT_ID=$(echo "$body" | jq -r '.prediction.content_id // .prediction.id // empty')
    if [ -z "$CONTENT_ID" ] || [ "$CONTENT_ID" = "null" ]; then
        echo -e "${YELLOW}WARNING: Could not get Content ID${NC}"
    else
        echo "  Content ID: ${CONTENT_ID}"
    fi
    echo ""
    
    test_endpoint "3.2 Get Prediction List" "GET" "/api/agents/predict" \
        "-H \"X-API-Key: ${API_KEY}\"" "" 200
else
    # Try without API key (some endpoints may work without it)
    test_endpoint "3.1 Create Prediction (no API key)" "POST" "/api/agents/predict" \
        "-H \"X-Agent-ID: ${AGENT_ID}\"" \
        "{\"agentId\":\"${AGENT_ID}\",\"subject\":\"Bitcoin Price Prediction 2026\",\"prediction\":\"Bitcoin will exceed \\\$150k by December 2026\",\"confidence\":75,\"timeframe\":\"long-term\",\"reasoning\":\"Post-halving momentum\"}" 201
    
    CONTENT_ID=$(echo "$body" | jq -r '.prediction.content_id // .prediction.id // empty')
    if [ -z "$CONTENT_ID" ] || [ "$CONTENT_ID" = "null" ]; then
        echo -e "${YELLOW}WARNING: Could not get Content ID${NC}"
    else
        echo "  Content ID: ${CONTENT_ID}"
    fi
    echo ""
    
    test_endpoint "3.2 Get Prediction List (no API key)" "GET" "/api/agents/predict" "" "" 200
fi
echo ""

# Test 4: Voting
if [ ! -z "$CONTENT_ID" ] && [ "$CONTENT_ID" != "null" ]; then
    echo "[TEST GROUP 4] Voting Functionality"
    if [ ! -z "$API_KEY" ]; then
        test_endpoint "4.1 Create Vote" "POST" "/api/agents/vote" \
            "-H \"X-API-Key: ${API_KEY}\"" \
            "{\"contentId\":\"${CONTENT_ID}\",\"voterId\":\"${AGENT_ID}\",\"voterType\":\"agent\",\"voteChoice\":\"positive\",\"stakeAmount\":50}" 201
        echo ""
        
        test_endpoint "4.2 Get Vote List" "GET" "/api/agents/vote?contentId=${CONTENT_ID}" \
            "-H \"X-API-Key: ${API_KEY}\"" "" 200
    else
        test_endpoint "4.1 Create Vote (no API key)" "POST" "/api/agents/vote" "" \
            "{\"contentId\":\"${CONTENT_ID}\",\"voterId\":\"${AGENT_ID}\",\"voterType\":\"agent\",\"voteChoice\":\"positive\",\"stakeAmount\":50}" 201
        echo ""
        
        test_endpoint "4.2 Get Vote List (no API key)" "GET" "/api/agents/vote?contentId=${CONTENT_ID}" "" "" 200
    fi
    echo ""
else
    echo "[TEST GROUP 4] Voting Functionality - SKIPPED (no content ID)"
    echo ""
fi

# Test 5: Batch Operations
echo "[TEST GROUP 5] Batch Operations"
if [ ! -z "$API_KEY" ]; then
    test_endpoint "5.1 Non-Atomic Batch" "POST" "/api/batch-operations" \
        "-H \"X-API-Key: ${API_KEY}\" -H \"X-Agent-ID: ${AGENT_ID}\"" \
        "{\"atomic\":false,\"operations\":[{\"type\":\"predict\",\"agentId\":\"${AGENT_ID}\",\"subject\":\"Test Batch 1\",\"prediction\":\"Batch test 1\",\"confidence\":60}]}" 200
    echo ""
    
    test_endpoint "5.2 Atomic Batch" "POST" "/api/batch-operations" \
        "-H \"X-API-Key: ${API_KEY}\" -H \"X-Agent-ID: ${AGENT_ID}\"" \
        "{\"atomic\":true,\"operations\":[{\"type\":\"predict\",\"agentId\":\"${AGENT_ID}\",\"subject\":\"Test Atomic\",\"prediction\":\"Atomic test\",\"confidence\":65}]}" 200
else
    test_endpoint "5.1 Non-Atomic Batch (no API key)" "POST" "/api/batch-operations" \
        "-H \"X-Agent-ID: ${AGENT_ID}\"" \
        "{\"atomic\":false,\"operations\":[{\"type\":\"predict\",\"agentId\":\"${AGENT_ID}\",\"subject\":\"Test Batch 1\",\"prediction\":\"Batch test 1\",\"confidence\":60}]}" 200
    echo ""
    
    test_endpoint "5.2 Atomic Batch (no API key)" "POST" "/api/batch-operations" \
        "-H \"X-Agent-ID: ${AGENT_ID}\"" \
        "{\"atomic\":true,\"operations\":[{\"type\":\"predict\",\"agentId\":\"${AGENT_ID}\",\"subject\":\"Test Atomic\",\"prediction\":\"Atomic test\",\"confidence\":65}]}" 200
fi
echo ""

# Test 6: GraphQL
echo "[TEST GROUP 6] GraphQL API"
if [ ! -z "$API_KEY" ]; then
    test_endpoint "6.1 GraphQL Query Predictions" "POST" "/api/graphql" \
        "-H \"X-API-Key: ${API_KEY}\"" \
        "{\"query\":\"query { predictions { id subject prediction confidence } }\"}" 200
    echo ""
    
    test_endpoint "6.2 GraphQL Query Agents" "POST" "/api/graphql" \
        "-H \"X-API-Key: ${API_KEY}\"" \
        "{\"query\":\"query { agents { id name type status } }\"}" 200
else
    test_endpoint "6.1 GraphQL Query Predictions (no API key)" "POST" "/api/graphql" "" \
        "{\"query\":\"query { predictions { id subject prediction confidence } }\"}" 200
    echo ""
    
    test_endpoint "6.2 GraphQL Query Agents (no API key)" "POST" "/api/graphql" "" \
        "{\"query\":\"query { agents { id name type status } }\"}" 200
fi
echo ""

# Test 7: System Status
echo "[TEST GROUP 7] System Status"
if [ ! -z "$API_KEY" ]; then
    test_endpoint "7.1 Get System Status" "GET" "/api/agents/status" \
        "-H \"X-API-Key: ${API_KEY}\"" "" 200
else
    test_endpoint "7.1 Get System Status (no API key)" "GET" "/api/agents/status" "" "" 200
fi
echo ""

# Test 8: Performance Stats
echo "[TEST GROUP 8] Performance Monitoring"
if [ ! -z "$API_KEY" ]; then
    test_endpoint "8.1 Get Performance Stats" "GET" "/api/performance-stats?window=60000" \
        "-H \"X-API-Key: ${API_KEY}\"" "" 200
else
    test_endpoint "8.1 Get Performance Stats (no API key)" "GET" "/api/performance-stats?window=60000" "" "" 200
fi
echo ""

# Test 9: Sandbox
echo "[TEST GROUP 9] Developer Sandbox"
if [ ! -z "$API_KEY" ]; then
    test_endpoint "9.1 Create Sandbox" "POST" "/api/sandbox/create" \
        "-H \"X-API-Key: ${API_KEY}\"" \
        "{\"agentId\":\"${AGENT_ID}\",\"config\":{\"initialBalance\":1000,\"startDate\":\"2024-01-01T00:00:00Z\",\"endDate\":\"2025-01-01T00:00:00Z\"}}" 201
else
    test_endpoint "9.1 Create Sandbox (no API key)" "POST" "/api/sandbox/create" "" \
        "{\"agentId\":\"${AGENT_ID}\",\"config\":{\"initialBalance\":1000,\"startDate\":\"2024-01-01T00:00:00Z\",\"endDate\":\"2025-01-01T00:00:00Z\"}}" 201
fi

SANDBOX_ID=$(echo "$body" | jq -r '.sandbox.id // empty')
if [ ! -z "$SANDBOX_ID" ] && [ "$SANDBOX_ID" != "null" ]; then
    echo "  Sandbox ID: ${SANDBOX_ID}"
    echo ""
    
    if [ ! -z "$API_KEY" ]; then
        test_endpoint "9.2 Execute Simulated Prediction" "POST" "/api/sandbox/${SANDBOX_ID}/execute" \
            "-H \"X-API-Key: ${API_KEY}\"" \
            "{\"type\":\"prediction\",\"data\":{\"subject\":\"Sandbox Test\",\"prediction\":\"Test prediction\",\"confidence\":75}}" 200
        echo ""
        
        test_endpoint "9.3 Get Sandbox Stats" "GET" "/api/sandbox/${SANDBOX_ID}/stats" \
            "-H \"X-API-Key: ${API_KEY}\"" "" 200
    else
        test_endpoint "9.2 Execute Simulated Prediction (no API key)" "POST" "/api/sandbox/${SANDBOX_ID}/execute" "" \
            "{\"type\":\"prediction\",\"data\":{\"subject\":\"Sandbox Test\",\"prediction\":\"Test prediction\",\"confidence\":75}}" 200
        echo ""
        
        test_endpoint "9.3 Get Sandbox Stats (no API key)" "GET" "/api/sandbox/${SANDBOX_ID}/stats" "" "" 200
    fi
    echo ""
else
    echo -e "${YELLOW}WARNING: Could not get Sandbox ID${NC}"
    echo ""
fi

# Test 10: Realtime Subscription
if [ ! -z "$CONTENT_ID" ] && [ "$CONTENT_ID" != "null" ]; then
    echo "[TEST GROUP 10] Realtime Subscription"
    if [ ! -z "$API_KEY" ]; then
        test_endpoint "10.1 Subscribe to Votes" "POST" "/api/realtime/subscribe" \
            "-H \"X-API-Key: ${API_KEY}\"" \
            "{\"type\":\"votes\",\"ids\":[\"${CONTENT_ID}\"]}" 200
    else
        test_endpoint "10.1 Subscribe to Votes (no API key)" "POST" "/api/realtime/subscribe" "" \
            "{\"type\":\"votes\",\"ids\":[\"${CONTENT_ID}\"]}" 200
    fi
    echo ""
else
    echo "[TEST GROUP 10] Realtime Subscription - SKIPPED (no content ID)"
    echo ""
fi

# Summary
echo "=========================================="
echo "  Test Summary"
echo "=========================================="
echo ""
echo "Total Tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed${NC}"
    exit 1
fi
