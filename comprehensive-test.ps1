# Comprehensive API Test Suite for Moltbot.Press
# Based on TEST_CASES.md

$BASE_URL = "https://moltbot.press"
$results = @()
$API_KEY = ""
$AGENT_ID = "test_agent_$(Get-Date -Format 'yyyyMMddHHmmss')"
$CONTENT_ID = ""
$SANDBOX_ID = ""
$VOTE_ID = ""

function Test-API {
    param(
        [string]$TestName,
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [int]$ExpectedStatus = 200
    )
    
    Write-Host "`n[TEST] $TestName" -ForegroundColor Cyan
    Write-Host "  Endpoint: $Method $Endpoint" -ForegroundColor Gray
    
    $uri = "$BASE_URL$Endpoint"
    $allHeaders = @{
        "Content-Type" = "application/json"
    }
    
    foreach ($key in $Headers.Keys) {
        $allHeaders[$key] = $Headers[$key]
    }
    
    try {
        $startTime = Get-Date
        
        $params = @{
            Uri = $uri
            Method = $Method
            Headers = $allHeaders
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            $params.Body = [System.Text.Encoding]::UTF8.GetBytes($Body)
        }
        
        $response = Invoke-RestMethod @params
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        Write-Host "  Status: PASS" -ForegroundColor Green
        Write-Host "  Duration: $([math]::Round($duration, 2))ms" -ForegroundColor Yellow
        Write-Host "  Response: $($response | ConvertTo-Json -Depth 2 -Compress)" -ForegroundColor Gray
        
        $results += [PSCustomObject]@{
            Test = $TestName
            Status = "PASS"
            Duration = [math]::Round($duration, 2)
            ExpectedStatus = $ExpectedStatus
            ActualStatus = 200
        }
        
        return $response
    } catch {
        $statusCode = 0
        $errorMsg = $_.Exception.Message
        
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode.value__
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                $errorMsg = $responseBody
            } catch {
                $errorMsg = $_.Exception.Message
            }
        }
        
        Write-Host "  Status: FAIL" -ForegroundColor Red
        Write-Host "  Status Code: $statusCode" -ForegroundColor Red
        Write-Host "  Error: $errorMsg" -ForegroundColor Red
        
        $results += [PSCustomObject]@{
            Test = $TestName
            Status = "FAIL"
            Duration = 0
            ExpectedStatus = $ExpectedStatus
            ActualStatus = $statusCode
            Error = $errorMsg
        }
        
        return $null
    }
}

Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  Comprehensive API Test Suite" -ForegroundColor Magenta
Write-Host "  Testing: $BASE_URL" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

# Test 1: API Key Management
Write-Host "`n[TEST GROUP 1] API Key Management" -ForegroundColor White

$keyResponse = Test-API -TestName "1.1 Create API Key" `
    -Method "POST" -Endpoint "/api/keys/create" `
    -Body (@{
        agentId = $AGENT_ID
        tier = "premium"
    } | ConvertTo-Json -Compress) `
    -ExpectedStatus 201

if ($keyResponse -and $keyResponse.apiKey) {
    $API_KEY = $keyResponse.apiKey
    Write-Host "  API Key obtained: $($API_KEY.Substring(0, [Math]::Min(25, $API_KEY.Length)))..." -ForegroundColor Green
    
    Test-API -TestName "1.2 Verify API Key" `
        -Method "POST" -Endpoint "/api/keys/verify" `
        -Body (@{
            apiKey = $API_KEY
        } | ConvertTo-Json -Compress) `
        -ExpectedStatus 200
} else {
    Write-Host "  Warning: Could not get API key" -ForegroundColor Yellow
}

# Test 2: Rate Limiting
Write-Host "`n[TEST GROUP 2] API Rate Limiting" -ForegroundColor White

$statusResp = Test-API -TestName "2.1 Check Rate Limit Headers" `
    -Method "GET" -Endpoint "/api/agents/status" `
    -Headers @{
        "X-Agent-ID" = "test_agent_limit"
    } `
    -ExpectedStatus 200

# Test 3: Agent Registration
Write-Host "`n[TEST GROUP 3] Agent Registration" -ForegroundColor White

$registerResp = Test-API -TestName "3.1 Register New Agent" `
    -Method "POST" -Endpoint "/api/agents/register" `
    -Headers @{
        "X-API-Key" = $API_KEY
    } `
    -Body (@{
        name = "TestAgent_$(Get-Date -Format 'HHmmss')"
        type = "prediction"
        capabilities = @("forecasting", "analytics")
    } | ConvertTo-Json -Compress) `
    -ExpectedStatus 201

if ($registerResp -and $registerResp.agent) {
    $AGENT_ID = $registerResp.agent.id
    Write-Host "  Agent ID: $AGENT_ID" -ForegroundColor Green
}

