// Activates paid ClickPesa orders automatically, even when the webhook never
// arrives or the customer closes the page. ClickPesa limits pre-KYC accounts to
// 100 API calls per day, so this runs sparsely with a daily budget.
const db = require('../config/database');
const clickpesa = require('../utils/clickpesa');
const logger = require('../utils/logger');
const { processAndActivate } = require('../controllers/clickpesaController');

const PAID_STATUSES = ['SUCCESS', 'SETTLED', 'COMPLETED'];
const RUN_EVERY_MS = 10 * 60 * 1000;
const ORDERS_PER_RUN = 2;
const MAX_CHECKS_PER_ORDER = 4;
const DAILY_STATUS_BUDGET = 20;

let lastRunAt = 0;
const checksByOrder = new Map();
let budgetDay = '';
let budgetUsed = 0;

function takeBudget() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== budgetDay) { budgetDay = today; budgetUsed = 0; }
  if (budgetUsed >= DAILY_STATUS_BUDGET) return false;
  budgetUsed += 1;
  return true;
}

async function reconcilePayments() {
  if (Date.now() - lastRunAt < RUN_EVERY_MS) return 0;
  lastRunAt = Date.now();

  const [rows] = await db.execute(
    `SELECT order_reference FROM clickpesa_transactions
     WHERE processed = 0
       AND purpose IN ('package_purchase', 'wallet_topup', 'reseller_topup', 'sponsor_deposit')
       AND status NOT IN ('FAILED', 'CANCELLED', 'CANCELED', 'EXPIRED', 'REFUNDED')
       AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
     ORDER BY updated_at ASC
     LIMIT ${ORDERS_PER_RUN}`
  );

  let activated = 0;
  for (const row of rows) {
    const orderReference = row.order_reference;
    const checks = checksByOrder.get(orderReference) || 0;
    if (checks >= MAX_CHECKS_PER_ORDER || !takeBudget()) continue;
    checksByOrder.set(orderReference, checks + 1);
    try {
      const result = await clickpesa.queryPaymentStatus(orderReference);
      const data = Array.isArray(result) ? result[0] : result;
      const status = String(data?.status || '').toUpperCase();
      if (!status) continue;
      await db.execute(
        'UPDATE clickpesa_transactions SET status = ?, clickpesa_response = ? WHERE order_reference = ?',
        [status, JSON.stringify(result), orderReference]
      );
      if (PAID_STATUSES.includes(status)) {
        await processAndActivate(orderReference);
        activated += 1;
        logger.info('Payment activated by reconciler', { orderReference, status });
      }
    } catch (err) {
      logger.warn('Payment check failed', { orderReference, error: err.message });
      if (/429/.test(err.message)) break;
    }
  }
  return activated;
}

module.exports = { reconcilePayments };
