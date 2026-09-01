const transactionModel = require('../models/transactionModel');
const customerModel = require('../models/customerModel');

const allowedFailureReasons = new Set([
  'expired_card',
  'insufficient_funds',
  'bank_declined',
  'temporary_failure',
  'invalid_payment_method'
]);

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getTransactions(request, response, next) {
  try {
    response.json({ success: true, data: await transactionModel.findAll() });
  } catch (error) {
    next(error);
  }
}

async function getFailedTransactions(request, response, next) {
  try {
    response.json({ success: true, data: await transactionModel.findFailed() });
  } catch (error) {
    next(error);
  }
}

async function getTransaction(request, response, next) {
  const id = parseId(request.params.id);
  if (!id) return response.status(400).json({ success: false, message: 'Invalid transaction ID' });

  try {
    const transaction = await transactionModel.findById(id);
    if (!transaction) return response.status(404).json({ success: false, message: 'Transaction not found' });
    response.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
}

async function createTransaction(request, response, next) {
  let customerId = parseId(request.body.customer_id);
  const amount = Number(request.body.amount);
  const status = request.body.status || 'failed';
  const failureReason = request.body.failure_reason || (status === 'failed' ? 'insufficient_funds' : null);
  const transactionType = request.body.transaction_type || 'subscription';

  // Support creating customer on-the-fly if customer_name & customer_email provided
  if (!customerId && request.body.customer_email && request.body.customer_name) {
    const cust = await customerModel.create({
      name: request.body.customer_name.trim(),
      email: request.body.customer_email.trim().toLowerCase(),
      phone: request.body.customer_phone || '9999999999'
    });
    customerId = cust.id;
  }

  if (!customerId || !Number.isFinite(amount) || amount <= 0) {
    return response.status(400).json({ success: false, message: 'Provide a valid customer (ID or name/email) and positive amount' });
  }

  if (status === 'failed' && !allowedFailureReasons.has(failureReason)) {
    return response.status(400).json({ success: false, message: 'Unsupported payment failure reason' });
  }

  try {
    const transaction = await transactionModel.create({
      customerId,
      amount,
      status,
      failureReason,
      transactionType
    });
    response.status(201).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
}

module.exports = { getTransactions, getFailedTransactions, getTransaction, createTransaction };
