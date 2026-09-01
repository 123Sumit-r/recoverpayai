const test = require('node:test');
const assert = require('node:assert/strict');
const { analyze, validateAnalysis } = require('../services/aiAnalysisService');
const { evaluate } = require('../services/policyService');
const checkoutController = require('../controllers/checkoutController');
const checkoutModel = require('../models/checkoutModel');

function responseSpy() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test('checkout lifecycle accepts completion and abandonment separately', async () => {
  const originalComplete = checkoutModel.complete;
  const originalAbandon = checkoutModel.abandon;
  checkoutModel.complete = async () => ({ id: 1, status: 'completed' });
  checkoutModel.abandon = async () => ({ id: 2, status: 'abandoned', abandonment_reason: 'payment_friction' });
  try {
    const completed = responseSpy();
    await checkoutController.updateCheckout({ params: { id: '1' }, body: { status: 'completed' } }, completed, () => {});
    assert.equal(completed.body.data.status, 'completed');
    const abandoned = responseSpy();
    await checkoutController.updateCheckout({ params: { id: '2' }, body: { status: 'abandoned', abandonment_reason: 'payment_friction' } }, abandoned, () => {});
    assert.equal(abandoned.body.data.status, 'abandoned');
  } finally {
    checkoutModel.complete = originalComplete;
    checkoutModel.abandon = originalAbandon;
  }
});

test('checkout abandonment gets an allowlisted AI recommendation and policy approval', async () => {
  const analysis = await analyze({ case_type: 'checkout_abandonment', failure_reason: 'payment_friction', amount_at_risk: 2499, reminder_count: 0 });
  assert.equal(validateAnalysis(analysis).root_cause, 'payment_friction');
  assert.equal(analysis.recommended_action, 'send_checkout_recovery');
  assert.equal(evaluate({ case_type: 'checkout_abandonment', status: 'open', reminder_count: 0, amount_at_risk: 2499 }, analysis.recommended_action).allowed, true);
});

test('checkout recovery reminder limit blocks the third simulated reminder', () => {
  const decision = evaluate({ case_type: 'checkout_abandonment', status: 'open', reminder_count: 2, amount_at_risk: 2499 }, 'send_checkout_recovery');
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'Maximum checkout reminder limit reached.');
});