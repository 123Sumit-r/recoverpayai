# 🚀 Pre-GitHub Deployment Checklist

Complete this checklist to verify everything is working before deploying to GitHub.

**Estimated Time**: 30-45 minutes

---

## ✅ Phase 1: Database Verification (5 minutes)

### 1.1 PostgreSQL Connection
```bash
psql -U postgres -d raz_ai -c "SELECT version();"
```
**Expected**: PostgreSQL version info displayed
**Status**: ✓ Pass / ✗ Fail

### 1.2 Check All Tables Exist
```bash
psql -U postgres -d raz_ai -c "\dt"
```
**Expected**: Should show these tables:
- customers
- transactions
- invoices
- checkout_events
- recovery_cases
- audit_logs
- processed_webhook_events
- email_audit_logs
- **payment_events** ← NEW
- **retry_attempts** ← NEW

**Status**: ✓ Pass / ✗ Fail

### 1.3 Verify Razorpay Tables
```bash
psql -U postgres -d raz_ai -c "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('payment_events', 'retry_attempts');"
```
**Expected**: 2 rows returned (payment_events, retry_attempts)
**Status**: ✓ Pass / ✗ Fail

### 1.4 Check Recovery Cases Extended Columns
```bash
psql -U postgres -d raz_ai -c "
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'recovery_cases' 
AND column_name IN ('payment_event_id', 'razorpay_payment_id', 'razorpay_order_id', 'next_retry_at', 'retry_blocked');"
```
**Expected**: 5 rows (all Razorpay columns exist)
**Status**: ✓ Pass / ✗ Fail

### 1.5 Count Records in Each Table
```bash
psql -U postgres -d raz_ai -c "
SELECT 
  (SELECT COUNT(*) FROM customers) as customers,
  (SELECT COUNT(*) FROM recovery_cases) as recovery_cases,
  (SELECT COUNT(*) FROM payment_events) as payment_events,
  (SELECT COUNT(*) FROM retry_attempts) as retry_attempts;"
```
**Expected**: 
- customers: > 0 (should have real customers, no fakes)
- recovery_cases: ≥ 0
- payment_events: 0 (until you test with Razorpay)
- retry_attempts: 0 (until you test with Razorpay)

**Status**: ✓ Pass / ✗ Fail

---

## ✅ Phase 2: Backend Services Verification (10 minutes)

### 2.1 Check Environment Configuration
```bash
cd c:\raz\backend
node -e "
require('dotenv').config();
console.log('=== Backend Configuration Check ===');
console.log('✓ NODE_ENV:', process.env.NODE_ENV);
console.log('✓ DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('✓ RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? 'SET (' + process.env.RAZORPAY_KEY_ID.substring(0, 20) + '...)' : 'NOT SET');
console.log('✓ RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'SET' : 'NOT SET');
console.log('✓ RAZORPAY_WEBHOOK_SECRET:', process.env.RAZORPAY_WEBHOOK_SECRET ? 'SET' : 'NOT SET');
console.log('✓ MAX_RETRY_ATTEMPTS:', process.env.MAX_RETRY_ATTEMPTS);
console.log('✓ RETRY_DELAY_MINUTES:', process.env.RETRY_DELAY_MINUTES);
console.log('✓ RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'SET' : 'NOT SET');
console.log('✓ AI_API_KEY:', process.env.AI_API_KEY ? 'SET' : 'NOT SET');
"
```
**Expected**: All configuration values SET
**Status**: ✓ Pass / ✗ Fail

### 2.2 Check All Backend Files Exist
```bash
cd c:\raz\backend
$files = @(
  'services/razorpayService.js',
  'services/retrySchedulingService.js',
  'services/emailTemplatesService.js',
  'models/paymentEventModel.js',
  'models/retryAttemptModel.js',
  'controllers/razorpayWebhookController.js',
  'routes/webhookRoutes.js',
  'scripts/migrateRazorpay.js'
)

foreach ($file in $files) {
  $exists = Test-Path $file
  $status = if ($exists) { '✓' } else { '✗' }
  Write-Host "$status $file"
}
```
**Expected**: All files exist (✓)
**Status**: ✓ Pass / ✗ Fail

### 2.3 Check Package Dependencies
```bash
cd c:\raz\backend
npm ls --depth=0 | findstr "express pg dotenv groq resend"
```
**Expected**: All packages installed
**Status**: ✓ Pass / ✗ Fail

### 2.4 Test Backend Starts
```bash
cd c:\raz\backend
npm start
```
**Expected**: 
```
Server running on port 5000
Database connection: connected
```
**Note**: Keep running for next tests. Do NOT close terminal.
**Status**: ✓ Pass / ✗ Fail

