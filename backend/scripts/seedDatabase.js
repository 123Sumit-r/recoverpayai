require('dotenv').config();

const pool = require('../config/database');

const amounts = [499, 999, 1499, 2499, 4999, 9999, 25000, 50000];
const failureReasons = ['expired_card', 'insufficient_funds', 'bank_declined', 'temporary_failure', 'invalid_payment_method'];
const customerTypes = ['individual', 'business', 'enterprise'];
const transactionTypes = ['subscription', 'one_time', 'renewal'];

function pick(values, index) {
  return values[index % values.length];
}

function transactionStatus(index) {
  if (index % 20 < 12) return 'success';
  if (index % 20 < 17) return 'failed';
  return 'pending';
}

async function seedDatabase() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM customers) AS customers,
        (SELECT COUNT(*) FROM transactions) AS transactions,
        (SELECT COUNT(*) FROM invoices) AS invoices,
        (SELECT COUNT(*) FROM checkout_events) AS checkout_events
    `);
    const current = counts.rows[0];
    if (Number(current.customers) === 100 && Number(current.transactions) === 300 && Number(current.invoices) === 100 && Number(current.checkout_events) === 20) {
      await client.query('ROLLBACK');
      console.log('Seed skipped: expected demo data already exists');
      return;
    }
    if (Number(current.customers) === 100 && Number(current.transactions) === 300 && Number(current.invoices) === 100 && Number(current.checkout_events) === 0) {
      for (let index = 1; index <= 20; index += 1) {
        const status = index % 4 === 0 ? 'completed' : index % 4 === 1 ? 'started' : 'abandoned';
        await client.query(
          `INSERT INTO checkout_events (customer_id, session_id, amount, status, abandonment_reason, completed_at)
           VALUES ($1, $2, $3, $4, $5, CASE WHEN $4 = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END)`,
          [index, `demo-checkout-${index}`, pick(amounts, index + 1), status, status === 'abandoned' ? pick(['price_concern', 'payment_friction', 'technical_issue', 'user_distraction'], index) : null]
        );
      }
      await client.query('COMMIT');
      console.log('Checkout seed complete: 20 checkout events');
      return;
    }
    if (Number(current.customers) !== 0 || Number(current.transactions) !== 0 || Number(current.invoices) !== 0) {
      throw new Error('Refusing to seed partially populated tables; review existing data first');
    }

    for (let index = 1; index <= 100; index += 1) {
      await client.query(
        `INSERT INTO customers (name, email, phone, customer_type)
         VALUES ($1, $2, $3, $4)`,
        [`Test Customer ${index}`, `test.customer.${index}@example.test`, `+91-90000-${String(index).padStart(5, '0')}`, pick(customerTypes, index)]
      );
    }

    for (let index = 1; index <= 300; index += 1) {
      const status = transactionStatus(index - 1);
      await client.query(
        `INSERT INTO transactions (customer_id, amount, status, failure_reason, transaction_type)
         VALUES ($1, $2, $3, $4, $5)`,
        [((index - 1) % 100) + 1, pick(amounts, index + 2), status, status === 'failed' ? pick(failureReasons, index) : null, pick(transactionTypes, index + 1)]
      );
    }

    for (let index = 1; index <= 100; index += 1) {
      const status = index % 5 < 3 ? 'paid' : index % 5 === 3 ? 'pending' : 'overdue';
      const daysFromToday = status === 'overdue' ? -(index % 45 + 1) : status === 'pending' ? index % 20 + 1 : -(index % 15);
      await client.query(
        `INSERT INTO invoices (customer_id, amount, due_date, status)
         VALUES ($1, $2, CURRENT_DATE + $3 * INTERVAL '1 day', $4)`,
        [index, pick(amounts, index + 4), daysFromToday, status]
      );
    }

    await client.query('COMMIT');
    for (let index = 1; index <= 20; index += 1) {
      const status = index % 4 === 0 ? 'completed' : index % 4 === 1 ? 'started' : 'abandoned';
      await client.query(
        `INSERT INTO checkout_events (customer_id, session_id, amount, status, abandonment_reason, completed_at)
         VALUES ($1, $2, $3, $4, $5, CASE WHEN $4 = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END)`,
        [index, `demo-checkout-${index}`, pick(amounts, index + 1), status, status === 'abandoned' ? pick(['price_concern', 'payment_friction', 'technical_issue', 'user_distraction'], index) : null]
      );
    }
    console.log('Seed complete: 100 customers, 300 transactions, 100 invoices, 20 checkout events');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

seedDatabase()
  .catch(() => {
    console.error('Could not seed the database. Run the schema first and check PostgreSQL/backend/.env.');
    process.exitCode = 1;
  })
  .finally(() => pool.end());
