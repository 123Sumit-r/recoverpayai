const recoveryModel = require('../models/recoveryModel');
const { diagnose } = require('../services/diagnosisService');
const { recommend } = require('../services/recommendationService');
const { evaluate } = require('../services/policyService');
const { analyze: analyzeWithAi, validateAnalysis } = require('../services/aiAnalysisService');

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getCases(request, response, next) {
  try { response.json({ success: true, data: await recoveryModel.findAll() }); } catch (error) { next(error); }
}

async function getRevenuePerformance(request, response, next) {
  try {
    response.json({ success: true, data: await recoveryModel.getRevenuePerformance(), baselineRecoveredRevenue: null });
  } catch (error) { next(error); }
}

async function getAuditLedger(request, response, next) {
  try { response.json({ success: true, data: await recoveryModel.getAuditLedger() }); } catch (error) { next(error); }
}

async function getCase(request, response, next) {
  const id = parseId(request.params.caseId);
  if (!id) return response.status(400).json({ success: false, message: 'Invalid recovery case ID' });
  try {
    const recoveryCase = await recoveryModel.findById(id);
    if (!recoveryCase) return response.status(404).json({ success: false, message: 'Recovery case not found' });
    response.json({
      success: true,
      data: recoveryCase,
      audit: await recoveryModel.getAuditLogs(id),
      emails: await recoveryModel.getEmailAuditLogs(id)
    });
  } catch (error) { next(error); }
}

async function createCase(request, response, next) {
  const transactionId = request.body.transaction_id ? parseId(request.body.transaction_id) : null;
  const invoiceId = request.body.invoice_id ? parseId(request.body.invoice_id) : null;
  const checkoutEventId = request.body.checkout_event_id ? parseId(request.body.checkout_event_id) : null;
  if ([transactionId, invoiceId, checkoutEventId].filter(Boolean).length !== 1) return response.status(400).json({ success: false, message: 'Provide exactly one valid transaction_id, invoice_id, or checkout_event_id' });
  try {
    const recoveryCase = await recoveryModel.createFromSource({ transactionId, invoiceId, checkoutEventId });
    if (!recoveryCase) return response.status(404).json({ success: false, message: transactionId ? 'Failed transaction not found' : invoiceId ? 'Overdue invoice not found' : 'Abandoned checkout not found' });
    response.status(201).json({ success: true, data: recoveryCase });
  } catch (error) { next(error); }
}

async function analyzeCase(request, response, next) {
  const id = parseId(request.params.caseId);
  if (!id) return response.status(400).json({ success: false, message: 'Invalid recovery case ID' });
  try {
    const recoveryCase = await recoveryModel.findById(id);
    if (!recoveryCase) return response.status(404).json({ success: false, message: 'Recovery case not found' });
    const diagnosis = diagnose(recoveryCase);
    const recommendation = recommend(recoveryCase, diagnosis);
    const policy = evaluate(recoveryCase, recommendation.recommended_action);
    const analyzedCase = await recoveryModel.saveAnalysis(id, diagnosis, recommendation, policy);
    response.json({ success: true, data: { case: analyzedCase, diagnosis, recommendation, policy } });
  } catch (error) { next(error); }
}

async function aiAnalyzeCase(request, response, next) {
  const id = parseId(request.params.caseId);
  if (!id) return response.status(400).json({ success: false, message: 'Invalid recovery case ID' });
  let recoveryCase;
  try {
    recoveryCase = await recoveryModel.findById(id);
    if (!recoveryCase) return response.status(404).json({ success: false, message: 'Recovery case not found' });
    const analysis = await analyzeWithAi(recoveryCase);
    const policy = evaluate(recoveryCase, analysis.recommended_action);
    const updatedCase = await recoveryModel.saveAiAnalysis(id, analysis, policy);
    response.json({ success: true, data: { case: updatedCase, analysis, policy } });
  } catch (error) {
    if (recoveryCase) {
      try { await recoveryModel.logAudit(id, 'ai_analysis_failed', error.message, { safe: true }); } catch (auditError) { console.error(auditError.message); }
    }
    if (error.message.startsWith('AI response') || error.message.startsWith('AI provider')) return response.status(422).json({ success: false, message: error.message });
    next(error);
  }
}

const { defaultIntegrationService } = require('../services/recoveryIntegrationService');

async function executeCase(request, response, next) {
  const id = parseId(request.params.caseId);
  if (!id) return response.status(400).json({ success: false, message: 'Invalid recovery case ID' });
  try {
    const recoveryCase = await recoveryModel.findById(id);
    if (!recoveryCase) return response.status(404).json({ success: false, message: 'Recovery case not found' });
    const diagnosis = recoveryCase.ai_analysis ? { root_cause: recoveryCase.ai_analysis.root_cause, diagnosis: recoveryCase.diagnosis } : diagnose(recoveryCase);
    const recommendation = recoveryCase.ai_analysis ? { recommended_action: recoveryCase.ai_analysis.recommended_action, reason: recoveryCase.ai_analysis.reason } : recommend(recoveryCase, diagnosis);
    if (request.body?.action === 'stop_recovery') {
      const stoppedCase = await recoveryModel.updateStatus(id, 'closed', 0, 'stop_recovery', 'manually_stopped');
      return response.json({ success: true, data: { case_id: id, action: 'stop_recovery', status: 'closed', mode: 'manual', simulated: false, recovery_case: stoppedCase } });
    }
    if (request.body?.action) recommendation.recommended_action = request.body.action;
    if (recoveryCase.ai_analysis) validateAnalysis(recoveryCase.ai_analysis);
    const policy = evaluate(recoveryCase, recommendation.recommended_action);

    // Route through Recovery Integration Layer
    const result = await defaultIntegrationService.executeRecoveryAction({
      action: recommendation.recommended_action,
      recoveryCase,
      policy,
      mode: request.body?.mode
    });

    const updatedCase = await recoveryModel.execute(recoveryCase, policy, result);
    response.status(policy.allowed ? 200 : 409).json({
      success: policy.allowed,
      data: {
        case_id: id,
        action: recommendation.recommended_action,
        status: result.status,
        mode: result.mode || 'simulated',
        simulated: result.simulated !== false,
        provider: result.provider,
        policy,
        result,
        recovery_case: updatedCase
      }
    });
  } catch (error) { next(error); }
}

async function getRecoverySummary(request, response, next) {
  try {
    const summary = await recoveryModel.getSummary();
    const modeConfig = defaultIntegrationService.resolveRecoveryMode();
    response.json({
      success: true,
      data: {
        ...summary,
        recovery_mode: modeConfig.mode,
        real_actions_enabled: modeConfig.realActionsEnabled,
        guarded: modeConfig.guarded
      }
    });
  } catch (error) { next(error); }
}

module.exports = { getCases, getCase, createCase, analyzeCase, aiAnalyzeCase, executeCase, getRecoverySummary };
module.exports = { getCases, getCase, createCase, analyzeCase, aiAnalyzeCase, executeCase, getRecoverySummary, getRevenuePerformance, getAuditLedger };

