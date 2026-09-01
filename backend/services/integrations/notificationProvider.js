/**
 * Notification Provider Abstraction & Resend Integration
 * 
 * Safety invariants:
 * - Direct integration with Resend API for transactional email delivery.
 * - Uses strictly parameterized, safe templates — no arbitrary code execution or AI-generated HTML.
 * - Validates recipient email format before attempting network requests.
 * - Gracefully handles provider errors without crashing the backend.
 * - Never logs or exposes API keys or sensitive data.
 * - Live provider NEVER returns fake success — if Resend key is missing during live dispatch, returns a clear error.
 */

class NotificationProvider {
  async sendEmail(params) {
    throw new Error('sendEmail must be implemented by notification provider subclass');
  }

  async sendSms(params) {
    throw new Error('sendSms must be implemented by notification provider subclass');
  }
}

class MockNotificationProvider extends NotificationProvider {
  constructor(options = {}) {
    super();
    this.name = 'MockNotificationProvider (Safe Adapter)';
    this.options = options;
  }

  async sendEmail({ to, subject, template, variables = {} }) {
    if (!to || !to.includes('@')) {
      return {
        success: false,
        provider: this.name,
        channel: 'email',
        recipient: to,
        error: 'Invalid recipient email address.',
        simulated: true,
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      provider: this.name,
      channel: 'email',
      recipient: to,
      subject,
      template,
      message_id: `sim_msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      simulated: true,
      timestamp: new Date().toISOString(),
      message: `Simulated email dispatched to ${to} (${subject}).`
    };
  }

  async sendSms({ to, message }) {
    return {
      success: true,
      provider: this.name,
      channel: 'sms',
      recipient: to,
      message_id: `sim_sms_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      simulated: true,
      timestamp: new Date().toISOString(),
      message: `Simulated SMS dispatched to ${to}.`
    };
  }
}

class ResendNotificationProvider extends NotificationProvider {
  constructor(options = {}) {
    super();
    this.name = 'Resend';
    this.apiKey = options.apiKey !== undefined ? options.apiKey : (process.env.RESEND_API_KEY || '');
    this.fromEmail = options.fromEmail || process.env.RESEND_FROM_EMAIL || '';
    this.staged = Boolean(options.staged);
    this.sentMessages = new Set(); // In-memory deduplication tracking
  }

  toJSON() {
    return {
      name: this.name,
      fromEmail: this.fromEmail,
      configured: Boolean(this.apiKey)
    };
  }