### 2.5 Test Backend Health Endpoint (new terminal)
```bash
curl -X GET http://localhost:5000/api/health
```
**Expected**:
```json
{"status":"ok","database":"connected"}
```
**Status**: ✓ Pass / ✗ Fail

### 2.6 Test Webhook Endpoint Exists
```bash
curl -X OPTIONS http://localhost:5000/api/webhooks/razorpay/payment
```
**Expected**: HTTP 200 (or 204)
**Status**: ✓ Pass / ✗ Fail

### 2.7 Test Recovery Routes
```bash
curl -X GET http://localhost:5000/api/recovery
```
**Expected**: HTTP 200 with JSON array
**Status**: ✓ Pass / ✗ Fail

---

## ✅ Phase 3: Frontend Verification (5 minutes)

### 3.1 Check Frontend Files Exist
```bash
cd c:\raz\frontend
$files = @(
  'src/api/realPaymentEvents.js',
  'src/App.jsx',
  'src/main.jsx',
  'package.json',
  'vite.config.js'
)

foreach ($file in $files) {
  $exists = Test-Path $file
  $status = if ($exists) { '✓' } else { '✗' }
  Write-Host "$status $file"
}
```
**Expected**: All files exist (✓)
**Status**: ✓ Pass / ✗ Fail

### 3.2 Check Frontend Dependencies
```bash
cd c:\raz\frontend
npm ls --depth=0 | findstr "react vite tailwind"
```
**Expected**: All packages installed
**Status**: ✓ Pass / ✗ Fail

### 3.3 Test Frontend Starts
```bash
cd c:\raz\frontend
npm run dev
```
**Expected**:
```
VITE v4.x.x ready in x ms
➜  Local: http://localhost:5173/
➜  press h to show help
```
**Note**: Keep running for next tests. Do NOT close terminal.
**Status**: ✓ Pass / ✗ Fail

### 3.4 Test Frontend Loads (new terminal)
```bash
curl -s http://localhost:5173/ | findstr -i "html"
```
**Expected**: HTML content returned
**Status**: ✓ Pass / ✗ Fail

### 3.5 Test Frontend API Integration
```bash
curl -X GET http://localhost:5173/api/realPaymentEvents.js
```
**Expected**: 404 (this is API, not served from frontend directly)
**Status**: ✓ Pass / ✗ Fail

---

## ✅ Phase 4: Razorpay Integration Verification (15 minutes)

### 4.1 Generate Test Razorpay Credentials

If you don't have credentials yet:

1. Go to https://razorpay.com
2. Sign up or login
3. Go to https://dashboard.razorpay.com/app/settings/api-keys
4. **Make sure TEST tab is selected** (red tab on left)
5. Copy:
   - **Key ID** (starts with `rzp_test_`)
   - **Key Secret** (starts with `rzp_test_`)

**Status**: ✓ Obtained / ✗ Not Obtained

### 4.2 Create Razorpay Webhook

1. Go to https://dashboard.razorpay.com/app/webhooks
2. Click "Create Webhook"
3. Note the **Signing Secret**
4. Save all 3 values:
   - RAZORPAY_KEY_ID
   - RAZORPAY_KEY_SECRET
   - RAZORPAY_WEBHOOK_SECRET

**Status**: ✓ Created / ✗ Not Created

### 4.3 Update .env with Credentials
```bash
# Edit backend/.env
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=rzp_test_YOUR_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET=YOUR_SIGNING_SECRET
```
**Status**: ✓ Updated / ✗ Not Updated

### 4.4 Setup ngrok Tunnel
```bash
# Download from https://ngrok.com/download if not installed
ngrok http 5000
```
**Expected**: Forwarding line like:
```
Forwarding https://abc123.ngrok.io -> http://localhost:5000
```
**Copy**: `https://abc123.ngrok.io`
**Status**: ✓ Running / ✗ Not Running

### 4.5 Configure Razorpay Webhook URL

1. Go to https://dashboard.razorpay.com/app/webhooks
2. Edit your webhook
3. Set **Webhook URL**: `https://YOUR_NGROK_URL/api/webhooks/razorpay/payment`
4. Set **Events**: `payment.failed` and `payment.authorized`
5. Save

**Status**: ✓ Configured / ✗ Not Configured

### 4.6 Test Webhook Connection
```bash
# In Razorpay Dashboard, click "Test webhook" button
# Or use curl:
curl -X POST http://localhost:5000/api/webhooks/razorpay/payment \
  -H "X-Razorpay-Signature: test" \
  -H "Content-Type: application/json" \
  -d '{"event":"payment.failed"}'
```
**Expected**: Response received (may show "invalid signature" but proves endpoint works)
**Status**: ✓ Responding / ✗ Not Responding

