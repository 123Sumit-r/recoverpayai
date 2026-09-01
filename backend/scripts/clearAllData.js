/**
 * Clear ALL data from the RecoverPay AI database.
 * Keeps the schema intact - only deletes all records.
 * 
 * WARNING: This is destructive. All existing data will be permanently deleted.
 */
require('dotenv').config();
const pool = require('../config/database');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Clearing all data from database...');

    // Delete in order of dependencies (foreign key constraints)
    const tables = [
      'audit_logs',
      'recovery_cases',
      'checkout_events',
      'invoices',
      'transactions',
      'customers'
    ];

    for (const table of tables) {
      const result = await client.query(`DELETE FROM ${table}`);
      console.log(`✓ Cleared ${result.rowCount} records from ${table}`);
    }

    await client.query('COMMIT');

    // Show final counts
    const remaining = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM customers) AS customers,
        (SELECT COUNT(*) FROM transactions) AS transactions,
        (SELECT COUNT(*) FROM invoices) AS invoices,
        (SELECT COUNT(*) FROM checkout_events) AS checkouts,
        (SELECT COUNT(*) FROM recovery_cases) AS cases,
        (SELECT COUNT(*) FROM audit_logs) AS audits
    `);
    
    console.log('\nDatabase cleared. Current state:', JSON.stringify(remaining.rows[0]));
    console.log('\n✓ All data removed. Database is ready for your own data.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Clear failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
