/**
 * Retry Attempts Model
 * 
 * Tracks all payment retry attempts with strict limits
 * Prevents infinite retry loops
 */

const pool = require('../config/database');

/**
 * Schedule a retry attempt
 */
async function schedule(retryData) {
  const {
    recoveryCase,
    paymentEventId,
    scheduledFor,
    attemptNumber = 1,
    razorpayOrderId = null,
    razorpayPaymentId = null
  } = retryData;

  try {
    const result = await pool.query(
      `INSERT INTO retry_attempts (
        recovery_case_id,
        payment_event_id,
        razorpay_order_id,
        razorpay_payment_id,
        attempt_number,
        scheduled_for,
        retry_status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'scheduled')
      RETURNING *`,
      [
        recoveryCase.id,
        paymentEventId,
        razorpayOrderId,
        razorpayPaymentId,
        attemptNumber,
        scheduledFor
      ]
    );

    return result.rows[0];
  } catch (error) {
    throw new Error(`Failed to schedule retry: ${error.message}`);
  }
}

/**
 * Mark retry attempt as attempted
 */
async function markAttempted(retryAttemptId) {
  try {
    const result = await pool.query(
      `UPDATE retry_attempts
       SET retry_status = 'attempted', executed_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [retryAttemptId]
    );

    return result.rows[0];
  } catch (error) {
    throw new Error(`Failed to mark retry as attempted: ${error.message}`);
  }
}

/**
 * Mark retry attempt as successful
 */
async function markSuccess(retryAttemptId, razorpayPaymentId = null) {
  try {
    const result = await pool.query(
      `UPDATE retry_attempts
       SET 
         retry_status = 'success',
         executed_at = CURRENT_TIMESTAMP,
         razorpay_payment_id = COALESCE($2, razorpay_payment_id)
       WHERE id = $1
       RETURNING *`,
      [retryAttemptId, razorpayPaymentId]
    );

    return result.rows[0];
  } catch (error) {
    throw new Error(`Failed to mark retry as successful: ${error.message}`);
  }
}

/**
 * Mark retry attempt as failed
 */
async function markFailed(retryAttemptId, retryResult = null, providerResponse = null) {
  try {
    const result = await pool.query(
      `UPDATE retry_attempts
       SET 
         retry_status = 'failed',
         retry_result = $2,
         provider_response = $3,
         executed_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [
        retryAttemptId,
        retryResult,
        JSON.stringify(providerResponse || {})
      ]
    );

    return result.rows[0];
  } catch (error) {
    throw new Error(`Failed to mark retry as failed: ${error.message}`);
  }
}

/**
 * Get retry attempts for a recovery case
 */
async function getByRecoveryCase(recoveryCase) {
  try {
    const result = await pool.query(
      `SELECT * FROM retry_attempts
       WHERE recovery_case_id = $1
       ORDER BY attempt_number ASC`,
      [recoveryCase.id]
    );

    return result.rows;
  } catch (error) {
    throw new Error(`Failed to fetch retry attempts: ${error.message}`);
  }
}

/**
 * Get retry count for a recovery case
 */
async function getCount(recoveryCase) {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM retry_attempts
       WHERE recovery_case_id = $1
       AND retry_status IN ('attempted', 'success', 'failed')`,
      [recoveryCase.id]
    );

    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    throw new Error(`Failed to get retry count: ${error.message}`);
  }
}

/**
 * Get successful retry for recovery case
 */
async function getSuccessful(recoveryCase) {
  try {
    const result = await pool.query(
      `SELECT * FROM retry_attempts
       WHERE recovery_case_id = $1
       AND retry_status = 'success'
       LIMIT 1`,
      [recoveryCase.id]
    );

    return result.rows[0] || null;
  } catch (error) {
    throw new Error(`Failed to fetch successful retry: ${error.message}`);
  }
}

/**
 * Get next scheduled retry for a recovery case
 */
async function getNextScheduled(recoveryCase) {
  try {
    const result = await pool.query(
      `SELECT * FROM retry_attempts
       WHERE recovery_case_id = $1
       AND retry_status = 'scheduled'
       AND scheduled_for <= CURRENT_TIMESTAMP
       ORDER BY scheduled_for ASC
       LIMIT 1`,
      [recoveryCase.id]
    );

    return result.rows[0] || null;
  } catch (error) {
    throw new Error(`Failed to fetch next scheduled retry: ${error.message}`);
  }
}

/**
 * Get all overdue scheduled retries across all cases
 */
async function getOverdueScheduled(limit = 100) {
  try {
    const result = await pool.query(
      `SELECT ra.*, rc.id as case_id FROM retry_attempts ra
       JOIN recovery_cases rc ON ra.recovery_case_id = rc.id
       WHERE ra.retry_status = 'scheduled'
       AND ra.scheduled_for <= CURRENT_TIMESTAMP
       ORDER BY ra.scheduled_for ASC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  } catch (error) {
    throw new Error(`Failed to fetch overdue retries: ${error.message}`);
  }
}

/**
 * Check if retry limits have been reached
 */
async function hasReachedLimit(recoveryCase, maxRetries) {
  try {
    const count = await getCount(recoveryCase);
    return count >= maxRetries;
  } catch (error) {
    throw new Error(`Failed to check retry limit: ${error.message}`);
  }
}

/**
 * Get retry statistics
 */
async function getStats() {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_retry_attempts,
        SUM(CASE WHEN retry_status = 'success' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN retry_status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN retry_status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN retry_status = 'attempted' THEN 1 ELSE 0 END) as attempted,
        COUNT(DISTINCT recovery_case_id) as cases_with_retries
      FROM retry_attempts
    `);

    return result.rows[0];
  } catch (error) {
    throw new Error(`Failed to fetch retry statistics: ${error.message}`);
  }
}

module.exports = {
  schedule,
  markAttempted,
  markSuccess,
  markFailed,
  getByRecoveryCase,
  getCount,
  getSuccessful,
  getNextScheduled,
  getOverdueScheduled,
  hasReachedLimit,
  getStats
};
