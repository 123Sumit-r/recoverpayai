const pool = require('../config/database');

function mapTransaction(row) {
  if (!row) return row;
  return {
    ...row,
    amount: Number(row.amount)
  };
}

async function findAll() {
  const result = await pool.query(`
    SELECT t.*, c.name AS customer_name, c.email AS customer_email
    FROM transactions t
    JOIN customers c ON c.id = t.customer_id
    ORDER BY t.id DESC
  `);
  return result.rows.map(mapTransaction);
}

async function findFailed() {
  const result = await pool.query(`
    SELECT t.*, c.name AS customer_name, c.email AS customer_email
    FROM transactions t
    JOIN customers c ON c.id = t.customer_id
    WHERE t.status = 'failed'
    ORDER BY t.id DESC
  `);
  return result.rows.map(mapTransaction);
}

async function findById(id) {
  const result = await pool.query(`
    SELECT t.*, c.name AS customer_name, c.email AS customer_email
    FROM transactions t
    JOIN customers c ON c.id = t.customer_id
    WHERE t.id = $1
  `, [id]);
  return mapTransaction(result.rows[0]);
}

async function create({ customerId, amount, status = 'failed', failureReason = 'insufficient_funds', transactionType = 'subscription' }) {
  const result = await pool.query(`
    INSERT INTO transactions (customer_id, amount, status, failure_reason, transaction_type)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [customerId, amount, status, status === 'failed' ? failureReason : null, transactionType]);
  return findById(result.rows[0].id);
}

module.exports = { findAll, findFailed, findById, create };
