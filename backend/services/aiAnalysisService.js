const allowedActions = new Set([
  'retry_payment',
  'retry_payment_later',
  'request_payment_method_update',
  'send_payment_reminder',
  'send_invoice_notification',
  'send_checkout_recovery',
  'escalate_to_human'
]);
const riskLevels = new Set(['low', 'medium', 'high', 'critical']);
const rootCauses = new Set([
  'expired_card',
  'insufficient_funds',
  'bank_declined',
  'temporary_failure',
  'invalid_payment_method',
  'overdue_invoice',
  'price_concern',
  'payment_friction',
  'technical_issue',
  'user_distraction',
  'unknown_abandonment'
]);

const rootCauseAliases = {
  'expired card': 'expired_card',
  expired_card: 'expired_card',
  'payment method expired': 'expired_card',
  'expired payment method': 'expired_card',
  'insufficient funds': 'insufficient_funds',
  insufficient_funds: 'insufficient_funds',
  'not enough funds': 'insufficient_funds',
  'bank declined': 'bank_declined',
  bank_declined: 'bank_declined',
  'bank rejection': 'bank_declined',
  'temporary failure': 'temporary_failure',
  temporary_failure: 'temporary_failure',
  'temporary processing issue': 'temporary_failure',
  'invalid payment method': 'invalid_payment_method',
  invalid_payment_method: 'invalid_payment_method',
  'bad payment details': 'invalid_payment_method',
  'overdue invoice': 'overdue_invoice',
  overdue_invoice: 'overdue_invoice',
  'price concern': 'price_concern',
  price_concern: 'price_concern',
  'payment friction': 'payment_friction',
  payment_friction: 'payment_friction',
  'technical issue': 'technical_issue',
  technical_issue: 'technical_issue',
  'user distraction': 'user_distraction',
  user_distraction: 'user_distraction',
  'unknown abandonment': 'unknown_abandonment',
  unknown_abandonment: 'unknown_abandonment'
};

const recommendedActionAliases = {
  'request payment method update': 'request_payment_method_update',
  'update payment method': 'request_payment_method_update',
  'new payment method': 'request_payment_method_update',
  'request new payment method': 'request_payment_method_update',
  request_payment_method_update: 'request_payment_method_update',
  'retry later': 'retry_payment_later',
  'retry payment later': 'retry_payment_later',
  retry_payment_later: 'retry_payment_later',
  'retry now': 'retry_payment',
  'retry payment': 'retry_payment',
  retry_payment: 'retry_payment',
  'send reminder': 'send_payment_reminder',
  'payment reminder': 'send_payment_reminder',
  send_payment_reminder: 'send_payment_reminder',
  'send invoice notification': 'send_invoice_notification',
  'invoice notification': 'send_invoice_notification',
  send_invoice_notification: 'send_invoice_notification',
  'send checkout recovery': 'send_checkout_recovery',
  'checkout recovery': 'send_checkout_recovery',
  send_checkout_recovery: 'send_checkout_recovery',
  'escalate to human': 'escalate_to_human',
  escalate_to_human: 'escalate_to_human',
  'human escalation': 'escalate_to_human'
};

function normalizeEnum(value, aliases) {
  if (typeof value !== 'string') return null;
  const key = value.trim().toLowerCase();
  return aliases[key] || null;
}

function resolveGroqConfig() {
  const apiKey = process.env.GROQ_API_KEY || process.env.AI_API_KEY || '';
  const baseUrl = process.env.GROQ_BASE_URL || process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1';
  const model = process.env.GROQ_MODEL || process.env.AI_MODEL || 'openai/gpt-oss-20b';
  const remoteEnabled = process.env.GROQ_USE_REMOTE === 'true' || process.env.AI_USE_REMOTE === 'true';
  return { apiKey, baseUrl, model, remoteEnabled };
}

