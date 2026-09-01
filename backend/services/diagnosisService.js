const diagnoses = {
  expired_card: 'The customer payment method has expired.',
  insufficient_funds: 'The payment may have failed because sufficient funds were unavailable.',
  bank_declined: "The customer's bank declined the transaction.",
  temporary_failure: 'The payment appears to have encountered a temporary processing failure.',
  invalid_payment_method: 'The stored payment method is invalid.',
  overdue_invoice: 'The invoice has passed its due date and payment has not been received.',
  price_concern: 'The customer may have paused at checkout because of price concerns.',
  payment_friction: 'The customer may have encountered friction while entering payment details.',
  technical_issue: 'A technical issue may have interrupted the checkout.',
  user_distraction: 'The customer may have been interrupted before completing checkout.',
  unknown_abandonment: 'The checkout was abandoned without a known reason.'
};

function diagnose(caseRecord) {
  const rootCause = caseRecord.case_type === 'overdue_invoice' ? 'overdue_invoice' : caseRecord.case_type === 'checkout_abandonment' ? caseRecord.failure_reason || 'unknown_abandonment' : caseRecord.failure_reason;
  return { root_cause: rootCause, diagnosis: diagnoses[rootCause] || 'The revenue event requires manual review.' };
}

module.exports = { diagnose };
