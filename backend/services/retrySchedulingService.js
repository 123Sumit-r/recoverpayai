/**
 * Retry Scheduling Service
 * 
 * Determines whether to retry, schedules retry attempts
 * Enforces retry limits and policy
 */

const retryAttemptModel = require('../models/retryAttemptModel');
const recoveryModel = require('../models/recoveryModel');
const { mapFailureReason, isRetryable } = require('./razorpayService');

/**
 * Configuration from environment
 */
function getRetryConfig() {
  return {
    maxAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '2', 10),
    delayMinutes: parseInt(process.env.RETRY_DELAY_MINUTES || '30', 10),
    minDelaySeconds: 300, // 5 minutes minimum
    maxDelayHours: 24
  };
}

/**
 * Determine if retry should be scheduled for a failure
 * 
 * Checks:
 * 1. Failure reason is retryable
 * 2. Policy allows retry
 * 3. Retry limit not reached
 * 4. Not already scheduled
 */
async function shouldScheduleRetry(failureReason, recoveryCase, policy = null) {
  // Check if failure is retryable
  if (!isRetryable(failureReason)) {
    return {
      shouldRetry: false,
      reason: `Failure reason '${failureReason}' is not retryable`,
      requiresCustomerAction: true
    };
  }

  // Check policy
  if (policy && !policy.allowAutoRetry) {
    return {
      shouldRetry: false,
      reason: policy.retryBlockReason || 'Policy does not allow automatic retry',
      requiresCustomerAction: false
    };
  }

  // Check retry limit
  const config = getRetryConfig();
  const attemptedCount = await retryAttemptModel.getCount(recoveryCase);
  
  if (attemptedCount >= config.maxAttempts) {
    return {
      shouldRetry: false,
      reason: `Retry limit of ${config.maxAttempts} attempts reached`,
      requiresCustomerAction: false,
      limitReached: true
    };
  }

  return {
    shouldRetry: true,
    attemptNumber: attemptedCount + 1,
    reason: null
  };
}

/**
 * Schedule a retry attempt
 * 
 * Creates a retry_attempts record with:
 * - Scheduled time (now + delay)
 * - Attempt number
 * - Status: 'scheduled'
 */
async function scheduleRetry(recoveryCase, paymentEventId, failureReason = null) {
  const config = getRetryConfig();
  
  try {
    // Get current attempt count
    const currentAttempt = await retryAttemptModel.getCount(recoveryCase);
    const nextAttemptNumber = currentAttempt + 1;

    // Calculate delay (in minutes, configurable)
    // First retry after RETRY_DELAY_MINUTES
    // Optional: could implement exponential backoff
    const delayMillis = config.delayMinutes * 60 * 1000;
    const scheduledFor = new Date(Date.now() + delayMillis);

    // Create retry attempt
    const retryAttempt = await retryAttemptModel.schedule({
      recoveryCase,
      paymentEventId,
      scheduledFor,
      attemptNumber: nextAttemptNumber,
      razorpayOrderId: recoveryCase.razorpay_order_id
    });

    // Update recovery case with next retry time
    await recoveryModel.updateNextRetry(recoveryCase.id, scheduledFor);

    return {
      success: true,
      retryAttempt,
      scheduledFor,
      delayMinutes: config.delayMinutes,
      attemptNumber: nextAttemptNumber,
      maxAttempts: config.maxAttempts
    };
  } catch (error) {
    throw new Error(`Failed to schedule retry: ${error.message}`);
  }
}

/**
 * Execute a scheduled retry
 * 
 * In a real integration, this would:
 * 1. Call Razorpay API to create new payment order
 * 2. Or call webhook with retry flag
 * 3. Update retry_attempts record with result
 * 
 * For MVP, we log the scheduled retry and wait for manual trigger
 */
async function executeRetry(retryAttempt) {
  try {
    // Mark as attempted
    await retryAttemptModel.markAttempted(retryAttempt.id);

    // TODO: In production, call Razorpay API here
    // const result = await razorpayApi.createPaymentOrder({...})
    
    // For now, return scheduled status
    return {
      success: true,
      status: 'pending',
      message: 'Retry execution pending - waiting for payment gateway',
      retryAttemptId: retryAttempt.id
    };
  } catch (error) {
    throw new Error(`Failed to execute retry: ${error.message}`);
  }
}

