const pool = require('../config/database');

async function findAll() {
  const result = await pool.query('SELECT * FROM customers ORDER BY id');
  return result.rows;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
  return result.rows[0];
}

async function findByEmail(email) {
  const result = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);
  return result.rows[0];
}

async function create({ name, email, phone, customer_type = 'individual' }) {
  const result = await pool.query(
    `INSERT INTO customers (name, email, phone, customer_type)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone
     RETURNING *`,
    [name, email, phone || '9999999999', customer_type]
  );
  return result.rows[0];
}

module.exports = { findAll, findById, findByEmail, create };
