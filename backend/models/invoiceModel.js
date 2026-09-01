const pool = require('../config/database');

function mapInvoice(row) {
  if (!row) return row;
  const daysOverdue = row.days_overdue !== undefined ? Number(row.days_overdue) : (row.due_date ? Math.max(0, Math.floor((new Date() - new Date(row.due_date)) / (1000 * 60 * 60 * 24))) : 0);
  return {
    ...row,
    invoice_id: row.id,
    amount: Number(row.amount),
    days_overdue: daysOverdue
  };
}

async function refreshOverdue() {
  await pool.query(`
    UPDATE invoices
    SET status = 'overdue', updated_at = CURRENT_TIMESTAMP
    WHERE status = 'pending' AND due_date < CURRENT_DATE
  `);
}

async function findAll() {
  await refreshOverdue();
  const result = await pool.query(`
    SELECT i.*, c.name AS customer_name, c.email AS customer_email, c.customer_type,
      GREATEST(0, (CURRENT_DATE - i.due_date)::integer) AS days_overdue
    FROM invoices i
    JOIN customers c ON c.id = i.customer_id
    ORDER BY i.id DESC
  `);
  return result.rows.map(mapInvoice);
}

async function findOverdue() {
  await refreshOverdue();
  const result = await pool.query(`
    SELECT i.*, c.name AS customer_name, c.email AS customer_email, c.customer_type,
      GREATEST(0, (CURRENT_DATE - i.due_date)::integer) AS days_overdue
    FROM invoices i
    JOIN customers c ON c.id = i.customer_id
    WHERE i.status = 'overdue'
    ORDER BY i.id DESC
  `);
  return result.rows.map(mapInvoice);
}

async function findById(id) {
  await refreshOverdue();
  const result = await pool.query(`
    SELECT i.*, c.name AS customer_name, c.email AS customer_email, c.customer_type,
      GREATEST(0, (CURRENT_DATE - i.due_date)::integer) AS days_overdue
    FROM invoices i
    JOIN customers c ON c.id = i.customer_id
    WHERE i.id = $1
  `, [id]);
  return mapInvoice(result.rows[0]);
}

async function create({ customerId, amount, dueDate, issueDate, status }) {
  const isPastDue = new Date(dueDate) < new Date(new Date().toISOString().slice(0, 10));
  const initialStatus = status || (isPastDue ? 'overdue' : 'pending');
  const result = await pool.query(`
    INSERT INTO invoices (customer_id, amount, due_date, issue_date, status)
    VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5)
    RETURNING id
  `, [customerId, amount, dueDate, issueDate || null, initialStatus]);
  return findById(result.rows[0].id);
}

module.exports = { findAll, findOverdue, findById, create, refreshOverdue, mapInvoice };

