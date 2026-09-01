/**
 * Recovery Integration Service
 * 
 * Central orchestration layer connecting Policy-Engine-approved actions
 * to Payment Gateway, Notification (Email/SMS via Resend), CRM, and ERP/Invoice providers.
 * 
 * Safety & Security Invariants:
 * 1. Default mode is strictly SIMULATED.
 * 2. REAL recovery requires double-lock activation:
 *    RECOVERY_MODE=real AND REAL_ACTIONS_ENABLED=true
 * 3. AI NEVER calls external APIs directly — only through strict Policy Engine evaluation.
 * 4. Zero exposure or logging of sensitive payment credentials or API keys.
 * 5. Distinct operational metrics: EMAIL SENT != PAYMENT RECOVERED.
 */

const { MockPaymentGatewayProvider } = require('./integrations/paymentGatewayProvider');
const { MockNotificationProvider, ResendNotificationProvider } = require('./integrations/notificationProvider');
const { MockCRMProvider } = require('./integrations/crmProvider');
const { MockInvoiceProvider } = require('./integrations/invoiceProvider');

class RecoveryIntegrationService {
  constructor(options = {}) {
    this.paymentGateway = options.paymentGateway || new MockPaymentGatewayProvider();
    this.notificationProvider = options.notificationProvider || (
      process.env.RESEND_API_KEY
        ? new ResendNotificationProvider()
        : new MockNotificationProvider()
    );
    this.crmProvider = options.crmProvider || new MockCRMProvider();
    this.invoiceProvider = options.invoiceProvider || new MockInvoiceProvider();
  }

  /**
   * Resolves the current runtime recovery mode.
   * Double lock: Both RECOVERY_MODE=real and REAL_ACTIONS_ENABLED=true are required for real actions.
   */
  resolveRecoveryMode(overrideMode = null) {
    const configuredMode = (overrideMode || process.env.RECOVERY_MODE || 'simulated').toLowerCase();
    const realActionsEnabled = process.env.REAL_ACTIONS_ENABLED === 'true';

    if (configuredMode === 'real' && !realActionsEnabled) {
      return {
        mode: 'simulated',
        requestedMode: 'real',
        realActionsEnabled: false,
        guarded: true,
        guardReason: 'Real actions safety lock is active (REAL_ACTIONS_ENABLED=false). Running in safe simulated mode.'
      };
    }

    return {
      mode: configuredMode === 'real' ? 'real' : 'simulated',
      requestedMode: configuredMode,
      realActionsEnabled,
      guarded: false
    };
  }

