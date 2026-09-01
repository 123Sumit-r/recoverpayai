const express = require('express');
const { getInvoice, getInvoices, getOverdueInvoices, createInvoice } = require('../controllers/invoiceController');

const router = express.Router();

router.get('/', getInvoices);
router.get('/overdue', getOverdueInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoice);

module.exports = router;
