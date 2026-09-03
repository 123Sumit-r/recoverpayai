const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = require('../config/database');
const customerModel = require('../models/customerModel');
const transactionModel = require('../models/transactionModel');
const razorpayService = require('../services/razorpayService');
const paymentEventModel = require('../models/paymentEventModel');
const recoveryModel = require('../models/recoveryModel');

const WEBHOOK_SECRET = 'test_webhook_secret';

function createPayload(overrides = {}) {
  return {
    id: overrides.eventId || 'evt_test_123',
    event: overrides.event || 'payment.failed',
    payload: {
      payment: {
        id: overrides.paymentId || 'pay_test_123',
        amount: overrides.amount || 50000,
        currency: 'INR',
        status: overrides.status || 'failed',
        method: 'card',
        order_id: overrides.orderId || 'order_test_123',
        email: 'customer@example.com',
        contact: '+919876543210',
        error_description: 'Card declined',
        error_reason: 'insufficient_funds'
      }
    }
  };
}

function sign(payload) {
  const rawBody = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  return { rawBody, signature };
}

function createNestedPayload(eventId = `evt_nested_${Date.now()}`) {
  return {
    entity: 'event',
    id: eventId,
    event: 'payment.failed',
    payload: {
      payment: {
        entity: {
          id: `pay_nested_${Date.now()}`,
          amount: 300,
          currency: 'INR',
          status: 'failed',
          method: 'netbanking',
          order_id: `order_nested_${Date.now()}`,
          email: `nested_${Date.now()}@example.com`,
          contact: '+919876543210',
          error_description: 'Payment declined by the bank',
          error_reason: 'payment_failed'
        }
      }
    }
  };
}