### 4.7 Make Test Payment

1. Go to Razorpay Dashboard → Payment Links
2. Click "Create Payment Link"
3. Amount: ₹500 (test amount)
4. Click link and complete payment flow

**Test Case 1: Success (no recovery)**
- Card: `4111111111111111`
- Expiry: `12/25`
- CVV: `123`
- OTP: `123456`
- **Expected**: Payment succeeds, no recovery case created

**Test Case 2: Failure (auto-retry)**
- Card: `4100000000000002`
- Expiry: `12/25`  
- CVV: `123`
- **Expected**: Payment fails, recovery case created

**Status**: ✓ Test Payments Made / ✗ No Payments Made

### 4.8 Verify Webhook Reception

Check backend terminal logs for:
```
✓ Payment failure webhook processed successfully:
  - Event: evt_xyz
  - Payment: pay_abc
  - Amount: ₹500
  - Failure: temporary_failure
  - Case ID: X
  - Retry Scheduled: true
  - Email Sent: true
```

**Status**: ✓ Webhook Received / ✗ Not Received

### 4.9 Verify Database Recording
```bash
psql -U postgres -d raz_ai -c "
SELECT 
  id, razorpay_event_id, failure_reason, 
  webhook_signature_verified, processed
FROM payment_events 
ORDER BY id DESC LIMIT 1;"
```
**Expected**: Your test payment event displayed
**Status**: ✓ Recorded / ✗ Not Recorded

### 4.10 Verify Recovery Case Created
```bash
psql -U postgres -d raz_ai -c "
SELECT 
  id, customer_id, failure_reason, 
  next_retry_at, retry_blocked
FROM recovery_cases 
ORDER BY id DESC LIMIT 1;"
```
**Expected**: Recovery case with your test payment
**Status**: ✓ Created / ✗ Not Created

### 4.11 Verify Email Sent
```bash
psql -U postgres -d raz_ai -c "
SELECT id, recovery_case_id, email, sent_at 
FROM email_audit_logs 
ORDER BY id DESC LIMIT 1;"
```
**Expected**: Email record with sent_at timestamp
**Also Check**: https://resend.com/emails for actual email delivery
**Status**: ✓ Sent / ✗ Not Sent

### 4.12 Verify Retry Scheduled
```bash
psql -U postgres -d raz_ai -c "
SELECT 
  id, recovery_case_id, attempt_number, 
  scheduled_for, retry_status
FROM retry_attempts 
ORDER BY id DESC LIMIT 1;"
```
**Expected**: Retry attempt with status='scheduled'
**Status**: ✓ Scheduled / ✗ Not Scheduled

### 4.13 Verify Audit Trail
```bash
psql -U postgres -d raz_ai -c "
SELECT action, resource_type, resource_id 
FROM audit_logs 
WHERE resource_type = 'recovery_case'
ORDER BY id DESC LIMIT 10;"
```
**Expected**: 10+ actions logged (webhook_received, case_created, email_sent, retry_scheduled, etc)
**Status**: ✓ Complete / ✗ Incomplete

### 4.14 Check Frontend Display
Go to http://localhost:5173
- Should see your payment failure
- Should show status: "Retry Scheduled" or similar
- Should display amount, failure reason, case ID
**Status**: ✓ Displayed / ✗ Not Displayed

---

## ✅ Phase 5: Code Quality Checks (5 minutes)

### 5.1 Check All Files for TODO/FIXME
```bash
cd c:\raz
findstr /R /C:"TODO\|FIXME\|HACK\|XXX" backend/**/*.js frontend/src/**/*.jsx 2>nul | findstr /V "node_modules"
```
**Expected**: No critical TODOs remaining
**Status**: ✓ Clean / ✗ Has TODOs

### 5.2 Check for Hardcoded Secrets
```bash
cd c:\raz\backend
# Should NOT find actual keys in code
findstr /I "rzp_test_\|rzp_live_\|whsec_" *.js routes/**/*.js services/**/*.js controllers/**/*.js 2>nul
```
**Expected**: No secrets found in code (only in .env)
**Status**: ✓ Secure / ✗ Secrets in Code

### 5.3 Check .gitignore
```bash
cd c:\raz
cat .gitignore
```
**Should contain:**
- `node_modules/`
- `.env` (not .env.example)
- `*.log`
- `.DS_Store`

**Status**: ✓ Correct / ✗ Missing entries