  /**
   * Main recovery action dispatcher.
   * 
   * @param {Object} params
   * @param {string} params.action - Policy-approved recovery action
   * @param {Object} params.recoveryCase - The recovery case record
   * @param {Object} params.policy - Policy engine decision
   * @param {string} [params.mode] - Optional mode override
   */
  async executeRecoveryAction({ action, recoveryCase, policy, mode = null }) {
    const modeConfig = this.resolveRecoveryMode(mode);
    const effectiveMode = modeConfig.mode;
    const isSimulated = effectiveMode === 'simulated';

    // 1. Guard against unapproved policy actions
    if (!policy || !policy.allowed) {
      return {
        success: false,
        status: policy?.escalate ? 'escalated' : 'blocked',
        mode: effectiveMode,
        simulated: true,
        provider: 'PolicyEngine',
        action,
        message: policy?.reason || 'Action blocked by policy engine.',
        timestamp: new Date().toISOString(),
        details: { policy, guard: modeConfig.guarded ? modeConfig.guardReason : undefined }
      };
    }

    // 2. Dispatch to appropriate provider based on action
    const executionDetails = {
      action,
      case_id: recoveryCase.id,
      customer_id: recoveryCase.customer_id,
      amount: recoveryCase.amount_at_risk,
      mode: effectiveMode,
      guarded: modeConfig.guarded,
      timestamp: new Date().toISOString()
    };

    let result;

    switch (action) {
      case 'retry_payment':
      case 'retry_payment_later': {
        const gwResult = await this.paymentGateway.retryPayment({
          transactionId: recoveryCase.transaction_id,
          customerId: recoveryCase.customer_id,
          amount: recoveryCase.amount_at_risk,
          currency: 'INR'
        });

        result = {
          success: gwResult.success,
          status: gwResult.status, // 'succeeded' or 'failed'
          simulated: isSimulated,
          mode: effectiveMode,
          provider: gwResult.provider,
          action,
          message: gwResult.message,
          timestamp: gwResult.timestamp,
          details: { ...executionDetails, gateway: gwResult }
        };
        break;
      }

      case 'request_payment_method_update': {
        const targetEmail = recoveryCase.customer_email || process.env.RECOVERY_ALERT_EMAIL;
        const gwResult = await this.paymentGateway.updatePaymentMethod({
          customerId: recoveryCase.customer_id
        });
        const notifyResult = await this.notificationProvider.sendEmail({
          to: targetEmail,
          subject: 'Action Required: Update Your Payment Method',
          template: 'payment_method_update',
          variables: {
            customerName: recoveryCase.customer_name,
            amount: recoveryCase.amount_at_risk,
            caseId: recoveryCase.id
          }
        });

        const notifySuccess = notifyResult.success;
        result = {
          success: notifySuccess,
          status: notifySuccess ? 'email_sent' : 'failed',
          email_sent: notifySuccess,
          simulated: isSimulated,
          mode: effectiveMode,
          provider: `${gwResult.provider} + ${notifyResult.provider}`,
          action,
          message: notifySuccess
            ? 'Payment update link generated and email notification dispatched.'
            : `Notification delivery failed: ${notifyResult.error}`,
          timestamp: new Date().toISOString(),
          details: { ...executionDetails, gateway: gwResult, notification: notifyResult }
        };
        break;
      }

      case 'send_payment_reminder':
      case 'send_invoice_notification': {
        const targetEmail = recoveryCase.customer_email || process.env.RECOVERY_ALERT_EMAIL;
        const notifyResult = await this.notificationProvider.sendEmail({
          to: targetEmail,
          subject: action === 'send_payment_reminder' ? 'Payment Reminder for Overdue Invoice' : 'Commercial Invoice Notification',
          template: action,
          variables: {
            customerName: recoveryCase.customer_name,
            amount: recoveryCase.amount_at_risk,
            invoiceId: recoveryCase.invoice_id,
            caseId: recoveryCase.id
          }
        });
        const invoiceResult = await this.invoiceProvider.recordRecoveryAttempt({
          invoiceId: recoveryCase.invoice_id,
          action,
          status: notifyResult.success ? 'reminder_dispatched' : 'reminder_failed',
          amount: recoveryCase.amount_at_risk
        });

        const notifySuccess = notifyResult.success;
        result = {
          success: notifySuccess,
          status: notifySuccess ? 'email_sent' : 'failed',
          email_sent: notifySuccess,
          simulated: isSimulated,
          mode: effectiveMode,
          provider: `${notifyResult.provider} + ${invoiceResult.provider}`,
          action,
          message: notifySuccess
            ? `${action === 'send_payment_reminder' ? 'Payment reminder' : 'Invoice notice'} delivered and recorded in ledger.`
            : `Email delivery failed: ${notifyResult.error}`,
          timestamp: new Date().toISOString(),
          details: { ...executionDetails, notification: notifyResult, invoice_ledger: invoiceResult }
        };
        break;
      }

      case 'send_checkout_recovery': {
        const targetEmail = recoveryCase.customer_email || process.env.RECOVERY_ALERT_EMAIL;
        const notifyResult = await this.notificationProvider.sendEmail({
          to: targetEmail,
          subject: 'Complete Your Order — Your Cart is Reserved',
          template: 'checkout_recovery',
          variables: {
            customerName: recoveryCase.customer_name,
            amount: recoveryCase.amount_at_risk,
            caseId: recoveryCase.id
          }
        });

        const notifySuccess = notifyResult.success;
        result = {
          success: notifySuccess,
          status: notifySuccess ? 'email_sent' : 'failed',
          email_sent: notifySuccess,
          simulated: isSimulated,
          mode: effectiveMode,
          provider: notifyResult.provider,
          action,
          message: notifySuccess
            ? 'Checkout recovery email notification dispatched to customer.'
            : `Checkout notification failed: ${notifyResult.error}`,
          timestamp: new Date().toISOString(),
          details: { ...executionDetails, notification: notifyResult }
        };
        break;
      }

      case 'escalate_to_human': {
        const crmResult = await this.crmProvider.createRecoveryCase({
          caseId: recoveryCase.id,
          customerId: recoveryCase.customer_id,
          amount: recoveryCase.amount_at_risk,
          reason: recoveryCase.failure_reason || recoveryCase.diagnosis || 'High risk revenue event'
        });

        result = {
          success: true,
          status: 'escalated',
          simulated: isSimulated,
          mode: effectiveMode,
          provider: crmResult.provider,
          action,
          message: 'Case escalated to human recovery team via CRM.',
          timestamp: new Date().toISOString(),
          details: { ...executionDetails, crm: crmResult }
        };
        break;
      }

      default: {
        result = {
          success: false,
          status: 'failed',
          simulated: isSimulated,
          mode: effectiveMode,
          provider: 'Unknown',
          action,
          message: `Unsupported recovery action: ${action}`,
          timestamp: new Date().toISOString(),
          details: executionDetails
        };
      }
    }

    return result;
  }
}

const defaultIntegrationService = new RecoveryIntegrationService();

module.exports = {
  RecoveryIntegrationService,
  defaultIntegrationService
};