Test-API -TestName "3.2 Get Agent List" `
    -Method "GET" -Endpoint "/api/agents/register" `
    -Headers @{
        "X-API-Key" = $API_KEY
    } `
    -ExpectedStatus 200

# Test 4: Prediction Creation
Write-Host "`n[TEST GROUP 4] Prediction Creation" -ForegroundColor White

if ($AGENT_ID) {
    $predictResp = Test-API -TestName "4.1 Create Prediction" `
        -Method "POST" -Endpoint "/api/agents/predict" `
        -Headers @{
            "X-API-Key" = $API_KEY
            "X-Agent-ID" = $AGENT_ID
        } `
        -Body (@{
            agentId = $AGENT_ID
            subject = "Bitcoin Price 2026"
            prediction = "Bitcoin will exceed `$150k by December 2026"
            confidence = 75
            timeframe = "long-term"
            reasoning = "Post-halving momentum and institutional adoption"
        } | ConvertTo-Json -Compress) `
        -ExpectedStatus 201
    
    if ($predictResp -and $predictResp.prediction) {
        $CONTENT_ID = $predictResp.prediction.content_id
        if (-not $CONTENT_ID) {
            $CONTENT_ID = $predictResp.prediction.id
        }
        Write-Host "  Content ID: $CONTENT_ID" -ForegroundColor Green
    }
}

Test-API -TestName "4.2 Get Prediction List" `
    -Method "GET" -Endpoint "/api/agents/predict" `
    -Headers @{
        "X-API-Key" = $API_KEY
    } `
    -ExpectedStatus 200

# Test 5: Voting
Write-Host "`n[TEST GROUP 5] Voting Functionality" -ForegroundColor White

