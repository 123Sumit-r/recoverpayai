-- ============================================================
-- RAZORPAY PAYMENT EVENTS TABLE
-- ============================================================
-- Stores real payment events from Razorpay webhooks
-- Enables audit trail and idempotency
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
);

-- ============================================================
-- RETRY ATTEMPTS TABLE
-- ============================================================
-- Tracks all payment retry attempts with controlled limits
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
);

-- ============================================================
-- EXTEND RECOVERY_CASES FOR RETRY MANAGEMENT
-- ============================================================
ALTER TABLE recovery_cases ADD COLUMN IF NOT EXISTS payment_event_id INTEGER REFERENCES payment_events(id) ON DELETE SET NULL;
ALTER TABLE recovery_cases ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(120);
ALTER TABLE recovery_cases ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(120);
ALTER TABLE recovery_cases ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;
ALTER TABLE recovery_cases ADD COLUMN IF NOT EXISTS retry_blocked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE recovery_cases ADD COLUMN IF NOT EXISTS retry_block_reason TEXT;
ALTER TABLE recovery_cases ADD COLUMN IF NOT EXISTS max_retries INTEGER NOT NULL DEFAULT 2;

-- ============================================================
-- INDICES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS payment_events_customer_id_idx ON payment_events(customer_id);
CREATE INDEX IF NOT EXISTS payment_events_razorpay_event_id_idx ON payment_events(razorpay_event_id);
CREATE INDEX IF NOT EXISTS payment_events_razorpay_payment_id_idx ON payment_events(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS payment_events_processed_idx ON payment_events(processed);
CREATE INDEX IF NOT EXISTS retry_attempts_recovery_case_id_idx ON retry_attempts(recovery_case_id);
CREATE INDEX IF NOT EXISTS retry_attempts_status_idx ON retry_attempts(retry_status);
CREATE INDEX IF NOT EXISTS retry_attempts_scheduled_for_idx ON retry_attempts(scheduled_for);
CREATE INDEX IF NOT EXISTS recovery_cases_payment_event_id_idx ON recovery_cases(payment_event_id);
CREATE INDEX IF NOT EXISTS recovery_cases_next_retry_at_idx ON recovery_cases(next_retry_at);

-- ============================================================
-- CONSTRAINTS FOR DATA INTEGRITY
-- ============================================================
-- Ensure payment_event_id is set when storing Razorpay data
ALTER TABLE recovery_cases ADD CONSTRAINT recovery_cases_payment_event_required
  CHECK ((payment_event_id IS NOT NULL) OR (transaction_id IS NOT NULL));
