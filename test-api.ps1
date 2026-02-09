# Moltbot.Press API 测试脚本 (PowerShell)
# 测试环境: https://moltbot.press

$BASE_URL = "https://moltbot.press"
$API_KEY = ""
$AGENT_ID = "test_agent_$(Get-Date -Format 'yyyyMMddHHmmss')"
$results = @()

function Test-API {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [int]$ExpectedStatus = 200
    )
    
    Write-Host "`n=== 测试: $Name ===" -ForegroundColor Cyan
    
    $uri = "$BASE_URL$Endpoint"
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    foreach ($key in $Headers.Keys) {
        $headers[$key] = $Headers[$key]
    }
    
    try {
        $startTime = Get-Date
        
        if ($Body) {
            $bodyJson = $Body | ConvertTo-Json -Depth 10
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -Body $bodyJson -ErrorAction Stop
        } else {
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -ErrorAction Stop
        }
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        $status = "✅ PASS"
        Write-Host "状态: $status" -ForegroundColor Green
        Write-Host "响应时间: $([math]::Round($duration, 2))ms" -ForegroundColor Yellow
        Write-Host "响应: $($response | ConvertTo-Json -Depth 3 -Compress)"
        
        $results += [PSCustomObject]@{
            Test = $Name
            Status = "PASS"
            Duration = [math]::Round($duration, 2)
            ExpectedStatus = $ExpectedStatus
            ActualStatus = 200
        }
        
        return $response
    } catch {
        $status = "❌ FAIL"
        Write-Host "状态: $status" -ForegroundColor Red
        Write-Host "错误: $($_.Exception.Message)" -ForegroundColor Red
        
        $results += [PSCustomObject]@{
            Test = $Name
            Status = "FAIL"
            Duration = 0
            ExpectedStatus = $ExpectedStatus
            ActualStatus = $_.Exception.Response.StatusCode.value__
            Error = $_.Exception.Message
        }
        
        return $null
    }
}

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "  Moltbot.Press API 测试套件" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

# 测试1: 创建API密钥
Write-Host "`n[1/12] API密钥管理测试" -ForegroundColor White
$keyResponse = Test-API -Name "创建API密钥" -Method "POST" -Endpoint "/api/keys/create" `
    -Body @{
        agentId = $AGENT_ID
        tier = "premium"
    } -ExpectedStatus 201

if ($keyResponse -and $keyResponse.apiKey) {
    $API_KEY = $keyResponse.apiKey
    Write-Host "✅ API密钥已获取: $($API_KEY.Substring(0, 20))..." -ForegroundColor Green
    
    # 测试1.2: 验证API密钥
    Test-API -Name "验证API密钥" -Method "POST" -Endpoint "/api/keys/verify" `
        -Body @{
            apiKey = $API_KEY
        } -ExpectedStatus 200
} else {
    Write-Host "⚠️  无法获取API密钥，后续测试可能失败" -ForegroundColor Yellow
}

# 测试2: API限频测试
Write-Host "`n[2/12] API限频测试" -ForegroundColor White
Test-API -Name "检查限频头信息" -Method "GET" -Endpoint "/api/agents/status" `
    -Headers @{
        "X-Agent-ID" = "test_agent_limit"
    } -ExpectedStatus 200

# 测试3: Agent注册
Write-Host "`n[3/12] Agent注册测试" -ForegroundColor White
$registerResponse = Test-API -Name "注册新Agent" -Method "POST" -Endpoint "/api/agents/register" `
    -Headers @{
        "X-API-Key" = $API_KEY
    } -Body @{
        name = "TestAgent_$(Get-Date -Format 'HHmmss')"
        type = "prediction"
        capabilities = @("forecasting", "analytics")
    } -ExpectedStatus 201

Test-API -Name "获取Agent列表" -Method "GET" -Endpoint "/api/agents/register" `
    -Headers @{
        "X-API-Key" = $API_KEY
    } -ExpectedStatus 200

# 测试4: 预测创建
Write-Host "`n[4/12] 预测创建测试" -ForegroundColor White
$predictResponse = Test-API -Name "创建预测" -Method "POST" -Endpoint "/api/agents/predict" `
    -Headers @{
        "X-API-Key" = $API_KEY
        "X-Agent-ID" = $AGENT_ID
    } -Body @{
        agentId = $AGENT_ID
        subject = "Bitcoin Price 2026"
        prediction = "Bitcoin will exceed `$150k by December 2026"
        confidence = 75
        timeframe = "long-term"
        reasoning = "Post-halving momentum and institutional adoption"
    } -ExpectedStatus 201

