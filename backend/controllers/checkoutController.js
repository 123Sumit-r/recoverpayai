const checkoutModel = require('../models/checkoutModel');
const customerModel = require('../models/customerModel');
const allowedAbandonmentReasons = new Set(['price_concern', 'payment_friction', 'technical_issue', 'user_distraction', 'unknown_abandonment']);

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getCheckouts(request, response, next) {
  try { response.json({ success: true, data: await checkoutModel.findAll() }); } catch (error) { next(error); }
}

async function getAbandonedCheckouts(request, response, next) {
  try { response.json({ success: true, data: await checkoutModel.findAbandoned() }); } catch (error) { next(error); }
}

async function startCheckout(request, response, next) {
  let customerId = parseId(request.body.customer_id);
  const amount = Number(request.body.amount);
  const sessionId = typeof request.body.session_id === 'string' ? request.body.session_id.trim() : `sess_${Date.now()}`;
  const status = request.body.status;
  const abandonmentReason = request.body.abandonment_reason;

  if (!customerId && request.body.customer_email && request.body.customer_name) {
    const cust = await customerModel.create({
      name: request.body.customer_name.trim(),
      email: request.body.customer_email.trim().toLowerCase(),
      phone: request.body.customer_phone || '9999999999',
      customer_type: 'individual'
    });
    customerId = cust.id;
  }

  if (!customerId || !sessionId || !Number.isFinite(amount) || amount <= 0) {
    return response.status(400).json({ success: false, message: 'Provide a valid customer, session_id, and positive amount' });
  }

  try {
    let event = await checkoutModel.start({ customerId, sessionId, amount });
    if (status === 'abandoned') {
      event = await checkoutModel.abandon(event.id, abandonmentReason || 'unknown_abandonment');
    }
    response.status(201).json({ success: true, data: event });
  } catch (error) { next(error); }
}

async function updateCheckout(request, response, next) {
  const id = parseId(request.params.id);
  if (!id) return response.status(400).json({ success: false, message: 'Invalid checkout ID' });
  if (request.body.status === 'abandoned' && request.body.abandonment_reason && !allowedAbandonmentReasons.has(request.body.abandonment_reason)) return response.status(400).json({ success: false, message: 'Unsupported checkout abandonment reason' });
  try {
    const event = request.body.status === 'completed' ? await checkoutModel.complete(id) : request.body.status === 'abandoned' ? await checkoutModel.abandon(id, request.body.abandonment_reason) : null;
    if (!event) return response.status(404).json({ success: false, message: 'Started checkout not found' });
    response.json({ success: true, data: event });
  } catch (error) { next(error); }
}

async function getCheckout(request, response, next) {
  const id = parseId(request.params.id);
  if (!id) return response.status(400).json({ success: false, message: 'Invalid checkout ID' });
  try {
    const event = await checkoutModel.findById(id);
    if (!event) return response.status(404).json({ success: false, message: 'Checkout not found' });
    response.json({ success: true, data: event });
  } catch (error) { next(error); }
}

module.exports = { getCheckouts, getAbandonedCheckouts, startCheckout, updateCheckout, getCheckout, allowedAbandonmentReasons };