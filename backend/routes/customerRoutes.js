const express = require('express');
const { getCustomer, getCustomers, createCustomer } = require('../controllers/customerController');

const router = express.Router();

router.get('/', getCustomers);
router.post('/', createCustomer);
router.get('/:id', getCustomer);

module.exports = router;