function buildRecoveryStrategy(rootCause, caseData = {}) {
  const amountAtRisk = Number(caseData.amount_at_risk || 0);
  const overdueDays = Number(caseData.overdue_days || 0);
  const retryCount = Number(caseData.retry_count || 0);
  const previousFailures = Number(caseData.previous_failed_transactions || 0);
  const riskLevel = amountAtRisk >= 500000 || overdueDays >= 30 ? 'critical' : previousFailures > 1 || retryCount > 0 ? 'high' : 'medium';

  const strategies = {
    expired_card: {
      root_cause: 'expired_card',
      risk_level: riskLevel,
      recommended_action: 'request_payment_method_update',
      action: 'request_payment_method_update',
      reason: 'The card on file is expired. The safest action is to request an updated payment method before retrying the charge.',
      strategy: 'request_payment_method_update',
      escalation_required: false,
      safe_to_retry: false
    },
    insufficient_funds: {
      root_cause: 'insufficient_funds',
      risk_level: riskLevel,
      recommended_action: 'retry_payment_later',
      action: 'retry_payment_later',
      reason: 'The customer likely needs time to replenish funds. A later retry is safer than an immediate retry or a risky payment action.',
      strategy: 'retry_payment_later',
      escalation_required: false,
      safe_to_retry: true
    },
    bank_declined: {
      root_cause: 'bank_declined',
      risk_level: riskLevel,
      recommended_action: 'request_payment_method_update',
      action: 'request_payment_method_update',
      reason: 'The bank rejected the payment, which usually indicates the card or account details need attention before the next attempt.',
      strategy: 'request_payment_method_update',
      escalation_required: false,
      safe_to_retry: false
    },
    temporary_failure: {
      root_cause: 'temporary_failure',
      risk_level: riskLevel,
      recommended_action: 'retry_payment',
      action: 'retry_payment',
      reason: 'This appears to be a transient gateway or processing issue. A limited retry is the most appropriate recovery step.',
      strategy: 'retry_payment',
      escalation_required: false,
      safe_to_retry: true
    },
    invalid_payment_method: {
      root_cause: 'invalid_payment_method',
      risk_level: riskLevel,
      recommended_action: 'request_payment_method_update',
      action: 'request_payment_method_update',
      reason: 'The stored payment method is invalid or unusable. Updating the method is the lowest-risk recovery path.',
      strategy: 'request_payment_method_update',
      escalation_required: false,
      safe_to_retry: false
    },
    overdue_invoice: {
      root_cause: 'overdue_invoice',
      risk_level: riskLevel,
      recommended_action: riskLevel === 'critical' ? 'escalate_to_human' : 'send_payment_reminder',
      action: riskLevel === 'critical' ? 'escalate_to_human' : 'send_payment_reminder',
      reason: riskLevel === 'critical'
        ? 'The invoice is highly overdue and high-value, so human review is the safest intervention.'
        : 'The invoice is overdue and a payment reminder is the most appropriate compliance-safe first action.',
      strategy: riskLevel === 'critical' ? 'escalate_to_human' : 'send_payment_reminder',
      escalation_required: riskLevel === 'critical',
      safe_to_retry: false
    },
    price_concern: { root_cause: 'price_concern', risk_level: riskLevel, recommended_action: 'send_checkout_recovery', action: 'send_checkout_recovery', reason: 'The customer may need a reminder that returns them to checkout without changing price or payment details.', strategy: 'send_checkout_recovery', escalation_required: false, safe_to_retry: false },
    payment_friction: { root_cause: 'payment_friction', risk_level: riskLevel, recommended_action: 'send_checkout_recovery', action: 'send_checkout_recovery', reason: 'The checkout likely stalled during payment. A safe recovery reminder can invite the customer to complete checkout.', strategy: 'send_checkout_recovery', escalation_required: false, safe_to_retry: false },
    technical_issue: { root_cause: 'technical_issue', risk_level: riskLevel, recommended_action: 'send_checkout_recovery', action: 'send_checkout_recovery', reason: 'A technical interruption may have stopped checkout. A bounded recovery reminder is safer than attempting a payment.', strategy: 'send_checkout_recovery', escalation_required: false, safe_to_retry: false },
    user_distraction: { root_cause: 'user_distraction', risk_level: riskLevel, recommended_action: 'send_checkout_recovery', action: 'send_checkout_recovery', reason: 'The customer may have been interrupted. A limited reminder can return them to the existing checkout.', strategy: 'send_checkout_recovery', escalation_required: false, safe_to_retry: false },
    unknown_abandonment: { root_cause: 'unknown_abandonment', risk_level: riskLevel, recommended_action: 'send_checkout_recovery', action: 'send_checkout_recovery', reason: 'The abandonment reason is unknown, so the safest automated intervention is a limited checkout recovery reminder.', strategy: 'send_checkout_recovery', escalation_required: false, safe_to_retry: false }
  };

  return strategies[rootCause] || {
    root_cause: rootCause || 'unknown',
    risk_level: riskLevel,
    recommended_action: 'escalate_to_human',
    action: 'escalate_to_human',
    reason: 'The revenue event requires manual review because no safe automated recovery path was identified.',
    strategy: 'escalate_to_human',
    escalation_required: true,
    safe_to_retry: false
  };
}

function deterministicAnalysis(caseData) {
  const rootCause = caseData.case_type === 'overdue_invoice' ? 'overdue_invoice' : caseData.case_type === 'checkout_abandonment' ? caseData.failure_reason || 'unknown_abandonment' : caseData.failure_reason || 'temporary_failure';
  return buildRecoveryStrategy(rootCause, caseData);
}

