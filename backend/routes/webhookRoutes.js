const express = require('express');
const {
  handlePaymentWebhook,
  handleCheckoutWebhook,
  handleInvoiceWebhook
} = require('../controllers/webhookController');
const { handleRazorpayPaymentWebhook } = require('../controllers/razorpayWebhookController');

const router = express.Router();

// Legacy webhook endpoints
router.post('/payment', express.json(), handlePaymentWebhook);
router.post('/checkout', express.json(), handleCheckoutWebhook);
router.post('/invoice', express.json(), handleInvoiceWebhook);

// REAL Razorpay webhook endpoint
// This is called by Razorpay payment gateway on payment events
router.post(
  '/razorpay/payment',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    req.rawBody = req.body.toString('utf8');
    handleRazorpayPaymentWebhook(req, res, next);
  }
);

module.exports = router;
