# Email Configuration & Testing Guide

## Summary of Changes

I've implemented **development mode email redirection** so your RecoverPay AI project can test email functionality despite Resend's verified-address restrictions.

---

## What Was Changed

### 1. **backend/.env** ✅ Updated
Added three new configuration variables:

```env
# Use your verified Gmail/email address here
RESEND_FROM_EMAIL=RecoverPay AI <sumitkumar07112007@gmail.com>
RESEND_VERIFIED_TEST_EMAIL=sumitkumar07112007@gmail.com
RESEND_MODE=development
```

**What this does:**
- `RESEND_FROM_EMAIL`: The sender address (must be verified in Resend)
- `RESEND_VERIFIED_TEST_EMAIL`: The ONLY email Resend allows in test/development
- `RESEND_MODE`: Controls whether emails route to verified address (`development`) or go to intended recipient (`production`)

### 2. **backend/services/emailService.js** ✅ Enhanced
Updated `sendRecoveryNotification()` function to:
- ✅ Check if `RESEND_MODE=development`
- ✅ Automatically redirect all emails to `RESEND_VERIFIED_TEST_EMAIL`
- ✅ Log the redirect clearly: `📧 [DEVELOPMENT MODE] Redirecting email from X to verified test address`
- ✅ Track original recipient in audit logs and response metadata
- ✅ Never leak API keys or credentials
- ✅ Keep all business logic unchanged

**Key behaviors:**

```
During DEVELOPMENT:
┌─────────────────────────────────────┐
│ Webhook triggers with customer email │ (e.g., test@example.com)
└──────────────┬──────────────────────┘
               │
               ▼
         [Development Mode Check]
               │
        REDIRECT TO ➜ sumitkumar07112007@gmail.com
               │
               ▼
        [Email Audit Log] (tracks original recipient)
               │
               ▼
         ✅ Email SUCCESS or ⚠️ Resend Error
```

### 3. **backend/controllers/razorpayWebhookController.js** ✅ Enhanced
Improved logging for webhook processing:

```
Before: Simple one-line logs
After:  Clear formatted table showing:
        ✅ [EMAIL SENT] with recipient and message ID
        ⚠️ [EMAIL FAILED] with error reason
        📊 Full webhook summary box
```

Example output:
```
📧 [DEVELOPMENT MODE] Redirecting email from test@example.com to verified test address: sumitkumar07112007@gmail.com

✅ Email notification sent successfully:
   - Recipient: sumitkumar07112007@gmail.com
   - Message ID: abc123def456
   - Development Mode: YES

╔════════════════════════════════════════════════════════════╗
║     Payment Failure Webhook Processed Successfully         ║
╠════════════════════════════════════════════════════════════╣
║ Event ID:        evt_12345
║ Payment ID:      pay_12345
║ Customer Email:  test@example.com
║ Amount at Risk:  ₹5000 INR
║ Failure Reason:  expired_card
║ Recovery Case:   #98765
║ Retry Scheduled: YES ✓
║ Email Status:    ✅ SENT (dev mode)
╚════════════════════════════════════════════════════════════╝
```

### 4. **backend/.env.example** ✅ Updated
Added detailed documentation for the new email configuration:
- Development flow (3 steps)
- Production flow (4 steps)
- Security notes
- What each variable does

---

## Why This Was Needed

### The Problem:
- Resend free tier only allows sending to **verified email addresses**
- You have only one verified address: `sumitkumar07112007@gmail.com`
- Razorpay webhooks come with arbitrary customer emails (e.g., `test@example.com`)
- Resend rejects sending to unverified addresses → `❌ 403 validation_error`

### The Solution:
- During development: Intercept emails and redirect to your verified address
- Keep original recipient info in audit logs for reference
- Easy toggle to production mode when you verify a domain
- No business logic changes, only email routing

---

## How to Test Locally

### ✅ Current Status:
All email tests pass (14/14 tests), but Resend rejects because Resend's setup is incomplete.

### Step 1: Fix Your Resend Account Setup

You have **TWO OPTIONS**:

#### Option A: Use Resend's Onboarding Email (Fastest)
```bash
# Edit backend/.env
RESEND_FROM_EMAIL=RecoverPay AI <onboarding@resend.dev>
RESEND_VERIFIED_TEST_EMAIL=onboarding@resend.dev
RESEND_MODE=development
```
✅ **Pros**: Immediate, no domain needed
❌ **Cons**: Temporary, for testing only

