const test = require('node:test');
const assert = require('node:assert/strict');
const { analyze, validateAnalysis } = require('../services/aiAnalysisService');
const { evaluate } = require('../services/policyService');
const invoiceModel = require('../models/invoiceModel');
const invoiceController = require('../controllers/invoiceController');

function responseSpy() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

test('future due date invoice is not overdue and has 0 days_overdue', () => {
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const mapped = invoiceModel.mapInvoice({
    id: 100,
    customer_id: 1,
    amount: '50000.00',
    due_date: futureDate,
    status: 'pending'
  });
  assert.equal(mapped.status, 'pending');
  assert.equal(mapped.days_overdue, 0);
  assert.equal(mapped.amount, 50000);
});

test('past due date invoice calculates positive days_overdue and maps amount', () => {
  const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const mapped = invoiceModel.mapInvoice({
    id: 101,
    customer_id: 1,
    amount: '75000.00',
    due_date: pastDate,
    status: 'overdue',
    days_overdue: 10
  });
  assert.equal(mapped.status, 'overdue');
  assert.equal(mapped.days_overdue, 10);
  assert.equal(mapped.amount, 75000);
});

test('overdue invoice gets allowlisted AI recommendation and policy approval', async () => {
  const analysis = await analyze({
    case_type: 'overdue_invoice',
    amount_at_risk: 45000,
    overdue_days: 5,
    reminder_count: 0
  });
  const validated = validateAnalysis(analysis);
  assert.equal(validated.root_cause, 'overdue_invoice');
  assert.ok(['send_payment_reminder', 'send_invoice_notification'].includes(validated.recommended_action));

  const policyDecision = evaluate(
    { case_type: 'overdue_invoice', status: 'open', reminder_count: 0, amount_at_risk: 45000, overdue_days: 5 },
    validated.recommended_action
  );
  assert.equal(policyDecision.allowed, true);
});

test('policy engine blocks overdue invoice reminder when reminder limit is reached', () => {
  const decision = evaluate(
    { case_type: 'overdue_invoice', status: 'open', reminder_count: 2, amount_at_risk: 45000, overdue_days: 5 },
    'send_payment_reminder'
  );
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'Maximum automated reminder limit reached.');
});

test('policy engine escalates high-value or extreme overdue invoice', () => {
  const decisionHighVal = evaluate(
    { case_type: 'overdue_invoice', status: 'open', reminder_count: 0, amount_at_risk: 750000, overdue_days: 5 },
    'send_payment_reminder'
  );
  assert.equal(decisionHighVal.allowed, false);
  assert.equal(decisionHighVal.escalate, true);

  const decisionExtremeOverdue = evaluate(
    { case_type: 'overdue_invoice', status: 'open', reminder_count: 0, amount_at_risk: 25000, overdue_days: 45 },
    'send_payment_reminder'
  );
  assert.equal(decisionExtremeOverdue.allowed, false);
  assert.equal(decisionExtremeOverdue.escalate, true);
});

test('validateAnalysis rejects arbitrary or unsupported AI actions', () => {
  assert.throws(() => {
    validateAnalysis({
      root_cause: 'overdue_invoice',
      risk_level: 'medium',
      recommended_action: 'send_arbitrary_legal_notice',
      reason: 'Should be blocked'
    });
  }, /AI response contains an unsafe recommended action/);
});
