/**
 * Razorpay Webhook Controller
 * 
 * Handles real Razorpay payment webhooks:
 * 1. Verifies webhook signature
 * 2. Extracts payment event data
 * 3. Checks idempotency
 * 4. Stores payment event
 * 5. Runs AI diagnosis
 * 6. Evaluates policy
 * 7. Schedules retry if applicable
 * 8. Sends Resend email
 * 9. Logs audit trail
 */

const pool = require('../config/database');
const customerModel = require('../models/customerModel');
const transactionModel = require('../models/transactionModel');
const paymentEventModel = require('../models/paymentEventModel');
const retryAttemptModel = require('../models/retryAttemptModel');
const recoveryModel = require('../models/recoveryModel');

const razorpayService = require('../services/razorpayService');
const retrySchedulingService = require('../services/retrySchedulingService');
const emailTemplatesService = require('../services/emailTemplatesService');
const { analyze } = require('../services/aiAnalysisService');
const { evaluate } = require('../services/policyService');
const { sendRecoveryNotification } = require('../services/emailService');

/**
 * POST /api/webhooks/razorpay/payment
 * 
 * Handle Razorpay payment webhook
 * Called by Razorpay when payment status changes
 */
async function handleRazorpayPaymentWebhook(req, res, next) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.rawBody || '';

  try {
    // 1. Verify Webhook Signature
    if (!webhookSecret) {
      return res.status(400).json({
        success: false,
        error: 'RAZORPAY_WEBHOOK_SECRET not configured'
      });
    }

    const signatureVerification = razorpayService.verifyWebhookSignature(
      rawBody,
      signature,
      webhookSecret
    );

      if (!signatureVerification.valid) {
        console.error('Invalid webhook signature:', signatureVerification.error);
        return res.status(401).json({
          success: false,
          error: 'Invalid webhook signature'
        });
      }

      // Parse webhook payload
      const eventData = JSON.parse(rawBody);
      if (!eventData.id && req.headers['x-razorpay-event-id']) {
        eventData.id = req.headers['x-razorpay-event-id'];
      }

      // 2. Extract payment event
      const paymentParsed = razorpayService.parsePaymentWebhook(eventData);

      if (!paymentParsed.valid) {
        return res.status(400).json({
          success: false,
          error: paymentParsed.error
        });
      }
        
        if (!paymentParsed.eventId) {
          if (!paymentParsed.eventType) {
            return res.status(200).json({
              success: true,
              message: 'Razorpay webhook validation received'
            });
          }
          
          return res.status(400).json({
            success: false,
            error: 'Razorpay event ID is required'
          });
        }

      // Ensure customer exists before storing the payment event.
      const customer = await customerModel.create({
        name: paymentParsed.email?.split('@')[0] || 'Customer',
        email: paymentParsed.email?.toLowerCase() || `customer_${paymentParsed.paymentId}@razorpay`,
        phone: paymentParsed.contact || '—',
        customer_type: 'individual'
      });

      // 3. Check idempotency - avoid duplicate processing
      const paymentEventCheck = await paymentEventModel.createOrGet({
        razorpayEventId: paymentParsed.eventId,
        razorpayPaymentId: paymentParsed.paymentId,
        razorpayOrderId: paymentParsed.orderId,
        eventType: paymentParsed.eventType,
        customerId: customer.id,
        amount: paymentParsed.amount,
        currency: paymentParsed.currency,
        failureReason: null, // Will set based on status
        failureDescription: paymentParsed.error,
        providerResponse: eventData,
        webhookSignatureVerified: true
      });

      if (paymentEventCheck.duplicate) {
        console.log('Duplicate webhook event (idempotent):', paymentParsed.eventId);
        return res.status(200).json({
          success: true,
          duplicate: true,
          message: 'Webhook event already processed'
        });
      }

      // 4. Only process payment FAILED events
      if (paymentParsed.status !== 'failed') {
        // Payment succeeded, no recovery needed
        await paymentEventModel.markProcessed(paymentEventCheck.event.id);
        return res.status(200).json({
          success: true,
          status: paymentParsed.status,
          message: 'Payment succeeded - no recovery action needed'
        });
      }

      // Update payment event with customer ID
      await pool.query(
        'UPDATE payment_events SET customer_id = $1 WHERE id = $2',
        [customer.id, paymentEventCheck.event.id]
      );

      // 6. Map Razorpay failure reason to standard codes
      const failureMapping = razorpayService.mapFailureReason(
        paymentParsed.error,
        paymentParsed.method
      );

      // Update payment event with failure reason
      await pool.query(
        'UPDATE payment_events SET failure_reason = $1, failure_description = $2 WHERE id = $3',
        [failureMapping.reason, failureMapping.description, paymentEventCheck.event.id]
      );

      // Store the real failed payment as a transaction for the recovery-case constraint.
      const transaction = await transactionModel.create({
        customerId: customer.id,
        amount: paymentParsed.amount,
        status: 'failed',
        failureReason: failureMapping.reason,
        transactionType: 'one_time'
      });

      // 7. Create recovery case
      const recoveryCase = await recoveryModel.createFromSource({
        transactionId: transaction.id
      });

      if (!recoveryCase) {
        throw new Error('Failed to create recovery case');
      }

      // Store Razorpay details in recovery case
      await recoveryModel.updateRazorpayPaymentDetails(
        recoveryCase.id,
        paymentEventCheck.event.id,
        paymentParsed.paymentId,
        paymentParsed.orderId
      );

      // 8. Run Groq AI Diagnosis
      const aiAnalysis = await analyze({
        case_type: 'failed_payment',
        failure_reason: failureMapping.reason,
        amount_at_risk: paymentParsed.amount,
        customer_type: customer.customer_type
      });

      // 9. Run Policy Engine
      const policy = evaluate(recoveryCase, aiAnalysis.recommended_action);

      // Save AI analysis and policy to recovery case
      await recoveryModel.saveAiAnalysis(recoveryCase.id, aiAnalysis, policy);

      // 10. Determine retry action
      const retryCheck = await retrySchedulingService.shouldScheduleRetry(
        failureMapping.reason,
        recoveryCase,
        {
          allowAutoRetry: policy.allowed,
          retryBlockReason: policy.reason
        }
      );

      let emailTemplate = 'payment_failed';
      let retryScheduled = false;

      // 11. Schedule retry if applicable
      if (retryCheck.shouldRetry && policy.allowed) {
        try {
          const retryScheduleResult = await retrySchedulingService.scheduleRetry(
            recoveryCase,
            paymentEventCheck.event.id,
            failureMapping.reason
          );

          retryScheduled = true;
          emailTemplate = 'retry_scheduled';

          console.log(`✓ Retry scheduled for case ${recoveryCase.id}:`, retryScheduleResult);
        } catch (retryError) {
          console.error('Failed to schedule retry:', retryError.message);
          // Continue with email notification even if retry scheduling failed
        }
      } else if (!retryCheck.shouldRetry && failureMapping.reason === 'expired_card') {
        // Card expired - ask for update
        emailTemplate = 'update_payment_method';
        await recoveryModel.blockRetry(
          recoveryCase.id,
          'Card expired - customer action required'
        );
      } else if (!policy.allowed) {
        // Policy blocked automatic action
        emailTemplate = 'human_review';
      }

      // 12. Send Resend email notification
      let emailResult = null;
      try {
        const emailTemplateName = getEmailTemplateName(emailTemplate);
        const emailHtml = generateEmailContent(
          emailTemplateName,
          {
            customerName: customer.name,
            amount: paymentParsed.amount,
            currency: paymentParsed.currency,
            failureReason: failureMapping.reason,
            failureDescription: failureMapping.description,
            retryTime: recoveryCase.next_retry_at,
            caseId: recoveryCase.id,
            diagnosis: aiAnalysis.reason,
            recoveryAction: aiAnalysis.recommended_action
          }
        );

        emailResult = await sendRecoveryNotification({
          recipient: customer.email,
          customerName: customer.name,
          customerEmail: customer.email,
          eventType: 'failed_payment',
          amount: paymentParsed.amount,
          rootCause: failureMapping.reason,
          diagnosis: failureMapping.description,
          recommendedAction: aiAnalysis.recommended_action,
          policyStatus: policy.allowed ? 'Approved' : 'Blocked',
          caseId: recoveryCase.id,
          extraDetails: {
            paymentId: paymentParsed.paymentId,
            orderId: paymentParsed.orderId,
            currency: paymentParsed.currency,
            webhookVerified: true
          }
        });

        if (emailResult && emailResult.success) {
          await recoveryModel.updateActionStatus(
            recoveryCase.id,
            'email_sent',
            aiAnalysis.recommended_action,
            'email_dispatched'
          );
          console.log(`✅ Email notification sent successfully:
          - Recipient: ${emailResult.recipient}
          ${emailResult.originalRecipient ? `- Originally intended for: ${emailResult.originalRecipient}` : ''}
          - Message ID: ${emailResult.emailId}
          - Development Mode: ${emailResult.developmentMode ? 'YES' : 'NO'}`);
        } else if (emailResult && !emailResult.success) {
          console.error(`⚠️  Email notification failed:
          - Recipient: ${emailResult.originalRecipient || customer.email}
          - Error: ${emailResult.error}
          - Provider: ${emailResult.provider}`);
          // Log but don't fail the webhook
          await recoveryModel.logAudit(
            recoveryCase.id,
            'email_failed',
            `Failed to send recovery email: ${emailResult.error}`,
            { error: emailResult.error, provider: emailResult.provider }
          );
        }
      } catch (emailError) {
        console.error('❌ Exception while sending email:', emailError.message);
        // Log but don't fail the webhook
        await recoveryModel.logAudit(
          recoveryCase.id,
          'email_failed',
          `Failed to send recovery email: ${emailError.message}`,
          { error: emailError.message }
        );
      }

      // 13. Mark payment event as processed
      await paymentEventModel.markProcessed(paymentEventCheck.event.id);

      // 14. Log completion
      console.log(`
╔════════════════════════════════════════════════════════════════════╗
║           Payment Failure Webhook Processed Successfully           ║
╠════════════════════════════════════════════════════════════════════╣
║ Event ID:              ${paymentParsed.eventId}
║ Payment ID:            ${paymentParsed.paymentId}
║ Customer Email:        ${customer.email}
║ Amount at Risk:        ₹${paymentParsed.amount} ${paymentParsed.currency}
║ Failure Reason:        ${failureMapping.reason}
║ Recovery Case ID:      ${recoveryCase.id}
║ Retry Scheduled:       ${retryScheduled ? 'YES ✓' : 'NO'}
║ Email Status:          ${emailResult?.success ? '✅ SENT' : (emailResult ? '⚠️  FAILED' : '❓ UNKNOWN')}
${emailResult?.developmentMode ? `║ Email Dev Mode:        YES (redirected to verified address)` : ''}
╚════════════════════════════════════════════════════════════════════╝
      `);

      return res.status(200).json({
        success: true,
        caseId: recoveryCase.id,
        paymentId: paymentParsed.paymentId,
        status: 'recovered_or_scheduled',
        retryScheduled,
        emailSent: emailResult?.success || false,
        message: retryScheduled 
          ? 'Payment failure detected. Retry scheduled.'
          : 'Payment failure detected. Escalated for human review.'
      });
    } catch (error) {
      console.error('Webhook processing error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
}

/**
 * Helper: Get email template name
 */
function getEmailTemplateName(template) {
  const templates = {
    payment_failed: 'getPaymentFailedTemplate',
    retry_scheduled: 'getRetryScheduledTemplate',
    payment_recovered: 'getPaymentRecoveredTemplate',
    update_payment_method: 'getUpdatePaymentMethodTemplate',
    retry_limit_reached: 'getRetryLimitReachedTemplate',
    human_review: 'getHumanReviewTemplate'
  };
  return templates[template] || 'getPaymentFailedTemplate';
}

/**
 * Helper: Generate email content from template
 */
function generateEmailContent(templateName, data) {
  const func = emailTemplatesService[templateName];
  if (typeof func === 'function') {
    return func(data);
  }
  return emailTemplatesService.getPaymentFailedTemplate(data);
}

module.exports = {
  handleRazorpayPaymentWebhook
};
