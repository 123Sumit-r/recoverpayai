const express = require('express');
const { getFailedTransactions, getTransaction, getTransactions, createTransaction } = require('../controllers/transactionController');

const router = express.Router();

router.get('/', getTransactions);
router.post('/', createTransaction);
router.get('/failed', getFailedTransactions);
router.get('/:id', getTransaction);

module.exports = router;
