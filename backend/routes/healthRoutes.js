const express = require('express');

const router = express.Router();

router.get('/health', (request, response) => {
  response.json({
    success: true,
    message: 'RecoverPay AI backend is running'
  });
});

module.exports = router;
