#!/usr/bin/env powershell

# RecoverPay AI + Razorpay Integration - Automated Verification

Write-Host "`n=== RecoverPay AI Deployment Verification ===" -ForegroundColor Cyan
Write-Host ""

$pass = 0
$fail = 0

# Database checks
Write-Host "Database Checks:" -ForegroundColor Yellow

try {
  $test = psql -U postgres -d raz_ai -c "SELECT 1" 2>&1
  if ($test -match "1") {
    Write-Host "  [OK] PostgreSQL" -ForegroundColor Green
    $pass++
  }
} catch {
  Write-Host "  [FAIL] PostgreSQL" -ForegroundColor Red
  $fail++
}

try {
  $test = psql -U postgres -d raz_ai -c "SELECT 1 FROM payment_events LIMIT 1" 2>&1
  if ($? -eq $true) {
    Write-Host "  [OK] payment_events table" -ForegroundColor Green
    $pass++
  }
} catch {
  Write-Host "  [FAIL] payment_events table" -ForegroundColor Red
  $fail++
}

try {
  $test = psql -U postgres -d raz_ai -c "SELECT 1 FROM retry_attempts LIMIT 1" 2>&1
  if ($? -eq $true) {
    Write-Host "  [OK] retry_attempts table" -ForegroundColor Green
    $pass++
  }
} catch {
  Write-Host "  [FAIL] retry_attempts table" -ForegroundColor Red
  $fail++
}

# Backend checks
Write-Host "`nBackend Files:" -ForegroundColor Yellow

$backend = "c:\raz\backend"
$files = @(
  "services\razorpayService.js",
  "models\paymentEventModel.js",
  "models\retryAttemptModel.js",
  "services\retrySchedulingService.js",
  "services\emailTemplatesService.js",
  "controllers\razorpayWebhookController.js",
  "scripts\migrateRazorpay.js",
  ".env"
)

foreach ($f in $files) {
  if (Test-Path "$backend\$f") {
    Write-Host "  [OK] $f" -ForegroundColor Green
    $pass++
  } else {
    Write-Host "  [FAIL] $f" -ForegroundColor Red
    $fail++
  }
}

if (Test-Path "$backend\node_modules") {
  Write-Host "  [OK] node_modules" -ForegroundColor Green
  $pass++
} else {
  Write-Host "  [FAIL] node_modules" -ForegroundColor Red
  $fail++
}

# Frontend checks
Write-Host "`nFrontend Files:" -ForegroundColor Yellow

$frontend = "c:\raz\frontend"
$ffiles = @(
  "src\api\realPaymentEvents.js",
  "src\App.jsx",
  "package.json"
)

foreach ($f in $ffiles) {
  if (Test-Path "$frontend\$f") {
    Write-Host "  [OK] $f" -ForegroundColor Green
    $pass++
  } else {
    Write-Host "  [FAIL] $f" -ForegroundColor Red
    $fail++
  }
}

if (Test-Path "$frontend\node_modules") {
  Write-Host "  [OK] node_modules" -ForegroundColor Green
  $pass++
} else {
  Write-Host "  [FAIL] node_modules" -ForegroundColor Red
  $fail++
}

# Documentation checks
Write-Host "`nDocumentation:" -ForegroundColor Yellow

$docs = @(
  "README.md",
  "QUICK_START.md",
  "IMPLEMENTATION_SUMMARY.md",
  "RAZORPAY_TESTING_GUIDE.md"
)

foreach ($d in $docs) {
  if (Test-Path "c:\raz\$d") {
    Write-Host "  [OK] $d" -ForegroundColor Green
    $pass++
  } else {
    Write-Host "  [WARN] $d" -ForegroundColor Yellow
  }
}

# Results
Write-Host "`n=== Results ===" -ForegroundColor Cyan
Write-Host "Passed: $pass" -ForegroundColor Green
Write-Host "Failed: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })

if ($fail -eq 0) {
  Write-Host "`nSTATUS: READY FOR GITHUB!" -ForegroundColor Green
  Write-Host "`nNext steps:" -ForegroundColor Green
  Write-Host "  1. git init"
  Write-Host "  2. git add ."
  Write-Host "  3. git commit -m 'Initial: RecoverAI with Razorpay'"
  Write-Host "  4. git remote add origin YOUR_GITHUB_URL"
  Write-Host "  5. git push -u origin main"
} else {
  Write-Host "`nSTATUS: NOT READY" -ForegroundColor Red
  Write-Host "Fix the failures above before deploying" -ForegroundColor Red
}

Write-Host ""
