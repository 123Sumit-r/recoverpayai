const riskModel = require('../models/riskModel');

async function getRiskSummary(request, response, next) {
  try {
    response.json({ success: true, data: await riskModel.getSummary() });
  } catch (error) {
    next(error);
  }
}

module.exports = { getRiskSummary };
