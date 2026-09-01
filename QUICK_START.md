# 🚀 Quick Start: RecoverPay AI + Razorpay Integration

## ✅ Implementation Status: COMPLETE

All Razorpay TEST/SANDBOX integration is ready. Zero real money involved.

---

## 📋 What's Done

- ✅ Database schema (payment_events, retry_attempts tables)
- ✅ Razorpay webhook signature verification
- ✅ Payment failure classification (5 failure reasons)
- ✅ Retry scheduling with limits (2 attempts max)
- ✅ Email templates (6 scenarios)
- ✅ Groq AI diagnosis integration
- ✅ Policy engine evaluation
- ✅ Full audit trail
- ✅ Frontend API integration
- ✅ Complete testing guide

---

## ⚡ Quick Start (45 minutes)

### Step 1: Get Razorpay Test Credentials (5 min)

1. Go to https://razorpay.com
2. Sign up (free)
3. Go to https://dashboard.razorpay.com/app/settings/api-keys
4. **Make sure you're on TEST tab** (not Live)
5. Copy:
   - Key ID: `rzp_test_xxxxx`
   - Key Secret: `rzp_test_xxxxx`

6. Go to https://dashboard.razorpay.com/app/webhooks
7. Click "Create Webhook"
8. Save the **Signing Secret**

### Step 2: Update Backend Configuration (5 min)

Edit `backend/.env`:
```bash
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=rzp_test_YOUR_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET=YOUR_SIGNING_SECRET
MAX_RETRY_ATTEMPTS=2
RETRY_DELAY_MINUTES=30
```

### Step 3: Run Database Migration (2 min)

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

### Step 4: Setup Webhook Tunnel (5 min)

Option A (ngrok - recommended):
```bash
# Download: https://ngrok.com/download
ngrok http 5000

# You'll see: Forwarding https://abc123.ngrok.io -> http://localhost:5000
# Copy: https://abc123.ngrok.io
```

Option B (cloudflared):
```bash
cloudflared tunnel --url http://localhost:5000
```

### Step 5: Configure Razorpay Webhook (5 min)

1. Go to https://dashboard.razorpay.com/app/webhooks
2. Click on your webhook
3. Set:
   - **Webhook URL**: `https://abc123.ngrok.io/api/webhooks/razorpay/payment`
   - **Events**: Check `payment.failed` and `payment.authorized`
   - **Active**: Yes
4. Click "Test webhook" to verify connection

### Step 6: Start Backend & Frontend (2 min)

Terminal 1:
```bash
cd c:\raz\backend
npm start
```

Terminal 2:
```bash
cd c:\raz\frontend
npm run dev
```

### Step 7: Make Test Payments (10 min)

1. Go to Razorpay Dashboard → Payment Links
2. Click "Create Payment Link"
3. Amount: ₹100 (or any amount)
4. Click link

**Test 1 - Success (no recovery)**
- Card: `4111111111111111`
- Expiry: `12/25`
- CVV: `123`
- Result: ✅ Success (no recovery action)

**Test 2 - Temporary Failure (auto-retry)**
- Card: `4100000000000002`
- Expiry: `12/25`
- CVV: `123`
- Result: ❌ Fails, then auto-retries

### Step 8: Verify in Backend Logs (2 min)

In Terminal 1 logs, you should see:
```
✓ Payment failure webhook processed successfully:
  - Event: evt_xyz123
  - Payment: pay_abc123
  - Amount: ₹500
  - Failure: temporary_failure
  - Case ID: 5
  - Retry Scheduled: true
  - Email Sent: true
```

### Step 9: Check Database (2 min)

```bash
psql -U postgres -d raz_ai -c "SELECT * FROM payment_events ORDER BY id DESC LIMIT 1;"
```

Should show your test payment failure.

### Step 10: Verify Email (2 min)

Go to https://resend.com/emails - look for recovery notification.

### Step 11: Check Frontend (2 min)

Go to http://localhost:5173 - should show your real payment failure with:
- Amount: ₹500
- Status: "Processing" or "Retry Scheduled"
- Failure Reason: "Temporary Gateway Failure"
- Case ID: #5 (or your case number)

---

