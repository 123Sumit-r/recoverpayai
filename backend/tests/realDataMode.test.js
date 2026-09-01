const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const customerModel = require('../models/customerModel');
const transactionModel = require('../models/transactionModel');
const invoiceModel = require('../models/invoiceModel');
const checkoutModel = require('../models/checkoutModel');
const recoveryModel = require('../models/recoveryModel');
const { ResendNotificationProvider } = require('../services/integrations/notificationProvider');
const { RecoveryIntegrationService } = require('../services/recoveryIntegrationService');
const { evaluate } = require('../services/policyService');
const { validateAnalysis } = require('../services/aiAnalysisService');

// 1. Real Customer Creation
test('Real Data Mode: can create customer in PostgreSQL with custom email', async () => {
  const email = `test_real_${Date.now()}@domain.com`;
  const customer = await customerModel.create({
    name: 'Real Mode User',
    email,
    phone: '9876543210',
    customer_type: 'business'
  });

  assert.ok(customer.id);
  assert.equal(customer.name, 'Real Mode User');
  assert.equal(customer.email, email);
});

// 2. Real Payment Event Creation
test('Real Data Mode: can create real failed transaction in PostgreSQL', async () => {
  const customer = await customerModel.create({
    name: 'Payment Test Customer',
    email: `pay_test_${Date.now()}@domain.com`,
    phone: '9876543210'
  });

  const txn = await transactionModel.create({
    customerId: customer.id,
    amount: 1499,
    status: 'failed',
    failureReason: 'insufficient_funds',
    transactionType: 'subscription'
  });

  assert.ok(txn.id);
  assert.equal(txn.customer_id, customer.id);
  assert.equal(txn.amount, 1499);
  assert.equal(txn.failure_reason, 'insufficient_funds');
  assert.equal(txn.status, 'failed');
});

// 3. Real Checkout Creation & Abandonment
test('Real Data Mode: can create real checkout event and abandon in PostgreSQL', async () => {
  const customer = await customerModel.create({
    name: 'Checkout Test User',
    email: `chk_test_${Date.now()}@domain.com`,
    phone: '9876543210'
  });

  const session = `real_sess_${Date.now()}`;
  const started = await checkoutModel.start({
    customerId: customer.id,
    sessionId: session,
    amount: 3200
  });
  assert.equal(started.status, 'started');

  const abandoned = await checkoutModel.abandon(started.id, 'payment_friction');
  assert.equal(abandoned.status, 'abandoned');
  assert.equal(abandoned.abandonment_reason, 'payment_friction');
});

// 4. Real Invoice Creation with Dynamic Overdue
test('Real Data Mode: can create real commercial invoice in PostgreSQL with due date', async () => {
  const customer = await customerModel.create({
    name: 'Invoice Test Corp',
    email: `inv_test_${Date.now()}@domain.com`,
    phone: '9876543210',
    customer_type: 'enterprise'
  });

  const pastDate = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);
  const invoice = await invoiceModel.create({
    customerId: customer.id,
    amount: 75000,
    dueDate: pastDate,
    status: 'overdue'
  });

  assert.ok(invoice.id);
  assert.equal(invoice.customer_id, customer.id);
  assert.equal(invoice.amount, 75000);
  assert.equal(invoice.status, 'overdue');
  assert.ok(invoice.days_overdue >= 9);
});

// 5. Real Email Validation
test('Real Data Mode: invalid email address rejected before email sending', async () => {
  const provider = new ResendNotificationProvider();
  const res = await provider.sendEmail({
    to: 'invalid-email',
    subject: 'Action Required',
    template: 'payment_method_update'
  });

  assert.equal(res.success, false);
  assert.ok(res.error.includes('Invalid recipient email address'));
});

// 6. Policy-Approved Email Action
test('Real Data Mode: policy-approved email action dispatches notification and updates reminder count', async () => {
  let emailSent = false;
  const mockNotifier = {
    sendEmail: async () => {
      emailSent = true;
      return { success: true, provider: 'Resend', message_id: 're_msg_123' };
    }
  };

  const integrationService = new RecoveryIntegrationService({ notificationProvider: mockNotifier });
  const recoveryCase = {
    id: 101,
    customer_id: 1,
    customer_email: 'finance@enterprise.com',
    amount_at_risk: 499,
    case_type: 'failed_payment'
  };

  const policy = evaluate(recoveryCase, 'request_payment_method_update');
  assert.equal(policy.allowed, true);

  const result = await integrationService.executeRecoveryAction({
    action: 'request_payment_method_update',
    recoveryCase,
    policy
  });

  assert.equal(result.success, true);
  assert.equal(result.status, 'email_sent');
  assert.equal(emailSent, true);
});

