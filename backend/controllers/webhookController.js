const pool = require('../config/database');
const customerModel = require('../models/customerModel');
const transactionModel = require('../models/transactionModel');
const invoiceModel = require('../models/invoiceModel');
const checkoutModel = require('../models/checkoutModel');
const recoveryModel = require('../models/recoveryModel');
const { analyze } = require('../services/aiAnalysisService');
const { evaluate } = require('../services/policyService');
const { sendRecoveryNotification } = require('../services/emailService');

/**
 * Helper to check and record webhook idempotency
 */
async function checkAndRecordEvent(eventId, eventType, payload) {
  if (!eventId) {
    eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  // Check if already processed
  const existing = await pool.query(
    'SELECT id, event_id, created_at FROM processed_webhook_events WHERE event_id = $1',
    [eventId]
  );

  if (existing.rows.length > 0) {
    return { duplicate: true, eventId, record: existing.rows[0] };
  }

  // Record event
  await pool.query(
    'INSERT INTO processed_webhook_events (event_id, event_type, payload) VALUES ($1, $2, $3)',
    [eventId, eventType, JSON.stringify(payload)]
  );

  return { duplicate: false, eventId };
}

/**
 * 1. REAL FAILED PAYMENT WEBHOOK
 * POST /api/webhooks/payment
 */
async function handlePaymentWebhook(req, res, next) {
  const {
    event_id,
    customer_name,
    customer_email,
    amount,
    currency = 'INR',
    failure_reason = 'insufficient_funds',
    payment_method = 'card',
    recipient_override
  } = req.body || {};

  if (!customer_email || !amount) {
    return res.status(400).json({
      success: false,
      message: 'customer_email and amount are required.'
    });
  }

  try {
    // 1. Idempotency guard
    const eventCheck = await checkAndRecordEvent(event_id, 'payment.failed', req.body);
    if (eventCheck.duplicate) {
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: `Webhook event ${event_id} has already been processed. No duplicate action taken.`
      });
    }

    // 2. Ensure customer exists
    const customer = await customerModel.create({
      name: customer_name || 'Customer',
      email: customer_email.trim().toLowerCase(),
      phone: '—',
      customer_type: 'individual'
    });

    // 3. Store real transaction failure
    const txn = await transactionModel.create({
      customerId: customer.id,
      amount: Number(amount),
      status: 'failed',
      failureReason: failure_reason,
      transactionType: 'subscription'
    });

    // 4. Create Recovery Case in PostgreSQL
    const recoveryCase = await recoveryModel.createFromSource({ transactionId: txn.id });

    // 5. Groq AI Diagnosis
    const aiResult = await analyze({
      case_type: 'failed_payment',
      failure_reason,
      amount_at_risk: txn.amount,
      customer_type: customer.customer_type
    });

    // 6. Policy Engine evaluation
    const policy = evaluate(recoveryCase, aiResult.recommended_action);

    // 7. Save AI analysis and Policy decision to recovery case
    await recoveryModel.saveAiAnalysis(recoveryCase.id, aiResult, policy);

    // 8. Trigger real Resend email notification
    let emailResult = null;
    if (policy.allowed) {
      emailResult = await sendRecoveryNotification({
        recipient: recipient_override,
        customerName: customer.name,
        customerEmail: customer.email,
        eventType: 'failed_payment',
        amount: txn.amount,
        rootCause: aiResult.root_cause || failure_reason,
        diagnosis: aiResult.reason,
        recommendedAction: aiResult.recommended_action,
        policyStatus: 'Approved',
        caseId: recoveryCase.id,
        extraDetails: { paymentMethod: payment_method, currency }
      });

      // Update case status to email_sent
      await recoveryModel.updateActionStatus(
        recoveryCase.id,
        'email_sent',
        aiResult.recommended_action,
        'email_dispatched'
      );
    } else {
      // Policy blocked / escalated
      await recoveryModel.updateActionStatus(
        recoveryCase.id,
        policy.escalate ? 'escalated' : 'failed',
        aiResult.recommended_action,
        'policy_blocked'
      );

      // Send alert notification for human review
      emailResult = await sendRecoveryNotification({
        recipient: recipient_override,
        customerName: customer.name,
        customerEmail: customer.email,
        eventType: 'failed_payment',
        amount: txn.amount,
        rootCause: aiResult.root_cause || failure_reason,
        diagnosis: aiResult.reason,
        recommendedAction: 'escalate_to_human',
        policyStatus: 'Blocked',
        caseId: recoveryCase.id
      });
    }

    // 9. Write audit log
    await pool.query(
      `INSERT INTO audit_logs (recovery_case_id, event_type, message, metadata)
       VALUES ($1, 'webhook_payment_processed', $2, $3)`,
      [
        recoveryCase.id,
        `Payment webhook processed (Event ID: ${eventCheck.eventId}). Policy: ${policy.allowed ? 'Approved' : 'Blocked'}.`,
        JSON.stringify({ eventId: eventCheck.eventId, policy, emailResult })
      ]
    );

    const updatedCase = await recoveryModel.findById(recoveryCase.id);

    res.status(201).json({
      success: true,
      event_id: eventCheck.eventId,
      message: 'Failed payment processed, analyzed by AI, policy evaluated, and notification dispatched.',
      data: {
        case: updatedCase,
        transaction: txn,
        customer,
        ai: aiResult,
        policy,
        email: emailResult
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 2. REAL CHECKOUT ABANDONMENT WEBHOOK
 * POST /api/webhooks/checkout
 */
async function handleCheckoutWebhook(req, res, next) {
  const {
    event_id,
    customer_name,
    customer_email,
    session_id,
    amount,
    abandonment_reason = 'payment_friction',
    recipient_override
  } = req.body || {};

  if (!customer_email || !amount) {
    return res.status(400).json({
      success: false,
      message: 'customer_email and amount are required.'
    });
  }

  try {
    // 1. Idempotency guard
    const eventCheck = await checkAndRecordEvent(event_id, 'checkout.abandoned', req.body);
    if (eventCheck.duplicate) {
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: `Webhook event ${event_id} has already been processed. No duplicate action taken.`
      });
    }

    // 2. Customer
    const customer = await customerModel.create({
      name: customer_name || 'Shopper',
      email: customer_email.trim().toLowerCase(),
      phone: '—',
      customer_type: 'individual'
    });

    // 3. Checkout Event
    const finalSessionId = session_id || `sess_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const checkout = await checkoutModel.start({
      customerId: customer.id,
      sessionId: finalSessionId,
      amount: Number(amount)
    });
    const abandonedCheckout = await checkoutModel.abandon(checkout.id, abandonment_reason);

    // 4. Recovery Case
    const recoveryCase = await recoveryModel.createFromSource({ checkoutEventId: abandonedCheckout.id });

    // 5. AI Diagnosis
    const aiResult = await analyze({
      case_type: 'checkout_abandonment',
      abandonment_reason,
      amount_at_risk: abandonedCheckout.amount,
      customer_type: customer.customer_type
    });

    // 6. Policy Engine
    const policy = evaluate(recoveryCase, aiResult.recommended_action);

    // 7. Save AI analysis
    await recoveryModel.saveAiAnalysis(recoveryCase.id, aiResult, policy);

    // 8. Resend Email Notification
    let emailResult = null;
    if (policy.allowed) {
      emailResult = await sendRecoveryNotification({
        recipient: recipient_override,
        customerName: customer.name,
        customerEmail: customer.email,
        eventType: 'checkout_abandonment',
        amount: abandonedCheckout.amount,
        rootCause: aiResult.root_cause || abandonment_reason,
        diagnosis: aiResult.reason,
        recommendedAction: aiResult.recommended_action,
        policyStatus: 'Approved',
        caseId: recoveryCase.id,
        extraDetails: { checkoutId: finalSessionId }
      });

      await recoveryModel.updateActionStatus(
        recoveryCase.id,
        'email_sent',
        aiResult.recommended_action,
        'email_dispatched'
      );
    } else {
      await recoveryModel.updateActionStatus(
        recoveryCase.id,
        policy.escalate ? 'escalated' : 'failed',
        aiResult.recommended_action,
        'policy_blocked'
      );
    }

    // 9. Audit
    await pool.query(
      `INSERT INTO audit_logs (recovery_case_id, event_type, message, metadata)
       VALUES ($1, 'webhook_checkout_processed', $2, $3)`,
      [
        recoveryCase.id,
        `Checkout webhook processed (Session: ${finalSessionId}). Policy: ${policy.allowed ? 'Approved' : 'Blocked'}.`,
        JSON.stringify({ eventId: eventCheck.eventId, policy, emailResult })
      ]
    );

    const updatedCase = await recoveryModel.findById(recoveryCase.id);

    res.status(201).json({
      success: true,
      event_id: eventCheck.eventId,
      message: 'Checkout abandonment processed, analyzed by AI, and recovery notification dispatched.',
      data: {
        case: updatedCase,
        checkout: abandonedCheckout,
        customer,
        ai: aiResult,
        policy,
        email: emailResult
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 3. REAL OVERDUE INVOICE WEBHOOK
 * POST /api/webhooks/invoice
 */
async function handleInvoiceWebhook(req, res, next) {
  const {
    event_id,
    customer_name,
    customer_email,
    amount,
    due_date,
    recipient_override
  } = req.body || {};

  if (!customer_email || !amount) {
    return res.status(400).json({
      success: false,
      message: 'customer_email and amount are required.'
    });
  }

  try {
    // 1. Idempotency guard
    const eventCheck = await checkAndRecordEvent(event_id, 'invoice.overdue', req.body);
    if (eventCheck.duplicate) {
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: `Webhook event ${event_id} has already been processed. No duplicate action taken.`
      });
    }

    // 2. Customer
    const customer = await customerModel.create({
      name: customer_name || 'Enterprise Customer',
      email: customer_email.trim().toLowerCase(),
      phone: '—',
      customer_type: 'business'
    });

    // 3. Invoice with actual due date
    const finalDueDate = due_date || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const invoice = await invoiceModel.create({
      customerId: customer.id,
      amount: Number(amount),
      dueDate: finalDueDate,
      status: 'overdue'
    });

    // 4. Recovery Case
    const recoveryCase = await recoveryModel.createFromSource({ invoiceId: invoice.id });

    // 5. AI Diagnosis
    const aiResult = await analyze({
      case_type: 'overdue_invoice',
      days_overdue: invoice.days_overdue,
      amount_at_risk: invoice.amount,
      customer_type: customer.customer_type
    });

    // 6. Policy Engine
    const policy = evaluate(recoveryCase, aiResult.recommended_action);

    // 7. Save AI analysis
    await recoveryModel.saveAiAnalysis(recoveryCase.id, aiResult, policy);

    // 8. Resend Email Notification
    let emailResult = null;
    if (policy.allowed) {
      emailResult = await sendRecoveryNotification({
        recipient: recipient_override,
        customerName: customer.name,
        customerEmail: customer.email,
        eventType: 'overdue_invoice',
        amount: invoice.amount,
        rootCause: 'overdue_invoice',
        diagnosis: aiResult.reason,
        recommendedAction: aiResult.recommended_action,
        policyStatus: 'Approved',
        caseId: recoveryCase.id,
        extraDetails: { dueDate: finalDueDate, daysOverdue: invoice.days_overdue }
      });

      await recoveryModel.updateActionStatus(
        recoveryCase.id,
        'email_sent',
        aiResult.recommended_action,
        'email_dispatched'
      );
    } else {
      await recoveryModel.updateActionStatus(
        recoveryCase.id,
        policy.escalate ? 'escalated' : 'failed',
        aiResult.recommended_action,
        'policy_blocked'
      );

      emailResult = await sendRecoveryNotification({
        recipient: recipient_override,
        customerName: customer.name,
        customerEmail: customer.email,
        eventType: 'overdue_invoice',
        amount: invoice.amount,
        rootCause: 'overdue_invoice',
        diagnosis: aiResult.reason,
        recommendedAction: 'escalate_to_human',
        policyStatus: 'Blocked',
        caseId: recoveryCase.id,
        extraDetails: { dueDate: finalDueDate, daysOverdue: invoice.days_overdue }
      });
    }

    // 9. Audit
    await pool.query(
      `INSERT INTO audit_logs (recovery_case_id, event_type, message, metadata)
       VALUES ($1, 'webhook_invoice_processed', $2, $3)`,
      [
        recoveryCase.id,
        `Invoice webhook processed (Invoice ID: ${invoice.id}, Days Overdue: ${invoice.days_overdue}). Policy: ${policy.allowed ? 'Approved' : 'Blocked'}.`,
        JSON.stringify({ eventId: eventCheck.eventId, policy, emailResult })
      ]
    );

    const updatedCase = await recoveryModel.findById(recoveryCase.id);

    res.status(201).json({
      success: true,
      event_id: eventCheck.eventId,
      message: 'Overdue invoice processed, analyzed by AI, and recovery notice dispatched.',
      data: {
        case: updatedCase,
        invoice,
        customer,
        ai: aiResult,
        policy,
        email: emailResult
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handlePaymentWebhook,
  handleCheckoutWebhook,
  handleInvoiceWebhook
};
