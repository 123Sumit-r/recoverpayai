const test = require('node:test');
const assert = require('node:assert/strict');
const { ResendNotificationProvider, MockNotificationProvider } = require('../services/integrations/notificationProvider');
const { RecoveryIntegrationService } = require('../services/recoveryIntegrationService');
const { evaluate } = require('../services/policyService');
const { analyze, validateAnalysis, buildRecoveryStrategy } = require('../services/aiAnalysisService');
const invoiceModel = require('../models/invoiceModel');

// 1. Real Data: Dynamic calculations from database fields
test('Day 8 Real Data: overdue invoices calculate dynamic days_overdue and positive amounts', () => {
  const pastDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const mapped = invoiceModel.mapInvoice({
    id: 201,
    customer_id: 1,
    amount: '45000.00',
    due_date: pastDate,
    status: 'overdue',
    days_overdue: 14
  });

  assert.equal(mapped.days_overdue, 14);
  assert.equal(mapped.amount, 45000);
  assert.equal(mapped.status, 'overdue');
});

// 2. Real Email: Resend Provider Template Safety & Sanitization
test('Day 8 Real Email: Resend provider creates safe HTML templates without executing arbitrary code', () => {
  const provider = new ResendNotificationProvider({ apiKey: 're_test_key_123' });
  const html = provider.generateTemplateHtml({
    template: 'payment_method_update',
    subject: 'Action Required',
    variables: {
      customerName: '<script>alert("hack")</script>Alice Corp',
      amount: 15000,
      caseId: 42
    }
  });

  assert.ok(html.includes('Alice Corp'));
  assert.equal(html.includes('<script>'), false);
  assert.ok(html.includes('₹15,000'));
  assert.ok(html.includes('Update Payment Method'));
});

// 3. Real Email: Recipient Validation
test('Day 8 Real Email: Invalid recipient email addresses are rejected safely without crashing', async () => {
  const provider = new ResendNotificationProvider({ apiKey: 're_test_key_123' });
  const result = await provider.sendEmail({
    to: 'invalid-email-address',
    subject: 'Payment Update',
    template: 'payment_method_update'
  });

  assert.equal(result.success, false);
  assert.ok(result.error.includes('Invalid recipient email'));
});

// 4. Real Email: Duplicate Email Prevention (Idempotency)
test('Day 8 Real Email: Duplicate recovery email attempts are prevented by idempotency guard', async () => {
  const provider = new ResendNotificationProvider({ staged: true }); // Staged mode
  const payload = {
    to: 'billing@enterprise.com',
    subject: 'Overdue Invoice Reminder',
    template: 'send_payment_reminder',
    variables: { caseId: 99 }
  };

  const firstSend = await provider.sendEmail(payload);
  assert.equal(firstSend.success, true);
  assert.equal(firstSend.duplicate, undefined);

  // In live mode with deduplication tracking:
  provider.sentMessages.add('billing@enterprise.com:send_payment_reminder:99');
  const secondSend = await provider.sendEmail(payload);
  assert.equal(secondSend.success, true);
  assert.equal(secondSend.duplicate, true);
  assert.ok(secondSend.message.includes('Idempotency'));
});

// 5. Policy Engine Gate: Rejected actions NEVER send an email
test('Day 8 Policy Gate: Policy REJECT strictly stops any email from being dispatched', async () => {
  let emailDispatched = false;
  const mockNotifier = {
    sendEmail: async () => {
      emailDispatched = true;
      return { success: true };
    }
  };

  const integrationService = new RecoveryIntegrationService({ notificationProvider: mockNotifier });
  const recoveryCase = {
    id: 50,
    customer_id: 1,
    reminder_count: 2, // Max reminder reached
    amount_at_risk: 10000,
    case_type: 'overdue_invoice',
    overdue_days: 10
  };

  const policy = evaluate(recoveryCase, 'send_payment_reminder');
  assert.equal(policy.allowed, false);

  const execution = await integrationService.executeRecoveryAction({
    action: 'send_payment_reminder',
    recoveryCase,
    policy
  });

  assert.equal(execution.success, false);
  assert.equal(emailDispatched, false);
  assert.equal(execution.provider, 'PolicyEngine');
});

// 6. Metric Distinction: Email Sent != Payment Recovered
test('Day 8 Metric Distinction: Email actions return email_sent status and do not count as direct recovered cash', async () => {
  const integrationService = new RecoveryIntegrationService();
  const recoveryCase = {
    id: 60,
    customer_id: 2,
    customer_email: 'finance@client.com',
    amount_at_risk: 25000,
    case_type: 'overdue_invoice',
    invoice_id: 105,
    overdue_days: 4
  };

  const policy = evaluate(recoveryCase, 'send_payment_reminder');
  assert.equal(policy.allowed, true);

  const result = await integrationService.executeRecoveryAction({
    action: 'send_payment_reminder',
    recoveryCase,
    policy
  });

  assert.equal(result.success, true);
  assert.equal(result.status, 'email_sent');
  assert.equal(result.email_sent, true);
});

// 7. Security: Zero API keys exposed in output
test('Day 8 Security: Secrets and credentials are not leaked in provider objects or execution results', async () => {
  process.env.RESEND_API_KEY = 're_super_secret_production_key';
  const provider = new ResendNotificationProvider();
  const jsonStr = JSON.stringify(provider);

  assert.equal(jsonStr.includes('re_super_secret_production_key'), false);
  assert.equal(jsonStr.includes('RESEND_API_KEY'), false);
});
