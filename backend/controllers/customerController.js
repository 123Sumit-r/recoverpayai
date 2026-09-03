const customerModel = require('../models/customerModel');

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getCustomers(request, response, next) {
  try {
    response.json({ success: true, data: await customerModel.findAll() });
  } catch (error) {
    next(error);
  }
}

async function getCustomer(request, response, next) {
  const id = parseId(request.params.id);
  if (!id) return response.status(400).json({ success: false, message: 'Invalid customer ID' });

  try {
    const customer = await customerModel.findById(id);
    if (!customer) return response.status(404).json({ success: false, message: 'Customer not found' });
    response.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
}

async function createCustomer(request, response, next) {
  const { name, email, phone, customer_type } = request.body || {};
  if (!name || !email || !email.includes('@') || !phone || !phone.trim()) {
    return response.status(400).json({ success: false, message: 'Valid customer name, email, and phone are required.' });
  }

  try {
    const customer = await customerModel.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      customer_type: customer_type || 'individual'
    });
    response.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
}

module.exports = { getCustomers, getCustomer, createCustomer };
