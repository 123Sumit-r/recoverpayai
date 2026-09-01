require('dotenv').config();

const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function setupDatabase() {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('Database schema created successfully');
}

setupDatabase()
  .catch(() => {
    console.error('Could not create the database schema. Check PostgreSQL and backend/.env.');
    process.exitCode = 1;
  })
  .finally(() => pool.end());