function createResponse() {
  return {
    statusCode: null,
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

test('accepts a valid Razorpay webhook signature', () => {
  const { rawBody, signature } = sign(createPayload());
  const result = razorpayService.verifyWebhookSignature(
    rawBody,
    signature,
    WEBHOOK_SECRET
  );

  assert.equal(result.valid, true);
});

test('rejects an invalid Razorpay webhook signature', () => {
  const { rawBody } = sign(createPayload());
  const result = razorpayService.verifyWebhookSignature(
    rawBody,
    'invalid-signature',
    WEBHOOK_SECRET
  );

  assert.equal(result.valid, false);
});

test('parses a payment.failed webhook event', () => {
  const result = razorpayService.parsePaymentWebhook(createPayload());

  assert.equal(result.valid, true);
  assert.equal(result.eventType, 'payment.failed');
  assert.equal(result.status, 'failed');
  assert.equal(result.paymentId, 'pay_test_123');
});

test('maps Razorpay card-expired reasons to expired_card', () => {
  const result = razorpayService.mapFailureReason('card_expired Payment failed', 'card');

  assert.equal(result.reason, 'expired_card');
});

test('parses a nested Razorpay payment amount in rupees', () => {
  const result = razorpayService.parsePaymentWebhook(createNestedPayload());

  assert.equal(result.amount, 3);
  assert.ok(result.amount > 0);
  assert.equal(result.status, 'failed');
});

test('processes a nested payment.failed webhook into linked transaction and recovery case', async () => {
  const { handleRazorpayPaymentWebhook } = require('../controllers/razorpayWebhookController');
  const payload = createNestedPayload();
  const { rawBody, signature } = sign(payload);
  const response = createResponse();
  const customerEmail = payload.payload.payment.entity.email;

  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;

  try {
    await handleRazorpayPaymentWebhook({
      rawBody,
      headers: { 'x-razorpay-signature': signature }
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);

    const customer = await customerModel.findByEmail(customerEmail);
    const transactions = await pool.query(
      'SELECT * FROM transactions WHERE customer_id = $1 ORDER BY id DESC',
      [customer.id]
    );
    const paymentEvent = await paymentEventModel.getByRazorpayEventId(payload.id);
    const recoveryCase = await pool.query(
      'SELECT * FROM recovery_cases WHERE payment_event_id = $1',
      [paymentEvent.id]
    );

    assert.equal(transactions.rows.length, 1);
    assert.equal(Number(transactions.rows[0].amount), 3);
    assert.equal(transactions.rows[0].status, 'failed');
    assert.equal(recoveryCase.rows.length, 1);
    assert.equal(recoveryCase.rows[0].transaction_id, transactions.rows[0].id);
    assert.equal(recoveryCase.rows[0].payment_event_id, paymentEvent.id);

    const emailAudit = await pool.query(
      'SELECT recipient FROM email_audit_logs WHERE case_id = $1 ORDER BY id DESC LIMIT 1',
      [recoveryCase.rows[0].id]
    );
    assert.equal(emailAudit.rows[0].recipient, customerEmail);
  } finally {
    const customer = await customerModel.findByEmail(customerEmail);
    if (customer) {
      await pool.query('DELETE FROM recovery_cases WHERE customer_id = $1', [customer.id]);
      await pool.query('DELETE FROM payment_events WHERE customer_id = $1', [customer.id]);
      await pool.query('DELETE FROM transactions WHERE customer_id = $1', [customer.id]);
      await pool.query('DELETE FROM customers WHERE id = $1', [customer.id]);
    }
  }
});

test('duplicate nested webhooks create one payment event, transaction, and recovery case', async () => {
  const { handleRazorpayPaymentWebhook } = require('../controllers/razorpayWebhookController');
  const payload = createNestedPayload(`evt_duplicate_integration_${Date.now()}`);
  const { rawBody, signature } = sign(payload);
  const customerEmail = payload.payload.payment.entity.email;
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;

  try {
    const firstResponse = createResponse();
    const secondResponse = createResponse();
    const request = { rawBody, headers: { 'x-razorpay-signature': signature } };

    await handleRazorpayPaymentWebhook(request, firstResponse);
    await handleRazorpayPaymentWebhook(request, secondResponse);

    const customer = await customerModel.findByEmail(customerEmail);
    const paymentEvents = await pool.query(
      'SELECT * FROM payment_events WHERE razorpay_event_id = $1',
      [payload.id]
    );
    const transactions = await pool.query(
      'SELECT * FROM transactions WHERE customer_id = $1',
      [customer.id]
    );
    const recoveryCases = await pool.query(
      'SELECT * FROM recovery_cases WHERE payment_event_id = $1',
      [paymentEvents.rows[0].id]
    );
    const emailAudits = await pool.query(
      'SELECT recipient FROM email_audit_logs WHERE case_id = $1',
      [recoveryCases.rows[0].id]
    );

    assert.equal(firstResponse.statusCode, 200);
    assert.equal(secondResponse.statusCode, 200);
    assert.equal(secondResponse.body.duplicate, true);
    assert.equal(paymentEvents.rows.length, 1);
    assert.equal(transactions.rows.length, 1);
    assert.equal(recoveryCases.rows.length, 1);
    assert.equal(emailAudits.rows.length, 1);
    assert.equal(emailAudits.rows[0].recipient, customerEmail);
  } finally {
    const customer = await customerModel.findByEmail(customerEmail);
    if (customer) {
      await pool.query('DELETE FROM recovery_cases WHERE customer_id = $1', [customer.id]);
      await pool.query('DELETE FROM payment_events WHERE customer_id = $1', [customer.id]);
      await pool.query('DELETE FROM transactions WHERE customer_id = $1', [customer.id]);
      await pool.query('DELETE FROM customers WHERE id = $1', [customer.id]);
    }
  }
});

test('returns the existing event for a duplicate webhook', async () => {
  const originalQuery = pool.query;
  const events = new Map();
  let nextId = 1;

  pool.query = async (query, values = []) => {
    const eventId = values[0];
    if (query.includes('SELECT * FROM payment_events')) {
      return { rows: events.has(eventId) ? [events.get(eventId)] : [] };
    }

    const event = {
      id: nextId++,
      razorpay_event_id: eventId,
      razorpay_payment_id: values[1]
    };
    events.set(eventId, event);
    return { rows: [event] };
  };

  const eventData = {
    razorpayEventId: 'evt_duplicate_test',
    razorpayPaymentId: 'pay_duplicate_test',
    eventType: 'payment.failed',
    amount: 500,
    currency: 'INR',
    providerResponse: createPayload(),
    webhookSignatureVerified: true
  };

  try {
    const first = await paymentEventModel.createOrGet(eventData);
    const second = await paymentEventModel.createOrGet(eventData);

    assert.equal(first.created, true);
    assert.equal(second.duplicate, true);
    assert.equal(second.event.id, first.event.id);
    assert.equal(events.size, 1);
  } finally {
    pool.query = originalQuery;
  }
});