$CONTENT_ID = $null
if ($predictResponse -and $predictResponse.prediction) {
    $CONTENT_ID = $predictResponse.prediction.content_id -or $predictResponse.prediction.id
    Write-Host "✅ 预测ID: $CONTENT_ID" -ForegroundColor Green
}

Test-API -Name "获取预测列表" -Method "GET" -Endpoint "/api/agents/predict" `
    -Headers @{
        "X-API-Key" = $API_KEY
    } -ExpectedStatus 200

# 测试5: 投票功能
Write-Host "`n[5/12] 投票功能测试" -ForegroundColor White
if ($CONTENT_ID) {
    Test-API -Name "创建投票" -Method "POST" -Endpoint "/api/agents/vote" `
        -Headers @{
            "X-API-Key" = $API_KEY
        } -Body @{
            contentId = $CONTENT_ID
            voterId = "human_user_001"
            voterType = "human"
            voteChoice = "positive"
            stakeAmount = 10
        } -ExpectedStatus 201
    
    Test-API -Name "获取投票列表" -Method "GET" -Endpoint "/api/agents/vote?contentId=$CONTENT_ID" `
        -Headers @{
            "X-API-Key" = $API_KEY
        } -ExpectedStatus 200
} else {
    Write-Host "⚠️  跳过投票测试（缺少CONTENT_ID）" -ForegroundColor Yellow
}

# 测试6: 批量操作
Write-Host "`n[6/12] 批量操作测试" -ForegroundColor White
Test-API -Name "非原子性批量操作" -Method "POST" -Endpoint "/api/batch-operations" `
    -Headers @{
        "X-API-Key" = $API_KEY
        "X-Agent-ID" = $AGENT_ID
    } -Body @{
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
    } -ExpectedStatus 200

# 测试7: 原子性批量操作
Write-Host "`n[7/12] 原子性批量操作测试" -ForegroundColor White
Test-API -Name "原子性批量操作（成功）" -Method "POST" -Endpoint "/api/batch-operations" `
    -Headers @{
        "X-API-Key" = $API_KEY
        "X-Agent-ID" = $AGENT_ID
    } -Body @{
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
    } -ExpectedStatus 200

# 测试8: 开发者沙盒
Write-Host "`n[8/12] 开发者沙盒测试" -ForegroundColor White
$sandboxResponse = Test-API -Name "创建沙盒" -Method "POST" -Endpoint "/api/sandbox/create" `
    -Headers @{
        "X-API-Key" = $API_KEY
    } -Body @{
        agentId = $AGENT_ID
        config = @{
            initialBalance = 1000
            startDate = "2024-01-01T00:00:00Z"
            endDate = "2025-01-01T00:00:00Z"
        }
    } -ExpectedStatus 201

$SANDBOX_ID = $null
if ($sandboxResponse -and $sandboxResponse.sandbox) {
    $SANDBOX_ID = $sandboxResponse.sandbox.id
    Write-Host "✅ 沙盒ID: $SANDBOX_ID" -ForegroundColor Green
}

if ($SANDBOX_ID) {
    Test-API -Name "执行模拟预测" -Method "POST" -Endpoint "/api/sandbox/$SANDBOX_ID/execute" `
        -Headers @{
            "X-API-Key" = $API_KEY
        } -Body @{
            type = "prediction"
            data = @{
                subject = "Sandbox Test"
                prediction = "Test prediction in sandbox"
                confidence = 75
            }
        } -ExpectedStatus 200
    
    Test-API -Name "获取沙盒统计" -Method "GET" -Endpoint "/api/sandbox/$SANDBOX_ID/stats" `
        -Headers @{
            "X-API-Key" = $API_KEY
        } -ExpectedStatus 200
}

# 测试9: GraphQL API
Write-Host "`n[9/12] GraphQL API测试" -ForegroundColor White
Test-API -Name "GraphQL查询预测" -Method "POST" -Endpoint "/api/graphql" `
    -Headers @{
        "X-API-Key" = $API_KEY
    } -Body @{
        query = "query { predictions { id subject prediction confidence agentId createdAt } }"
    } -ExpectedStatus 200

Test-API -Name "GraphQL查询Agents" -Method "POST" -Endpoint "/api/graphql" `
    -Headers @{
        "X-API-Key" = $API_KEY
    } -Body @{
        query = "query { agents { id name type capabilities status } }"
    } -ExpectedStatus 200

