const { sendRecoveryNotification } = require('../services/emailService');

async function sendTestEmail(request, response, next) {
  const { to, subject, message } = request.body || {};

  // 1. Validate recipient email format
  if (!to || typeof to !== 'string' || !to.includes('@') || !to.includes('.')) {
    return response.status(400).json({
      success: false,
      message: 'Please provide a valid recipient email address (e.g. user@example.com).'
    });
  }

  // 2. Check Resend configuration before attempting
  const apiKeyConfigured = Boolean(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKeyConfigured) {
    return response.status(503).json({
      success: false,
      message: 'Email service is not configured. Add RESEND_API_KEY to backend/.env and restart the server.',
      data: {
        resend_api_key: 'NOT CONFIGURED',
        resend_from_email: fromEmail || 'NOT CONFIGURED'
      }
    });
  }

  if (!fromEmail) {
    return response.status(503).json({
      success: false,
      message: 'RESEND_FROM_EMAIL is missing in backend/.env. Set a verified sender such as RecoverPay AI <recovery@yourdomain.com> before sending emails.',
      data: {
        resend_api_key: 'CONFIGURED',
        resend_from_email: 'NOT CONFIGURED'
      }
    });
  }

  try {
    // 3. Call real Resend SDK via sendRecoveryNotification
    const result = await sendRecoveryNotification({
      recipient: to.trim().toLowerCase(),
      customerName: 'Test Recipient',
      customerEmail: to.trim().toLowerCase(),
      eventType: 'test',
      amount: 0,
      rootCause: 'test_connectivity',
      diagnosis: message || 'This is a real test notification confirming that your RecoverPay AI Resend email integration is operational.',
      recommendedAction: 'verify_connection',
      policyStatus: 'Approved'
    });

    if (!result.success) {
      return response.status(422).json({
        success: false,
        message: result.error || 'Email provider failed to send message.',
        data: {
          recipient: to,
          provider: result.provider,
          error: result.error
        }
      });
    }

    response.json({
      success: true,
      message: `Email accepted by Resend and dispatched to ${to}.`,
      emailId: result.emailId,
      data: {
        recipient: to,
        provider: result.provider,
        message_id: result.emailId,
        simulated: false
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { sendTestEmail };
