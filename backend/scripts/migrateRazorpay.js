#!/usr/bin/env node

/**
 * Database Migration Script: Add Razorpay Integration Tables
 * 
 * Run this script to apply the Razorpay integration schema changes:
 * node scripts/migrateRazorpay.js
 */

require('dotenv').config();
const pool = require('../config/database');

(async () => {
  const client = await pool.connect();
  try {
    console.log('Starting Razorpay database migration...\n');

    await client.query('BEGIN');

    // Create payment_events table
    console.log('Creating payment_events table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_events (
        id SERIAL PRIMARY KEY,
        razorpay_event_id VARCHAR(120) NOT NULL UNIQUE,
        razorpay_payment_id VARCHAR(120),
        razorpay_order_id VARCHAR(120),
        event_type VARCHAR(50) NOT NULL,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
        currency VARCHAR(3) NOT NULL DEFAULT 'INR',
        failure_reason VARCHAR(40),
        failure_description TEXT,
        provider_response JSONB NOT NULL DEFAULT '{}'::jsonb,
        webhook_signature_verified BOOLEAN NOT NULL DEFAULT false,
        processed BOOLEAN NOT NULL DEFAULT false,
        processed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create retry_attempts table
    console.log('Creating retry_attempts table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS retry_attempts (
        id SERIAL PRIMARY KEY,
        recovery_case_id INTEGER NOT NULL REFERENCES recovery_cases(id) ON DELETE CASCADE,
        payment_event_id INTEGER NOT NULL REFERENCES payment_events(id) ON DELETE CASCADE,
        razorpay_order_id VARCHAR(120),
        razorpay_payment_id VARCHAR(120),
        attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
        scheduled_for TIMESTAMPTZ NOT NULL,
        retry_status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (retry_status IN ('scheduled', 'attempted', 'success', 'failed', 'cancelled')),
        retry_result VARCHAR(40),
        provider_response JSONB NOT NULL DEFAULT '{}'::jsonb,
        executed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Extend recovery_cases table
    console.log('Extending recovery_cases table...');
    await client.query(`ALTER TABLE recovery_cases ADD COLUMN IF NOT EXISTS payment_event_id INTEGER REFERENCES payment_events(id) ON DELETE SET NULL`);
    await client.query(`ALTER TABLE recovery_cases ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(120)`);
    await client.query(`ALTER TABLE recovery_cases ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(120)`);
    await client.query(`ALTER TABLE recovery_cases ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ`);
    await client.query(`ALTER TABLE recovery_cases ADD COLUMN IF NOT EXISTS retry_blocked BOOLEAN NOT NULL DEFAULT false`);
    await client.query(`ALTER TABLE recovery_cases ADD COLUMN IF NOT EXISTS retry_block_reason TEXT`);
    await client.query(`ALTER TABLE recovery_cases ADD COLUMN IF NOT EXISTS max_retries INTEGER NOT NULL DEFAULT 2`);

    // Create indices
    console.log('Creating indices...');
    await client.query(`CREATE INDEX IF NOT EXISTS payment_events_customer_id_idx ON payment_events(customer_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS payment_events_razorpay_event_id_idx ON payment_events(razorpay_event_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS payment_events_razorpay_payment_id_idx ON payment_events(razorpay_payment_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS payment_events_processed_idx ON payment_events(processed)`);
    await client.query(`CREATE INDEX IF NOT EXISTS retry_attempts_recovery_case_id_idx ON retry_attempts(recovery_case_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS retry_attempts_status_idx ON retry_attempts(retry_status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS retry_attempts_scheduled_for_idx ON retry_attempts(scheduled_for)`);
    await client.query(`CREATE INDEX IF NOT EXISTS recovery_cases_payment_event_id_idx ON recovery_cases(payment_event_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS recovery_cases_next_retry_at_idx ON recovery_cases(next_retry_at)`);

    console.log('Migration complete!');
    await client.query('COMMIT');

    // Verify tables exist
    const tableCheck = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('payment_events', 'retry_attempts')
    `);

    if (tableCheck.rows.length === 2) {
      console.log('\n✅ Migration successful! Tables created:');
      console.log('   - payment_events');
      console.log('   - retry_attempts');
      console.log('   - recovery_cases (extended)');
    } else {
      console.error('❌ Migration failed: Required tables not found');
      process.exitCode = 1;
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