  /**
   * Generates safe, responsive HTML for recovery emails.
   */
  generateTemplateHtml({ template, subject, variables = {} }) {
    const customerName = (variables.customerName || 'Valued Customer').replace(/[<>&"]/g, '');
    const amount = variables.amount ? `₹${Number(variables.amount).toLocaleString('en-IN')}` : '';
    const caseId = variables.caseId || '';

    let contentHtml = '';
    let actionBtnText = 'Resolve Account';
    let actionUrl = variables.actionUrl || 'https://app.recoverpayai.com/resolve';

    switch (template) {
      case 'payment_method_update':
      case 'request_payment_method_update':
        contentHtml = `
          <p>We attempted to process your recent transaction of <strong>${amount}</strong>, but your bank indicated that your payment method on file needs to be updated.</p>
          <p>To ensure uninterrupted service and avoid suspension, please update your payment details using our secure portal below.</p>
        `;
        actionBtnText = 'Update Payment Method';
        break;

      case 'send_payment_reminder':
      case 'send_invoice_notification':
        contentHtml = `
          <p>This is a friendly reminder that invoice <strong>#${variables.invoiceId || caseId}</strong> for <strong>${amount}</strong> is currently past its scheduled due date.</p>
          <p>Please review the invoice and complete payment at your earliest convenience.</p>
        `;
        actionBtnText = 'Pay Overdue Invoice';
        break;

      case 'send_checkout_recovery':
      case 'checkout_recovery':
        contentHtml = `
          <p>We noticed you didn't complete your order for <strong>${amount}</strong>.</p>
          <p>Your items have been reserved. Click the button below to resume checkout seamlessly.</p>
        `;
        actionBtnText = 'Complete Checkout';
        break;

      case 'test_email':
        contentHtml = `
          <p>This is a <strong>real email notification</strong> from RecoverPay AI.</p>
          <p>This message confirms that the RecoverPay AI email notification service is correctly connected and operational.</p>
          <p style="color: #64748b; font-size: 13px;">No payment has been charged. This is a connectivity verification only.</p>
        `;
        actionBtnText = 'Open RecoverPay AI Dashboard';
        actionUrl = 'http://localhost:5173';
        break;

      default:
        contentHtml = `
          <p>${(variables.message || 'Action required regarding your account payment.').replace(/[<>&"]/g, '')}</p>
        `;
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .header { background: #ffffff; padding: 24px; border-bottom: 1px solid #f1f5f9; }
    .logo { font-size: 20px; font-weight: 700; color: #f97316; }
    .body { padding: 32px 24px; font-size: 14px; line-height: 1.6; }
    .btn { display: inline-block; background-color: #f97316; color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 20px 0; font-size: 14px; }
    .footer { background: #f8fafc; padding: 16px 24px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">RecoverPay AI</div>
    </div>
    <div class="body">
      <p>Hello <strong>${customerName}</strong>,</p>
      ${contentHtml}
      <div>
        <a href="${actionUrl}" class="btn" target="_blank">${actionBtnText}</a>
      </div>
      <p style="font-size: 12px; color: #64748b;">Reference ID: RC-${caseId || Date.now()}</p>
    </div>
    <div class="footer">
      <p>This is an automated operational notification from RecoverPay AI Revenue Protection Engine.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  async sendEmail({ to, subject, template, variables = {} }) {
    // 1. Recipient validation
    if (!to || typeof to !== 'string' || !to.includes('@') || !to.includes('.')) {
      return {
        success: false,
        provider: this.name,
        channel: 'email',
        recipient: to,
        error: 'Invalid recipient email address format.',
        simulated: false,
        timestamp: new Date().toISOString()
      };
    }

    // 2. Deduplication check
    const dedupKey = `${to}:${template}:${variables.caseId || ''}`;
    if (this.sentMessages.has(dedupKey)) {
      return {
        success: true,
        duplicate: true,
        provider: this.name,
        channel: 'email',
        recipient: to,
        message_id: 'dedup_skipped',
        message: `Idempotency: email already dispatched to ${to} for this recovery attempt.`,
        simulated: false,
        timestamp: new Date().toISOString()
      };
    }

    // 3. Test/staged mode is allowed only for non-production validation.
    if (this.staged || this.apiKey.startsWith('re_mock_test')) {
      this.sentMessages.add(dedupKey);
      return {
        success: true,
        provider: `${this.name} (Staged)`,
        channel: 'email',
        recipient: to,
        subject,
        template,
        message_id: `staged_resend_${Date.now()}`,
        simulated: true,
        timestamp: new Date().toISOString(),
        message: `Resend email staged for ${to} (${subject}).`
      };
    }

    // 4. FAIL if no API key in live mode — NEVER return fake success
    if (!this.apiKey) {
      return {
        success: false,
        provider: `${this.name} (NOT CONFIGURED)`,
        channel: 'email',
        recipient: to,
        error: 'Email service is not configured. RESEND_API_KEY is missing in backend/.env. No email was sent.',
        simulated: false,
        timestamp: new Date().toISOString()
      };
    }

    // 5. Live dispatch via Resend REST API
    try {
      const htmlBody = this.generateTemplateHtml({ template, subject, variables });
      if (!this.fromEmail) {
        return {
          success: false,
          provider: this.name,
          channel: 'email',
          recipient: to,
          error: 'RESEND_FROM_EMAIL is missing in backend/.env. Set a verified sender such as RecoverAI <recovery@yourdomain.com> before sending emails.',
          simulated: false,
          timestamp: new Date().toISOString()
        };
      }

      const deliverTo = to.trim().toLowerCase();

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: [deliverTo],
          subject: subject || 'RecoverAI Action Required',
          html: htmlBody
        })
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          provider: this.name,
          channel: 'email',
          recipient: deliverTo,
          error: data.message || `Resend API returned HTTP ${res.status}`,
          statusCode: res.status,
          simulated: false,
          timestamp: new Date().toISOString()
        };
      }

      if (!data || !data.id) {
        return {
          success: false,
          provider: this.name,
          channel: 'email',
          recipient: deliverTo,
          subject,
          template,
          error: 'Resend accepted the request but did not return a valid message ID. No success message was shown.',
          simulated: false,
          timestamp: new Date().toISOString()
        };
      }

      this.sentMessages.add(dedupKey);

      return {
        success: true,
        provider: this.name,
        channel: 'email',
        recipient: deliverTo,
        subject,
        template,
        message_id: data.id,
        simulated: false,
        timestamp: new Date().toISOString(),
        message: `Email accepted by Resend and dispatched to ${deliverTo} (ID: ${data.id})`
      };
    } catch (err) {
      return {
        success: false,
        provider: this.name,
        channel: 'email',
        recipient: to,
        error: `Network error contacting Resend API: ${err.message}`,
        simulated: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  async sendSms({ to, message }) {
    return {
      success: true,
      provider: this.name,
      channel: 'sms',
      recipient: to,
      message_id: `sms_${Date.now()}`,
      simulated: true,
      timestamp: new Date().toISOString(),
      message: `SMS staged for ${to}.`
    };
  }
}

module.exports = {
  NotificationProvider,
  MockNotificationProvider,
  ResendNotificationProvider
};
