const express = require('express');
const { getCheckouts, getAbandonedCheckouts, startCheckout, updateCheckout, getCheckout } = require('../controllers/checkoutController');

const router = express.Router();
router.get('/', getCheckouts);
router.get('/abandoned', getAbandonedCheckouts);
router.post('/', startCheckout);
router.get('/:id', getCheckout);
router.patch('/:id', updateCheckout);

module.exports = router;