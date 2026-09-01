const test = require('node:test');
const assert = require('node:assert/strict');
const { analyze, validateAnalysis, buildRecoveryStrategy, resolveGroqConfig } = require('../services/aiAnalysisService');
const { evaluate, MAX_RETRIES, MAX_REMINDERS, MAX_CHECKOUT_REMINDERS, HIGH_VALUE_THRESHOLD, EXTREME_OVERDUE_DAYS } = require('../services/policyService');
const riskModel = require('../models/riskModel');
const invoiceModel = require('../models/invoiceModel');
const checkoutModel = require('../models/checkoutModel');

// 1. All 5 Payment Failure Reasons
test('Day 7: verify all 5 payment failure reasons produce correct strategy', () => {
  const reasons = [
    { code: 'expired_card', expectedAction: 'request_payment_method_update', retrySafe: false },
    { code: 'insufficient_funds', expectedAction: 'retry_payment_later', retrySafe: true },
    { code: 'bank_declined', expectedAction: 'request_payment_method_update', retrySafe: false },
    { code: 'temporary_failure', expectedAction: 'retry_payment', retrySafe: true },
    { code: 'invalid_payment_method', expectedAction: 'request_payment_method_update', retrySafe: false }
  ];

  for (const item of reasons) {
    const strat = buildRecoveryStrategy(item.code, {
      amount_at_risk: 1500,
      retry_count: 0,
      case_type: 'failed_payment'
    });
    assert.equal(strat.root_cause, item.code);
    assert.equal(strat.recommended_action, item.expectedAction);
    assert.equal(strat.safe_to_retry, item.retrySafe);

    // Validate through validateAnalysis
    const validated = validateAnalysis(strat);
    assert.equal(validated.root_cause, item.code);
    assert.equal(validated.recommended_action, item.expectedAction);
  }
});

// 2. All 3 Workflows: Failed Payment, Checkout Abandonment, Overdue Invoice
test('Day 7: verify Failed Payment workflow strategy and policy', async () => {
  const analysis = await analyze({
    case_type: 'failed_payment',
    failure_reason: 'insufficient_funds',
    amount_at_risk: 2500,
    retry_count: 0
  });
  assert.equal(analysis.root_cause, 'insufficient_funds');
  assert.equal(analysis.recommended_action, 'retry_payment_later');

  const policyDecision = evaluate(
    { case_type: 'failed_payment', status: 'open', retry_count: 0, amount_at_risk: 2500 },
    analysis.recommended_action
  );
  assert.equal(policyDecision.allowed, true);
});

test('Day 7: verify Checkout Abandonment workflow strategy and policy', async () => {
  const analysis = await analyze({
    case_type: 'checkout_abandonment',
    failure_reason: 'user_distraction',
    amount_at_risk: 4999,
    reminder_count: 0
  });
  assert.equal(analysis.root_cause, 'user_distraction');
  assert.equal(analysis.recommended_action, 'send_checkout_recovery');

  const policyDecision = evaluate(
    { case_type: 'checkout_abandonment', status: 'open', reminder_count: 0, amount_at_risk: 4999 },
    analysis.recommended_action
  );
  assert.equal(policyDecision.allowed, true);
});

test('Day 7: verify Overdue Invoice workflow strategy and policy', async () => {
  const analysis = await analyze({
    case_type: 'overdue_invoice',
    amount_at_risk: 60000,
    overdue_days: 12,
    reminder_count: 0
  });
  assert.equal(analysis.root_cause, 'overdue_invoice');
  assert.ok(['send_payment_reminder', 'send_invoice_notification'].includes(analysis.recommended_action));

  const policyDecision = evaluate(
    { case_type: 'overdue_invoice', status: 'open', reminder_count: 0, amount_at_risk: 60000, overdue_days: 12 },
    analysis.recommended_action
  );
  assert.equal(policyDecision.allowed, true);
});

// 3. Policy Engine Thresholds and Guards
test('Day 7: policy engine guards against excessive retries, high value, and extreme aging', () => {
  // Max retries exceeded
  const retryBlocked = evaluate(
    { case_type: 'failed_payment', status: 'open', retry_count: MAX_RETRIES, amount_at_risk: 1000 },
    'retry_payment'
  );
  assert.equal(retryBlocked.allowed, false);
  assert.equal(retryBlocked.escalate, true);

  // High value threshold
  const highValBlocked = evaluate(
    { case_type: 'failed_payment', status: 'open', retry_count: 0, amount_at_risk: HIGH_VALUE_THRESHOLD + 1000 },
    'retry_payment'
  );
  assert.equal(highValBlocked.allowed, false);
  assert.equal(highValBlocked.escalate, true);

  // Extreme overdue days
  const extremeAgingBlocked = evaluate(
    { case_type: 'overdue_invoice', status: 'open', reminder_count: 0, amount_at_risk: 5000, overdue_days: EXTREME_OVERDUE_DAYS + 5 },
    'send_payment_reminder'
  );
  assert.equal(extremeAgingBlocked.allowed, false);
  assert.equal(extremeAgingBlocked.escalate, true);

  // Closed or recovered case blocked
  const closedBlocked = evaluate(
    { case_type: 'failed_payment', status: 'recovered', retry_count: 0, amount_at_risk: 1000 },
    'retry_payment'
  );
  assert.equal(closedBlocked.allowed, false);
});

// 4. Security: No secrets leakage in analysis or config
test('Day 7: resolveGroqConfig safely encapsulates server-side secrets without leaking into payload', () => {
  process.env.GROQ_API_KEY = 'gsk_secret_test_key_12345';
  const cfg = resolveGroqConfig();
  assert.equal(cfg.apiKey, 'gsk_secret_test_key_12345');

  const strat = buildRecoveryStrategy('temporary_failure', { amount_at_risk: 1000 });
  const str = JSON.stringify(strat);
  assert.equal(str.includes('gsk_secret_test_key_12345'), false);
  assert.equal(str.includes('GROQ_API_KEY'), false);
});

// 5. Groq Failure & Unsupported Actions Safety
test('Day 7: validateAnalysis rejects arbitrary actions and falls back safely on invalid input', () => {
  assert.throws(() => {
    validateAnalysis({
      root_cause: 'temporary_failure',
      recommended_action: 'send_fraudulent_charge',
      risk_level: 'low',
      reason: 'Malicious action'
    });
  }, /AI response contains an unsafe recommended action/);
});
