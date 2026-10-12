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

// CORS: Allow deployed frontend and localhost for development
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      return callback(null, true);
    }
    callback(null, false);
  },
  credentials: true
}));

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

// Global error handler - never expose internal details in production
app.use((error, request, response, next) => {
  console.error('Unhandled error:', error.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(error.stack);
  }
  response.status(500).json({ success: false, message: 'Internal server error' });
});

// Bind to 0.0.0.0 for Render/Docker compatibility
app.listen(port, '0.0.0.0', () => {
  console.log(`RecoverPay AI backend listening on 0.0.0.0:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Verify critical service configuration (never log actual keys)
  console.log(`Database: ${process.env.DATABASE_URL ? 'DATABASE_URL configured' : `${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'raz_ai'}`}`);
  console.log(`Resend API key: ${process.env.RESEND_API_KEY ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
  console.log(`Resend sender: ${process.env.RESEND_FROM_EMAIL || 'NOT CONFIGURED'}`);
  console.log(`Groq AI key: ${process.env.AI_API_KEY || process.env.GROQ_API_KEY ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
  console.log(`Razorpay: ${process.env.RAZORPAY_KEY_ID ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
  console.log(`Recovery mode: ${process.env.RECOVERY_MODE || 'simulated'}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);

  testDatabaseConnection().catch(() => {
    console.error('PostgreSQL connection failed. Check that PostgreSQL is running and DATABASE_URL or backend/.env is correct.');
  });
});
// Operational status: ready - automatic Resend integration active
