CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(30) NOT NULL,
  customer_type VARCHAR(30) NOT NULL CHECK (customer_type IN ('individual', 'business', 'enterprise')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  failure_reason VARCHAR(40) CHECK (failure_reason IS NULL OR failure_reason IN ('expired_card', 'insufficient_funds', 'bank_declined', 'temporary_failure', 'invalid_payment_method')),
  transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('subscription', 'one_time', 'renewal')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((status = 'failed' AND failure_reason IS NOT NULL) OR (status <> 'failed' AND failure_reason IS NULL))
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('paid', 'pending', 'overdue')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS checkout_events (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  session_id VARCHAR(120) NOT NULL UNIQUE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'abandoned')),
  abandonment_reason VARCHAR(40),
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((status = 'abandoned' AND completed_at IS NULL) OR status <> 'abandoned'),
  CHECK ((status = 'completed' AND completed_at IS NOT NULL) OR status <> 'completed')
);

CREATE TABLE IF NOT EXISTS recovery_cases (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  checkout_event_id INTEGER REFERENCES checkout_events(id) ON DELETE CASCADE,
  amount_at_risk NUMERIC(12, 2) NOT NULL CHECK (amount_at_risk > 0),
  case_type VARCHAR(30) NOT NULL CHECK (case_type IN ('failed_payment', 'overdue_invoice')),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'processing', 'recovered', 'failed', 'escalated', 'closed')),
  diagnosis_code VARCHAR(40),
  diagnosis TEXT,
  risk_level VARCHAR(20),
  recommended_action VARCHAR(50),
  policy_allowed BOOLEAN,
  policy_reason TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  reminder_count INTEGER NOT NULL DEFAULT 0 CHECK (reminder_count >= 0),
  amount_recovered NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount_recovered >= 0),
  ai_analysis JSONB,
  last_action VARCHAR(50),
  last_action_status VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ((case_type = 'failed_payment' AND transaction_id IS NOT NULL AND invoice_id IS NULL AND checkout_event_id IS NULL) OR
      (case_type = 'overdue_invoice' AND invoice_id IS NOT NULL AND transaction_id IS NULL AND checkout_event_id IS NULL) OR
      (case_type = 'checkout_abandonment' AND checkout_event_id IS NOT NULL AND transaction_id IS NULL AND invoice_id IS NULL))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  recovery_case_id INTEGER NOT NULL REFERENCES recovery_cases(id) ON DELETE CASCADE,
  event_type VARCHAR(40) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS transactions_customer_id_idx ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS invoices_customer_id_idx ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS transactions_status_idx ON transactions(status);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices(status);
CREATE INDEX IF NOT EXISTS checkout_events_status_idx ON checkout_events(status);
CREATE INDEX IF NOT EXISTS checkout_events_customer_id_idx ON checkout_events(customer_id);
CREATE INDEX IF NOT EXISTS recovery_cases_status_idx ON recovery_cases(status);
CREATE INDEX IF NOT EXISTS recovery_cases_customer_id_idx ON recovery_cases(customer_id);
CREATE INDEX IF NOT EXISTS audit_logs_case_id_idx ON audit_logs(recovery_case_id);

ALTER TABLE recovery_cases ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20);
ALTER TABLE recovery_cases ADD COLUMN IF NOT EXISTS ai_analysis JSONB;
ALTER TABLE recovery_cases ADD COLUMN IF NOT EXISTS checkout_event_id INTEGER REFERENCES checkout_events(id) ON DELETE CASCADE;
ALTER TABLE recovery_cases DROP CONSTRAINT IF EXISTS recovery_cases_case_type_check;
ALTER TABLE recovery_cases DROP CONSTRAINT IF EXISTS recovery_cases_status_check;
ALTER TABLE recovery_cases ADD CONSTRAINT recovery_cases_status_check CHECK (status IN ('open', 'processing', 'email_sent', 'recovered', 'failed', 'escalated', 'closed'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS issue_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(120) NOT NULL UNIQUE,
  event_type VARCHAR(50) NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'webhook',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_audit_logs (
  id SERIAL PRIMARY KEY,
  case_id INTEGER REFERENCES recovery_cases(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  provider_message_id VARCHAR(120),
  status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS processed_webhook_events_event_id_idx ON processed_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS email_audit_logs_case_id_idx ON email_audit_logs(case_id);
CREATE INDEX IF NOT EXISTS email_audit_logs_status_idx ON email_audit_logs(status);

