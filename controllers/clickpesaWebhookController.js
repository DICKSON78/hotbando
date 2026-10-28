const clickpesa = require('../utils/clickpesa');
const db = require('../config/database');
const logger = require('../utils/logger');
const { fulfillClickPesaPayment } = require('../services/paymentFulfillment');

function eventData(payload) {
  return payload?.data && typeof payload.data === 'object' ? payload.data : (payload || {});
}

function getProviderRef(payload) {
  const data = eventData(payload);
  return data.paymentReference || data.providerRef || data.providerReference || data.transactionId || data.id
    || payload?.paymentReference || payload?.providerRef || payload?.providerReference || payload?.id || null;
}

function getOrderRef(payload) {
  const data = eventData(payload);
  return data.orderReference || data.order_reference || data.merchantReference || data.externalReference
    || payload?.orderReference || payload?.order_reference || payload?.merchantReference || null;
}

function getEventType(payload) {
  return String(payload?.eventType || payload?.event || payload?.type || eventData(payload).eventType || '').toUpperCase();
}

function getAmount(payload) {
  const data = eventData(payload);
  return data.collectedAmount ?? data.paidAmount ?? data.totalAmount ?? data.amount
    ?? payload?.collectedAmount ?? payload?.paidAmount ?? payload?.amount ?? null;
}

function getCurrency(payload) {
  const data = eventData(payload);
  return data.collectedCurrency || data.currency || payload?.collectedCurrency || payload?.currency || 'TZS';
}

function unwrapProviderResult(result) {
  const value = Array.isArray(result) ? result[0] : result;
  return value?.data && typeof value.data === 'object' ? value.data : (value || {});
}

function eventMatchesStatus(eventType, status) {
  const normalized = String(status || '').toUpperCase();
  if (eventType === 'PAYMENT RECEIVED') return ['SUCCESS', 'SETTLED'].includes(normalized);
  if (eventType === 'PAYMENT FAILED') return ['FAILED', 'CANCELLED', 'CANCELED'].includes(normalized);
  if (eventType === 'PAYOUT INITIATED') return ['AUTHORIZED', 'PROCESSING', 'PENDING', 'SUCCESS', 'SETTLED'].includes(normalized);
  if (eventType === 'PAYOUT REFUNDED') return normalized === 'REFUNDED';
  if (eventType === 'PAYOUT REVERSED') return normalized === 'REVERSED';
  return false;
}

async function verifyWebhook(payload, rawBody, signature, eventType, orderRef) {
  const data = eventData(payload);
  const hasHmacSecret = !!process.env.CLICKPESA_WEBHOOK_SECRET;
  const hasChecksumKey = !!process.env.CLICKPESA_CHECKSUM_KEY;
  const hmacValid = clickpesa.verifyClickPesaWebhookSignature(rawBody, signature);
  const checksum = payload?.checksum || data.checksum || signature;
  const checksumValid = clickpesa.verifyWebhookChecksum(payload, checksum);

  if (hmacValid || checksumValid) return data;
  if (hasHmacSecret || hasChecksumKey) {
    throw Object.assign(new Error('Invalid ClickPesa webhook signature/checksum'), { statusCode: 401 });
  }

  // If checksum verification is not configured, treat the webhook only as a
  // trigger and verify its order directly against ClickPesa before accepting it.
  if (!orderRef) throw Object.assign(new Error('Webhook order reference is missing'), { statusCode: 400 });
  let result;
  if (eventType.startsWith('PAYMENT ')) result = await clickpesa.queryPaymentStatus(orderRef);
  else result = await clickpesa.queryPayoutStatus(orderRef);
  const providerData = unwrapProviderResult(result);
  const providerStatus = providerData.status || providerData.paymentStatus;
  if (!eventMatchesStatus(eventType, providerStatus)) {
    throw Object.assign(new Error('ClickPesa status does not match the webhook event'), { statusCode: 401 });
  }
  if (eventType === 'PAYMENT RECEIVED' && getAmount(providerData) == null) {
    throw Object.assign(new Error('ClickPesa status response did not include the settled amount'), { statusCode: 503 });
  }
  return providerData;
}

async function markEvent(eventId, status, errorMessage = null) {
  await db.execute(
    'UPDATE payment_events SET status = ?, error_message = ?, processed_at = NOW() WHERE id = ?',
    [status, errorMessage ? String(errorMessage).slice(0, 1000) : null, eventId]
  );
}

