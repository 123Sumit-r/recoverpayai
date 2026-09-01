# RecoverPay AI - AI-Powered Payment Recovery Platform

## Project Overview

RecoverPay AI is a comprehensive payment recovery system for detecting revenue at risk, understanding the cause, choosing a safe recovery action, verifying the outcome, and keeping an audit trail.

## Problem Statement

Revenue can be lost when payments fail, subscriptions lapse, or customer actions are missed. RecoverPay AI helps teams respond to these risks automatically and reliably.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Axios
- Backend: Node.js, Express.js, CORS, dotenv
- Database: PostgreSQL 17 (`raz_ai`)
- Development: VS Code

## Day 1 Setup

Prerequisites: Node.js 18+, npm, and PostgreSQL installed locally.

1. From the workspace root, configure `backend/.env` with your PostgreSQL credentials.
2. Install dependencies and start the API:

```powershell
npm --prefix backend install
npm run backend
```

3. In a second terminal, install frontend dependencies and start Vite:

```powershell
npm --prefix frontend install
npm run frontend
```

4. Open the frontend URL shown by Vite, normally `http://localhost:5173`.

## Testing

- Backend health check: open `http://localhost:5000/api/health`.
- Expected response: `{ "success": true, "message": "RecoverPay AI backend is running" }`.
- Frontend: the dashboard should show `Backend Connected ✓`.
- Frontend production build: run `npm run frontend:build` from the workspace root.

## Environment Variables

`backend/.env` supports:

- `PORT`: API port, default `5000`
- `FRONTEND_URL`: allowed frontend origin, default `http://localhost:5173`
- `DB_HOST`: PostgreSQL host, default `localhost`
- `DB_PORT`: PostgreSQL port, default `5432`
- `DB_NAME`: PostgreSQL database name, default `recover_ai`
- `DB_USER`: PostgreSQL user, default `postgres`
- `DB_PASSWORD`: PostgreSQL password

The frontend optionally supports `VITE_API_URL`, which defaults to `http://localhost:5000/api`.

## Deployment & Production Setup

### Prerequisites Before Deployment

1. **Verify `.gitignore` is in place** to never commit secrets:
   ```
   backend/.env
   backend/node_modules/
   frontend/node_modules/
   frontend/dist/
   ```

2. **Use `.env.example` as a template** (see `backend/.env.example`):
   - All secrets are left empty
   - Only documentation and variable names are included
   - Never commit actual API keys or passwords

3. **Email Service (Resend)**:
   - Create account at https://resend.com
   - Verify a domain (not sandbox default)
   - Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in production `.env`
   - Until configured, email sending returns a clear error

4. **Payment Gateway (Razorpay)**:
   - Use TEST credentials for development/staging
   - Get credentials from https://dashboard.razorpay.com/app/settings/api-keys
   - Never mix test and production keys

5. **AI Engine (Groq)**:
   - Create account at https://console.groq.com
   - Keep API key server-side only (backend/.env)
   - NEVER expose to frontend or environment variables

### Production Database Setup

**Option 1: AWS RDS (PostgreSQL)**
```
1. Create RDS PostgreSQL instance
2. Update backend/.env:
   DB_HOST=<your-rds-endpoint>
   DB_PORT=5432
   DB_NAME=raz_ai
   DB_USER=<master-username>
   DB_PASSWORD=<secure-password>
3. Run schema: npm --prefix backend run db:schema
```

**Option 2: Azure Database for PostgreSQL**
```
1. Create Azure Database for PostgreSQL
2. Update backend/.env with connection string
3. Run schema: npm --prefix backend run db:schema
```

**Option 3: Supabase (Managed PostgreSQL)**
```
1. Create project at https://supabase.com
2. Copy connection string to backend/.env
3. Run schema: npm --prefix backend run db:schema
```

### Deployment Steps

1. **Prepare `.env` file**:
   - Copy `backend/.env.example` to `backend/.env` (production server only)
   - Fill in all secrets (API keys, database password, etc.)
   - NEVER commit `backend/.env` to GitHub

2. **Build frontend**:
   ```powershell
   cd frontend
   npm install
   npm run build
   # Output in frontend/dist/
   ```

3. **Start backend**:
   ```powershell
   cd backend
   npm install
   npm start
   # Listens on PORT (default 5000)
   ```

4. **Serve frontend** (choose one):
   - **Static hosting** (Vercel, Netlify, AWS S3+CloudFront): Deploy `frontend/dist/`
   - **Same server**: Use Express to serve frontend/dist/ (see `server.js`)
   - **Docker**: Build containers and orchestrate with Docker Compose or Kubernetes

