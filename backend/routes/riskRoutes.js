const express = require('express');
const { getRiskSummary } = require('../controllers/riskController');

const router = express.Router();
router.get('/summary', getRiskSummary);

module.exports = router;
