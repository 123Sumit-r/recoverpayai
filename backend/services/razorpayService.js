/**
 * Razorpay Integration Service
 * 
 * Handles:
 * - Webhook signature verification
 * - Payment failure classification
 * - Razorpay API communication
 * - Test mode detection
 */

const crypto = require('crypto');

/**
 * Verify Razorpay webhook signature
 * 
 * Razorpay sends:
 * - X-Razorpay-Signature: HMAC-SHA256 signature
 * 
 * We compute: HMAC-SHA256(body, secret)
 * And verify it matches the signature header
 */
function verifyWebhookSignature(rawBody, signature, webhookSecret) {
  if (!rawBody || !signature || !webhookSecret) {
    return { valid: false, error: 'Missing signature components' };
  }

  try {
    // Razorpay signature verification
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );

    return { valid: isValid, signature: expectedSignature };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Map Razorpay failure reason to RecoverPay AI standard codes
 * 
 * Razorpay provides various failure descriptions.
 * We normalize to our 5 standard reasons.
 */
function mapFailureReason(razorpayError, paymentMethod = 'card') {
  if (!razorpayError) {
    return { reason: 'temporary_failure', description: 'Payment gateway error' };
  }

  const errorLower = String(razorpayError).toLowerCase();

  // Prefer Razorpay's machine-readable reason when it is provided.
  if (['card_expired', 'expired_card'].includes(errorLower) || errorLower.includes('expired')) {
    return {
      reason: 'expired_card',
      description: 'Payment method has expired'
    };
  }

  // Card expired
  // Insufficient funds
  if (
    errorLower.includes('insufficient') ||
    errorLower.includes('insufficient funds') ||
    errorLower.includes('nsf')
  ) {
    return {
      reason: 'insufficient_funds',
      description: 'Insufficient funds in the account'
    };
  }

  // Bank declined
  if (
    errorLower.includes('declined') ||
    errorLower.includes('decline') ||
    errorLower.includes('issuer') ||
    errorLower.includes('authentication failed')
  ) {
    return {
      reason: 'bank_declined',
      description: 'Bank or issuer declined the transaction'
    };
  }

  // Invalid payment method
  if (
    errorLower.includes('invalid') ||
    errorLower.includes('bad') ||
    errorLower.includes('stolen') ||
    errorLower.includes('lost') ||
    errorLower.includes('not found')
  ) {
    return {
      reason: 'invalid_payment_method',
      description: 'Invalid or unauthorized payment method'
    };
  }

  // Temporary failure (network, gateway, etc)
  if (
    errorLower.includes('gateway') ||
    errorLower.includes('timeout') ||
    errorLower.includes('network') ||
    errorLower.includes('temporary') ||
    errorLower.includes('service') ||
    errorLower.includes('error')
  ) {
    return {
      reason: 'temporary_failure',
      description: 'Temporary payment gateway issue'
    };
  }

  // Default: unknown temporary failure
  return {
    reason: 'temporary_failure',
    description: razorpayError
  };
}

/**
 * Classify if a failure is retryable
 * 
 * Some failures should never be retried automatically:
 * - expired_card: requires customer action
 * - invalid_payment_method: requires customer action
 * 
 * Retryable failures:
 * - temporary_failure: infrastructure issue
 * - bank_declined: might work on retry
 * - insufficient_funds: might have funds later
 */
function isRetryable(failureReason) {
  const nonRetryable = ['expired_card', 'invalid_payment_method'];
  return !nonRetryable.includes(failureReason);
}

/**
 * Get recovery email template name for failure reason
 */
function getEmailTemplate(failureReason) {
  const templates = {
    expired_card: 'update_payment_method',
    insufficient_funds: 'retry_scheduled',
    bank_declined: 'retry_scheduled',
    temporary_failure: 'retry_scheduled',
    invalid_payment_method: 'update_payment_method'
  };
  return templates[failureReason] || 'generic_failure';
}

/**
 * Parse Razorpay webhook payload
 */
function parsePaymentWebhook(eventData) {
  if (!eventData || !eventData.payload) {
    return { valid: false, error: 'Invalid webhook payload' };
  }

  const { payload } = eventData;
  const { payment: paymentPayload = {} } = payload;
  const payment = paymentPayload.entity || paymentPayload;

  return {
    valid: true,
    eventId: eventData.id,
    eventType: eventData.event,
    paymentId: payment.id,
    orderId: payment.order_id,
    customerId: payment.customer_id,
    amount: payment.amount ? payment.amount / 100 : 0, // Razorpay stores in paise
    currency: payment.currency || 'INR',
    status: payment.status,
    method: payment.method,
      error: payment.error_description || payment.error_reason || null,
      failureReason: payment.error_reason || payment.error_description || null,
    email: payment.email,
    contact: payment.contact,
    description: payment.description,
    notes: payment.notes || {},
    createdAt: new Date(payment.created_at * 1000),
    vpa: payment.vpa, // UPI identifier
    card: {
      id: payment.card_id,
      lastFour: payment.card?.last4,
      issuer: payment.card?.issuer,
      type: payment.card?.type
    }
  };
}

/**
 * Check if a payment event is from Razorpay TEST mode
 * In test mode, payment IDs start with "pay_" and order IDs start with "order_"
 * Real production payments would have different prefixes
 */
function isTestMode(paymentId, orderId) {
  // In Razorpay, test payments have these characteristics
  // This is simplified - in real implementation, check the API key mode
  return process.env.RAZORPAY_KEY_ID?.includes('rzp_test');
}

module.exports = {
  verifyWebhookSignature,
  mapFailureReason,
  isRetryable,
  getEmailTemplate,
  parsePaymentWebhook,
  isTestMode
};
