const MAX_RETRIES = 3;
const MAX_REMINDERS = 2;
const MAX_CHECKOUT_REMINDERS = 2;
const HIGH_VALUE_THRESHOLD = 500000;
const EXTREME_OVERDUE_DAYS = 30;
const SAFE_ACTIONS = new Set([
  'retry_payment',
  'retry_payment_later',
  'request_payment_method_update',
  'send_payment_reminder',
  'send_invoice_notification',
  'send_checkout_recovery',
  'escalate_to_human'
]);

function evaluate(caseRecord, action) {
  if (!caseRecord || !action) {
    return { allowed: false, action: action || null, reason: 'Recovery action is missing.', escalate: true };
  }
  if (!SAFE_ACTIONS.has(action)) {
    return { allowed: false, action, reason: 'Action is outside the safe recovery policy.', escalate: true };
  }
  if (caseRecord.status === 'recovered' || caseRecord.status === 'closed') {
    return { allowed: false, action, reason: 'This recovery case is already complete.', escalate: false };
  }
  if (action === 'retry_payment' || action === 'retry_payment_later') {
    if (caseRecord.retry_count >= MAX_RETRIES) {
      return { allowed: false, action, reason: 'Maximum payment retry limit reached.', escalate: true };
    }
    if (Number(caseRecord.amount_at_risk || 0) >= HIGH_VALUE_THRESHOLD) {
      return { allowed: false, action, reason: 'High-value payment retries require human approval.', escalate: true };
    }
  }
  if (action === 'send_payment_reminder' || action === 'send_invoice_notification') {
    if (caseRecord.reminder_count >= MAX_REMINDERS) {
      return { allowed: false, action, reason: 'Maximum automated reminder limit reached.', escalate: true };
    }
    if (Number(caseRecord.amount_at_risk) >= HIGH_VALUE_THRESHOLD) {
      return { allowed: false, action, reason: 'High-value invoices require human approval.', escalate: true };
    }
  }
  if (action === 'send_checkout_recovery') {
    if (caseRecord.case_type !== 'checkout_abandonment') return { allowed: false, action, reason: 'Checkout recovery is only valid for checkout abandonment cases.', escalate: true };
    if (caseRecord.reminder_count >= MAX_CHECKOUT_REMINDERS) return { allowed: false, action, reason: 'Maximum checkout reminder limit reached.', escalate: true };
  }
  if (Number(caseRecord.amount_at_risk || 0) >= HIGH_VALUE_THRESHOLD || Number(caseRecord.overdue_days || 0) >= EXTREME_OVERDUE_DAYS) {
    if (action !== 'escalate_to_human') {
      return { allowed: false, action, reason: 'High-value or extremely overdue revenue requires human approval.', escalate: true };
    }
  }
  return { allowed: true, action, reason: 'The action is within the configured recovery policy.', escalate: false };
}

module.exports = { evaluate, MAX_RETRIES, MAX_REMINDERS, MAX_CHECKOUT_REMINDERS, HIGH_VALUE_THRESHOLD, EXTREME_OVERDUE_DAYS, SAFE_ACTIONS };
