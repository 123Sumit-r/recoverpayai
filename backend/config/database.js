const { Pool } = require('pg');

// Support DATABASE_URL (Render/Supabase) or individual DB_* vars (local dev)
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'raz_ai',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || ''
    };

const pool = new Pool(poolConfig);

// Gracefully handle idle client errors (prevents crash on broken connections)
pool.on('error', (err) => {
  console.error('Unexpected idle PostgreSQL client error:', err.message);
});

async function testDatabaseConnection() {
  const client = await pool.connect();

  try {
    await client.query('SELECT 1');
    console.log('PostgreSQL connection successful');
    return true;
  } finally {
    client.release();
  }
}

module.exports = pool;
module.exports.testDatabaseConnection = testDatabaseConnection;
