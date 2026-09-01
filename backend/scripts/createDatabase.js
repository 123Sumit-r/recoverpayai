require('dotenv').config();

const { Pool } = require('pg');

async function createDatabase() {
  // Connect to the default 'postgres' database first
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres',  // Connect to default database
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
  });

  const client = await pool.connect();

  try {
    const dbName = process.env.DB_NAME || 'raz_ai';

    // Check if database exists
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (result.rows.length === 0) {
      console.log(`Creating database: ${dbName}...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✓ Database "${dbName}" created successfully`);
    } else {
      console.log(`✓ Database "${dbName}" already exists`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

createDatabase()
  .catch((error) => {
    console.error('✗ Could not create database:', error.message);
    console.error('\nMake sure:');
    console.error('1. PostgreSQL is running');
    console.error('2. backend/.env has correct DB_HOST, DB_PORT, DB_USER, DB_PASSWORD');
    console.error('3. PostgreSQL user "postgres" exists and password matches');
    process.exitCode = 1;
  });
