const pool = require('../config/database');

function mapCase(row) {
  if (!row) return row;
  return { ...row, amount_at_risk: Number(row.amount_at_risk), amount_recovered: Number(row.amount_recovered || 0) };
}

async function findAll() {
  const result = await pool.query(`
    SELECT rc.*, c.name AS customer_name, c.email AS customer_email, c.customer_type,
      t.failure_reason, t.status AS transaction_status, i.due_date, ce.status AS checkout_status, ce.abandonment_reason,
      (SELECT COUNT(*) FROM transactions history WHERE history.customer_id = rc.customer_id AND history.status = 'failed') AS previous_failed_transactions,
      CASE WHEN i.id IS NOT NULL THEN CURRENT_DATE - i.due_date ELSE 0 END AS overdue_days
    FROM recovery_cases rc
    JOIN customers c ON c.id = rc.customer_id
    LEFT JOIN transactions t ON t.id = rc.transaction_id
    LEFT JOIN invoices i ON i.id = rc.invoice_id
    LEFT JOIN checkout_events ce ON ce.id = rc.checkout_event_id
    ORDER BY rc.id DESC
  `);
  return result.rows.map(mapCase);
}

async function findById(id) {
  const result = await pool.query(`
    SELECT rc.*, c.name AS customer_name, c.email AS customer_email, c.customer_type,
      t.failure_reason, t.status AS transaction_status, i.due_date, ce.status AS checkout_status, ce.abandonment_reason,
      (SELECT COUNT(*) FROM transactions history WHERE history.customer_id = rc.customer_id AND history.status = 'failed') AS previous_failed_transactions,
      CASE WHEN i.id IS NOT NULL THEN CURRENT_DATE - i.due_date ELSE 0 END AS overdue_days
    FROM recovery_cases rc
    JOIN customers c ON c.id = rc.customer_id
    LEFT JOIN transactions t ON t.id = rc.transaction_id
    LEFT JOIN invoices i ON i.id = rc.invoice_id
    LEFT JOIN checkout_events ce ON ce.id = rc.checkout_event_id
    WHERE rc.id = $1
  `, [id]);
  return mapCase(result.rows[0]);
}

