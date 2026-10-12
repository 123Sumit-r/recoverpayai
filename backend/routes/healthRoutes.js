const express = require('express');
const pool = require('../config/database');

const router = express.Router();

router.get('/health', async (request, response) => {
  const health = {
    success: true,
    message: 'RecoverPay AI backend is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };

  // Check database connectivity for Render health checks
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      health.database = 'connected';
    } finally {
      client.release();
    }
  } catch (dbError) {
    health.database = 'disconnected';
    health.database_error = dbError.message;
    // Still return 200 so the service stays up while DB reconnects
  }

  response.json(health);
});

module.exports = router;
