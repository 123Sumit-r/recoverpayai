function recommend(caseRecord, diagnosis) {
  if (caseRecord.case_type === 'overdue_invoice') {
    const overdueDays = Number(caseRecord.overdue_days || 0);
    if (Number(caseRecord.amount_at_risk) >= 500000 || overdueDays >= 30) {
      return { recommended_action: 'escalate_to_human', reason: 'The invoice is high-value or significantly overdue.' };
    }
    return { recommended_action: 'send_payment_reminder', reason: 'A payment reminder is appropriate for this overdue invoice.' };
  }

  if (caseRecord.case_type === 'checkout_abandonment') {
    return { recommended_action: 'send_checkout_recovery', reason: 'A checkout recovery link is appropriate for this abandoned checkout.' };
  }

  const actions = {
    expired_card: ['request_payment_method_update', 'The payment method should be updated before another attempt.'],
    insufficient_funds: ['retry_payment_later', 'A later retry may succeed when funds are available.'],
    bank_declined: ['request_payment_method_update', 'The bank declined the payment, so another payment method is needed.'],
    temporary_failure: ['retry_payment', 'A temporary processing issue can be retried.'],
    invalid_payment_method: ['request_payment_method_update', 'The stored payment method must be replaced.']
  };
  const [recommendedAction, reason] = actions[diagnosis.root_cause] || ['escalate_to_human', 'The cause is not safe to automate.'];
  return { recommended_action: recommendedAction, reason };
}

module.exports = { recommend };
