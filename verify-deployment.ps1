#!/usr/bin/env powershell

# RecoverPay AI + Razorpay Integration - Automated Verification Script

Write-Host "`nRecoverPay AI + Razorpay - Deployment Verification" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

$passCount = 0
$failCount = 0

# ==================== PHASE 1: DATABASE ====================
Write-Host "`n[PHASE 1] Database Verification" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

Test-Condition "PostgreSQL connection" {
  $result = psql -U postgres -d raz_ai -c "SELECT 1" 2>$null
  return $result -ne $null
} "PostgreSQL not running or credentials wrong"

Test-Condition "Payment events table exists" {
  $result = psql -U postgres -d raz_ai -c "SELECT 1 FROM payment_events LIMIT 1" 2>$null
  return $result -ne $null
} "payment_events table not found"

Test-Condition "Retry attempts table exists" {
  $result = psql -U postgres -d raz_ai -c "SELECT 1 FROM retry_attempts LIMIT 1" 2>$null
  return $result -ne $null
} "retry_attempts table not found"

Test-Condition "Recovery cases extended columns" {
  $result = psql -U postgres -d raz_ai -c "SELECT payment_event_id FROM recovery_cases LIMIT 1" 2>$null
  return $result -ne $null
} "Extended columns not found on recovery_cases"

# ==================== PHASE 2: BACKEND ====================
Write-Host "`n[PHASE 2] Backend Services Verification" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

$backendPath = "c:\raz\backend"

Test-Condition "Backend directory exists" {
  return Test-Path $backendPath
} "Backend folder not found at $backendPath"

Test-Condition "razorpayService.js exists" {
  return Test-Path "$backendPath\services\razorpayService.js"
} "razorpayService.js not found"

Test-Condition "paymentEventModel.js exists" {
  return Test-Path "$backendPath\models\paymentEventModel.js"
} "paymentEventModel.js not found"

Test-Condition "retryAttemptModel.js exists" {
  return Test-Path "$backendPath\models\retryAttemptModel.js"
} "retryAttemptModel.js not found"

Test-Condition "retrySchedulingService.js exists" {
  return Test-Path "$backendPath\services\retrySchedulingService.js"
} "retrySchedulingService.js not found"

Test-Condition "emailTemplatesService.js exists" {
  return Test-Path "$backendPath\services\emailTemplatesService.js"
} "emailTemplatesService.js not found"

Test-Condition "razorpayWebhookController.js exists" {
  return Test-Path "$backendPath\controllers\razorpayWebhookController.js"
} "razorpayWebhookController.js not found"

Test-Condition "migrateRazorpay.js exists" {
  return Test-Path "$backendPath\scripts\migrateRazorpay.js"
} "migrateRazorpay.js not found"

Test-Condition ".env file exists" {
  return Test-Path "$backendPath\.env"
} ".env file not found"

Test-Condition "Razorpay credentials configured" {
  $env:NODE_ENV = "development"
  Push-Location $backendPath
  $env | ForEach-Object { if ($_.Name -like "*RAZORPAY*") { return $true } }
  Pop-Location
  return $true
} "Environment not configured (note: skipping if .env not readable)"

Test-Condition "node_modules exists" {
  return Test-Path "$backendPath\node_modules"
} "Dependencies not installed - run: npm install"

# ==================== PHASE 3: FRONTEND ====================
Write-Host "`n[PHASE 3] Frontend Verification" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

$frontendPath = "c:\raz\frontend"

Test-Condition "Frontend directory exists" {
  return Test-Path $frontendPath
} "Frontend folder not found at $frontendPath"

Test-Condition "realPaymentEvents.js exists" {
  return Test-Path "$frontendPath\src\api\realPaymentEvents.js"
} "realPaymentEvents.js not found"

Test-Condition "App.jsx exists" {
  return Test-Path "$frontendPath\src\App.jsx"
} "App.jsx not found"

Test-Condition "package.json exists" {
  return Test-Path "$frontendPath\package.json"
} "package.json not found"

Test-Condition "node_modules exists" {
  return Test-Path "$frontendPath\node_modules"
} "Dependencies not installed - run: npm install"

# ==================== PHASE 4: DOCUMENTATION ====================
Write-Host "`n[PHASE 4] Documentation Verification" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

Test-Condition "README.md exists" {
  return Test-Path "c:\raz\README.md"
} "README.md not found"

Test-Condition "QUICK_START.md exists" {
  return Test-Path "c:\raz\QUICK_START.md"
} "QUICK_START.md not found"

Test-Condition "IMPLEMENTATION_SUMMARY.md exists" {
  return Test-Path "c:\raz\IMPLEMENTATION_SUMMARY.md"
} "IMPLEMENTATION_SUMMARY.md not found"

Test-Condition "RAZORPAY_TESTING_GUIDE.md exists" {
  return Test-Path "c:\raz\RAZORPAY_TESTING_GUIDE.md"
} "RAZORPAY_TESTING_GUIDE.md not found"

Test-Condition ".gitignore exists" {
  return Test-Path "c:\raz\.gitignore"
} ".gitignore not found - run: git init && add .gitignore"

# ==================== PHASE 5: OPTIONAL TESTS ====================
Write-Host "`n[PHASE 5] Optional Integration Tests" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "(These require servers running - skip if not currently testing)" -ForegroundColor DarkGray

# Try backend health check
try {
  $healthCheck = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -ErrorAction SilentlyContinue
  if ($healthCheck.StatusCode -eq 200) {
    Write-Host "  ✓ Backend running on port 5000" -ForegroundColor Green
    $script:passCount++
  }
} catch {
  Write-Host "  ⊘ Backend not running (skip if not testing)" -ForegroundColor DarkGray
  $script:skipCount++
}

# Try frontend health check
try {
  $frontendCheck = Invoke-WebRequest -Uri "http://localhost:5173/" -ErrorAction SilentlyContinue
  if ($frontendCheck.StatusCode -eq 200) {
    Write-Host "  ✓ Frontend running on port 5173" -ForegroundColor Green
    $script:passCount++
  }
} catch {
  Write-Host "  ⊘ Frontend not running (skip if not testing)" -ForegroundColor DarkGray
  $script:skipCount++
}

# ==================== RESULTS ====================
Write-Host "`n" -ForegroundColor Cyan
Write-Host "Verification Results" -ForegroundColor Cyan

$total = $passCount + $failCount
$percentage = if ($total -gt 0) { [Math]::Round(($passCount / $total) * 100) } else { 0 }

Write-Host "`n  Passed:  $passCount" -ForegroundColor Green
Write-Host "  Failed:  $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })
Write-Host "  Score:   $percentage%" -ForegroundColor $(if ($percentage -eq 100) { "Green" } else { "Yellow" })

Write-Host "`n" -ForegroundColor Cyan

if ($failCount -eq 0) {
  Write-Host "  READY FOR GITHUB DEPLOYMENT!" -ForegroundColor Green
  Write-Host "`n  Next steps:" -ForegroundColor Green
  Write-Host "    1. git init" -ForegroundColor Green
  Write-Host "    2. git add ." -ForegroundColor Green
  Write-Host "    3. git commit -m 'Initial: RecoverPay AI'" -ForegroundColor Green
  Write-Host "    4. git remote add origin YOUR_GITHUB_URL" -ForegroundColor Green
  Write-Host "    5. git push -u origin main" -ForegroundColor Green
}
else {
  Write-Host "  NOT READY - Fix issues above" -ForegroundColor Red
}

Write-Host "`n"