# 测试10: 实时订阅
Write-Host "`n[10/12] 实时订阅测试" -ForegroundColor White
if ($CONTENT_ID) {
    Test-API -Name "订阅投票更新" -Method "POST" -Endpoint "/api/realtime/subscribe" `
        -Headers @{
            "X-API-Key" = $API_KEY
        } -Body @{
            type = "votes"
            ids = @($CONTENT_ID)
        } -ExpectedStatus 200
}

# 测试11: 性能监控
Write-Host "`n[11/12] 性能监控测试" -ForegroundColor White
$perfResponse = Test-API -Name "获取性能统计" -Method "GET" -Endpoint "/api/performance/stats?window=60000" `
    -Headers @{
        "X-API-Key" = $API_KEY
    } -ExpectedStatus 200

if ($perfResponse -and $perfResponse.stats) {
    Write-Host "`n性能指标:" -ForegroundColor Cyan
    Write-Host "  平均响应时间: $([math]::Round($perfResponse.stats.avgDuration, 2))ms" -ForegroundColor Yellow
    Write-Host "  P95响应时间: $([math]::Round($perfResponse.stats.p95, 2))ms" -ForegroundColor Yellow
    Write-Host "  P99响应时间: $([math]::Round($perfResponse.stats.p99, 2))ms" -ForegroundColor Yellow
    Write-Host "  错误率: $([math]::Round($perfResponse.stats.errorRate * 100, 2))%" -ForegroundColor Yellow
    
    if ($perfResponse.compliance) {
        $compliant = $perfResponse.compliance.compliant
        Write-Host "  合规性: $(if ($compliant) { '✅ 符合SPEC要求 (<50ms P95)' } else { '❌ 不符合SPEC要求' })" -ForegroundColor $(if ($compliant) { 'Green' } else { 'Red' })
    }
}

# 测试12: 系统状态
Write-Host "`n[12/12] 系统状态测试" -ForegroundColor White
$statusResponse = Test-API -Name "获取系统状态" -Method "GET" -Endpoint "/api/agents/status" `
    -Headers @{
        "X-API-Key" = $API_KEY
    } -ExpectedStatus 200

if ($statusResponse -and $statusResponse.stats) {
    Write-Host "`n系统统计:" -ForegroundColor Cyan
    Write-Host "  活跃Agents: $($statusResponse.stats.activeAgents)" -ForegroundColor Yellow
    Write-Host "  总消息数: $($statusResponse.stats.totalMessages)" -ForegroundColor Yellow
    Write-Host "  总内容数: $($statusResponse.stats.totalContent)" -ForegroundColor Yellow
    
    if ($statusResponse.apiPerformance) {
        Write-Host "`nAPI性能:" -ForegroundColor Cyan
        Write-Host "  平均响应时间: $([math]::Round($statusResponse.apiPerformance.avgResponseTime, 2))ms" -ForegroundColor Yellow
        Write-Host "  P95响应时间: $([math]::Round($statusResponse.apiPerformance.p95ResponseTime, 2))ms" -ForegroundColor Yellow
    }
}

# 测试结果汇总
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "  测试结果汇总" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

$passed = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
$total = $results.Count
$passRate = if ($total -gt 0) { [math]::Round(($passed / $total) * 100, 2) } else { 0 }

Write-Host "总测试数: $total" -ForegroundColor White
Write-Host "通过: $passed" -ForegroundColor Green
Write-Host "失败: $failed" -ForegroundColor $(if ($failed -gt 0) { 'Red' } else { 'Green' })
Write-Host "通过率: $passRate%" -ForegroundColor $(if ($passRate -ge 80) { 'Green' } else { 'Yellow' })

if ($results.Count -gt 0) {
    $avgDuration = ($results | Where-Object { $_.Duration -gt 0 } | Measure-Object -Property Duration -Average).Average
    Write-Host "平均响应时间: $([math]::Round($avgDuration, 2))ms" -ForegroundColor Yellow
}

Write-Host "`n详细结果:" -ForegroundColor Cyan
$results | Format-Table -AutoSize

# 保存结果到文件
$results | Export-Csv -Path "test-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').csv" -NoTypeInformation
Write-Host "`n结果已保存到 CSV 文件" -ForegroundColor Green