async function createFromSource({ transactionId, invoiceId, checkoutEventId, paymentEventId }) {
  const source = transactionId ? `
    SELECT t.customer_id, t.id AS transaction_id, NULL::integer AS invoice_id, t.amount AS amount_at_risk,
      'failed_payment' AS case_type, t.failure_reason, 0 AS overdue_days
    FROM transactions t WHERE t.id = $1 AND t.status = 'failed'
  ` : invoiceId ? `
    SELECT i.customer_id, NULL::integer AS transaction_id, i.id AS invoice_id, i.amount AS amount_at_risk,
      'overdue_invoice' AS case_type, NULL::varchar AS failure_reason, CURRENT_DATE - i.due_date AS overdue_days
    FROM invoices i WHERE i.id = $1 AND i.status = 'overdue'
  ` : paymentEventId ? `
    SELECT pe.customer_id, NULL::integer AS transaction_id, NULL::integer AS invoice_id, NULL::integer AS checkout_event_id,
      pe.id AS payment_event_id, pe.amount AS amount_at_risk,
      'failed_payment' AS case_type, pe.failure_reason, 0 AS overdue_days
    FROM payment_events pe WHERE pe.id = $1
  ` : `
    SELECT ce.customer_id, NULL::integer AS transaction_id, NULL::integer AS invoice_id, ce.id AS checkout_event_id, ce.amount AS amount_at_risk,
      'checkout_abandonment' AS case_type, ce.abandonment_reason AS failure_reason, 0 AS overdue_days
    FROM checkout_events ce WHERE ce.id = $1 AND ce.status = 'abandoned'
  `;
  const sourceId = transactionId || invoiceId || checkoutEventId || paymentEventId;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sourceResult = await client.query(source, [sourceId]);
    const sourceRecord = sourceResult.rows[0];
    if (!sourceRecord) {
      await client.query('ROLLBACK');
      return null;
    }
    const existing = await client.query(`
      SELECT id FROM recovery_cases
      WHERE status NOT IN ('recovered', 'failed', 'closed')
        AND (($1::integer IS NOT NULL AND transaction_id = $1) OR ($2::integer IS NOT NULL AND invoice_id = $2) OR ($3::integer IS NOT NULL AND checkout_event_id = $3) OR ($4::integer IS NOT NULL AND payment_event_id = $4))
      ORDER BY id DESC LIMIT 1
    `, [transactionId || null, invoiceId || null, checkoutEventId || null, paymentEventId || null]);
    if (existing.rows[0]) {
      await client.query('COMMIT');
      return findById(existing.rows[0].id);
    }
    const inserted = await client.query(`
      INSERT INTO recovery_cases (customer_id, transaction_id, invoice_id, checkout_event_id, payment_event_id, amount_at_risk, case_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `, [sourceRecord.customer_id, sourceRecord.transaction_id, sourceRecord.invoice_id, sourceRecord.checkout_event_id || null, sourceRecord.payment_event_id || paymentEventId || null, sourceRecord.amount_at_risk, sourceRecord.case_type]);
    const caseId = inserted.rows[0].id;
    await client.query(`INSERT INTO audit_logs (recovery_case_id, event_type, message, metadata) VALUES ($1, 'case_created', $2, $3)`, [caseId, 'Revenue risk case created.', JSON.stringify({ case_type: sourceRecord.case_type, amount_at_risk: sourceRecord.amount_at_risk })]);
    await client.query(`INSERT INTO audit_logs (recovery_case_id, event_type, message) VALUES ($1, 'risk_detected', 'Revenue at risk detected from PostgreSQL.')`, [caseId]);
    await client.query('COMMIT');
    return findById(caseId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function saveAnalysis(caseId, diagnosis, recommendation, policy) {
  await pool.query(`UPDATE recovery_cases SET diagnosis_code = $1, diagnosis = $2, recommended_action = $3, policy_allowed = $4, policy_reason = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6`, [diagnosis.root_cause, diagnosis.diagnosis, recommendation.recommended_action, policy.allowed, policy.reason, caseId]);
  await pool.query(`INSERT INTO audit_logs (recovery_case_id, event_type, message, metadata) VALUES ($1, 'diagnosis_generated', $2, $3), ($1, 'intervention_recommended', $4, $5)`, [caseId, diagnosis.diagnosis, JSON.stringify(diagnosis), recommendation.reason, JSON.stringify(recommendation)]);
  return findById(caseId);
}

async function saveAiAnalysis(caseId, analysis, policy) {
  await pool.query(`UPDATE recovery_cases SET diagnosis_code = $1, diagnosis = $2, risk_level = $3, recommended_action = $4, policy_allowed = $5, policy_reason = $6, ai_analysis = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8`, [analysis.root_cause, analysis.reason, analysis.risk_level, analysis.recommended_action, policy.allowed, policy.reason, JSON.stringify(analysis), caseId]);
  await pool.query(`INSERT INTO audit_logs (recovery_case_id, event_type, message, metadata) VALUES ($1, 'ai_analysis_generated', $2, $3), ($1, 'ai_intervention_recommended', $4, $5), ($1, $6, $7, $8)`, [caseId, analysis.reason, JSON.stringify(analysis), `AI recommended ${analysis.recommended_action}.`, JSON.stringify({ recommendation: analysis.recommended_action, risk_level: analysis.risk_level }), policy.allowed ? 'policy_approved' : 'policy_rejected', policy.reason, JSON.stringify(policy)]);
  return findById(caseId);
}

async function logAudit(caseId, eventType, message, metadata = {}) {
  await pool.query('INSERT INTO audit_logs (recovery_case_id, event_type, message, metadata) VALUES ($1, $2, $3, $4)', [caseId, eventType, message, JSON.stringify(metadata)]);
}

async function execute(caseRecord, policy, result) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const nextStatus = policy.allowed ? (result.status === 'succeeded' ? 'recovered' : result.status) : (policy.escalate ? 'escalated' : caseRecord.status);
    const retryIncrement = policy.allowed && ['retry_payment', 'retry_payment_later'].includes(policy.action) && result.status === 'failed' ? 1 : 0;
    const reminderIncrement = policy.allowed && ['send_payment_reminder', 'send_checkout_recovery', 'send_invoice_notification'].includes(policy.action) ? 1 : 0;
    const recovered = policy.allowed && result.status === 'succeeded' ? caseRecord.amount_at_risk : 0;
    await client.query(`UPDATE recovery_cases SET status = $1, policy_allowed = $2, policy_reason = $3, retry_count = retry_count + $4, reminder_count = reminder_count + $5, amount_recovered = amount_recovered + $6, last_action = $7, last_action_status = $8, updated_at = CURRENT_TIMESTAMP WHERE id = $9`, [nextStatus, policy.allowed, policy.reason, retryIncrement, reminderIncrement, recovered, policy.action, result.status, caseRecord.id]);
    await client.query(`INSERT INTO audit_logs (recovery_case_id, event_type, message, metadata) VALUES ($1, $2, $3, $4)`, [caseRecord.id, policy.allowed ? 'policy_approved' : 'policy_rejected', policy.reason, JSON.stringify(policy)]);
    const isReal = result.mode === 'real' && result.simulated === false;
    const providerName = result.provider || 'Integration Provider';
    const auditMessage = policy.allowed
      ? `${isReal ? 'Real' : 'Simulated'} recovery action executed via ${providerName}.`
      : 'Recovery action was blocked by policy.';
    await client.query(`INSERT INTO audit_logs (recovery_case_id, event_type, message, metadata) VALUES ($1, 'recovery_action_executed', $2, $3)`, [caseRecord.id, auditMessage, JSON.stringify(result)]);
    if (policy.allowed) {
      const outcomeMessage = result.status === 'succeeded'
        ? `${isReal ? 'Real' : 'Simulated'} recovery succeeded via ${providerName}.`
        : `${isReal ? 'Real' : 'Simulated'} recovery failed (${result.message || 'declined'}).`;
      await client.query(`INSERT INTO audit_logs (recovery_case_id, event_type, message) VALUES ($1, $2, $3)`, [caseRecord.id, result.status === 'succeeded' ? 'recovery_succeeded' : 'recovery_failed', outcomeMessage]);
    } else if (policy.escalate) {
      await client.query(`INSERT INTO audit_logs (recovery_case_id, event_type, message) VALUES ($1, 'case_escalated', $2)`, [caseRecord.id, policy.reason]);
    }
    await client.query('COMMIT');
    return findById(caseRecord.id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getRevenuePerformance() {
  const result = await pool.query(`
    WITH transaction_recovery AS (
      SELECT transaction_id, LEAST(SUM(amount_recovered), MAX(amount_at_risk)) AS recovered_revenue
      FROM recovery_cases
      WHERE transaction_id IS NOT NULL AND status = 'recovered'
      GROUP BY transaction_id
    )
    SELECT
      TO_CHAR(t.created_at::date, 'YYYY-MM-DD') AS date,
      COALESCE(SUM(t.amount), 0) AS revenue_at_risk,
      COALESCE(SUM(CASE WHEN tr.recovered_revenue > 0 THEN LEAST(tr.recovered_revenue, t.amount) ELSE 0 END), 0) AS recovered_revenue
    FROM transactions t
    LEFT JOIN transaction_recovery tr ON tr.transaction_id = t.id
    WHERE t.status = 'failed'
    GROUP BY t.created_at::date
    ORDER BY t.created_at::date
  `);

  return result.rows.map((row) => ({
    date: row.date,
    revenueAtRisk: Number(row.revenue_at_risk),
    recoveredRevenue: Number(row.recovered_revenue)
  }));
}

async function getAuditLedger() {
  const result = await pool.query(`
    SELECT al.id, al.recovery_case_id AS case_id, al.event_type, al.message, al.created_at,
      rc.amount_at_risk, c.name AS customer_name
    FROM audit_logs al
    JOIN recovery_cases rc ON rc.id = al.recovery_case_id
    JOIN customers c ON c.id = rc.customer_id
    ORDER BY al.created_at DESC, al.id DESC
    LIMIT 500
  `);
  return result.rows.map((row) => ({ ...row, amount_at_risk: Number(row.amount_at_risk) }));
}

async function getSummary() {
  const result = await pool.query(`
    SELECT
      COUNT(*) AS total_cases,
      COUNT(*) FILTER (WHERE status = 'open') AS open_cases,
      COUNT(*) FILTER (WHERE status = 'recovered') AS recovered_cases,
      COUNT(*) FILTER (WHERE status = 'failed') AS failed_cases,
      COUNT(*) FILTER (WHERE status = 'escalated') AS escalated_cases,
      COUNT(*) FILTER (WHERE case_type = 'checkout_abandonment') AS checkout_recovery_cases,
      COUNT(*) FILTER (WHERE case_type = 'checkout_abandonment' AND status = 'recovered') AS checkout_recovered_cases,
      COALESCE(SUM(amount_at_risk), 0) AS total_amount_at_risk,
      COALESCE(SUM(amount_recovered), 0) AS amount_recovered,
      COALESCE(SUM(amount_at_risk) FILTER (WHERE case_type = 'checkout_abandonment'), 0) AS checkout_amount_at_risk,
      COALESCE(SUM(amount_recovered) FILTER (WHERE case_type = 'checkout_abandonment'), 0) AS checkout_amount_recovered,
      COUNT(*) FILTER (WHERE case_type = 'overdue_invoice') AS invoice_recovery_cases,
      COUNT(*) FILTER (WHERE case_type = 'overdue_invoice' AND status = 'recovered') AS invoice_recovered_cases,
      COALESCE(SUM(amount_at_risk) FILTER (WHERE case_type = 'overdue_invoice'), 0) AS invoice_amount_at_risk,
      COALESCE(SUM(amount_recovered) FILTER (WHERE case_type = 'overdue_invoice'), 0) AS invoice_amount_recovered
    FROM recovery_cases
  `);
  const row = result.rows[0];
  const totalCases = Number(row.total_cases);
  const recoveredCases = Number(row.recovered_cases);
  return {
    total_cases: totalCases,
    open_cases: Number(row.open_cases),
    recovered_cases: recoveredCases,
    failed_cases: Number(row.failed_cases),
    escalated_cases: Number(row.escalated_cases),
    total_amount_at_risk: Number(row.total_amount_at_risk),
    amount_recovered: Number(row.amount_recovered),
    recovery_rate: totalCases ? Number(((recoveredCases / totalCases) * 100).toFixed(2)) : 0,
    checkout_recovery_cases: Number(row.checkout_recovery_cases),
    checkout_recovered_cases: Number(row.checkout_recovered_cases),
    checkout_amount_at_risk: Number(row.checkout_amount_at_risk),
    checkout_amount_recovered: Number(row.checkout_amount_recovered),
    invoice_recovery_cases: Number(row.invoice_recovery_cases),
    invoice_recovered_cases: Number(row.invoice_recovered_cases),
    invoice_amount_at_risk: Number(row.invoice_amount_at_risk),
    invoice_amount_recovered: Number(row.invoice_amount_recovered)
  };
}

async function getAuditLogs(caseId) {
  const result = await pool.query('SELECT * FROM audit_logs WHERE recovery_case_id = $1 ORDER BY id', [caseId]);
  return result.rows;
}

async function getEmailAuditLogs(caseId) {
  const result = await pool.query('SELECT * FROM email_audit_logs WHERE case_id = $1 ORDER BY id DESC', [caseId]);
  return result.rows;
}

async function updateActionStatus(caseId, status, lastAction = null, lastActionStatus = null) {
  const reminderIncrement = status === 'email_sent' ? 1 : 0;
  await pool.query(
    `UPDATE recovery_cases
     SET status = $1, last_action = $2, last_action_status = $3, reminder_count = reminder_count + $4, updated_at = CURRENT_TIMESTAMP
     WHERE id = $5`,
    [status, lastAction, lastActionStatus, reminderIncrement, caseId]
  );
  return findById(caseId);
}

/**
 * Update next retry timestamp
 */
async function updateNextRetry(caseId, nextRetryAt) {
  await pool.query(
    `UPDATE recovery_cases
     SET next_retry_at = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [nextRetryAt, caseId]
  );
  return findById(caseId);
}

/**
 * Update case status with amount recovered and action tracking
 */
async function updateStatus(caseId, status, amountRecovered = 0, lastAction = null, lastActionStatus = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE recovery_cases
       SET 
         status = $1,
         amount_recovered = amount_recovered + $2,
         last_action = $3,
         last_action_status = $4,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [status, amountRecovered, lastAction, lastActionStatus, caseId]
    );

    // Log the status change
    if (status === 'recovered') {
      await client.query(
        `INSERT INTO audit_logs (recovery_case_id, event_type, message, metadata)
         VALUES ($1, 'status_recovered', $2, $3)`,
        [caseId, `Case status changed to recovered. Amount: ₹${amountRecovered}`, JSON.stringify({ amount: amountRecovered })]
      );
    } else if (status === 'escalated') {
      await client.query(
        `INSERT INTO audit_logs (recovery_case_id, event_type, message, metadata)
         VALUES ($1, 'status_escalated', $2, $3)`,
        [caseId, `Case escalated for human review. Reason: ${lastActionStatus}`, JSON.stringify({ reason: lastActionStatus })]
      );
    } else if (status === 'failed') {
      await client.query(
        `INSERT INTO audit_logs (recovery_case_id, event_type, message, metadata)
         VALUES ($1, 'status_failed', $2, $3)`,
        [caseId, `Case marked as failed. Reason: ${lastActionStatus}`, JSON.stringify({ reason: lastActionStatus })]
      );
    }

    await client.query('COMMIT');
    return findById(caseId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Store Razorpay payment details in recovery case
 */
async function updateRazorpayPaymentDetails(caseId, paymentEventId, razorpayPaymentId, razorpayOrderId) {
  await pool.query(
    `UPDATE recovery_cases
     SET 
       payment_event_id = $1,
       razorpay_payment_id = $2,
       razorpay_order_id = $3,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [paymentEventId, razorpayPaymentId, razorpayOrderId, caseId]
  );
  return findById(caseId);
}

/**
 * Block retries with a reason
 */
async function blockRetry(caseId, reason) {
  await pool.query(
    `UPDATE recovery_cases
     SET 
       retry_blocked = true,
       retry_block_reason = $1,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [reason, caseId]
  );
  return findById(caseId);
}

module.exports = {
  findAll,
  findById,
  createFromSource,
  saveAnalysis,
  saveAiAnalysis,
  logAudit,
  execute,
  updateActionStatus,
  updateNextRetry,
  updateStatus,
  updateRazorpayPaymentDetails,
  blockRetry,
  getSummary,
  getRevenuePerformance,
  getAuditLedger,
  getAuditLogs,
  getEmailAuditLogs
};

