require('dotenv').config();
const pool = require('../config/database');

(async () => {
  const r = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM customers) AS customers,
      (SELECT COUNT(*) FROM transactions) AS transactions,
      (SELECT COUNT(*) FROM invoices) AS invoices,
      (SELECT COUNT(*) FROM checkout_events) AS checkouts,
      (SELECT COUNT(*) FROM recovery_cases) AS cases,
      (SELECT COUNT(*) FROM audit_logs) AS audits
  `);
  console.log('Total counts:', JSON.stringify(r.rows[0]));

  const demo = await pool.query(`SELECT COUNT(*) AS cnt FROM customers WHERE email LIKE '%example.test%'`);
  console.log('Demo customers (example.test):', demo.rows[0].cnt);

  const real = await pool.query(`SELECT COUNT(*) AS cnt FROM customers WHERE email NOT LIKE '%example.test%'`);
  console.log('Real customers:', real.rows[0].cnt);

  const demoTxn = await pool.query(`
    SELECT COUNT(*) AS cnt FROM transactions t
    JOIN customers c ON t.customer_id = c.id
    WHERE c.email LIKE '%example.test%'
  `);
  console.log('Demo transactions:', demoTxn.rows[0].cnt);

  const demoInv = await pool.query(`
    SELECT COUNT(*) AS cnt FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE c.email LIKE '%example.test%'
  `);
  console.log('Demo invoices:', demoInv.rows[0].cnt);

  const demoChk = await pool.query(`
    SELECT COUNT(*) AS cnt FROM checkout_events ce
    WHERE ce.session_id LIKE 'demo-%'
  `);
  console.log('Demo checkouts:', demoChk.rows[0].cnt);

  await pool.end();
})();