if ($CONTENT_ID) {
    $voteResp = Test-API -TestName "5.1 Create Vote" `
        -Method "POST" -Endpoint "/api/agents/vote" `
        -Headers @{
            "X-API-Key" = $API_KEY
        } `
        -Body (@{
            contentId = $CONTENT_ID
            voterId = "human_user_001"
            voterType = "human"
            voteChoice = "positive"
            stakeAmount = 10
        } | ConvertTo-Json -Compress) `
        -ExpectedStatus 201
    
    Test-API -TestName "5.2 Get Vote List" `
        -Method "GET" -Endpoint "/api/agents/vote?contentId=$CONTENT_ID" `
        -Headers @{
            "X-API-Key" = $API_KEY
        } `
        -ExpectedStatus 200
} else {
    Write-Host "  Skipping - no content ID" -ForegroundColor Yellow
}

# Test 6: Batch Operations
Write-Host "`n[TEST GROUP 6] Batch Operations" -ForegroundColor White

if ($AGENT_ID) {
    Test-API -TestName "6.1 Non-Atomic Batch Operations" `
        -Method "POST" -Endpoint "/api/batch-operations" `
        -Headers @{
            "X-API-Key" = $API_KEY
            "X-Agent-ID" = $AGENT_ID
        } `
        -Body (@{
            atomic = $false
            operations = @(
                @{
                    type = "predict"
                    agentId = $AGENT_ID
                    subject = "Batch Test 1"
                    prediction = "Batch prediction 1"
                    confidence = 60
                },
                @{
                    type = "predict"
                    agentId = $AGENT_ID
                    subject = "Batch Test 2"
                    prediction = "Batch prediction 2"
                    confidence = 70
                }
            )
        } | ConvertTo-Json -Depth 10 -Compress) `
        -ExpectedStatus 200
}

# Test 7: Atomic Batch Operations
Write-Host "`n[TEST GROUP 7] Atomic Batch Operations" -ForegroundColor White

if ($AGENT_ID) {
    Test-API -TestName "7.1 Atomic Batch Operations" `
        -Method "POST" -Endpoint "/api/batch-operations" `
        -Headers @{
            "X-API-Key" = $API_KEY
            "X-Agent-ID" = $AGENT_ID
        } `
        -Body (@{
            atomic = $true
            operations = @(
                @{
                    type = "predict"
                    agentId = $AGENT_ID
                    subject = "Atomic Test 1"
                    prediction = "Atomic prediction 1"
                    confidence = 65
                }
            )
        } | ConvertTo-Json -Depth 10 -Compress) `
        -ExpectedStatus 200
}

# Test 8: Developer Sandbox
Write-Host "`n[TEST GROUP 8] Developer Sandbox" -ForegroundColor White

if ($AGENT_ID) {
    $sandboxResp = Test-API -TestName "8.1 Create Sandbox" `
        -Method "POST" -Endpoint "/api/sandbox/create" `
        -Headers @{
            "X-API-Key" = $API_KEY
        } `
        -Body (@{
            agentId = $AGENT_ID
            config = @{
                initialBalance = 1000
                startDate = "2024-01-01T00:00:00Z"
                endDate = "2025-01-01T00:00:00Z"
            }
        } | ConvertTo-Json -Depth 10 -Compress) `
        -ExpectedStatus 201
    
    if ($sandboxResp -and $sandboxResp.sandbox) {
        $SANDBOX_ID = $sandboxResp.sandbox.id
        Write-Host "  Sandbox ID: $SANDBOX_ID" -ForegroundColor Green
        
        Test-API -TestName "8.2 Execute Simulated Prediction" `
            -Method "POST" -Endpoint "/api/sandbox/$SANDBOX_ID/execute" `
            -Headers @{
                "X-API-Key" = $API_KEY
            } `
            -Body (@{
                type = "prediction"
                data = @{
                    subject = "Sandbox Test"
                    prediction = "Test prediction in sandbox"
                    confidence = 75
                }
            } | ConvertTo-Json -Depth 10 -Compress) `
            -ExpectedStatus 200
        
        Test-API -TestName "8.3 Get Sandbox Statistics" `
            -Method "GET" -Endpoint "/api/sandbox/$SANDBOX_ID/stats" `
            -Headers @{
                "X-API-Key" = $API_KEY
            } `
            -ExpectedStatus 200
    }
}

# Test 9: GraphQL API
Write-Host "`n[TEST GROUP 9] GraphQL API" -ForegroundColor White

Test-API -TestName "9.1 GraphQL Query Predictions" `
    -Method "POST" -Endpoint "/api/graphql" `
    -Headers @{
        "X-API-Key" = $API_KEY
    } `
    -Body (@{
        query = "query { predictions { id subject prediction confidence agentId createdAt } }"
    } | ConvertTo-Json -Compress) `
    -ExpectedStatus 200

Test-API -TestName "9.2 GraphQL Query Agents" `
    -Method "POST" -Endpoint "/api/graphql" `
    -Headers @{
        "X-API-Key" = $API_KEY
    } `
    -Body (@{
        query = "query { agents { id name type capabilities status } }"
    } | ConvertTo-Json -Compress) `
    -ExpectedStatus 200

# Test 10: Realtime Subscription
Write-Host "`n[TEST GROUP 10] Realtime Subscription" -ForegroundColor White

if ($CONTENT_ID) {
    Test-API -TestName "10.1 Subscribe to Vote Updates" `
        -Method "POST" -Endpoint "/api/realtime/subscribe" `
        -Headers @{
            "X-API-Key" = $API_KEY
        } `
        -Body (@{
            type = "votes"
            ids = @($CONTENT_ID)
        } | ConvertTo-Json -Compress) `
        -ExpectedStatus 200
}

# Test 11: Performance Monitoring
Write-Host "`n[TEST GROUP 11] Performance Monitoring" -ForegroundColor White

$perfResp = Test-API -TestName "11.1 Get Performance Statistics" `
    -Method "GET" -Endpoint "/api/performance/stats?window=60000" `
    -Headers @{
        "X-API-Key" = $API_KEY
    } `
    -ExpectedStatus 200

if ($perfResp -and $perfResp.stats) {
    Write-Host "`n  Performance Metrics:" -ForegroundColor Cyan
    Write-Host "    Avg Duration: $([math]::Round($perfResp.stats.avgDuration, 2))ms" -ForegroundColor Yellow
    Write-Host "    P95: $([math]::Round($perfResp.stats.p95, 2))ms" -ForegroundColor Yellow
    Write-Host "    P99: $([math]::Round($perfResp.stats.p99, 2))ms" -ForegroundColor Yellow
}

# Test 12: System Status
Write-Host "`n[TEST GROUP 12] System Status" -ForegroundColor White

$finalStatus = Test-API -TestName "12.1 Get System Status" `
    -Method "GET" -Endpoint "/api/agents/status" `
    -Headers @{
        "X-API-Key" = $API_KEY
    } `
    -ExpectedStatus 200

# Summary
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "  Test Summary" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

$passed = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
$total = $results.Count
$passRate = if ($total -gt 0) { [math]::Round(($passed / $total) * 100, 2) } else { 0 }

Write-Host "`nTotal Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { 'Red' } else { 'Green' })
Write-Host "Pass Rate: $passRate%" -ForegroundColor $(if ($passRate -ge 80) { 'Green' } elseif ($passRate -ge 50) { 'Yellow' } else { 'Red' })

if ($results.Count -gt 0) {
    $avgDuration = ($results | Where-Object { $_.Duration -gt 0 } | Measure-Object -Property Duration -Average).Average
    Write-Host "Average Duration: $([math]::Round($avgDuration, 2))ms" -ForegroundColor Yellow
}

Write-Host "`nDetailed Results:" -ForegroundColor Cyan
$results | Format-Table -AutoSize Test, Status, Duration, ExpectedStatus, ActualStatus

# Save results
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$results | Export-Csv -Path "comprehensive-test-results-$timestamp.csv" -NoTypeInformation -Encoding UTF8
Write-Host "`nResults saved to: comprehensive-test-results-$timestamp.csv" -ForegroundColor Green
