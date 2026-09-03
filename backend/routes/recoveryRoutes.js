const express = require('express');
const { getCases, getCase, createCase, analyzeCase, aiAnalyzeCase, executeCase, getRecoverySummary, getRevenuePerformance, getAuditLedger } = require('../controllers/recoveryController');

const router = express.Router();
router.get('/summary', getRecoverySummary);
router.get('/revenue-performance', getRevenuePerformance);
router.get('/audit-ledger', getAuditLedger);
router.get('/cases', getCases);
router.post('/cases', createCase);
router.post('/:caseId/ai-analyze', aiAnalyzeCase);
router.get('/:caseId', getCase);
router.post('/:caseId/analyze', analyzeCase);
router.post('/:caseId/execute', executeCase);

module.exports = router;
