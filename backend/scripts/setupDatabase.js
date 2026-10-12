require('dotenv').config();

const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function setupDatabase() {
  // Run base schema
  const schema = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('Base database schema applied successfully');

  // Run Razorpay enhancement schema
  const razorpaySchema = fs.readFileSync(path.join(__dirname, '..', 'schema-razorpay-enhancement.sql'), 'utf8');
  await pool.query(razorpaySchema);
  console.log('Razorpay enhancement schema applied successfully');

  console.log('All database schemas applied successfully');
}

setupDatabase()
  .catch((err) => {
    console.error('Could not create the database schema. Check PostgreSQL and DATABASE_URL or backend/.env.');
    console.error('Error:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
