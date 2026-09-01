require('dotenv').config();

console.log('=== PostgreSQL Connection Debug ===');
console.log('DB_HOST:', process.env.DB_HOST || 'localhost');
console.log('DB_PORT:', process.env.DB_PORT || 5432);
console.log('DB_NAME:', process.env.DB_NAME || 'raz_ai');
console.log('DB_USER:', process.env.DB_USER || 'postgres');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***set***' : 'not set');
console.log('');

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'raz_ai',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

(async () => {
  try {
    console.log('Attempting to connect...');
    const client = await pool.connect();
    console.log('✓ PostgreSQL connection successful');

    const dbNameResult = await client.query('SELECT current_database()');
    console.log('✓ Connected to database:', dbNameResult.rows[0].current_database);

    const tableCount = await client.query(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema='public'"
    );
    console.log('✓ Existing tables in this database:', tableCount.rows[0].count);

    // Check if specific tables exist
    const requiredTables = ['customers', 'transactions', 'invoices'];
    for (const table of requiredTables) {
      const result = await client.query(
        "SELECT to_regclass('public.' || $1) IS NOT NULL as exists",
        [table]
      );
      const exists = result.rows[0].exists;
      console.log(`  - ${table}: ${exists ? '✓ exists' : '✗ missing'}`);
    }

    client.release();
    await pool.end();
  } catch (error) {
    console.error('✗ Connection failed');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Is PostgreSQL running? Check: pg_isready -h localhost -p 5432');
    console.error('2. Is the database "' + (process.env.DB_NAME || 'raz_ai') + '" created?');
    console.error('3. Is the password correct in backend/.env?');
    process.exitCode = 1;
  }
})();
