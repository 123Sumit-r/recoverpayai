# RecoverPay AI + Razorpay Integration Testing Guide

## Overview
This guide walks you through setting up and testing the REAL Razorpay payment integration with RecoverPay AI. This uses **Razorpay TEST/SANDBOX mode only** — no real money is charged.

## Architecture

```
Real Customer Payment
         ↓
   Razorpay Gateway (TEST)
         ↓
   Payment Fails
         ↓
   Razorpay Sends Webhook
         ↓
   RecoverPay AI Backend Receives & Verifies
         ↓
   1. Webhook Signature Verification ✓
   2. Payment Event Stored ✓
   3. AI Diagnosis (Groq) ✓
   4. Policy Engine ✓
   5. Retry Decision ✓
   6. Resend Email ✓
   7. Audit Trail ✓
         ↓
   Frontend Shows Real Event
```

## Prerequisites

- [ ] Razorpay account (free, instant signup at https://razorpay.com)
- [ ] PostgreSQL running locally
- [ ] Backend running on http://localhost:5000
- [ ] Frontend running on http://localhost:5173
- [ ] Groq API key (already configured)
- [ ] Resend API key (already configured)
- [ ] ngrok or equivalent for webhook tunneling (for local testing)

## Step 1: Get Razorpay Test Credentials

1. **Create Razorpay Account**
   - Go to https://razorpay.com
   - Sign up (free account)
   - Create a business (select "Use as individual")

2. **Get API Keys (TEST Mode)**
   - Go to https://dashboard.razorpay.com/app/settings/api-keys
   - You'll see two tabs: "Live" (production) and "Test" (sandbox)
   - **Stay on TEST tab** ⚠️
   - Copy your test credentials:
     - **Key ID**: Starts with `rzp_test_`
     - **Key Secret**: Starts with `rzp_test_`

3. **Generate Webhook Secret**
   - Go to https://dashboard.razorpay.com/app/webhooks
   - Click "Create Webhook"
   - Webhook URL: (Will configure in Step 3)
   - Events: Select at least "payment.failed"
   - Active: Yes
   - After creation, you'll get a **Signing Secret**

## Step 2: Update Backend Configuration

1. **Add Razorpay Credentials to .env**
   ```bash
   # Edit backend/.env
   RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
   RAZORPAY_KEY_SECRET=rzp_test_YOUR_KEY_SECRET
   RAZORPAY_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET
   ```

2. **Verify Configuration**
   ```bash
   cd c:\raz\backend
   node -e "require('dotenv').config(); console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID)"
   ```

3. **Run Database Migration**
   ```bash
   cd c:\raz\backend
   node scripts/migrateRazorpay.js
   ```
   
   Expected output:
   ```
   ✅ Migration successful! Tables created:
      - payment_events
      - retry_attempts
      - recovery_cases (extended)
   ```

## Step 3: Setup Webhook Tunnel (for Local Testing)

Since Razorpay needs to reach your local backend, you must expose it:

### Option A: Using ngrok (Recommended)
```bash
# Install ngrok from: https://ngrok.com/download
# Or if you have it installed:
ngrok http 5000

# You'll get a public URL like: https://abc123.ngrok.io
# Your webhook URL will be: https://abc123.ngrok.io/api/webhooks/razorpay/payment
```

### Option B: Using cloudflared
```bash
# Install cloudflare tunnel
cloudflared tunnel --url http://localhost:5000

# You'll get a URL like: https://xxx.trycloudflare.com
# Your webhook URL will be: https://xxx.trycloudflare.com/api/webhooks/razorpay/payment
```

### Option C: Using expose.sh
```bash
# One-liner:
expose http://5000
```

**Keep the tunnel running throughout testing!**

## Step 4: Configure Razorpay Webhook

1. **Go to Razorpay Dashboard**
   - https://dashboard.razorpay.com/app/webhooks

2. **Create New Webhook**
   - **Webhook URL**: `https://your-tunnel-url/api/webhooks/razorpay/payment`
   - **Events**: Check "payment.failed" and "payment.authorized"
   - **Active**: Yes
   - **Save**

3. **Test Webhook Connection**
   - Razorpay shows "Test webhook" button
   - Click it to verify connection
   - Should see "Event delivered" if tunnel is working

## Step 5: Start Backend & Frontend

```bash
# Terminal 1: Backend
cd c:\raz\backend
npm start
# Expected: "RecoverPay AI backend listening on port 5000"

# Terminal 2: Frontend
cd c:\raz\frontend
npm run dev
# Expected: "Local: http://localhost:5173"
```

## Step 6: Make a Test Payment (SUCCESS scenario first)

1. **Create a Payment Link**
   - Go to Razorpay Dashboard → Payment Links
   - Click "Create Payment Link"
   - Amount: ₹100 (any amount)
   - Title: "RecoverPay AI Test"
   - Description: "Testing payment recovery"
   - Save & Copy link

2. **Open Payment Link**
   - Click the link or paste in browser
   - You'll see Razorpay payment form

3. **Use Razorpay Test Card (SUCCESS)**
   - Card Number: `4111111111111111`
   - Expiry: `12/25`
   - CVV: `123`
   - Click "Pay Now"
   - Result: ✅ Payment successful (no recovery needed yet)

## Step 7: Make a Test Payment (FAILURE scenario - Temporary)

1. **Create Another Payment Link**
   - Go to Razorpay Dashboard → Payment Links
   - Click "Create Payment Link"
   - Amount: ₹500
   - Title: "RecoverPay AI Test - Failure"
   - Save & Copy link

2. **Open Payment Link**
   - Click the link

3. **Use Razorpay Test Card (DECLINED - Temporary)**
   - Card Number: `4100000000000002`
   - Expiry: `12/25`
   - CVV: `123`
   - Click "Pay Now"
   - Result: ❌ Payment failed (Temporary failure)

## Step 8: Verify Webhook Reception

### Check Backend Logs
```bash
# In Terminal 1 (Backend), you should see:
✓ Payment failure webhook processed successfully:
  - Event: evt_xyz123
  - Payment: pay_abc123
  - Customer: test@razorpay
  - Amount: 500 INR
  - Failure: temporary_failure
  - Case ID: 5
  - Retry Scheduled: true
  - Email Sent: true
```

### Check Database
```bash
# In a new terminal:
psql -U postgres -d raz_ai -c "SELECT * FROM payment_events ORDER BY id DESC LIMIT 1;"

# Expected columns:
# - razorpay_event_id: evt_xxxx
# - razorpay_payment_id: pay_xxxx
# - failure_reason: temporary_failure
# - processed: true
```

## Step 9: Verify Failure Reason Mapping

```bash
psql -U postgres -d raz_ai -c "
  SELECT 
    pe.razorpay_payment_id,
    pe.failure_reason,
    pe.failure_description,
    rc.diagnosis,
    rc.recommended_action
  FROM payment_events pe
  LEFT JOIN recovery_cases rc ON pe.id = rc.payment_event_id
  ORDER BY pe.id DESC LIMIT 1;
"
```

Expected output:
```
 razorpay_payment_id | failure_reason       | diagnosis              | recommended_action
─────────────────────┼──────────────────────┼────────────────────────┼──────────────────────
 pay_abc123          | temporary_failure    | Gateway connectivity   | retry_payment_later
```

## Step 10: Verify AI Diagnosis

```bash
psql -U postgres -d raz_ai -c "
  SELECT 
    id,
    diagnosis_code,
    diagnosis,
    risk_level,
    recommended_action,
    policy_allowed
  FROM recovery_cases
  ORDER BY id DESC LIMIT 1;
"
```

Expected:
- `diagnosis_code`: `temporary_failure`
- `risk_level`: `medium` or `high`
- `policy_allowed`: `true`
- `recommended_action`: `retry_payment_later`

## Step 11: Verify Policy Engine

```bash
psql -U postgres -d raz_ai -c "
  SELECT 
    al.event_type,
    al.message
  FROM audit_logs al
  WHERE al.recovery_case_id = (SELECT MAX(id) FROM recovery_cases)
  AND al.event_type IN ('policy_approved', 'policy_rejected')
  ORDER BY al.id DESC;
"
```

Expected: "policy_approved" with reason like "Temporary failures are retryable"

## Step 12: Verify Retry Scheduling

```bash
psql -U postgres -d raz_ai -c "
  SELECT 
    id,
    attempt_number,
    retry_status,
    scheduled_for,
    executed_at
  FROM retry_attempts
  WHERE recovery_case_id = (SELECT MAX(id) FROM recovery_cases)
  ORDER BY id DESC;
"
```

Expected:
- `retry_status`: `scheduled`
- `scheduled_for`: Future timestamp (~30 minutes from now)
- `executed_at`: NULL (not executed yet)

## Step 13: Verify Resend Email

1. **Check Resend Dashboard**
   - Go to https://resend.com/emails
   - Look for recent email to `RECOVERY_ALERT_EMAIL`

2. **Expected Email Content**
   - Subject: Contains "Payment Failed" or "Retry Scheduled"
   - Body includes:
     - Customer name
     - Amount: ₹500
     - Failure reason
     - Case ID
     - Next retry time (if scheduled)

3. **Resend Status**
   ```bash
   # Check email audit logs
   psql -U postgres -d raz_ai -c "
     SELECT 
       recipient,
       subject,
       status,
       sent_at
     FROM email_audit_logs
     WHERE case_id = (SELECT MAX(id) FROM recovery_cases)
     ORDER BY id DESC LIMIT 1;
   "
   ```

## Step 14: Verify Frontend Shows Real Event

1. **Open Frontend**
   - Go to http://localhost:5173

2. **Expected Display**
   - Dashboard shows the failed payment
   - Customer name (from Razorpay)
   - Amount: ₹500
   - Status: "processing" or "email_sent"
   - Failure reason: "Temporary Gateway Failure"
   - Next retry: [scheduled time]
   - Case ID: #5 (or your case number)

3. **Click "Inspect"**
   - Shows full recovery case details
   - AI diagnosis
   - Policy decision
   - Retry status

## Step 15: Test Different Failure Scenarios

### Scenario 1: Expired Card
- Card: `4000000000000069`
- Expected behavior:
  - `failure_reason`: `expired_card`
  - Email: "Update Payment Method"
  - No automatic retry
  - `retry_blocked`: true

### Scenario 2: Insufficient Funds
- Card: `4000000000000010`
- Expected behavior:
  - `failure_reason`: `insufficient_funds`
  - Email: "Retry Scheduled"
  - Retry scheduled after 30 minutes
  - `policy_allowed`: true

### Scenario 3: Bank Declined
- Card: `4000000000000002` (might also trigger temporary)
- Expected behavior:
  - `failure_reason`: `bank_declined` or `temporary_failure`
  - Email: "Retry Scheduled" or "Human Review"
  - Retry may be blocked by policy

## Step 16: Verify Idempotency

1. **Simulate Duplicate Webhook**
   ```bash
   # Get the last event ID from database
   psql -U postgres -d raz_ai -c "
     SELECT razorpay_event_id FROM payment_events ORDER BY id DESC LIMIT 1;
   "
   # Copy the event ID
   
   # Replay webhook (using curl or Postman)
   curl -X POST http://localhost:5000/api/webhooks/razorpay/payment \
     -H "Content-Type: application/json" \
     -H "X-Razorpay-Signature: YOUR_SIGNATURE" \
     -d '{...same payload...}'
   ```

2. **Expected Behavior**
   - Backend returns "duplicate: true"
   - No new recovery case created
   - No new email sent
   - Logs show: "Duplicate webhook event (idempotent)"

## Step 17: Verify Audit Trail

```bash
psql -U postgres -d raz_ai -c "
  SELECT 
    event_type,
    message,
    created_at
  FROM audit_logs
  WHERE recovery_case_id = (SELECT MAX(id) FROM recovery_cases)
  ORDER BY id ASC;
"
```

Expected sequence:
1. `case_created` - Recovery case created
2. `ai_analysis_generated` - AI diagnosis run
3. `policy_approved` - Policy evaluated
4. `email_sent` - Email dispatched
5. Retry-related events (if applicable)

## Troubleshooting

### Webhook Not Received
```bash
# Check backend logs for connection errors
# Make sure ngrok tunnel is still running
ngrok http 5000 # Restart if needed

# Verify webhook URL in Razorpay dashboard matches tunnel URL
# Razorpay Dashboard → Webhooks → View webhook details
```

### Email Not Sent
```bash
# Check Resend API key
node -e "require('dotenv').config(); console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'SET' : 'NOT SET')"

# Check email audit logs for errors
psql -U postgres -d raz_ai -c "
  SELECT status, error_message FROM email_audit_logs ORDER BY id DESC LIMIT 5;
"
```

### Retry Not Scheduled
```bash
# Check recovery case status and policy
psql -U postgres -d raz_ai -c "
  SELECT 
    id,
    status,
    policy_allowed,
    retry_blocked,
    next_retry_at
  FROM recovery_cases
  ORDER BY id DESC LIMIT 1;
"

# If retry_blocked = true, check retry_block_reason
```

### Payment Event Not Created
```bash
# Check processed_webhook_events for duplicates
psql -U postgres -d raz_ai -c "
  SELECT * FROM processed_webhook_events
  ORDER BY created_at DESC LIMIT 5;
"

# If event exists but not in payment_events, check webhook signature
```

## Summary Checklist

- [ ] Razorpay test credentials obtained
- [ ] ngrok tunnel configured and running
- [ ] Webhook URL configured in Razorpay dashboard
- [ ] Backend migrated (`node scripts/migrateRazorpay.js`)
- [ ] Backend running (`npm start`)
- [ ] Frontend running (`npm run dev`)
- [ ] Test payment (success) processed
- [ ] Test payment (failure) triggered
- [ ] Webhook received and logged
- [ ] Payment event stored in database
- [ ] AI diagnosis generated
- [ ] Policy engine evaluated
- [ ] Retry scheduled (if applicable)
- [ ] Resend email delivered
- [ ] Frontend shows real event
- [ ] Audit trail complete
- [ ] Idempotency verified

## Final Report

After completing all steps, generate a report:

```bash
# Generate summary
psql -U postgres -d raz_ai -c "
  SELECT 
    'Payment Events' AS entity,
    COUNT(*) AS total,
    SUM(CASE WHEN processed = true THEN 1 ELSE 0 END) AS processed,
    SUM(CASE WHEN failure_reason IS NOT NULL THEN 1 ELSE 0 END) AS with_failures
  FROM payment_events
  UNION ALL
  SELECT 
    'Recovery Cases' AS entity,
    COUNT(*) AS total,
    SUM(CASE WHEN status = 'email_sent' THEN 1 ELSE 0 END) AS email_sent,
    SUM(CASE WHEN status = 'recovered' THEN 1 ELSE 0 END) AS recovered
  FROM recovery_cases
  UNION ALL
  SELECT 
    'Retry Attempts' AS entity,
    COUNT(*) AS total,
    SUM(CASE WHEN retry_status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled,
    SUM(CASE WHEN retry_status = 'success' THEN 1 ELSE 0 END) AS successful
  FROM retry_attempts;
"
```

## Next Steps

After successful testing:
1. Document any issues or improvements needed
2. Set up production Razorpay credentials (when ready)
3. Deploy backend to production
4. Configure production webhook
5. Monitor real payment failures

---

**Important Reminders:**
- ✅ TEST mode only - no real money charged
- ✅ Webhook signature verification enabled
- ✅ Retry limits enforced (max 2 attempts)
- ✅ Policy engine protects against blocked scenarios
- ✅ All sensitive data stored securely in database
- ✅ Email notifications via Resend
- ✅ Complete audit trail for compliance

