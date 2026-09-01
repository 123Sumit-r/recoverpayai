/**
 * Payment Events Model
 * 
 * Stores real payment events from Razorpay webhooks
 * Source of truth for payment failure information
 */

const pool = require('../config/database');

/**
 * Create or get payment event from webhook
 */
async function createOrGet(paymentEventData) {
  const {
    razorpayEventId,
    razorpayPaymentId,
    razorpayOrderId,
    eventType,
    customerId,
    amount,
    currency,
    failureReason,
    failureDescription,
    providerResponse,
    webhookSignatureVerified
  } = paymentEventData;

  try {
    // Check if already exists (idempotency)
    const existing = await pool.query(
      `SELECT * FROM payment_events WHERE razorpay_event_id = $1`,
      [razorpayEventId]
    );

    if (existing.rows.length > 0) {
      return { event: existing.rows[0], created: false, duplicate: true };
    }

    // Create new payment event
    const result = await pool.query(
      `INSERT INTO payment_events (
        razorpay_event_id,
        razorpay_payment_id,
        razorpay_order_id,
        event_type,
        customer_id,
        amount,
        currency,
        failure_reason,
        failure_description,
        provider_response,
        webhook_signature_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        razorpayEventId,
        razorpayPaymentId,
        razorpayOrderId,
        eventType,
        customerId,
        amount,
        currency,
        failureReason,
        failureDescription,
        JSON.stringify(providerResponse),
        webhookSignatureVerified
      ]
    );

    return { event: result.rows[0], created: true, duplicate: false };
  } catch (error) {
    throw new Error(`Payment event creation failed: ${error.message}`);
  }
}

/**
 * Mark payment event as processed
 */
async function markProcessed(paymentEventId, recoveryCase = null) {
  try {
    const result = await pool.query(
      `UPDATE payment_events 
       SET processed = true, processed_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [paymentEventId]
    );

    return result.rows[0];
  } catch (error) {
    throw new Error(`Failed to mark payment event as processed: ${error.message}`);
  }
}

/**
 * Get payment event by Razorpay event ID
 */
async function getByRazorpayEventId(razorpayEventId) {
  try {
    const result = await pool.query(
      `SELECT * FROM payment_events WHERE razorpay_event_id = $1`,
      [razorpayEventId]
    );

    return result.rows[0] || null;
  } catch (error) {
    throw new Error(`Failed to fetch payment event: ${error.message}`);
  }
}

/**
 * Get payment event by payment ID
 */
async function getByPaymentId(paymentId) {
  try {
    const result = await pool.query(
      `SELECT * FROM payment_events WHERE razorpay_payment_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [paymentId]
    );

    return result.rows[0] || null;
  } catch (error) {
    throw new Error(`Failed to fetch payment event: ${error.message}`);
  }
}

/**
 * Get all unprocessed payment events
 */
async function getUnprocessed() {
  try {
    const result = await pool.query(
      `SELECT * FROM payment_events 
       WHERE processed = false
       ORDER BY created_at ASC`
    );

    return result.rows;
  } catch (error) {
    throw new Error(`Failed to fetch unprocessed events: ${error.message}`);
  }
}

/**
 * Get payment events for a customer
 */
async function getByCustomerId(customerId, limit = 50) {
  try {
    const result = await pool.query(
      `SELECT * FROM payment_events 
       WHERE customer_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [customerId, limit]
    );

    return result.rows;
  } catch (error) {
    throw new Error(`Failed to fetch customer payment events: ${error.message}`);
  }
}

/**
 * Get payment event summary stats
 */
async function getStats() {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN processed = true THEN 1 ELSE 0 END) as processed,
        SUM(CASE WHEN processed = false THEN 1 ELSE 0 END) as pending,
        COUNT(DISTINCT customer_id) as unique_customers,
        SUM(amount) as total_amount_at_risk
      FROM payment_events
      WHERE failure_reason IS NOT NULL
    `);

    return result.rows[0];
  } catch (error) {
    throw new Error(`Failed to fetch payment event stats: ${error.message}`);
  }
}

module.exports = {
  createOrGet,
  markProcessed,
  getByRazorpayEventId,
  getByPaymentId,
  getUnprocessed,
  getByCustomerId,
  getStats
};
