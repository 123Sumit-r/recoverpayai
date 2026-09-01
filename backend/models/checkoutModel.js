const pool = require('../config/database');

function mapEvent(row) {
  if (!row) return row;
  return { ...row, amount: Number(row.amount) };
}

async function findAll() {
  const result = await pool.query(`
    SELECT ce.*, c.name AS customer_name, c.email AS customer_email
    FROM checkout_events ce
    JOIN customers c ON c.id = ce.customer_id
    ORDER BY ce.id DESC
  `);
  return result.rows.map(mapEvent);
}

async function findAbandoned() {
  const result = await pool.query(`
    SELECT ce.*, c.name AS customer_name, c.email AS customer_email
    FROM checkout_events ce
    JOIN customers c ON c.id = ce.customer_id
    WHERE ce.status = 'abandoned'
    ORDER BY ce.id DESC
  `);
  return result.rows.map(mapEvent);
}

async function findById(id) {
  const result = await pool.query(`SELECT ce.*, c.name AS customer_name, c.email AS customer_email FROM checkout_events ce JOIN customers c ON c.id = ce.customer_id WHERE ce.id = $1`, [id]);
  return mapEvent(result.rows[0]);
}

async function start({ customerId, sessionId, amount }) {
  const result = await pool.query(`INSERT INTO checkout_events (customer_id, session_id, amount) VALUES ($1, $2, $3) RETURNING id`, [customerId, sessionId, amount]);
  return findById(result.rows[0].id);
}

async function complete(id) {
  const result = await pool.query(`UPDATE checkout_events SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'started' RETURNING id`, [id]);
  return result.rows[0] ? findById(result.rows[0].id) : null;
}

async function abandon(id, abandonmentReason) {
  const result = await pool.query(`UPDATE checkout_events SET status = 'abandoned', abandonment_reason = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'started' RETURNING id`, [id, abandonmentReason || 'unknown_abandonment']);
  return result.rows[0] ? findById(result.rows[0].id) : null;
}

module.exports = { findAll, findAbandoned, findById, start, complete, abandon };