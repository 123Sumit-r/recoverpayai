const test = require('node:test');
const assert = require('node:assert/strict');
const { analyze, validateAnalysis, buildRecoveryStrategy, resolveGroqConfig } = require('../services/aiAnalysisService');
const { evaluate } = require('../services/policyService');

test('resolveGroqConfig prefers GROQ_API_KEY and Groq endpoint', () => {
  process.env.GROQ_API_KEY = 'gk_test';
  process.env.AI_API_KEY = 'old_key';
  process.env.GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
  process.env.GROQ_MODEL = 'openai/gpt-oss-20b';
  process.env.GROQ_USE_REMOTE = 'true';

  const config = resolveGroqConfig();
  assert.equal(config.apiKey, 'gk_test');
  assert.equal(config.baseUrl, 'https://api.groq.com/openai/v1');
  assert.equal(config.model, 'openai/gpt-oss-20b');
  assert.equal(config.remoteEnabled, true);
});

test('buildRecoveryStrategy returns a reasoned plan for failed payment causes', () => {
  const plan = buildRecoveryStrategy('insufficient_funds', { amount_at_risk: 2500, retry_count: 0, case_type: 'failed_payment' });
  assert.equal(plan.action, 'retry_payment_later');
  assert.equal(plan.reason.includes('later'), true);
});

test('validateAnalysis accepts a structured Groq response', () => {
  const parsed = validateAnalysis({
    root_cause: 'invalid_payment_method',
    risk_level: 'high',
    recommended_action: 'request_payment_method_update',
    reason: 'Card on file is invalid.'
  });
  assert.equal(parsed.root_cause, 'invalid_payment_method');
  assert.equal(parsed.recommended_action, 'request_payment_method_update');
});

test('policy engine blocks excessive retries and high-value actions without escalation', () => {
  const decision = evaluate({ status: 'open', retry_count: 3, reminder_count: 2, amount_at_risk: 600000, overdue_days: 10 }, 'retry_payment');
  assert.equal(decision.allowed, false);
  assert.equal(decision.escalate, true);
});

test('analyze falls back deterministically when remote AI is disabled', async () => {
  delete process.env.GROQ_API_KEY;
  delete process.env.AI_API_KEY;
  delete process.env.GROQ_USE_REMOTE;
  delete process.env.AI_USE_REMOTE;
  const result = await analyze({ case_type: 'failed_payment', failure_reason: 'temporary_failure', amount_at_risk: 1500, previous_failed_transactions: 1, retry_count: 0 });
  assert.equal(result.root_cause, 'temporary_failure');
  assert.equal(result.recommended_action, 'retry_payment');
});