/**
 * Handle successful retry
 * 
 * Updates:
 * - retry_attempts: status = success
 * - recovery_cases: status = recovered, amount_recovered
 */
async function handleRetrySuccess(retryAttempt, recoveryCase, paymentAmount) {
  try {
    // Mark retry as successful
    await retryAttemptModel.markSuccess(retryAttempt.id);

    // Update recovery case as recovered
    await recoveryModel.updateStatus(
      recoveryCase.id,
      'recovered',
      paymentAmount,
      'retry_payment_success',
      'Automatic retry successful'
    );

    return {
      success: true,
      status: 'recovered',
      message: 'Payment recovered via automatic retry'
    };
  } catch (error) {
    throw new Error(`Failed to handle retry success: ${error.message}`);
  }
}

/**
 * Handle failed retry
 * 
 * If limit not reached: reschedule another retry
 * If limit reached: mark case as failed/escalated
 */
async function handleRetryFailure(
  retryAttempt,
  recoveryCase,
  newFailureReason = null,
  providerResponse = null
) {
  const config = getRetryConfig();
  
  try {
    // Mark retry as failed
    await retryAttemptModel.markFailed(
      retryAttempt.id,
      newFailureReason,
      providerResponse
    );

    // Check if we should retry again
    const attemptedCount = await retryAttemptModel.getCount(recoveryCase);
    
    if (attemptedCount >= config.maxAttempts) {
      // Limit reached - escalate
      await recoveryModel.updateStatus(
        recoveryCase.id,
        'escalated',
        0,
        'retry_limit_reached',
        `Maximum retry attempts (${config.maxAttempts}) exhausted`
      );

      return {
        success: false,
        limitReached: true,
        status: 'escalated',
        message: `Retry limit of ${config.maxAttempts} reached. Case escalated for human review.`
      };
    }

    // Try again
    const retryCheck = await shouldScheduleRetry(newFailureReason, recoveryCase);
    
    if (retryCheck.shouldRetry) {
      const nextRetry = await scheduleRetry(recoveryCase, recoveryCase.payment_event_id, newFailureReason);
      
      return {
        success: false,
        limitReached: false,
        status: 'retry_scheduled',
        message: `Retry failed. Next attempt scheduled in ${config.delayMinutes} minutes.`,
        nextRetry
      };
    } else {
      // Cannot retry anymore
      await recoveryModel.updateStatus(
        recoveryCase.id,
        'failed',
        0,
        'retry_blocked',
        retryCheck.reason
      );

      return {
        success: false,
        limitReached: false,
        status: 'failed',
        message: `Retry blocked: ${retryCheck.reason}`,
        requiresCustomerAction: retryCheck.requiresCustomerAction
      };
    }
  } catch (error) {
    throw new Error(`Failed to handle retry failure: ${error.message}`);
  }
}

/**
 * Get retry summary for a recovery case
 */
async function getRetrySummary(recoveryCase) {
  try {
    const config = getRetryConfig();
    const retries = await retryAttemptModel.getByRecoveryCase(recoveryCase);
    const attemptedCount = await retryAttemptModel.getCount(recoveryCase);
    const successfulRetry = await retryAttemptModel.getSuccessful(recoveryCase);

    return {
      maxAttempts: config.maxAttempts,
      attemptedCount,
      remainingAttempts: Math.max(0, config.maxAttempts - attemptedCount),
      retries: retries.map(r => ({
        attemptNumber: r.attempt_number,
        status: r.retry_status,
        scheduledFor: r.scheduled_for,
        executedAt: r.executed_at,
        result: r.retry_result
      })),
      successfulRetry: successfulRetry ? {
        attemptNumber: successfulRetry.attempt_number,
        executedAt: successfulRetry.executed_at
      } : null
    };
  } catch (error) {
    throw new Error(`Failed to get retry summary: ${error.message}`);
  }
}

module.exports = {
  getRetryConfig,
  shouldScheduleRetry,
  scheduleRetry,
  executeRetry,
  handleRetrySuccess,
  handleRetryFailure,
  getRetrySummary
};
