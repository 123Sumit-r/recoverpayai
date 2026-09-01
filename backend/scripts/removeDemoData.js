/**
 * Remove all demo/seed data from the RecoverPay AI database.
 * Preserves real customer data (emails NOT ending in @example.test).
 * 
 * This script is intentionally idempotent — safe to run multiple times.
 */
require('dotenv').config();
const pool = require('../config/database');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Identify demo customer IDs (including all fake data patterns)
    const demoCustomers = await client.query(
      `SELECT id FROM customers WHERE 
        email LIKE '%example.test%' OR
        email LIKE 'real_inv_%' OR
        email LIKE 'real_ch_%' OR
        email LIKE 'real_pay_%' OR
        email LIKE 'pay_test_%' OR
        email LIKE 'persist_%' OR
        email LIKE 'audit_%' OR
        email LIKE 'inv_test_%' OR
        email LIKE 'demo_%'`
    );
    const demoIds = demoCustomers.rows.map(r => r.id);

    if (demoIds.length === 0) {
      console.log('No demo data found. Database is clean.');
      await client.query('ROLLBACK');
      return;
    }

    console.log(`Found ${demoIds.length} demo customers to remove.`);

    // 2. Delete audit logs for recovery cases linked to demo data
    const demoCases = await client.query(`
      SELECT rc.id FROM recovery_cases rc
      LEFT JOIN transactions t ON rc.transaction_id = t.id
      LEFT JOIN invoices i ON rc.invoice_id = i.id
      LEFT JOIN checkout_events ce ON rc.checkout_event_id = ce.id
      WHERE t.customer_id = ANY($1::int[])
         OR i.customer_id = ANY($1::int[])
         OR ce.customer_id = ANY($1::int[])
    `, [demoIds]);
    const demoCaseIds = demoCases.rows.map(r => r.id);

    if (demoCaseIds.length > 0) {
      const delAudit = await client.query(
        `DELETE FROM audit_logs WHERE recovery_case_id = ANY($1::int[])`,
        [demoCaseIds]
      );
      console.log(`Deleted ${delAudit.rowCount} demo audit log entries.`);

      const delCases = await client.query(
        `DELETE FROM recovery_cases WHERE id = ANY($1::int[])`,
        [demoCaseIds]
      );
      console.log(`Deleted ${delCases.rowCount} demo recovery cases.`);
    }

    // 3. Delete demo checkout events
    const delCheckouts = await client.query(
      `DELETE FROM checkout_events WHERE customer_id = ANY($1::int[]) OR session_id LIKE 'demo-%'`,
      [demoIds]
    );
    console.log(`Deleted ${delCheckouts.rowCount} demo checkout events.`);

    // 4. Delete demo invoices
    const delInvoices = await client.query(
      `DELETE FROM invoices WHERE customer_id = ANY($1::int[])`,
      [demoIds]
    );
    console.log(`Deleted ${delInvoices.rowCount} demo invoices.`);

    // 5. Delete demo transactions
    const delTransactions = await client.query(
      `DELETE FROM transactions WHERE customer_id = ANY($1::int[])`,
      [demoIds]
    );
    console.log(`Deleted ${delTransactions.rowCount} demo transactions.`);

    // 6. Delete demo customers
    const delCustomers = await client.query(
      `DELETE FROM customers WHERE id = ANY($1::int[])`,
      [demoIds]
    );
    console.log(`Deleted ${delCustomers.rowCount} demo customers.`);

    await client.query('COMMIT');

    // 7. Show remaining counts
    const remaining = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM customers) AS customers,
        (SELECT COUNT(*) FROM transactions) AS transactions,
        (SELECT COUNT(*) FROM invoices) AS invoices,
        (SELECT COUNT(*) FROM checkout_events) AS checkouts,
        (SELECT COUNT(*) FROM recovery_cases) AS cases,
        (SELECT COUNT(*) FROM audit_logs) AS audits
    `);
    console.log('\nRemaining real data:', JSON.stringify(remaining.rows[0]));
    console.log('\nDemo data cleanup complete. Only real records remain.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cleanup failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
