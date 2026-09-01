/**
 * Payment Gateway Provider Abstraction
 * 
 * Safety invariants:
 * - Never store or transmit raw card numbers, CVV, PIN, or payment credentials.
 * - By default, all operations run in simulated/mock mode.
 * - Real gateway execution requires explicit multi-factor environment activation.
 */

class PaymentGatewayProvider {
  async retryPayment(params) {
    throw new Error('retryPayment must be implemented by gateway provider subclass');
  }

  async getPaymentStatus(params) {
    throw new Error('getPaymentStatus must be implemented by gateway provider subclass');
  }

  async updatePaymentMethod(params) {
    throw new Error('updatePaymentMethod must be implemented by gateway provider subclass');
  }
}

class MockPaymentGatewayProvider extends PaymentGatewayProvider {
  constructor(options = {}) {
    super();
    this.name = 'MockPaymentGateway (Stripe/Razorpay Ready)';
    this.options = options;
  }

  async retryPayment({ transactionId, customerId, amount, currency = 'INR' }) {
    // Deterministic simulation: even transaction IDs succeed, odd fail
    const isSuccess = !transactionId || Number(transactionId) % 2 === 0;
    return {
      success: isSuccess,
      provider: this.name,
      status: isSuccess ? 'succeeded' : 'failed',
      gateway_reference: `sim_gw_txn_${transactionId || Date.now()}`,
      amount: Number(amount || 0),
      currency,
      timestamp: new Date().toISOString(),
      simulated: true,
      message: isSuccess
        ? 'Payment retry simulated successfully through mock gateway adapter.'
        : 'Payment retry simulated failure (card declined by issuer).'
    };
  }

  async getPaymentStatus({ transactionId }) {
    return {
      provider: this.name,
      transaction_id: transactionId,
      status: 'failed',
      simulated: true,
      timestamp: new Date().toISOString()
    };
  }

  async updatePaymentMethod({ customerId, paymentMethodToken }) {
    return {
      provider: this.name,
      customer_id: customerId,
      status: 'payment_method_update_requested',
      simulated: true,
      timestamp: new Date().toISOString(),
      message: 'Payment method update link generated and staged.'
    };
  }
}

module.exports = {
  PaymentGatewayProvider,
  MockPaymentGatewayProvider
};
