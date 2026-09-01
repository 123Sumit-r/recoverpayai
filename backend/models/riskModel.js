const pool = require('../config/database');
const { refreshOverdue } = require('./invoiceModel');

async function getSummary() {
  await refreshOverdue();
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM transactions WHERE status = 'failed') AS failed_payment_count,
      (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE status = 'failed') AS failed_payment_amount,
      (SELECT COUNT(*) FROM invoices WHERE status = 'overdue') AS overdue_invoice_count,
      (SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE status = 'overdue') AS overdue_invoice_amount,
      (SELECT COUNT(*) FROM checkout_events WHERE status = 'abandoned') AS checkout_abandonment_count,
      (SELECT COALESCE(SUM(amount), 0) FROM checkout_events WHERE status = 'abandoned') AS checkout_abandonment_amount
  `);
  const row = result.rows[0];
  const failedAmount = Number(row.failed_payment_amount);
  const overdueAmount = Number(row.overdue_invoice_amount);
  const checkoutAmount = Number(row.checkout_abandonment_amount);
  return {
    failed_payment_count: Number(row.failed_payment_count),
    failed_payment_amount: failedAmount,
    overdue_invoice_count: Number(row.overdue_invoice_count),
    overdue_invoice_amount: overdueAmount,
    checkout_abandonment_count: Number(row.checkout_abandonment_count),
    checkout_abandonment_amount: checkoutAmount,
    total_revenue_at_risk: failedAmount + overdueAmount + checkoutAmount
  };
}

module.exports = { getSummary };
