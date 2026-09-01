const test = require('node:test');
const assert = require('node:assert/strict');
const { RecoveryIntegrationService } = require('../services/recoveryIntegrationService');
const { MockPaymentGatewayProvider } = require('../services/integrations/paymentGatewayProvider');
const { MockNotificationProvider } = require('../services/integrations/notificationProvider');
const { MockCRMProvider } = require('../services/integrations/crmProvider');
const { MockInvoiceProvider } = require('../services/integrations/invoiceProvider');
const { evaluate } = require('../services/policyService');
const { validateAnalysis } = require('../services/aiAnalysisService');

// A. Simulation mode -> recovery is simulated
test('Integration Layer: default mode is simulated and returns simulated provider results', async () => {
  delete process.env.RECOVERY_MODE;
  delete process.env.REAL_ACTIONS_ENABLED;

  const service = new RecoveryIntegrationService();
  const modeConfig = service.resolveRecoveryMode();
  assert.equal(modeConfig.mode, 'simulated');

  const recoveryCase = {
    id: 10,
    customer_id: 1,
    transaction_id: 2, // Even -> succeeds in mock
    amount_at_risk: 1500,
    case_type: 'failed_payment'
  };
  const policy = evaluate(recoveryCase, 'retry_payment');

  const result = await service.executeRecoveryAction({
    action: 'retry_payment',
    recoveryCase,
    policy
  });

  assert.equal(result.success, true);
  assert.equal(result.status, 'succeeded');
  assert.equal(result.simulated, true);
  assert.equal(result.mode, 'simulated');
  assert.ok(result.provider.includes('MockPaymentGateway'));
});

// B. Real mode disabled by double-lock protection
test('Integration Layer: RECOVERY_MODE=real without REAL_ACTIONS_ENABLED=true safely guards execution', async () => {
  process.env.RECOVERY_MODE = 'real';
  process.env.REAL_ACTIONS_ENABLED = 'false';

  const service = new RecoveryIntegrationService();
  const modeConfig = service.resolveRecoveryMode();
  assert.equal(modeConfig.mode, 'simulated');
  assert.equal(modeConfig.guarded, true);
  assert.equal(modeConfig.realActionsEnabled, false);

  const recoveryCase = {
    id: 12,
    customer_id: 1,
    transaction_id: 4,
    amount_at_risk: 2500,
    case_type: 'failed_payment'
  };
  const policy = evaluate(recoveryCase, 'retry_payment');

  const result = await service.executeRecoveryAction({
    action: 'retry_payment',
    recoveryCase,
    policy
  });

  assert.equal(result.simulated, true);
  assert.equal(result.details.guarded, true);
});

// C. Policy REJECT -> no provider is called
test('Integration Layer: rejected policy action is blocked before reaching external provider', async () => {
  const service = new RecoveryIntegrationService();
  const recoveryCase = {
    id: 14,
    customer_id: 1,
    retry_count: 3, // Max retries exceeded
    amount_at_risk: 1500,
    case_type: 'failed_payment'
  };
  const policy = evaluate(recoveryCase, 'retry_payment');
  assert.equal(policy.allowed, false);

  const result = await service.executeRecoveryAction({
    action: 'retry_payment',
    recoveryCase,
    policy
  });

  assert.equal(result.success, false);
  assert.equal(result.status, 'escalated');
  assert.equal(result.provider, 'PolicyEngine');
});

// D. Policy ESCALATE -> routed to CRM without automated payment action
test('Integration Layer: escalate_to_human routes to CRM ticket and creates no payment charge', async () => {
  const service = new RecoveryIntegrationService();
  const recoveryCase = {
    id: 20,
    customer_id: 5,
    amount_at_risk: 750000, // High value
    case_type: 'overdue_invoice',
    overdue_days: 45
  };
  const policy = evaluate(recoveryCase, 'escalate_to_human');
  assert.equal(policy.allowed, true);

  const result = await service.executeRecoveryAction({
    action: 'escalate_to_human',
    recoveryCase,
    policy
  });

  assert.equal(result.success, true);
  assert.equal(result.status, 'escalated');
  assert.ok(result.provider.includes('MockCRMProvider'));
  assert.ok(result.details.crm.crm_case_id);
});

// E. Policy ALLOW + simulation -> dispatches notifications & invoice updates
test('Integration Layer: overdue invoice reminder dispatches notification and updates ERP ledger', async () => {
  const service = new RecoveryIntegrationService();
  const recoveryCase = {
    id: 30,
    customer_id: 2,
    customer_email: 'finance@corp.com',
    invoice_id: 101,
    amount_at_risk: 45000,
    case_type: 'overdue_invoice',
    overdue_days: 5
  };
  const policy = evaluate(recoveryCase, 'send_payment_reminder');
  assert.equal(policy.allowed, true);

  const result = await service.executeRecoveryAction({
    action: 'send_payment_reminder',
    recoveryCase,
    policy
  });

  assert.equal(result.success, true);
  assert.equal(result.status, 'email_sent');
  assert.ok(result.provider.includes('MockNotificationProvider'));
  assert.ok(result.provider.includes('MockInvoiceProvider'));
  assert.ok(result.details.notification.message_id);
  assert.ok(result.details.invoice_ledger.sync_reference);
});

// F. Invalid AI action -> rejected before integration
test('Integration Layer: validateAnalysis rejects invalid actions prior to integration dispatch', () => {
  assert.throws(() => {
    validateAnalysis({
      root_cause: 'temporary_failure',
      recommended_action: 'unsupported_wire_transfer',
      risk_level: 'low',
      reason: 'Invalid action test'
    });
  }, /AI response contains an unsafe recommended action/);
});

// G. Secrets: No credentials stored or exposed
test('Integration Layer: providers never store or expose credentials or API keys in response objects', async () => {
  const gw = new MockPaymentGatewayProvider();
  const res = await gw.retryPayment({ transactionId: 8, customerId: 1, amount: 2000 });
  const str = JSON.stringify(res);

  assert.equal(str.includes('apiKey'), false);
  assert.equal(str.includes('password'), false);
  assert.equal(str.includes('secret'), false);
  assert.equal(str.includes('card_number'), false);
  assert.equal(str.includes('cvv'), false);
});