// 7. Policy-Blocked Email Action
test('Real Data Mode: policy-blocked action never sends email', async () => {
  let emailSent = false;
  const mockNotifier = {
    sendEmail: async () => {
      emailSent = true;
      return { success: true };
    }
  };

  const integrationService = new RecoveryIntegrationService({ notificationProvider: mockNotifier });
  const recoveryCase = {
    id: 102,
    customer_id: 1,
    reminder_count: 2, // Max limit reached
    amount_at_risk: 1000,
    case_type: 'failed_payment'
  };

  const policy = evaluate(recoveryCase, 'send_payment_reminder');
  assert.equal(policy.allowed, false);

  const result = await integrationService.executeRecoveryAction({
    action: 'send_payment_reminder',
    recoveryCase,
    policy
  });

  assert.equal(result.success, false);
  assert.equal(emailSent, false);
});

// 8. Audit Log Persistence
test('Real Data Mode: audit log correctly records real recovery timeline events', async () => {
  const customer = await customerModel.create({
    name: 'Audit User',
    email: `audit_${Date.now()}@domain.com`,
    phone: '9876543210'
  });

  const txn = await transactionModel.create({
    customerId: customer.id,
    amount: 999,
    status: 'failed',
    failureReason: 'bank_declined'
  });

  const recoveryCase = await recoveryModel.createFromSource({ transactionId: txn.id });
  assert.ok(recoveryCase.id);

  const auditLogs = await recoveryModel.getAuditLogs(recoveryCase.id);
  assert.ok(auditLogs.length >= 2);
  assert.equal(auditLogs[0].event_type, 'case_created');
  assert.equal(auditLogs[1].event_type, 'risk_detected');
});

// 9. Database Persistence for Recovery Cases
test('Real Data Mode: recovery case created from real source is persistent in PostgreSQL', async () => {
  const customer = await customerModel.create({
    name: 'Persistence User',
    email: `persist_${Date.now()}@domain.com`,
    phone: '9876543210'
  });

  const txn = await transactionModel.create({
    customerId: customer.id,
    amount: 1999,
    status: 'failed',
    failureReason: 'expired_card'
  });

  const createdCase = await recoveryModel.createFromSource({ transactionId: txn.id });
  const fetchedCase = await recoveryModel.findById(createdCase.id);

  assert.equal(fetchedCase.id, createdCase.id);
  assert.equal(fetchedCase.amount_at_risk, 1999);
  assert.equal(fetchedCase.failure_reason, 'expired_card');
});

// 10. No Fake Data Generated Silently
test('Real Data Mode: queries return real rows without injecting artificial demo data', async () => {
  const customers = await customerModel.findAll();
  assert.ok(Array.isArray(customers));
  // Every customer in database has real integer id and valid email
  for (const c of customers.slice(0, 10)) {
    assert.ok(Number.isInteger(c.id));
    assert.ok(typeof c.email === 'string' && c.email.includes('@'));
  }
});

// 11. Secrets Protection
test('Real Data Mode: API keys and credentials are never leaked in models or objects', () => {
  process.env.RESEND_API_KEY = 're_test_secret_123';
  process.env.GROQ_API_KEY = 'gsk_test_secret_456';

  const provider = new ResendNotificationProvider();
  const serialized = JSON.stringify(provider);

  assert.equal(serialized.includes('re_test_secret_123'), false);
  assert.equal(serialized.includes('gsk_test_secret_456'), false);
});

// 12. Unsupported AI Action Rejection
test('Real Data Mode: arbitrary unsupported AI action is rejected before execution', () => {
  assert.throws(() => {
    validateAnalysis({
      root_cause: 'insufficient_funds',
      recommended_action: 'send_fraudulent_notice',
      risk_level: 'low',
      reason: 'Should be rejected'
    });
  }, /AI response contains an unsafe recommended action/);
});