async function notifyPaymentFailure(conn, orderRef, reason) {
  const [orders] = await conn.execute(
    'SELECT user_id FROM clickpesa_transactions WHERE order_reference = ? FOR UPDATE',
    [orderRef]
  );
  await conn.execute('UPDATE clickpesa_transactions SET status = ? WHERE order_reference = ?', ['FAILED', orderRef]);
  if (orders[0]?.user_id) {
    await conn.execute(
      `INSERT INTO notifications (user_id, notification_type, title, message, action_url, action_text, created_at)
       VALUES (?, 'error', 'Malipo hayajakamilika', ?, '/hotspot/subscribe', 'Jaribu tena', NOW())`,
      [orders[0].user_id, reason ? `ClickPesa haijakamilisha malipo: ${String(reason).slice(0, 300)}` : 'ClickPesa haijakamilisha malipo. Tafadhali jaribu tena.']
    );
  }
}

async function processEvent({ eventId, eventType, orderRef, providerRef, payload, verifiedData }) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    if (eventType === 'PAYMENT RECEIVED') {
      if (!orderRef) throw new Error('Payment webhook has no order reference');
      // `verifiedData` is either the signature-verified webhook body or the
      // authoritative ClickPesa status response. Never fulfill from an
      // unverified callback amount.
      const amount = getAmount(verifiedData);
      const currency = getCurrency(verifiedData);
      await fulfillClickPesaPayment({ orderReference: orderRef, amount, currency, providerRef }, conn);
    } else if (eventType === 'PAYMENT FAILED') {
      const details = eventData(payload);
      await notifyPaymentFailure(conn, orderRef, details.message || details.failureReason);
    }
    // Payout events are preserved verbatim in payment_events. This app does
    // not initiate ClickPesa payouts, so webhook events must not fabricate a
    // row in the legacy customer-payments table.
    await conn.execute(
      'UPDATE payment_events SET status = ?, error_message = NULL, processed_at = NOW() WHERE id = ?',
      ['processed', eventId]
    );
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    logger.error('ClickPesa webhook processing failed', { eventId, eventType, orderRef, error: error.message });
    await markEvent(eventId, 'failed', error.message);
    throw error;
  } finally {
    conn.release();
  }
}

exports.handleWebhook = async (req, res) => {
  const rawBody = req.rawBody || (Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {})));
  const signature = req.headers['x-clickpesa-signature'] || req.headers['x-signature']
    || req.headers['clickpesa-signature'] || req.headers['x-webhook-signature'] || req.headers['x-checksum'];
  let payload;
  try {
    payload = typeof req.body === 'string'
      ? JSON.parse(req.body)
      : Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
  } catch (error) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const eventType = getEventType(payload);
  const orderRef = getOrderRef(payload) ? String(getOrderRef(payload)) : null;
  const providerRef = getProviderRef(payload) ? String(getProviderRef(payload)) : null;
  const supportedEvents = new Set(['PAYMENT RECEIVED', 'PAYMENT FAILED', 'PAYOUT INITIATED', 'PAYOUT REFUNDED', 'PAYOUT REVERSED']);
  if (!supportedEvents.has(eventType)) return res.status(400).json({ error: 'Unsupported ClickPesa event' });

  let verifiedData;
  try {
    verifiedData = await verifyWebhook(payload, rawBody, signature, eventType, orderRef);
  } catch (error) {
    const status = error.statusCode || (error.response?.status === 429 ? 503 : 401);
    logger.warn('ClickPesa webhook verification failed', { eventType, orderRef, status, error: error.message });
    return res.status(status).json({ error: status === 503 ? 'Verification temporarily unavailable' : 'Invalid ClickPesa webhook' });
  }

  let eventId;
  try {
    const [insert] = await db.execute(
      `INSERT INTO payment_events (provider, event_type, provider_ref, order_reference, raw_payload, status)
       VALUES ('clickpesa', ?, ?, ?, ?, 'received')`,
      [eventType, providerRef, orderRef, JSON.stringify(payload)]
    );
    eventId = insert.insertId;
  } catch (error) {
    if (error.code !== 'ER_DUP_ENTRY') {
      logger.error('Failed to store ClickPesa webhook event', { eventType, orderRef, error: error.message });
      return res.status(503).json({ error: 'Could not store webhook event' });
    }
    const [existing] = await db.execute(
      'SELECT id, status FROM payment_events WHERE provider = ? AND provider_ref = ? AND event_type = ? LIMIT 1',
      ['clickpesa', providerRef, eventType]
    );
    if (!existing.length) return res.status(503).json({ error: 'Could not locate duplicate webhook event' });
    if (existing[0].status === 'processed') return res.status(200).json({ status: 'received', duplicate: true });
    eventId = existing[0].id;
  }

  try {
    await processEvent({ eventId, eventType, orderRef, providerRef, payload, verifiedData });
    return res.status(200).json({ status: 'received' });
  } catch (error) {
    // Return a retryable response so ClickPesa can redeliver if fulfillment or
    // audit persistence fails. Duplicate events resume from their saved row.
    logger.error('ClickPesa webhook processing deferred for provider retry', { eventId, eventType, orderRef, error: error.message });
    return res.status(503).json({ error: 'Webhook processing failed; retry later' });
  }
};