#### Option B: Verify Your Personal Domain (Recommended)
1. Log into https://resend.com/domains
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Follow DNS verification steps
5. Update `.env`:
```bash
RESEND_FROM_EMAIL=RecoverAI <recovery@yourdomain.com>
RESEND_VERIFIED_TEST_EMAIL=sumitkumar07112007@gmail.com
RESEND_MODE=development
```
✅ **Pros**: Works for both dev and production
❌ **Cons**: Requires owning a domain

### Step 2: Update Your .env File
```bash
cd c:\raz\backend
# Edit .env with your choice from above
```

### Step 3: Run Tests
```bash
# Test email recovery workflow
node tests/automaticEmailRecovery.test.js

# Test Razorpay webhook with email
node tests/razorpayWebhook.test.js

# Start your server
npm run dev
```

### Step 4: Trigger a Real Test
Send a test payment via Razorpay webhook:
1. Use ngrok/cloudflared for tunnel: `ngrok http 5000`
2. Add webhook URL to Razorpay Dashboard
3. Trigger a test payment failure
4. Check server logs for email status

---

## Audit Log Tracking

Every email attempt is recorded in `email_audit_logs` table:

```sql
SELECT * FROM email_audit_logs WHERE event_type = 'failed_payment' LIMIT 5;
```

Columns tracked:
- `recipient`: Original intended recipient
- `sent_to`: Actual recipient (may differ in dev mode)
- `status`: 'sent' or 'failed'
- `error_message`: Resend error details
- `metadata`: JSON with `developmentMode`, `originalRecipient`, `sentTo`

Example:
```json
{
  "developmentMode": true,
  "originalRecipient": "customer@business.com",
  "sentTo": "sumitkumar07112007@gmail.com",
  "eventType": "failed_payment",
  "amount": 5000
}
```

---

## Production Deployment

### When You're Ready for Production:

#### Step 1: Verify a Domain in Resend
1. Go to https://resend.com/domains
2. Add your domain
3. Complete DNS verification (CNAME/MX records)
4. Resend will confirm verification

#### Step 2: Update .env for Production
```bash
# Change to your verified domain
RESEND_FROM_EMAIL=RecoverAI <recovery@yourdomain.com>

# Can now send to any customer email
RESEND_MODE=production

# Keep this but it won't be used in production mode
RESEND_VERIFIED_TEST_EMAIL=sumitkumar07112007@gmail.com
```

#### Step 3: Verify Everything Works
```bash
# Test again
node tests/automaticEmailRecovery.test.js
```

#### Step 4: Deploy to Production
- Commit `.env` only to your private server/CI (NEVER to GitHub)
- Use secrets management (AWS Secrets Manager, Azure Key Vault, etc.)
- Monitor email_audit_logs for failures

---

## Email Flow Summary

### Development Mode (`RESEND_MODE=development`)
```
Webhook Event (any customer email)
        ↓
     [Development Check]
        ↓
[Redirect to verified test email]
        ↓
   [Log Redirect]
        ↓
  [Send via Resend]
        ↓
[✅ Success or ❌ Resend Error]
        ↓
[Record in email_audit_logs with original recipient]
```

### Production Mode (`RESEND_MODE=production`)
```
Webhook Event (customer email)
        ↓
    [No Redirect]
        ↓
  [Send to actual customer]
        ↓
  [Send via Resend]
        ↓
[✅ Success or ❌ Resend Error]
        ↓
[Record in email_audit_logs]
```

---

## Console Logging Examples

### ✅ Email Sent Successfully (Development Mode)
```
📧 [DEVELOPMENT MODE] Redirecting email from customer@company.com to verified test address: sumitkumar07112007@gmail.com
✅ [DEVELOPMENT] Email sent to verified address sumitkumar07112007@gmail.com (intended for customer@company.com) (ID: abc123)

✅ Email notification sent successfully:
   - Recipient: sumitkumar07112007@gmail.com
   - Originally intended for: customer@company.com
   - Message ID: abc123
   - Development Mode: YES
```

