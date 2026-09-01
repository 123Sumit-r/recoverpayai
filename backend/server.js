require('dotenv').config();

const cors = require('cors');
const express = require('express');
const { testDatabaseConnection } = require('./config/database');
const healthRoutes = require('./routes/healthRoutes');
const customerRoutes = require('./routes/customerRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const riskRoutes = require('./routes/riskRoutes');
const recoveryRoutes = require('./routes/recoveryRoutes');
const emailRoutes = require('./routes/emailRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));

// Webhook routes include their own body parsing before the global JSON parser.
app.use('/api/webhooks', webhookRoutes);

// Global JSON parser for all other routes
app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/payment-events', transactionRoutes); // Route alias for payment events
app.use('/api/checkouts', checkoutRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/recovery', recoveryRoutes);
app.use('/api/recovery-cases', recoveryRoutes); // Route alias for recovery cases
app.use('/api/email', emailRoutes);

app.use((error, request, response, next) => {
  console.error(error.message);
  response.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`RecoverPay AI backend listening on port ${port}`);

  // Verify critical service configuration (never log actual keys)
  console.log(`Resend API key: ${process.env.RESEND_API_KEY ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
  console.log(`Resend sender: ${process.env.RESEND_FROM_EMAIL || 'NOT CONFIGURED'}`);
  console.log(`Groq AI key: ${process.env.AI_API_KEY ? 'CONFIGURED' : 'NOT CONFIGURED'}`);

  testDatabaseConnection().catch(() => {
    console.error('PostgreSQL connection failed. Check that PostgreSQL is running and backend/.env is correct.');
  });
});
// Operational status: ready - automatic Resend integration active

