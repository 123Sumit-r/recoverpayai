/**
 * CRM Provider Abstraction (Salesforce / HubSpot / Zendesk)
 * 
 * Safety invariants:
 * - Allows tracking customer recovery lifecycle notes, tier updates, and escalation assignments.
 * - Safely simulated by default.
 */

class CRMProvider {
  async createRecoveryCase(params) {
    throw new Error('createRecoveryCase must be implemented by CRM provider subclass');
  }

  async updateCustomerRecoveryStatus(params) {
    throw new Error('updateCustomerRecoveryStatus must be implemented by CRM provider subclass');
  }

  async addRecoveryNote(params) {
    throw new Error('addRecoveryNote must be implemented by CRM provider subclass');
  }
}

class MockCRMProvider extends CRMProvider {
  constructor(options = {}) {
    super();
    this.name = 'MockCRMProvider (HubSpot/Salesforce Ready)';
    this.options = options;
  }

  async createRecoveryCase({ caseId, customerId, amount, reason }) {
    return {
      success: true,
      provider: this.name,
      crm_case_id: `sim_crm_case_${caseId}`,
      customer_id: customerId,
      amount,
      reason,
      simulated: true,
      timestamp: new Date().toISOString(),
      message: `Simulated CRM recovery ticket created for case #${caseId}.`
    };
  }

  async updateCustomerRecoveryStatus({ customerId, status, details = {} }) {
    return {
      success: true,
      provider: this.name,
      customer_id: customerId,
      status,
      details,
      simulated: true,
      timestamp: new Date().toISOString(),
      message: `Simulated CRM customer recovery status updated to ${status}.`
    };
  }

  async addRecoveryNote({ caseId, note }) {
    return {
      success: true,
      provider: this.name,
      case_id: caseId,
      note_id: `sim_crm_note_${Date.now()}`,
      note,
      simulated: true,
      timestamp: new Date().toISOString(),
      message: `Simulated CRM note appended to case #${caseId}.`
    };
  }
}

module.exports = {
  CRMProvider,
  MockCRMProvider
};
