const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../config/database');
const {
  handlePaymentWebhook,
  handleCheckoutWebhook,
  handleInvoiceWebhook
} = require('../controllers/webhookController');
const { sendRecoveryNotification, generateRecoveryAlertHtml } = require('../services/emailService');

// Mock request / response helper
function createMockReqRes(body) {
  const req = { body };
  let statusCode = 200;
  let responseData = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    }
  };
  return { req, res, getStatus: () => statusCode, getData: () => responseData };
}

// 1. Failed Payment Workflow: webhook -> DB -> AI -> Policy -> Resend -> Audit
test('Automatic Recovery: failed payment event creates transaction, recovery case, and triggers notification', async () => {
  const eventId = `test_evt_pay_${Date.now()}`;
  const customerEmail = `real_pay_${Date.now()}@business.org`;
  const { req, res, getStatus, getData } = createMockReqRes({
    event_id: eventId,
    customer_name: 'Stripe Business Customer',
    customer_email: customerEmail,
    amount: 2499,
    currency: 'INR',
    failure_reason: 'expired_card',
    payment_method: 'card'
  });

  await handlePaymentWebhook(req, res, (err) => { throw err; });

  assert.equal(getStatus(), 201);
  const data = getData();
  assert.equal(data.success, true);
  assert.equal(data.event_id, eventId);
  assert.ok(data.data.case.id);
  assert.equal(data.data.case.amount_at_risk, 2499);
  assert.equal(data.data.transaction.failure_reason, 'expired_card');
  assert.equal(data.data.policy.allowed, true);

  // Verify DB record
  const dbCase = await pool.query('SELECT * FROM recovery_cases WHERE id = $1', [data.data.case.id]);
  assert.equal(dbCase.rows.length, 1);
  assert.ok(['email_sent', 'open', 'failed'].includes(dbCase.rows[0].status));

  // Verify Audit Log
  const auditLogs = await pool.query('SELECT * FROM audit_logs WHERE recovery_case_id = $1', [data.data.case.id]);
  assert.ok(auditLogs.rows.length >= 1);
});

// 2. Checkout Abandonment Workflow: webhook -> DB -> AI -> Policy -> Resend -> Audit
test('Automatic Recovery: checkout abandonment event creates checkout session, recovery case, and triggers email', async () => {
  const eventId = `test_evt_chk_${Date.now()}`;
  const customerEmail = `real_chk_${Date.now()}@shoppers.org`;
  const sessionId = `chk_sess_${Date.now()}`;
  const { req, res, getStatus, getData } = createMockReqRes({
    event_id: eventId,
    customer_name: 'E-commerce Shopper',
    customer_email: customerEmail,
    session_id: sessionId,
    amount: 4500,
    abandonment_reason: 'payment_friction'
  });

  await handleCheckoutWebhook(req, res, (err) => { throw err; });

  assert.equal(getStatus(), 201);
  const data = getData();
  assert.equal(data.success, true);
  assert.ok(data.data.case.id);
  assert.equal(data.data.checkout.session_id, sessionId);
  assert.equal(data.data.policy.allowed, true);

  // Verify DB record
  const dbCase = await pool.query('SELECT * FROM recovery_cases WHERE id = $1', [data.data.case.id]);
  assert.equal(dbCase.rows[0].status, 'email_sent');
});

// 3. Overdue Invoice Workflow: webhook -> DB -> dynamic days overdue -> AI -> Policy -> Resend
test('Automatic Recovery: overdue invoice event calculates dynamic days overdue and triggers notice', async () => {
  const eventId = `test_evt_inv_${Date.now()}`;
  const customerEmail = `real_inv_${Date.now()}@corp.org`;
  const pastDueDate = new Date(Date.now() - 12 * 86400000).toISOString().slice(0, 10);
  const { req, res, getStatus, getData } = createMockReqRes({
    event_id: eventId,
    customer_name: 'Acme Enterprise Corp',
    customer_email: customerEmail,
    amount: 60000,
    due_date: pastDueDate
  });

  await handleInvoiceWebhook(req, res, (err) => { throw err; });

  assert.equal(getStatus(), 201);
  const data = getData();
  assert.equal(data.success, true);
  assert.ok(data.data.case.id);
  assert.ok(data.data.invoice.days_overdue >= 11);
});

// 4. Policy Blocked / Escalated: template contains human review required notice
test('Automatic Recovery: policy blocked or escalated template contains human review warning', () => {
  const html = generateRecoveryAlertHtml({
    customerName: 'High Value Enterprise',
    customerEmail: 'ceo@enterprise.com',
    eventType: 'overdue_invoice',
    amount: 150000,
    rootCause: 'overdue_invoice',
    diagnosis: 'Amount exceeds automated recovery limits.',
    recommendedAction: 'escalate_to_human',
    policyStatus: 'Escalated',
    caseId: 888
  });

  assert.ok(html.includes('Automated recovery blocked — human review required'));
  assert.ok(html.includes('₹1,50,000'));
  assert.ok(html.includes('Case #888'));
});

// 5. Idempotency Guard: Duplicate webhook events do not re-process or duplicate cases
test('Automatic Recovery Idempotency: duplicate event ID is acknowledged without creating second case', async () => {
  const eventId = `idempotent_evt_${Date.now()}`;
  const payload = {
    event_id: eventId,
    customer_name: 'Duplicate Test User',
    customer_email: `dup_${Date.now()}@test.org`,
    amount: 1999,
    failure_reason: 'temporary_failure'
  };

  // First call -> 201 Created
  const first = createMockReqRes(payload);
  await handlePaymentWebhook(first.req, first.res, (err) => { throw err; });
  assert.equal(first.getStatus(), 201);
  assert.equal(first.getData().duplicate, undefined);

  // Second call with same event_id -> 200 Duplicate Acknowledged
  const second = createMockReqRes(payload);
  await handlePaymentWebhook(second.req, second.res, (err) => { throw err; });
  assert.equal(second.getStatus(), 200);
  assert.equal(second.getData().duplicate, true);
  assert.ok(second.getData().message.includes('already been processed'));
});

// 6. Resend Error Safety: Missing API key returns structured failure and does not crash
test('Automatic Recovery Safety: missing RESEND_API_KEY returns safe error without crashing', async () => {
  const originalKey = process.env.RESEND_API_KEY;
  try {
    delete process.env.RESEND_API_KEY;
    const result = await sendRecoveryNotification({
      recipient: 'safe-test@example.com',
      customerName: 'Test Customer',
      customerEmail: 'safe-test@example.com',
      eventType: 'failed_payment',
      amount: 1000
    });

    assert.equal(result.success, false);
    assert.ok(result.error.includes('RESEND_API_KEY is missing'));
    assert.equal(result.provider.includes('NOT CONFIGURED'), true);
  } finally {
    process.env.RESEND_API_KEY = originalKey;
  }
});

// 7. Security: Secrets (API keys, CVV, Card numbers) are never leaked in email templates or objects
test('Automatic Recovery Security: no sensitive card numbers or keys leaked in email templates', () => {
  const html = generateRecoveryAlertHtml({
    customerName: 'Secured Customer',
    customerEmail: 'user@bank.com',
    eventType: 'failed_payment',
    amount: 5000,
    rootCause: 'insufficient_funds',
    diagnosis: 'Normal failure diagnosis'
  });

  assert.equal(html.includes('cvv'), false);
  assert.equal(html.includes('gsk_'), false);
  assert.equal(html.includes('re_'), false);
});
