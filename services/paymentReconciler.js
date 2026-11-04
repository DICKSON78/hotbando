// Activates paid ClickPesa orders automatically, even when the webhook never
// arrives or the customer closes the page. Each tick checks a few unprocessed
// orders from the last day against ClickPesa and fulfils the ones that are paid.
const db = require('../config/database');
const clickpesa = require('../utils/clickpesa');
const logger = require('../utils/logger');
const { processAndActivate } = require('../controllers/clickpesaController');

const PAID_STATUSES = ['SUCCESS', 'SETTLED', 'COMPLETED'];
const BATCH_SIZE = 5;

async function reconcilePayments() {
  const [rows] = await db.execute(
    `SELECT order_reference FROM clickpesa_transactions
     WHERE processed = 0
       AND purpose IN ('package_purchase', 'wallet_topup', 'reseller_topup', 'sponsor_deposit')
       AND status NOT IN ('FAILED', 'CANCELLED', 'CANCELED', 'EXPIRED', 'REFUNDED')
       AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
     ORDER BY updated_at ASC
     LIMIT ${BATCH_SIZE}`
  );
  let activated = 0;
  for (const row of rows) {
    try {
      const result = await clickpesa.queryPaymentStatus(row.order_reference);
      const data = Array.isArray(result) ? result[0] : result;
      const status = String(data?.status || '').toUpperCase();
      if (!status) continue;
      await db.execute(
        'UPDATE clickpesa_transactions SET status = ?, clickpesa_response = ? WHERE order_reference = ?',
        [status, JSON.stringify(result), row.order_reference]
      );
      if (PAID_STATUSES.includes(status)) {
        await processAndActivate(row.order_reference);
        activated += 1;
        logger.info('Payment activated by reconciler', { orderReference: row.order_reference, status });
      }
    } catch (err) {
      logger.warn('Payment reconciliation failed for one order', { orderReference: row.order_reference, error: err.message });
    }
  }
  return activated;
}

module.exports = { reconcilePayments };