### Environment-Specific Configuration

| Variable | Local | Staging | Production |
| --- | --- | --- | --- |
| `NODE_ENV` | `development` | `staging` | `production` |
| `FRONTEND_URL` | `http://localhost:5173` | `https://staging.yourdomain.com` | `https://yourdomain.com` |
| `DB_HOST` | `localhost` | RDS/Azure | RDS/Azure |
| `RESEND_FROM_EMAIL` | (empty) | Verified domain | Verified domain |
| `RECOVERY_MODE` | `simulated` | `simulated` | `simulated` (until ready) |
| `REAL_ACTIONS_ENABLED` | `false` | `false` | `false` (until ready) |

### Health Check

After deployment, verify:
```bash
# Backend health
curl https://yourdomain.com/api/health
# Expected: { "success": true, "message": "RecoverAI backend is running" }

# Frontend loads
curl https://yourdomain.com/
# Expected: HTML response with React app
```

### Monitoring & Logs

1. **Backend logs**: Monitor Node.js application logs
   - Check PostgreSQL connection status
   - Watch for Resend/API errors
   - Audit recovery actions in `audit_logs` table

2. **Email audit**: Query `email_audit_logs` table
   ```sql
   SELECT * FROM email_audit_logs ORDER BY created_at DESC LIMIT 20;
   ```

3. **Database backups**: Set up automated PostgreSQL backups
   - AWS RDS: Enable automated backups
   - Azure: Use geo-redundant backups
   - Supabase: Built-in backups included

## Day 2 Completed

Day 2 adds the PostgreSQL data layer and read-only APIs. The flow is:

`React -> Axios -> Express route -> controller -> model query -> PostgreSQL`

No AI integration, recovery actions, payment gateway, messaging automation, or authentication has been added.

## Database Architecture

The schema is in `backend/schema.sql` and creates three tables:

- `customers`: fake customer identity and customer type.
- `transactions`: customer-linked payments with amount, status, type, and failure reason.
- `invoices`: customer-linked billing records with amount, due date, and status.

All tables use serial primary keys and `transactions.customer_id` and `invoices.customer_id` reference `customers.id`. Constraints enforce the supported statuses, positive amounts, and valid failed-transaction reasons.

### Existing Database

The project uses the existing PostgreSQL database `raz_ai`. Do not recreate it. Set the real local PostgreSQL password in `backend/.env`; the file is ignored by Git.

### Apply the Schema

From the workspace root:

```powershell
npm --prefix backend run db:schema
```

### Seed Test Data

Run this after applying the schema. It clears and recreates the three test tables, so use it only for local test data:

```powershell
npm --prefix backend run db:seed
```

The seed creates exactly 100 fake customers, 300 transactions, and 100 invoices. Transaction statuses are distributed 60% success, 25% failed, and 15% pending. Names, emails, and phone numbers use fake test values.

## Day 2 API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/customers` | List all customers |
| GET | `/api/customers/:id` | Get one customer |
| GET | `/api/transactions` | List all transactions |
| GET | `/api/transactions/failed` | List failed transactions |
| GET | `/api/transactions/:id` | Get one transaction |
| GET | `/api/invoices` | List all invoices |
| GET | `/api/invoices/overdue` | List overdue invoices |
| GET | `/api/invoices/:id` | Get one invoice |

Successful responses use this shape:

```json
{
	"success": true,
	"data": []
}
```

Missing or invalid records use an appropriate status code and a safe message:

```json
{
	"success": false,
	"message": "Customer not found"
}
```

## Day 5 Checkout Abandonment Workflow

