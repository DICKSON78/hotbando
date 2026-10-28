const clickpesa = require('../utils/clickpesa');
const db = require('../config/database');
const logger = require('../utils/logger');
const { fulfillClickPesaPayment } = require('../services/paymentFulfillment');

function getProviderRef(payload) {
  if (!payload) return null;
  return payload.id || payload.paymentId || payload.transactionId || payload.providerReference || payload.reference || payload.orderReference || null;
}

function getOrderRef(payload) {
  if (!payload) return null;
  return payload.orderReference || payload.order_reference || payload.merchantReference || payload.externalReference || payload.reference || null;
}

function getEventType(payload) {
  if (!payload) return 'UNKNOWN';
  return payload.eventType || payload.event || payload.type || payload.status || 'UNKNOWN';
}

function getAmount(payload) {
  if (!payload) return null;
  return payload.amount || payload.collectedAmount || payload.paidAmount || payload.totalAmount || null;
}

function getCurrency(payload) {
  if (!payload) return 'TZS';
  return payload.currency || 'TZS';
}

exports.handleWebhook = async (req, res) => {
  const rawBody = req.rawBody || (Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {})));
  const signature = req.headers['x-clickpesa-signature'] || req.headers['x-signature'] || req.headers['clickpesa-signature'] || req.headers['x-webhook-signature'];

  // Verify signature
  const isValidSig = clickpesa.verifyClickPesaWebhookSignature(rawBody, signature);
  // Also try checksum if configured
  let payload;
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : (Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  if (!isValidSig) {
    // Fallback to checksum verification
    const isValidChecksum = clickpesa.verifyWebhookChecksum(payload, signature);
    if (!isValidChecksum) {
      logger.warn('ClickPesa webhook signature/checksum invalid');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  const eventType = String(getEventType(payload)).toUpperCase();
  const providerRef = getProviderRef(payload) ? String(getProviderRef(payload)) : null;
  const orderRef = getOrderRef(payload) ? String(getOrderRef(payload)) : null;
  const amount = getAmount(payload);
  const currency = getCurrency(payload);

  // Idempotency: store event
  try {
    await db.execute(
      `INSERT INTO payment_events (provider, event_type, provider_ref, order_reference, raw_payload, status)
       VALUES ('clickpesa', ?, ?, ?, ?, 'received')`,
      [eventType, providerRef, orderRef, JSON.stringify(payload)]
    );
  } catch (e) {
    // Duplicate
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(200).json({ status: 'received', duplicate: true });
    }
    logger.error('Failed to store payment event', { error: e.message });
  }

  // Respond quickly
  res.status(200).json({ status: 'received' });

  // Process asynchronously
  setImmediate(async () => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      if (eventType === 'PAYMENT RECEIVED' || eventType === 'SUCCESS' || eventType === 'SETTLED' || eventType === 'COMPLETED') {
        if (!orderRef) {
          await conn.rollback();
          return;
        }
        try {
          await fulfillClickPesaPayment({ orderReference: orderRef, amount, currency, providerRef }, conn);
          await conn.execute('UPDATE payment_events SET status = ?, processed_at = NOW() WHERE provider_ref = ? AND event_type = ?', ['processed', providerRef, eventType]);
        } catch (err) {
          logger.error('Webhook fulfillment failed', { error: err.message, orderRef });
          await conn.execute('UPDATE payment_events SET status = ?, error_message = ?, processed_at = NOW() WHERE provider_ref = ? AND event_type = ?', ['failed', err.message, providerRef, eventType]);
        }
      } else if (eventType === 'PAYMENT FAILED' || eventType === 'FAILED' || eventType === 'CANCELLED') {
        if (orderRef) {
          try {
            await conn.execute('UPDATE clickpesa_transactions SET status = ? WHERE order_reference = ?', ['FAILED', orderRef]);
          } catch (e) {}
        }
        await conn.execute('UPDATE payment_events SET status = ?, processed_at = NOW() WHERE provider_ref = ? AND event_type = ?', ['processed', providerRef, eventType]);
      } else if (eventType === 'PAYOUT INITIATED' || eventType === 'PAYOUT_INITIATED') {
        try {
          await conn.execute(
            `INSERT INTO payments (partner_id, order_reference, type, amount, currency, status, provider, provider_ref, description, metadata)
             VALUES ((SELECT partner_id FROM routers r JOIN clickpesa_transactions ct ON ct.extra_data LIKE CONCAT('%"router_id":', r.id, '%') WHERE ct.order_reference = ? LIMIT 1), ?, 'payout', ?, ?, 'initiated', 'clickpesa', ?, 'Payout initiated', ?)`,
            [orderRef, orderRef, amount || 0, currency, providerRef, JSON.stringify(payload)]
          );
        } catch (e) {
          logger.warn('Failed to record payout initiated', { error: e.message });
        }
        await conn.execute('UPDATE payment_events SET status = ?, processed_at = NOW() WHERE provider_ref = ? AND event_type = ?', ['processed', providerRef, eventType]);
      } else if (eventType === 'PAYOUT REFUNDED' || eventType === 'PAYOUT_REFUNDED') {
        try {
          await conn.execute("UPDATE payments SET status = 'refunded', updated_at = NOW() WHERE provider_ref = ? AND type = 'payout'", [providerRef]);
        } catch (e) {
          logger.warn('Failed to update payout refunded', { error: e.message });
        }
        await conn.execute('UPDATE payment_events SET status = ?, processed_at = NOW() WHERE provider_ref = ? AND event_type = ?', ['processed', providerRef, eventType]);
      } else if (eventType === 'PAYOUT REVERSED' || eventType === 'PAYOUT_REVERSED') {
        try {
          // Check balance - don't go negative silently, just log and flag
          const [rows] = await conn.execute("SELECT id, partner_id, amount FROM payments WHERE provider_ref = ? AND type = 'payout' FOR UPDATE", [providerRef]);
          if (rows.length) {
            await conn.execute("UPDATE payments SET status = 'reversed', metadata = JSON_SET(COALESCE(metadata,'{}'), '$.reversal_flagged', true), updated_at = NOW() WHERE id = ?", [rows[0].id]);
            logger.error('PAYOUT REVERSAL - flagged for HQ review', { providerRef, partnerId: rows[0].partner_id, amount: rows[0].amount });
          }
        } catch (e) {
          logger.error('Failed to process payout reversal', { error: e.message });
        }
        await conn.execute('UPDATE payment_events SET status = ?, processed_at = NOW() WHERE provider_ref = ? AND event_type = ?', ['processed', providerRef, eventType]);
      } else {
        await conn.execute('UPDATE payment_events SET status = ?, processed_at = NOW() WHERE provider_ref = ? AND event_type = ?', ['processed', providerRef, eventType]);
      }

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      logger.error('Webhook processing error', { error: e.message });
    } finally {
      conn.release();
    }
  });
};