function normalizeAnalysis(raw, caseData) {
  const candidate = raw && typeof raw === 'object' && !Array.isArray(raw) ? { ...raw } : {};
  const rootCause = normalizeEnum(candidate.root_cause, rootCauseAliases) || (caseData && caseData.failure_reason) || 'temporary_failure';
  const action = normalizeEnum(candidate.recommended_action, recommendedActionAliases) || buildRecoveryStrategy(rootCause, caseData).recommended_action;
  const riskLevel = normalizeEnum(candidate.risk_level, {
    low: 'low',
    medium: 'medium',
    high: 'high',
    critical: 'critical'
  }) || buildRecoveryStrategy(rootCause, caseData).risk_level;

  const safeRecommendation = buildRecoveryStrategy(rootCause, caseData);
  const finalAction = allowedActions.has(action) ? action : safeRecommendation.recommended_action;
  const finalRootCause = rootCauses.has(rootCause) ? rootCause : safeRecommendation.root_cause;
  const finalRiskLevel = riskLevels.has(riskLevel) ? riskLevel : safeRecommendation.risk_level;

  return {
    root_cause: finalRootCause,
    risk_level: finalRiskLevel,
    recommended_action: finalAction,
    reason: typeof candidate.reason === 'string' && candidate.reason.trim() ? candidate.reason.trim() : safeRecommendation.reason,
    strategy: candidate.strategy || finalAction,
    escalation_required: Boolean(candidate.escalation_required) || safeRecommendation.escalation_required,
    safe_to_retry: Boolean(candidate.safe_to_retry) || safeRecommendation.safe_to_retry,
    confidence: typeof candidate.confidence === 'number' ? candidate.confidence : 0.9
  };
}

function validateAnalysis(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('AI response must be a JSON object');
  for (const field of ['root_cause', 'risk_level', 'recommended_action', 'reason']) {
    if (typeof value[field] !== 'string' || !value[field].trim()) throw new Error(`AI response is missing required field: ${field}`);
  }
  if (!rootCauses.has(value.root_cause)) throw new Error('AI response contains an unsupported root cause');
  if (!riskLevels.has(value.risk_level)) throw new Error('AI response contains an unsupported risk level');
  if (!allowedActions.has(value.recommended_action)) throw new Error('AI response contains an unsafe recommended action');
  return {
    root_cause: value.root_cause,
    risk_level: value.risk_level,
    recommended_action: value.recommended_action,
    reason: value.reason.trim(),
    strategy: value.strategy || value.recommended_action,
    escalation_required: Boolean(value.escalation_required),
    safe_to_retry: Boolean(value.safe_to_retry),
    confidence: typeof value.confidence === 'number' ? value.confidence : 0.9
  };
}

async function requestRemoteAnalysis(caseData) {
  const config = resolveGroqConfig();
  if (!config.apiKey || !config.remoteEnabled) {
    throw new Error('Groq API is not configured for remote analysis.');
  }

  try {
    const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Return only a JSON object with these exact enum values. root_cause must be one of: expired_card, insufficient_funds, bank_declined, temporary_failure, invalid_payment_method, overdue_invoice, price_concern, payment_friction, technical_issue, user_distraction, unknown_abandonment. risk_level must be one of: low, medium, high, critical. recommended_action must be one of: retry_payment, retry_payment_later, request_payment_method_update, send_payment_reminder, send_invoice_notification, send_checkout_recovery, escalate_to_human. reason must be a short explanation. confidence must be a number between 0 and 1. Never invent values outside these enums. Do not execute payments or modify amounts.'
          },
          { role: 'user', content: JSON.stringify(caseData) }
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`AI provider returned HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('AI response must be a JSON object');
    return parsed;
  } catch (error) {
    if (error.message.startsWith('AI provider returned HTTP')) {
      throw error;
    }
    if (error.name === 'SyntaxError') {
      throw new Error('AI response was not valid JSON.');
    }
    throw error;
  }
}

async function analyze(caseData) {
  let raw;
  try {
    if (process.env.AI_MOCK_RESPONSE) raw = JSON.parse(process.env.AI_MOCK_RESPONSE);
    else if (resolveGroqConfig().remoteEnabled && resolveGroqConfig().apiKey) raw = await requestRemoteAnalysis(caseData);
    else {
      raw = deterministicAnalysis(caseData);
    }
    const normalized = normalizeAnalysis(raw, caseData);
    return validateAnalysis(normalized);
  } catch (error) {
    const fallback = validateAnalysis(deterministicAnalysis(caseData));
    return fallback;
  }
}

module.exports = { analyze, validateAnalysis, allowedActions, buildRecoveryStrategy, resolveGroqConfig, normalizeAnalysis };