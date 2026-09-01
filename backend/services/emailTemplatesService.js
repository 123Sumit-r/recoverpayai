/**
 * Email Template Service
 * 
 * Generates formatted HTML emails for different recovery scenarios:
 * 1. Payment Failed
 * 2. Retry Scheduled
 * 3. Payment Recovered
 * 4. Update Payment Method Required
 * 5. Retry Limit Reached
 * 6. Human Review Required
 */

/**
 * Format currency in Indian Rupees (INR)
 */
function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

/**
 * Template 1: Payment Failed - Initial Notification
 */
function getPaymentFailedTemplate({
  customerName,
  amount,
  currency = 'INR',
  failureReason,
  failureDescription,
  caseId,
  recoveryAction
}) {
  const reasonLabels = {
    expired_card: 'Your payment card has expired',
    insufficient_funds: 'Insufficient funds in your account',
    bank_declined: 'Your bank declined the transaction',
    temporary_failure: 'Temporary payment gateway issue',
    invalid_payment_method: 'Invalid or unauthorized payment method'
  };

  const reasonText = reasonLabels[failureReason] || failureDescription || 'Payment processing failed';
  const formatAmount = currency === 'INR' ? formatCurrency(amount) : `${currency} ${amount}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed - RecoverPay AI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f5f5f5; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: white; border: 1px solid #e0e0e0; border-top: none; padding: 30px; }
    .footer { background: #f5f5f5; padding: 15px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none; font-size: 12px; color: #666; }
    .alert { background: #fee; border-left: 4px solid #f00; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .cta-button { background: #ff6b35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
    h1 { color: #222; margin-top: 0; }
    .metadata { background: #f9f9f9; padding: 15px; border-radius: 4px; margin: 15px 0; font-size: 13px; }
    .metadata-row { margin: 8px 0; }
    .metadata-label { font-weight: 600; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💳 Payment Failed</h1>
    </div>
    <div class="content">
      <p>Hi ${(customerName || 'Valued Customer').replace(/[<>&"]/g, '')},</p>

      <div class="alert">
        <strong>⚠️ Your payment of ${formatAmount} could not be processed.</strong><br>
        <em>${reasonText}</em>
      </div>

      <h2>What Happened?</h2>
      <p>We attempted to process your payment but it was unsuccessful. The reason was: <strong>${reasonText}</strong></p>

      <div class="metadata">
        <div class="metadata-row"><span class="metadata-label">Amount:</span> ${formatAmount}</div>
        <div class="metadata-row"><span class="metadata-label">Case ID:</span> #${caseId}</div>
        <div class="metadata-row"><span class="metadata-label">Timestamp:</span> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
      </div>

      <h2>Next Steps</h2>
      <p>${recoveryAction || 'We are working to recover this payment automatically.'}</p>

      <p style="margin-top: 30px; font-size: 13px; color: #999;">
        Case Reference: ${caseId}<br>
        This is an automated notification from RecoverPay AI Payment Recovery System.
      </p>
    </div>
    <div class="footer">
      <p>RecoverPay AI © 2026. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Template 2: Retry Scheduled
 */
function getRetryScheduledTemplate({
  customerName,
  amount,
  currency = 'INR',
  failureReason,
  retryTime,
  retryCount = 1,
  maxRetries = 2,
  caseId
}) {
  const formatAmount = currency === 'INR' ? formatCurrency(amount) : `${currency} ${amount}`;
  const retryDate = new Date(retryTime).toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Retry Scheduled - RecoverPay AI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f5f5f5; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: white; border: 1px solid #e0e0e0; border-top: none; padding: 30px; }
    .footer { background: #f5f5f5; padding: 15px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none; font-size: 12px; color: #666; }
    .info-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 4px; }
    h1 { color: #222; margin-top: 0; }
    .metadata { background: #f9f9f9; padding: 15px; border-radius: 4px; margin: 15px 0; font-size: 13px; }
    .metadata-row { margin: 8px 0; }
    .metadata-label { font-weight: 600; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Retry Scheduled</h1>
    </div>
    <div class="content">
      <p>Hi ${(customerName || 'Valued Customer').replace(/[<>&"]/g, '')},</p>

      <div class="info-box">
        <strong>Good news!</strong> We've detected this is a temporary issue. We're automatically retrying your payment.
      </div>

      <h2>Retry Details</h2>
      <div class="metadata">
        <div class="metadata-row"><span class="metadata-label">Amount:</span> ${formatAmount}</div>
        <div class="metadata-row"><span class="metadata-label">Next Retry:</span> ${retryDate} (IST)</div>
        <div class="metadata-row"><span class="metadata-label">Attempt:</span> ${retryCount} of ${maxRetries}</div>
        <div class="metadata-row"><span class="metadata-label">Failure Reason:</span> ${failureReason}</div>
        <div class="metadata-row"><span class="metadata-label">Case ID:</span> #${caseId}</div>
      </div>

      <h2>What Happens Next?</h2>
      <ul>
        <li>We will automatically retry your payment on ${retryDate}</li>
        <li>If successful, you'll receive a confirmation email</li>
        <li>If it fails again, we'll attempt another retry (up to ${maxRetries} times)</li>
        <li>You don't need to take any action unless you update your payment method</li>
      </ul>

      <p style="margin-top: 30px; font-size: 13px; color: #999;">
        Case Reference: ${caseId}<br>
        This is an automated notification from RecoverPay AI Payment Recovery System.
      </p>
    </div>
    <div class="footer">
      <p>RecoverPay AI © 2026. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Template 3: Payment Recovered
 */
function getPaymentRecoveredTemplate({
  customerName,
  amount,
  currency = 'INR',
  recoveryMethod,
  attemptNumber = 1,
  caseId
}) {
  const formatAmount = currency === 'INR' ? formatCurrency(amount) : `${currency} ${amount}`;
  const methodText = attemptNumber === 1 ? 'first attempt' : `attempt ${attemptNumber}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Recovered - RecoverPay AI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f5f5f5; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: white; border: 1px solid #e0e0e0; border-top: none; padding: 30px; }
    .footer { background: #f5f5f5; padding: 15px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none; font-size: 12px; color: #666; }
    .success-box { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px; }
    h1 { color: #222; margin-top: 0; }
    .metadata { background: #f9f9f9; padding: 15px; border-radius: 4px; margin: 15px 0; font-size: 13px; }
    .metadata-row { margin: 8px 0; }
    .metadata-label { font-weight: 600; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Payment Recovered</h1>
    </div>
    <div class="content">
      <p>Hi ${(customerName || 'Valued Customer').replace(/[<>&"]/g, '')},</p>

      <div class="success-box">
        <strong>Great news!</strong> Your payment of ${formatAmount} has been successfully recovered!
      </div>

      <h2>Payment Details</h2>
      <div class="metadata">
        <div class="metadata-row"><span class="metadata-label">Amount Recovered:</span> <strong style="color: #4caf50;">${formatAmount}</strong></div>
        <div class="metadata-row"><span class="metadata-label">Recovery Method:</span> ${recoveryMethod || 'Automatic Retry'}</div>
        <div class="metadata-row"><span class="metadata-label">Attempt Number:</span> ${methodText}</div>
        <div class="metadata-row"><span class="metadata-label">Timestamp:</span> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
        <div class="metadata-row"><span class="metadata-label">Case ID:</span> #${caseId}</div>
      </div>

      <h2>What's Next?</h2>
      <p>Your service is now active. You're all set! If you have any questions, please don't hesitate to contact us.</p>

      <p style="margin-top: 30px; font-size: 13px; color: #999;">
        Case Reference: ${caseId}<br>
        This is an automated notification from RecoverPay AI Payment Recovery System.
      </p>
    </div>
    <div class="footer">
      <p>RecoverPay AI © 2026. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Template 4: Update Payment Method Required
 */
function getUpdatePaymentMethodTemplate({
  customerName,
  amount,
  currency = 'INR',
  failureReason,
  updateLink,
  caseId
}) {
  const formatAmount = currency === 'INR' ? formatCurrency(amount) : `${currency} ${amount}`;
  const reasonText = failureReason === 'expired_card' 
    ? 'Your payment card has expired' 
    : 'Your payment method is no longer valid';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Update Payment Method - RecoverPay AI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f5f5f5; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: white; border: 1px solid #e0e0e0; border-top: none; padding: 30px; }
    .footer { background: #f5f5f5; padding: 15px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none; font-size: 12px; color: #666; }
    .warning-box { background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .cta-button { background: #ff6b35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; font-weight: 600; }
    h1 { color: #222; margin-top: 0; }
    .metadata { background: #f9f9f9; padding: 15px; border-radius: 4px; margin: 15px 0; font-size: 13px; }
    .metadata-row { margin: 8px 0; }
    .metadata-label { font-weight: 600; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💳 Update Payment Method</h1>
    </div>
    <div class="content">
      <p>Hi ${(customerName || 'Valued Customer').replace(/[<>&"]/g, '')},</p>

      <div class="warning-box">
        <strong>⚠️ Your payment could not be processed</strong><br>
        ${reasonText}. We cannot retry until you update your payment method.
      </div>

      <h2>What You Need to Do</h2>
      <p>Please update your payment method immediately to continue:</p>

      <div class="metadata">
        <div class="metadata-row"><span class="metadata-label">Amount Pending:</span> ${formatAmount}</div>
        <div class="metadata-row"><span class="metadata-label">Issue:</span> ${reasonText}</div>
        <div class="metadata-row"><span class="metadata-label">Case ID:</span> #${caseId}</div>
      </div>

      ${updateLink ? `<a href="${updateLink.replace(/[<>&"]/g, '')}" class="cta-button">Update Payment Method</a>` : ''}

      <h2>Next Steps</h2>
      <ol>
        <li>Click the button above to update your payment information</li>
        <li>Enter your new or existing valid payment method</li>
        <li>Confirm the update</li>
        <li>We'll automatically retry your payment</li>
      </ol>

      <p style="color: #999; font-size: 13px;">
        <strong>Security Note:</strong> Never share your card details via email. Always update through our secure portal.
      </p>

      <p style="margin-top: 30px; font-size: 13px; color: #999;">
        Case Reference: ${caseId}<br>
        This is an automated notification from RecoverPay AI Payment Recovery System.
      </p>
    </div>
    <div class="footer">
      <p>RecoverPay AI © 2026. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Template 5: Retry Limit Reached
 */
function getRetryLimitReachedTemplate({
  customerName,
  amount,
  currency = 'INR',
  maxRetries = 2,
  contactEmail,
  caseId
}) {
  const formatAmount = currency === 'INR' ? formatCurrency(amount) : `${currency} ${amount}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Retry Limit Reached - RecoverPay AI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f5f5f5; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: white; border: 1px solid #e0e0e0; border-top: none; padding: 30px; }
    .footer { background: #f5f5f5; padding: 15px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none; font-size: 12px; color: #666; }
    .alert-box { background: #ffebee; border-left: 4px solid #d32f2f; padding: 15px; margin: 20px 0; border-radius: 4px; }
    h1 { color: #222; margin-top: 0; }
    .metadata { background: #f9f9f9; padding: 15px; border-radius: 4px; margin: 15px 0; font-size: 13px; }
    .metadata-row { margin: 8px 0; }
    .metadata-label { font-weight: 600; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ Retry Limit Reached</h1>
    </div>
    <div class="content">
      <p>Hi ${(customerName || 'Valued Customer').replace(/[<>&"]/g, '')},</p>

      <div class="alert-box">
        <strong>Unfortunately,</strong> we've reached the maximum number of automatic retry attempts (${maxRetries}) for your payment of ${formatAmount}. We could not recover it automatically.
      </div>

      <h2>What Happened?</h2>
      <p>After ${maxRetries} automatic retry attempts, your payment still failed. This usually indicates a persistent issue with your payment method or account.</p>

      <div class="metadata">
        <div class="metadata-row"><span class="metadata-label">Amount At Risk:</span> ${formatAmount}</div>
        <div class="metadata-row"><span class="metadata-label">Attempts Made:</span> ${maxRetries}</div>
        <div class="metadata-row"><span class="metadata-label">Case ID:</span> #${caseId}</div>
      </div>

      <h2>What You Can Do</h2>
      <ul>
        <li>Update your payment method with valid card/account details</li>
        <li>Contact us for manual review and retry options</li>
        <li>Reach out to your bank to verify the issue</li>
      </ul>

      ${contactEmail ? `<p>For assistance, please contact us at: <strong>${contactEmail.replace(/[<>&"]/g, '')}</strong></p>` : ''}

      <p style="margin-top: 30px; font-size: 13px; color: #999;">
        Case Reference: ${caseId}<br>
        This is an automated notification from RecoverPay AI Payment Recovery System.
      </p>
    </div>
    <div class="footer">
      <p>RecoverPay AI © 2026. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Template 6: Human Review Required
 */
function getHumanReviewTemplate({
  customerName,
  amount,
  currency = 'INR',
  failureReason,
  diagnosis,
  contactEmail,
  caseId
}) {
  const formatAmount = currency === 'INR' ? formatCurrency(amount) : `${currency} ${amount}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Human Review Required - RecoverPay AI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f5f5f5; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: white; border: 1px solid #e0e0e0; border-top: none; padding: 30px; }
    .footer { background: #f5f5f5; padding: 15px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none; font-size: 12px; color: #666; }
    .info-box { background: #f3e5f5; border-left: 4px solid #9c27b0; padding: 15px; margin: 20px 0; border-radius: 4px; }
    h1 { color: #222; margin-top: 0; }
    .metadata { background: #f9f9f9; padding: 15px; border-radius: 4px; margin: 15px 0; font-size: 13px; }
    .metadata-row { margin: 8px 0; }
    .metadata-label { font-weight: 600; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>👤 Human Review Required</h1>
    </div>
    <div class="content">
      <p>Hi ${(customerName || 'Valued Customer').replace(/[<>&"]/g, '')},</p>

      <div class="info-box">
        <strong>Your payment requires special attention.</strong> Our AI analysis indicates that a human agent should review this case for the best outcome.
      </div>

      <h2>Case Details</h2>
      <div class="metadata">
        <div class="metadata-row"><span class="metadata-label">Amount:</span> ${formatAmount}</div>
        <div class="metadata-row"><span class="metadata-label">Failure Reason:</span> ${failureReason || 'Requires Review'}</div>
        <div class="metadata-row"><span class="metadata-label">AI Assessment:</span> ${diagnosis || 'Complex case'}</div>
        <div class="metadata-row"><span class="metadata-label">Case ID:</span> #${caseId}</div>
      </div>

      <h2>What Happens Next?</h2>
      <p>A member of our support team will review your case shortly and contact you with the best options for recovery. We prioritize cases that require special handling to ensure the best outcome.</p>

      <h2>How to Help</h2>
      <ul>
        <li>Ensure your contact information is up to date</li>
        <li>Check your email/phone for updates from us</li>
        <li>Be prepared to provide additional information if requested</li>
      </ul>

      ${contactEmail ? `<p><strong>Support Team Email:</strong> ${contactEmail.replace(/[<>&"]/g, '')}</p>` : ''}

      <p style="margin-top: 30px; font-size: 13px; color: #999;">
        Case Reference: ${caseId}<br>
        This is an automated notification from RecoverAI Payment Recovery System.
      </p>
    </div>
    <div class="footer">
      <p>RecoverAI © 2026. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

module.exports = {
  getPaymentFailedTemplate,
  getRetryScheduledTemplate,
  getPaymentRecoveredTemplate,
  getUpdatePaymentMethodTemplate,
  getRetryLimitReachedTemplate,
  getHumanReviewTemplate
};
