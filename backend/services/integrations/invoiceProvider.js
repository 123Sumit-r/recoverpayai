/**
 * ERP / Invoice System Provider Abstraction (QuickBooks / NetSuite / Zoho Books)
 * 
 * Safety invariants:
 * - Read/sync invoice status and record recovery payment attempts.
 * - Safely simulated by default.
 */

class InvoiceProvider {
  async getInvoice(params) {
    throw new Error('getInvoice must be implemented by invoice provider subclass');
  }

  async getInvoiceStatus(params) {
    throw new Error('getInvoiceStatus must be implemented by invoice provider subclass');
  }

  async recordRecoveryAttempt(params) {
    throw new Error('recordRecoveryAttempt must be implemented by invoice provider subclass');
  }
}

class MockInvoiceProvider extends InvoiceProvider {
  constructor(options = {}) {
    super();
    this.name = 'MockInvoiceProvider (QuickBooks/NetSuite Ready)';
    this.options = options;
  }

  async getInvoice({ invoiceId }) {
    return {
      provider: this.name,
      invoice_id: invoiceId,
      status: 'overdue',
      simulated: true,
      timestamp: new Date().toISOString()
    };
  }

  async getInvoiceStatus({ invoiceId }) {
    return {
      provider: this.name,
      invoice_id: invoiceId,
      status: 'overdue',
      simulated: true,
      timestamp: new Date().toISOString()
    };
  }

  async recordRecoveryAttempt({ invoiceId, action, status, amount }) {
    return {
      success: true,
      provider: this.name,
      invoice_id: invoiceId,
      action_recorded: action,
      status,
      amount,
      sync_reference: `sim_erp_sync_${invoiceId}_${Date.now()}`,
      simulated: true,
      timestamp: new Date().toISOString(),
      message: `Simulated ERP ledger updated: ${action} recorded for invoice #${invoiceId}.`
    };
  }
}

module.exports = {
  InvoiceProvider,
  MockInvoiceProvider
};