## 📚 Full Documentation

For complete details, see:

1. **IMPLEMENTATION_SUMMARY.md** - What was implemented
2. **RAZORPAY_TESTING_GUIDE.md** - Step-by-step testing
3. **setup-razorpay.ps1** - Automated setup script

---

## 🔍 Verify Everything Works

```bash
# 1. Check migration
psql -U postgres -d raz_ai -c "
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('payment_events', 'retry_attempts');"

# Expected: 2 rows (payment_events, retry_attempts)

# 2. Check webhook endpoint exists
curl -X OPTIONS http://localhost:5000/api/webhooks/razorpay/payment

# Expected: 200 OK

# 3. Check email configuration
node -e "require('dotenv').config(); 
  console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'SET' : 'NOT SET');
  console.log('RAZORPAY_WEBHOOK_SECRET:', process.env.RAZORPAY_WEBHOOK_SECRET ? 'SET' : 'NOT SET');"

# Expected: Both SET
```

---

## ⚠️ Important

- **TEST MODE ONLY**: All credentials start with `rzp_test_` (not `rzp_live_`)
- **NO REAL MONEY**: Test cards provided by Razorpay, no charges
- **NGROK MUST RUN**: Keep tunnel running during entire testing session
- **VERIFY WEBHOOK URL**: Must match your ngrok URL exactly
- **CHECK DATABASE**: After each test payment, verify records in PostgreSQL

---

## 🎯 What Happens on Payment Failure

```
Payment Fails
    ↓
Razorpay Sends Webhook
    ↓
RecoverPay AI Verifies Signature ✓
    ↓
Stores Payment Event ✓
    ↓
Runs Groq AI Analysis ✓
    ↓
Evaluates Policy ✓
    ↓
Determines if Retryable ✓
    ↓
Schedules Retry (if applicable) ✓
    ↓
Sends Resend Email ✓
    ↓
Logs Audit Trail ✓
    ↓
Frontend Shows Real Event ✓
```

---

## 🚨 Troubleshooting

### Webhook not received?
- Verify ngrok is running: `ngrok http 5000`
- Check Razorpay dashboard webhook URL matches exactly
- Check backend logs for errors

### Email not sent?
- Verify RESEND_API_KEY is set in .env
- Go to https://resend.com/emails to check status
- Check backend logs for email sending errors

### Database migration failed?
- Ensure PostgreSQL is running
- Check backend/.env has correct DB credentials
- Run: `psql -U postgres -d raz_ai -c "\dt"` to check existing tables

### No retry scheduled?
- Check recovery case: `SELECT retry_blocked FROM recovery_cases WHERE id = 5;`
- Check policy: `SELECT policy_allowed FROM recovery_cases WHERE id = 5;`
- Check failure reason: `SELECT failure_reason FROM payment_events WHERE id = 1;`

---

## 📞 Next Steps

1. ✅ Get Razorpay credentials
2. ✅ Update backend/.env
3. ✅ Run migration
4. ✅ Setup tunnel
5. ✅ Configure webhook
6. ✅ Start servers
7. ✅ Make test payments
8. ✅ Verify webhook reception
9. ✅ Check email delivery
10. ✅ View in frontend

---

## 🎉 Success Criteria

After all steps, you should see:

✅ Payment fails in Razorpay test
✅ Webhook received by RecoverPay AI
✅ Payment event stored in database
✅ Recovery case created
✅ AI diagnosis generated
✅ Policy evaluated
✅ Retry scheduled (for retryable failures)
✅ Email sent via Resend
✅ Frontend shows real event
✅ Audit trail complete

---

## Production Ready?

To switch to production:
1. Get production Razorpay credentials (rzp_live_xxxx)
2. Update RAZORPAY_KEY_ID and KEY_SECRET to production
3. Update webhook secret to production
4. Change RAZORPAY_WEBHOOK_SECRET in .env
5. Deploy backend to production domain
6. Update webhook URL in Razorpay to production domain
7. Switch NODE_ENV=production
8. All code works identically

---

**🚀 Ready? Let's test!**

Start with Step 1 above, follow through Step 11, and you'll have a fully working Razorpay payment recovery system.