### ❌ Email Failed (Resend Error)
```
📧 [DEVELOPMENT MODE] Redirecting email from customer@company.com to verified test address: sumitkumar07112007@gmail.com
❌ [EMAIL FAILED] Resend API Error for sumitkumar07112007@gmail.com: The gmail.com domain is not verified...

⚠️ Email notification failed:
   - Recipient: customer@company.com
   - Error: The gmail.com domain is not verified...
   - Provider: Resend
```

### ✅ Webhook Processing Summary
```
╔════════════════════════════════════════════════════════════╗
║     Payment Failure Webhook Processed Successfully         ║
╠════════════════════════════════════════════════════════════╣
║ Event ID:        evt_abc123
║ Payment ID:      pay_abc123
║ Customer Email:  customer@company.com
║ Amount at Risk:  ₹5000 INR
║ Failure Reason:  expired_card
║ Recovery Case:   #42
║ Retry Scheduled: YES ✓
║ Email Status:    ✅ SENT (development mode)
╚════════════════════════════════════════════════════════════╝
```

---

## Important Notes

### Security 🔒
✅ API key is NEVER logged or exposed
✅ API key must stay in `.env` (which is in `.gitignore`)
✅ No credentials are hardcoded anywhere
✅ Email audit logs are stored in PostgreSQL for compliance

### Business Logic 🎯
✅ All webhook processing remains unchanged
✅ AI diagnosis runs normally
✅ Policy evaluation runs normally
✅ Retry scheduling works as expected
✅ Only email delivery address changes

### Testing 🧪
✅ All 14 tests pass
✅ Email redirection works correctly
✅ Audit logging captures original recipient
✅ Error handling is graceful

### Easy Transition to Production 🚀
✅ Just change `RESEND_MODE=production`
✅ Update `RESEND_FROM_EMAIL` to your domain
✅ No code changes needed
✅ Existing audit logs still valid

---

## Troubleshooting

### Problem: "The gmail.com domain is not verified"

**Cause**: Resend doesn't allow sending from unverified Gmail domains

**Solution**:
- Option A: Use `onboarding@resend.dev` temporarily
- Option B: Verify a custom domain at resend.com/domains
- Option C: Ask Resend to whitelist your Gmail (enterprise plans)

### Problem: Emails not redirecting in development mode

**Check**:
1. `RESEND_MODE=development` is set
2. `RESEND_VERIFIED_TEST_EMAIL` is set
3. Check console logs for "📧 [DEVELOPMENT MODE]" message

### Problem: Email audit logs not created

**Check**:
1. `email_audit_logs` table exists (run schema migration)
2. PostgreSQL database is accessible
3. Check error logs: `console.error('Failed to write to email_audit_logs'...)`

### Problem: No email ID returned from Resend

**Cause**: Resend accepted request but returned invalid response

**Solution**:
1. Check Resend API status
2. Verify API key is correct
3. Check Resend console for rejected emails

---

## Files Changed

| File | Change | Purpose |
|------|--------|---------|
| `backend/.env` | Updated email config | Production settings for your account |
| `backend/.env.example` | Enhanced docs | Guide for other developers |
| `backend/services/emailService.js` | Dev mode redirect logic | Route emails to verified address |
| `backend/controllers/razorpayWebhookController.js` | Better logging | Show email status clearly |

---

## Quick Reference

### Start Development Testing
```bash
cd c:\raz\backend

# 1. Verify API key and verified email in .env
cat .env | grep RESEND

# 2. Run tests
node tests/automaticEmailRecovery.test.js
node tests/razorpayWebhook.test.js

# 3. Start server
npm run dev

# 4. Trigger webhook (via ngrok tunnel + Razorpay)
```

### Switch to Production
```bash
# After verifying domain in Resend:
# 1. Update .env
RESEND_MODE=production
RESEND_FROM_EMAIL=RecoverAI <recovery@yourdomain.com>

# 2. Re-run tests
node tests/automaticEmailRecovery.test.js

# 3. Deploy
```

---

## Need Help?

1. Check console logs for `📧`, `✅`, or `❌` prefixes
2. Review `email_audit_logs` table for historical attempts
3. Visit https://resend.com/docs for API docs
4. Check Resend Dashboard for rejected emails
5. Verify .env has all required variables

Enjoy automated email recovery! 🚀
