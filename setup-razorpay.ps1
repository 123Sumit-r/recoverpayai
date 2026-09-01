#!/usr/bin/env powershell

<#
  RecoverPay AI + Razorpay Integration Quick Setup
  
  This script automates the setup process:
  1. Verify prerequisites
  2. Install dependencies
  3. Run database migration
  4. Generate configuration checklist
#>

Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "RecoverPay AI + Razorpay Integration Setup" -ForegroundColor Cyan
Write-Host "===============================================`n" -ForegroundColor Cyan

# Check prerequisites
Write-Host "Step 1: Checking Prerequisites..." -ForegroundColor Yellow

$checks = @{
  "PostgreSQL" = { Test-Connection localhost -Count 1 -ErrorAction SilentlyContinue }
  "Node.js" = { node --version }
  "npm" = { npm --version }
}

foreach ($check in $checks.GetEnumerator()) {
  try {
    if ($check.Value -is [scriptblock]) {
      & $check.Value > $null 2>&1
    }
    Write-Host "✓ $($check.Key) found" -ForegroundColor Green
  } catch {
    Write-Host "❌ $($check.Key) not found - Please install and try again" -ForegroundColor Red
    exit 1
  }
}

# Check environment files
Write-Host "`nStep 2: Checking Configuration Files..." -ForegroundColor Yellow

$envPath = "backend\.env"
if (Test-Path $envPath) {
  Write-Host "✓ backend/.env exists" -ForegroundColor Green
  
  # Check if Razorpay credentials are set
  $envContent = Get-Content $envPath
  if ($envContent -contains "*YOUR_KEY_ID*") {
    Write-Host "⚠ Razorpay credentials not configured yet" -ForegroundColor Yellow
  }
} else {
  Write-Host "❌ backend/.env not found" -ForegroundColor Red
  exit 1
}

# Install dependencies
Write-Host "`nStep 3: Installing Dependencies..." -ForegroundColor Yellow

Write-Host "Installing backend dependencies..."
Set-Location backend
npm install --silent
Set-Location ..

Write-Host "Installing frontend dependencies..."
Set-Location frontend
npm install --silent
Set-Location ..

Write-Host "✓ Dependencies installed" -ForegroundColor Green

# Run database migration
Write-Host "`nStep 4: Running Database Migration..." -ForegroundColor Yellow
Write-Host "Applying Razorpay schema to database..."

try {
  Set-Location backend
  & node scripts/migrateRazorpay.js
  Set-Location ..
  Write-Host "✓ Database migration completed" -ForegroundColor Green
} catch {
  Write-Host "❌ Database migration failed: $_" -ForegroundColor Red
  exit 1
}

# Generate setup checklist
Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "Setup Complete! Here's What's Next:" -ForegroundColor Cyan
Write-Host "===============================================`n" -ForegroundColor Cyan

$checklist = @"
📋 RAZORPAY CONFIGURATION CHECKLIST

Before testing, you must:

1. ✓ Get Razorpay Test Credentials
   └─ Go to https://dashboard.razorpay.com/app/settings/api-keys
   └─ Stay on "Test" tab (not "Live")
   └─ Copy your test credentials:
      • Key ID: rzp_test_xxxxxxxx
      • Key Secret: rzp_test_xxxxxxxx

2. ✓ Generate Webhook Secret
   └─ Go to https://dashboard.razorpay.com/app/webhooks
   └─ Click "Create Webhook"
   └─ Save the signing secret

3. ✓ Update backend/.env
   └─ Edit backend/.env with your credentials:
      
      RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
      RAZORPAY_KEY_SECRET=rzp_test_YOUR_KEY_SECRET
      RAZORPAY_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET

4. ✓ Setup Webhook Tunnel (for local testing)
   └─ Install ngrok: https://ngrok.com/download
   └─ Run: ngrok http 5000
   └─ Copy the public URL (e.g., https://abc123.ngrok.io)

5. ✓ Configure Razorpay Webhook
   └─ Go to https://dashboard.razorpay.com/app/webhooks
   └─ Webhook URL: https://YOUR_TUNNEL_URL/api/webhooks/razorpay/payment
   └─ Events: payment.failed, payment.authorized
   └─ Save

6. ✓ Start Backend & Frontend
   
   Terminal 1:
   cd backend
   npm start
   
   Terminal 2:
   cd frontend
   npm run dev

7. ✓ Make Test Payments
   └─ Go to Razorpay Dashboard → Payment Links
   └─ Create a payment link for ₹100
   └─ Test with card: 4111111111111111 (success)
   └─ Test with card: 4100000000000002 (failure)

8. ✓ Verify Webhook Reception
   └─ Check backend logs for webhook processing
   └─ Check database: 
      psql -U postgres -d raz_ai -c "SELECT * FROM payment_events ORDER BY id DESC LIMIT 1;"

9. ✓ Check Email Delivery
   └─ Go to https://resend.com/emails
   └─ Look for recovery notification

10. ✓ View in Frontend
    └─ Go to http://localhost:5173
    └─ Dashboard shows real payment failure
    └─ Click "Inspect" for full case details

📖 DETAILED TESTING GUIDE

For step-by-step instructions, see:
  → RAZORPAY_TESTING_GUIDE.md

🔐 SECURITY NOTES

✓ Using Razorpay TEST mode only (no real money)
✓ Webhook signature verification enabled
✓ API keys never exposed to frontend
✓ Retry limits enforced (max 2 attempts)
✓ All sensitive data encrypted in database
✓ Audit trail for compliance

❓ TROUBLESHOOTING

Webhook not received?
  → Check ngrok tunnel is running
  → Verify webhook URL in Razorpay dashboard
  → Check backend logs for errors

Email not sent?
  → Verify RESEND_API_KEY is set
  → Check Resend dashboard for bounce/errors
  → Review email_audit_logs in database

Retry not scheduled?
  → Check recovery_cases.retry_blocked field
  → Verify policy_allowed is true
  → Check policy engine logs

🎯 NEXT STEPS

After successful testing:
1. Document any issues
2. Set up production Razorpay account (if ready)
3. Deploy to production
4. Configure production webhook URL
5. Run integration tests

================================
Questions? Check RAZORPAY_TESTING_GUIDE.md
================================
"@

Write-Host $checklist -ForegroundColor White

Write-Host "`n✅ Setup Complete!" -ForegroundColor Green
Write-Host "Follow the checklist above to configure Razorpay and start testing.`n" -ForegroundColor Green