Day 5 adds `checkout_events` and the additive `checkout_abandonment` recovery case. Checkout amounts count toward revenue at risk only while an event is abandoned. AI analysis uses Groq server-side when enabled, but every response is normalized to allowlisted causes/actions and checked by the Policy Engine immediately before simulated execution. No messages or payments are sent.

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/checkouts` | List checkout events |
| GET | `/api/checkouts/abandoned` | List abandoned checkouts |
| POST | `/api/checkouts` | Start a checkout with `customer_id`, `session_id`, and `amount` |
| PATCH | `/api/checkouts/:id` | Mark a started checkout `completed` or `abandoned` |
| POST | `/api/recovery/cases` | Create a case with `checkout_event_id` |
| GET | `/api/risk/summary` | Include checkout abandonment count/amount in risk totals |
| GET | `/api/recovery/summary` | Include checkout case and recovered-amount metrics |

Example simulated flow:

```powershell
$checkout = Invoke-RestMethod http://localhost:5000/api/checkouts -Method Post -ContentType 'application/json' -Body '{"customer_id":1,"session_id":"day5-demo","amount":2499}'
Invoke-RestMethod http://localhost:5000/api/checkouts/$($checkout.data.id) -Method Patch -ContentType 'application/json' -Body '{"status":"abandoned","abandonment_reason":"payment_friction"}'
$case = Invoke-RestMethod http://localhost:5000/api/recovery/cases -Method Post -ContentType 'application/json' -Body (ConvertTo-Json @{ checkout_event_id = $checkout.data.id })
Invoke-RestMethod http://localhost:5000/api/recovery/$($case.data.id)/ai-analyze -Method Post
Invoke-RestMethod http://localhost:5000/api/recovery/$($case.data.id)/execute -Method Post
```

The schema now includes `checkout_events`, and `recovery_cases` supports a nullable `checkout_event_id` with a constraint requiring exactly one source. The demo seed adds 20 checkout events, including completed, started, and abandoned examples.

## Day 3 Recovery Workflow

Day 3 adds deterministic risk calculation, recovery cases, diagnosis, recommendations, policy checks, simulated execution, and audit logs. The additive tables are `recovery_cases` and `audit_logs`; the existing customer, transaction, and invoice tables are preserved.

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/risk/summary` | Calculate failed-payment and overdue-invoice risk |
| GET | `/api/recovery/cases` | List recovery cases |
| POST | `/api/recovery/cases` | Create a case from a transaction or invoice ID |
| GET | `/api/recovery/:caseId` | Get a case and its audit trail |
| POST | `/api/recovery/:caseId/analyze` | Generate deterministic diagnosis and recommendation |
| POST | `/api/recovery/:caseId/execute` | Check policy and run a simulated action |
| GET | `/api/recovery/summary` | Summarize case and simulated recovery totals |

All recovery execution is simulated and never calls a payment gateway. Retry simulation succeeds for even transaction IDs and fails for odd transaction IDs, making tests predictable.

## Day 4 AI Recovery Integration

`POST /api/recovery/:caseId/ai-analyze` fetches case, customer, transaction, history, retry, and invoice-aging context from PostgreSQL. It returns validated JSON containing `root_cause`, `risk_level`, `recommended_action`, and `reason`. Configure `AI_API_KEY` and optionally `AI_BASE_URL`/`AI_MODEL` for an OpenAI-compatible provider; without a key, the deterministic local fallback is used. `AI_MOCK_RESPONSE` supports safe invalid-response tests.

AI recommendations are never executed directly. The Policy Engine validates the recommendation during analysis and again immediately before execution. Invalid AI responses return HTTP 422 and are audited; retry and reminder limits can only block or escalate actions.

### Day 3 End-to-End Test

```powershell
npm --prefix backend run db:schema
npm --prefix backend run db:seed
npm run backend
```

In another terminal, call `POST /api/recovery/cases` with `{ "transaction_id": 14 }`, then call the returned case ID with `POST /api/recovery/:caseId/analyze` and `POST /api/recovery/:caseId/execute`. Fetch `GET /api/recovery/:caseId` to see the diagnosis, recommendation, result, and audit events.

## Test Everything

1. Start the backend from the workspace root: `npm run backend`.
2. Confirm the terminal reports `PostgreSQL connection successful`.
3. Open `http://localhost:5000/api/customers` and the other endpoints above.
4. Specifically verify `/api/customers/1`, `/api/transactions`, `/api/transactions/failed`, `/api/invoices`, `/api/invoices/overdue`, and `/api/invoices/1` return seeded rows.
5. Start the frontend in a second terminal with `npm run frontend`.
6. Open `http://localhost:5173`; the failed transactions table should load from PostgreSQL through the API.

## Day 3 Preview

Day 3 will build the Revenue Risk Engine on top of these data APIs. It will analyze risk signals without adding recovery execution yet.

## Important Files

- `backend/server.js`: starts Express, configures CORS and JSON parsing, and mounts routes.
- `backend/routes/healthRoutes.js`: contains the Day 1 health endpoint.
- `backend/config/database.js`: creates a reusable PostgreSQL pool; it does not create tables or connect until used.
- `frontend/src/App.jsx`: dashboard homepage and health API request.
- `frontend/src/index.css`: Tailwind entry point and small page animations.
