const { Resend } = require('resend');
const pool = require('../config/database');

/**
 * Format currency in Indian Rupees (INR)
 */
function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

/**
 * Format root cause codes to human readable text
 */
function formatRootCause(code) {
  if (!code) return 'Unknown Root Cause';
  const labels = {
    expired_card: 'Expired Card',
    insufficient_funds: 'Insufficient Funds',
    bank_declined: 'Bank Declined',
    temporary_failure: 'Temporary Gateway Failure',
    invalid_payment_method: 'Invalid Payment Method',
    overdue_invoice: 'Overdue Commercial Invoice',
    price_concern: 'Price Concern',
    payment_friction: 'Payment Friction',
    technical_issue: 'Technical Checkout Issue',
    user_distraction: 'User Distraction',
    unknown_abandonment: 'Checkout Abandoned'
  };
  return labels[code] || code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format recommended action code to human readable text
 */
function formatAction(action) {
  if (!action) return 'Pending Analysis';
  const labels = {
    request_payment_method_update: 'Request Payment Method Update',
    retry_payment: 'Instant Payment Retry',
    retry_payment_later: 'Schedule Smart Retry',
    send_payment_reminder: 'Send Payment Reminder',
    send_invoice_notification: 'Send Commercial Invoice Notice',
    send_checkout_recovery: 'Send Checkout Recovery Link',
    escalate_to_human: 'Escalate to Human Agent'
  };
  return labels[action] || action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Generate responsive, accessible HTML email template
 */
function generateRecoveryAlertHtml({
  customerName,
  customerEmail,
  eventType,
  amount,
  rootCause,
  diagnosis,
  recommendedAction,
  policyStatus,
  caseId,
  extraDetails = {}
}) {
  const safeName = (customerName || 'Valued Customer').replace(/[<>&"]/g, '');
  const safeEmail = (customerEmail || '—').replace(/[<>&"]/g, '');
  const safeDiagnosis = (diagnosis || 'Automated diagnosis in progress.').replace(/[<>&"]/g, '');
  const formattedAmount = formatCurrency(amount);
  const formattedCause = formatRootCause(rootCause);
  const formattedAction = formatAction(recommendedAction);

  let eventTitle = 'Revenue Recovery Alert';
  let badgeColor = '#f97316'; // Orange default

  if (eventType === 'failed_payment') {
    eventTitle = 'Payment Failure Detected';
    badgeColor = '#ef4444';
  } else if (eventType === 'checkout_abandonment') {
    eventTitle = 'Checkout Abandonment Detected';
    badgeColor = '#8b5cf6';
  } else if (eventType === 'overdue_invoice') {
    eventTitle = 'Commercial Invoice Overdue';
    badgeColor = '#f59e0b';
  }

  const isBlockedOrEscalated =
    policyStatus?.toLowerCase() === 'blocked' ||
    policyStatus?.toLowerCase() === 'escalated' ||
    recommendedAction === 'escalate_to_human';

  const policyBadge = isBlockedOrEscalated
    ? `<span style="background-color: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; padding: 4px 10px; border-radius: 4px; font-weight: 600; font-size: 12px;">Automated recovery blocked — human review required</span>`
    : `<span style="background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 4px; font-weight: 600; font-size: 12px;">Policy Approved (${policyStatus || 'Approved'})</span>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RecoverPay AI Alert</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.04); }
    .header { background: #0f172a; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; }
    .logo { font-size: 18px; font-weight: 700; color: #ffffff; }
    .logo span { color: #f97316; }
    .badge { background: ${badgeColor}; color: #ffffff; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .content { padding: 28px 24px; }
    .headline { font-size: 18px; font-weight: 600; color: #0f172a; margin-top: 0; margin-bottom: 16px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 16px 0; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .row:last-child { border-bottom: none; }
    .label { color: #64748b; font-weight: 500; }
    .value { color: #0f172a; font-weight: 600; text-align: right; }
    .diagnosis-box { background: #f1f5f9; border-left: 3px solid #f97316; padding: 12px 16px; margin: 16px 0; font-size: 13px; line-height: 1.5; color: #334155; }
    .footer { background: #f8fafc; padding: 16px 24px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Recover<span>Pay AI</span></div>
      <div class="badge">${eventTitle}</div>
    </div>
    <div class="content">
      <h2 class="headline">${eventTitle} — Case #${caseId || 'NEW'}</h2>
      <p style="font-size: 14px; color: #475569; margin-bottom: 16px;">
        A real revenue recovery event has been processed by the RecoverPay AI intelligence engine.
      </p>

      <div class="card">
        <div class="row">
          <span class="label">Customer</span>
          <span class="value">${safeName}</span>
        </div>
        <div class="row">
          <span class="label">Customer Email</span>
          <span class="value">${safeEmail}</span>
        </div>
        <div class="row">
          <span class="label">Amount at Risk</span>
          <span class="value" style="color: #dc2626;">${formattedAmount}</span>
        </div>
        <div class="row">
          <span class="label">Root Cause</span>
          <span class="value">${formattedCause}</span>
        </div>
        ${extraDetails.dueDate ? `
        <div class="row">
          <span class="label">Due Date</span>
          <span class="value">${extraDetails.dueDate} (${extraDetails.daysOverdue || 0} days overdue)</span>
        </div>` : ''}
        ${extraDetails.checkoutId ? `
        <div class="row">
          <span class="label">Checkout Session</span>
          <span class="value font-mono">${extraDetails.checkoutId}</span>
        </div>` : ''}
        <div class="row">
          <span class="label">Recommended Action</span>
          <span class="value" style="color: #2563eb;">${formattedAction}</span>
        </div>
      </div>

      <div style="margin: 16px 0;">
        <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">AI Root-Cause Diagnosis</div>
        <div class="diagnosis-box">${safeDiagnosis}</div>
      </div>

      <div style="margin: 18px 0; display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 13px; font-weight: 600; color: #334155;">Policy Engine Status:</span>
        ${policyBadge}
      </div>
    </div>
    <div class="footer">
      <p>This is a real automated notification from your RecoverPay AI installation. Sensitive payment details, cards, or CVVs are never processed or logged.</p>
      <p style="margin-top: 4px; color: #94a3b8;">RecoverPay AI Autonomous Revenue Protection Engine</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Core sendRecoveryNotification function using official Resend SDK.
 * 
 * Safety invariants:
 * - Direct integration with official Resend SDK.
 * - Defaults recipient to RECOVERY_ALERT_EMAIL if provided.
 * - Validates recipient syntax.
 * - Records outcome in PostgreSQL email_audit_logs.
 * - Never throws unhandled exceptions; returns structured result.
 * - Never returns or leaks RESEND_API_KEY.
 * - In development mode, redirects all emails to RESEND_VERIFIED_TEST_EMAIL
 */
async function sendRecoveryNotification({
  recipient,
  customerName,
  customerEmail,
  eventType = 'failed_payment',
  amount = 0,
  rootCause = 'insufficient_funds',
  diagnosis = '',
  recommendedAction = 'request_payment_method_update',
  policyStatus = 'Approved',
  caseId = null,
  extraDetails = {}
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const defaultAlertRecipient = process.env.RECOVERY_ALERT_EMAIL;
  const resendMode = (process.env.RESEND_MODE || 'development').toLowerCase();
  const verifiedTestEmail = process.env.RESEND_VERIFIED_TEST_EMAIL;

  // 1. Resolve effective recipient: prioritize the actual recipient / customerEmail
  let targetEmail = (recipient || customerEmail || defaultAlertRecipient || '').trim().toLowerCase();
  let originalRecipient = targetEmail; // Keep original for audit logging

  if (!targetEmail || typeof targetEmail !== 'string' || !targetEmail.includes('@') || !targetEmail.includes('.')) {
    return {
      success: false,
      error: 'Invalid or missing recipient email address.',
      provider: 'Resend'
    };
  }

  // 2. Development mode: redirect to verified test email
  if (resendMode === 'development' && verifiedTestEmail) {
    if (targetEmail !== verifiedTestEmail.toLowerCase()) {
      console.log(`📧 [DEVELOPMENT MODE] Redirecting email from ${targetEmail} to verified test address: ${verifiedTestEmail}`);
      targetEmail = verifiedTestEmail.toLowerCase();
    }
  }

  // 3. Resolve subject
  let subject = 'RecoverPay AI Alert: Payment Failed';
  if (eventType === 'checkout_abandonment') {
    subject = 'RecoverPay AI Alert: Checkout Abandoned';
  } else if (eventType === 'overdue_invoice') {
    subject = 'RecoverPay AI Alert: Invoice Overdue';
  } else if (eventType === 'test') {
    subject = 'RecoverPay AI — Email Integration Test';
  }

  // 4. Pre-check configuration.
  if (!apiKey) {
    const errorMsg = 'Email service is not configured. RESEND_API_KEY is missing in backend/.env.';
    await recordEmailAudit({
      caseId,
      eventType,
      recipient: originalRecipient,
      subject,
      providerMessageId: null,
      status: 'failed',
      errorMessage: errorMsg
    });

    return {
      success: false,
      error: errorMsg,
      provider: 'Resend (NOT CONFIGURED)'
    };
  }

  if (!fromEmail) {
    const errorMsg = 'Email service is not configured. RESEND_FROM_EMAIL is missing in backend/.env. Set a verified sender such as RecoverAI <recovery@yourdomain.com> before sending emails.';
    await recordEmailAudit({
      caseId,
      eventType,
      recipient: originalRecipient,
      subject,
      providerMessageId: null,
      status: 'failed',
      errorMessage: errorMsg
    });

    return {
      success: false,
      error: errorMsg,
      provider: 'Resend (SENDER NOT CONFIGURED)'
    };
  }

  // 5. Generate safe HTML content
  const html = generateRecoveryAlertHtml({
    customerName,
    customerEmail: customerEmail || originalRecipient,
    eventType,
    amount,
    rootCause,
    diagnosis,
    recommendedAction,
    policyStatus,
    caseId,
    extraDetails
  });

  // 6. Send directly to the target email via official Resend SDK
  try {
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [targetEmail],
      subject,
      html
    });

    if (error) {
      const customError = error.message || 'Resend rejected email dispatch';
      console.error(`❌ [EMAIL FAILED] Resend API Error for ${targetEmail}:`, customError);

      await recordEmailAudit({
        caseId,
        eventType,
        recipient: originalRecipient,
        subject,
        providerMessageId: null,
        status: 'failed',
        errorMessage: customError
      });

      return {
        success: false,
        error: customError,
        provider: 'Resend',
        originalRecipient: originalRecipient !== targetEmail ? originalRecipient : undefined
      };
    }

    const messageId = data?.id;
    if (!messageId) {
      const errorMsg = 'Email provider accepted the request but did not return a valid message ID. No success message was shown.';
      console.error('❌ [EMAIL FAILED] No message ID returned from Resend');

      await recordEmailAudit({
        caseId,
        eventType,
        recipient: originalRecipient,
        subject,
        providerMessageId: null,
        status: 'failed',
        errorMessage: errorMsg
      });

      return {
        success: false,
        error: errorMsg,
        provider: 'Resend'
      };
    }

    const successMsg = resendMode === 'development' && originalRecipient !== targetEmail
      ? `✅ [DEVELOPMENT] Email sent to verified address ${targetEmail} (intended for ${originalRecipient})`
      : `✅ [EMAIL SENT] ${targetEmail}`;

    console.log(`${successMsg} (ID: ${messageId})`);

    await recordEmailAudit({
      caseId,
      eventType,
      recipient: originalRecipient,
      subject,
      providerMessageId: messageId,
      status: 'sent',
      errorMessage: null,
      metadata: {
        caseId,
        eventType,
        amount,
        policyStatus,
        sentTo: targetEmail,
        developmentMode: resendMode === 'development',
        originalRecipient: originalRecipient !== targetEmail ? originalRecipient : undefined
      }
    });

    return {
      success: true,
      emailId: messageId,
      message_id: messageId,
      recipient: targetEmail,
      originalRecipient: originalRecipient !== targetEmail ? originalRecipient : undefined,
      developmentMode: resendMode === 'development',
      provider: 'Resend',
      message: successMsg
    };
  } catch (err) {
    const errorMsg = `Network or SDK error contacting Resend API: ${err.message}`;
    console.error(`❌ [EMAIL ERROR] ${errorMsg}`);

    await recordEmailAudit({
      caseId,
      eventType,
      recipient: originalRecipient,
      subject,
      providerMessageId: null,
      status: 'failed',
      errorMessage: errorMsg
    });

    return {
      success: false,
      error: errorMsg,
      provider: 'Resend',
      originalRecipient: originalRecipient !== targetEmail ? originalRecipient : undefined
    };
  }
}

/**
 * Record email delivery information into PostgreSQL email_audit_logs
 */
async function recordEmailAudit({
  caseId,
  eventType,
  recipient,
  subject,
  providerMessageId,
  status,
  errorMessage = null,
  metadata = {}
}) {
  try {
    await pool.query(
      `INSERT INTO email_audit_logs
       (case_id, event_type, recipient, subject, provider_message_id, status, error_message, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        caseId || null,
        eventType,
        recipient,
        subject,
        providerMessageId || null,
        status,
        errorMessage || null,
        JSON.stringify(metadata)
      ]
    );
  } catch (auditErr) {
    console.error('Failed to write to email_audit_logs:', auditErr.message);
  }
}

module.exports = {
  sendRecoveryNotification,
  recordEmailAudit,
  generateRecoveryAlertHtml
};
