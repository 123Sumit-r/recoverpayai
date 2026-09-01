const invoiceModel = require('../models/invoiceModel');
const customerModel = require('../models/customerModel');

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getInvoices(request, response, next) {
  try {
    response.json({ success: true, data: await invoiceModel.findAll() });
  } catch (error) {
    next(error);
  }
}

async function getOverdueInvoices(request, response, next) {
  try {
    response.json({ success: true, data: await invoiceModel.findOverdue() });
  } catch (error) {
    next(error);
  }
}

async function getInvoice(request, response, next) {
  const id = parseId(request.params.id);
  if (!id) return response.status(400).json({ success: false, message: 'Invalid invoice ID' });

  try {
    const invoice = await invoiceModel.findById(id);
    if (!invoice) return response.status(404).json({ success: false, message: 'Invoice not found' });
    response.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
}

async function createInvoice(request, response, next) {
  let customerId = parseId(request.body.customer_id);
  const amount = Number(request.body.amount);
  const dueDate = typeof request.body.due_date === 'string' ? request.body.due_date.trim() : '';
  const issueDate = typeof request.body.issue_date === 'string' ? request.body.issue_date.trim() : null;
  const status = request.body.status || 'overdue';

  if (!customerId && request.body.customer_email && request.body.customer_name) {
    const cust = await customerModel.create({
      name: request.body.customer_name.trim(),
      email: request.body.customer_email.trim().toLowerCase(),
      phone: request.body.customer_phone || '9999999999',
      customer_type: 'business'
    });
    customerId = cust.id;
  }

  if (!customerId || !Number.isFinite(amount) || amount <= 0 || !dueDate) {
    return response.status(400).json({ success: false, message: 'Provide a valid customer, positive amount, and due_date (YYYY-MM-DD)' });
  }

  try {
    const invoice = await invoiceModel.create({ customerId, amount, dueDate, issueDate, status });
    response.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
}

module.exports = { getInvoices, getOverdueInvoices, getInvoice, createInvoice };