### 5.4 Check README Files
```bash
cd c:\raz
ls -la *.md
```
**Should have:**
- README.md
- QUICK_START.md
- RAZORPAY_TESTING_GUIDE.md
- IMPLEMENTATION_SUMMARY.md
- DEPLOYMENT_CHECKLIST.md (this file)

**Status**: ✓ All exist / ✗ Some missing

### 5.5 Verify package.json Scripts
```bash
cd c:\raz\backend
npm run | findstr "start\|test\|dev"
```
**Expected**: start, test scripts defined
**Status**: ✓ Defined / ✗ Not Defined

---

## ✅ Phase 6: Git Preparation (5 minutes)

### 6.1 Initialize Git Repository
```bash
cd c:\raz
git init
```
**Status**: ✓ Initialized / ✗ Not Initialized

### 6.2 Create .gitignore
```bash
# Create c:\raz\.gitignore with:
node_modules/
.env
.env.local
dist/
build/
*.log
.DS_Store
.vscode/settings.json
.idea/
coverage/
.nyc_output/
```
**Status**: ✓ Created / ✗ Not Created

### 6.3 Add All Files
```bash
cd c:\raz
git add .
```
**Status**: ✓ Added / ✗ Not Added

### 6.4 Create Initial Commit
```bash
cd c:\raz
git commit -m "Initial commit: RecoverPay AI with Razorpay integration"
```
**Status**: ✓ Committed / ✗ Not Committed

### 6.5 Create GitHub Remote
```bash
# On GitHub, create new repository (don't initialize with README)
# Then run:
cd c:\raz
git remote add origin https://github.com/YOUR_USERNAME/razorpay-recover-ai.git
git branch -M main
git push -u origin main
```
**Status**: ✓ Pushed / ✗ Not Pushed

---

## ✅ Final Verification Checklist

Before marking as "Ready for GitHub", verify:

### Database
- [ ] PostgreSQL connection verified
- [ ] All 10 tables exist
- [ ] Razorpay tables created
- [ ] Extended columns present
- [ ] No fake data remains

### Backend
- [ ] Environment configured correctly
- [ ] All service files present
- [ ] All model files present
- [ ] All controller files present
- [ ] Backend starts on port 5000
- [ ] Health endpoint responds
- [ ] Webhook endpoint exists
- [ ] Recovery routes accessible

### Frontend
- [ ] All files present
- [ ] Dependencies installed
- [ ] Frontend starts on port 5173
- [ ] Loads in browser
- [ ] Shows real payment events

### Razorpay Integration
- [ ] Credentials obtained
- [ ] Webhook created
- [ ] .env updated
- [ ] ngrok tunnel running
- [ ] Webhook URL configured
- [ ] Test payment made
- [ ] Webhook received
- [ ] Recovery case created
- [ ] Email sent
- [ ] Retry scheduled
- [ ] Frontend displays event
- [ ] Audit trail complete

### Code Quality
- [ ] No TODOs/FIXMEs
- [ ] No secrets in code
- [ ] .gitignore proper
- [ ] Documentation complete
- [ ] package.json configured

### Git
- [ ] Repository initialized
- [ ] .gitignore created
- [ ] All files added
- [ ] Initial commit created
- [ ] Remote configured
- [ ] Pushed to GitHub

---

## 🚀 Summary

**Total Checks**: 60+
**Estimated Time**: 45 minutes

### What This Verifies:
✅ Database is properly set up  
✅ Backend services are running  
✅ Frontend is working  
✅ Razorpay integration is complete  
✅ Real payment flow works  
✅ Code quality is good  
✅ Ready for GitHub deployment  

---

## 📋 Score Card

After completing all checks, fill in:

```
DATABASE:     [ ] Pass / [ ] Fail
BACKEND:      [ ] Pass / [ ] Fail
FRONTEND:     [ ] Pass / [ ] Fail
RAZORPAY:     [ ] Pass / [ ] Fail
CODE QUALITY: [ ] Pass / [ ] Fail
GIT:          [ ] Pass / [ ] Fail

OVERALL: [ ] READY FOR GITHUB / [ ] NEEDS FIXES
```

---

## ❌ If Any Test Fails

1. **Check logs**: Backend terminal, browser console
2. **Verify configuration**: .env file, database credentials
3. **Test individually**: Each service separately
4. **Check database**: `psql -U postgres -d raz_ai -c "\dt"`
5. **Review errors**: Look for specific error messages

For help, check:
- RAZORPAY_TESTING_GUIDE.md (Troubleshooting section)
- Backend logs (Terminal output)
- Database logs (PostgreSQL)
- Frontend console (Browser Dev Tools)

---

**Ready to check? Start with Phase 1! ✅**

