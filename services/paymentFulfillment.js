const db = require('../config/database');
const logger = require('../utils/logger');
const crypto = require('crypto');
const { extendUserPackage } = require('../utils/packageEntitlement');
const { recordRouterSplit } = require('./routerSplit');

function generateVoucherCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const group = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `HB-${group()}-${group()}-${group()}`;
}

async function activatePackage(userId, packageId, amount, extraData = {}, conn = null) {
  const executor = conn || db;
  const [packages] = await executor.execute('SELECT * FROM packages WHERE id = ?', [packageId]);
  if (!packages.length) return;
  const pkg = packages[0];
  const [users] = await executor.execute('SELECT id FROM users WHERE id = ?', [userId]);
  if (!users.length) return;
  await extendUserPackage(executor, userId, pkg);

  await executor.execute(
    'UPDATE users SET moneyspent = moneyspent + ?, updated_at = NOW() WHERE id = ?',
    [amount, userId]
  );
  await executor.execute(
    'INSERT INTO payments (user_id, package_id, amount, payment_method, status, activated, created_at) VALUES (?, ?, ?, "clickpesa", "completed", 1, NOW())',
    [userId, packageId, amount]
  );

  // Device provisioning is intentionally NOT awaited here. This function runs
  // inside the payment transaction, and the router API can take 10+ seconds to
  // time out when the router is unreachable, which would hold database locks
  // and delay payment confirmation. The portal calls /api/hotspot/connect
  // after the payment is confirmed, and RADIUS MAC authentication also picks
  // up the new entitlement on the next Wi-Fi reconnect.
}

async function creditWallet(userId, amount, orderReference, description, executor) {
  // A wallet is created on first deposit; locking the row serializes concurrent credits.
  await executor.execute(
    'INSERT INTO wallets (user_id, balance, total_deposited) VALUES (?, 0, 0) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)',
    [userId]
  );
  const [walletRows] = await executor.execute('SELECT id, balance FROM wallets WHERE user_id = ? FOR UPDATE', [userId]);
  if (!walletRows.length) throw new Error(`Wallet could not be created for user ${userId}`);
  const wallet = walletRows[0];
  const before = Number(wallet.balance || 0);
  const credit = Number(amount);
  const after = before + credit;
  await executor.execute(
    'UPDATE wallets SET balance = ?, total_deposited = total_deposited + ?, updated_at = NOW() WHERE id = ?',
    [after, credit, wallet.id]
  );
  await executor.execute(
    `INSERT INTO transactions (wallet_id, user_id, transaction_type, amount, balance_before, balance_after, currency, reference_type, description, status, processed_at, payment_method, payment_reference, created_at)
     VALUES (?, ?, 'deposit', ?, ?, ?, 'TZS', 'payment', ?, 'completed', NOW(), 'system', ?, NOW())`,
    [wallet.id, userId, credit, before, after, description, orderReference]
  );
}

async function fulfillClickPesaPayment({ orderReference, amount, currency, providerRef }, conn) {
  const executor = conn || db;
  // Find transaction
  const [txRows] = await executor.execute('SELECT * FROM clickpesa_transactions WHERE order_reference = ? FOR UPDATE', [orderReference]);
  if (!txRows.length) {
    throw new Error('Order not found');
  }
  const tx = txRows[0];
  if (tx.processed) {
    return { alreadyProcessed: true };
  }

  const purpose = tx.purpose;
  const userId = tx.user_id;
  const extra = tx.extra_data ? (typeof tx.extra_data === 'string' ? JSON.parse(tx.extra_data) : tx.extra_data) : {};

  // The package/wallet value stays at the order amount. ClickPesa adds the
  // disclosed mobile-money fee to the payer's total, so accept either amount.
  const orderAmount = Number(tx.amount);
  const paidAmount = amount !== undefined && amount !== null ? Number(amount) : orderAmount;
  const payerTotal = Number(extra.customer_total || orderAmount);
  const orderCurrency = tx.currency || 'TZS';
  const paidCurrency = currency || orderCurrency;
  if (![orderAmount, payerTotal].some(expected => Math.abs(paidAmount - expected) <= 0.01)) {
    throw new Error('Amount mismatch');
  }
  if (paidCurrency !== orderCurrency) {
    throw new Error('Currency mismatch');
  }

  let result = {};

  if (purpose === 'wallet_topup' && userId) {
    await creditWallet(userId, tx.amount, orderReference, 'Wallet top-up via ClickPesa', executor);
    result = { message: 'Salio limeongezwa!' };
  } else if (purpose === 'package_purchase' && userId) {
    const packageId = extra.package_id;
    const isGift = extra.gift;
    if (isGift) {
      const voucherCode = generateVoucherCode();
      const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);
      await executor.execute(
        `INSERT INTO vouchers
           (voucher_code, package_id, price, is_used, expires_at, recipient_phone, purchased_by_phone, payment_order_reference, created_at)
         VALUES (?, ?, ?, 0, ?, ?, ?, ?, NOW())`,
        [voucherCode, packageId, tx.amount, expiresAt, extra.recipient_phone || null, tx.phone || null, orderReference]
      );
      extra.voucher_code = voucherCode;
      await executor.execute('UPDATE clickpesa_transactions SET extra_data = ? WHERE order_reference = ?',
        [JSON.stringify(extra), orderReference]);
      result = { voucher: voucherCode, message: 'Voucher imegeneratiwa!' };
    } else if (packageId) {
      await activatePackage(userId, packageId, tx.amount, extra, executor);
      result = { activated: true, message: 'Kifurushi chako kimewashwa. Unganisha tena au refresh Wi-Fi ili kuanza kutumia.' };
    }
  } else if (purpose === 'package_purchase' && extra.gift && !userId) {
    const packageId = extra.package_id;
    if (!packageId) throw new Error('Voucher purchase has no package');
    const voucherCode = generateVoucherCode();
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    await executor.execute(
      `INSERT INTO vouchers
         (voucher_code, package_id, price, is_used, expires_at, recipient_phone, purchased_by_phone, payment_order_reference, created_at)
       VALUES (?, ?, ?, 0, ?, ?, ?, ?, NOW())`,
      [voucherCode, packageId, tx.amount, expiresAt, extra.recipient_phone || null, tx.phone || null, orderReference]
    );
    extra.voucher_code = voucherCode;
    await executor.execute('UPDATE clickpesa_transactions SET extra_data = ? WHERE order_reference = ?',
      [JSON.stringify(extra), orderReference]);
    result = { voucher: voucherCode, message: 'Voucher imegeneratiwa!' };
  } else if (purpose === 'reseller_topup' && userId) {
    await creditWallet(userId, tx.amount, orderReference, 'Reseller wallet top-up via ClickPesa', executor);
    result = { message: 'Salio la wallet limeongezwa!' };
  } else if (purpose === 'sponsor_deposit' && userId) {
    await creditWallet(userId, tx.amount, orderReference, 'Sponsor deposit via ClickPesa', executor);
    result = { message: 'Fedha zimeongezwa kwenye wallet!' };
  }

  // Update transaction
  await executor.execute('UPDATE clickpesa_transactions SET status = ?, processed = 1, clickpesa_id = COALESCE(?, clickpesa_id) WHERE order_reference = ?',
    ['SUCCESS', providerRef || null, orderReference]);

  if (userId) {
    const isGift = purpose === 'package_purchase' && !!extra.gift;
    const title = isGift ? 'Vocha yako iko tayari' : 'Malipo yamefanikiwa';
    const details = result.voucher
      ? `Malipo ya TSh ${orderAmount.toLocaleString()} yamepokelewa. Vocha yako: ${result.voucher}`
      : purpose === 'package_purchase'
        ? `Malipo ya TSh ${orderAmount.toLocaleString()} yamepokelewa na kifurushi kimewashwa.`
        : `Malipo ya TSh ${orderAmount.toLocaleString()} yamepokelewa na fedha zimeongezwa kwenye wallet yako.`;
    await executor.execute(
      `INSERT INTO notifications (user_id, notification_type, title, message, action_url, action_text, created_at)
       VALUES (?, 'success', ?, ?, ?, ?, NOW())`,
      [userId, title, details, isGift ? '/hotspot/subscribe' : '/hotspot/dashboard', isGift ? 'Tazama vocha' : 'Fungua dashboard']
    );
  }

  // Router/reseller revenue split. Never blocks the customer's payment.
  try {
    const split = await recordRouterSplit(executor, conn, {
      orderReference, purpose, routerId: extra.router_id, amount: tx.amount, currency: orderCurrency, customerId: userId
    });
    if (split && split.recorded) {
      logger.info('Router split recorded', { orderReference, router: extra.router_id, hq: split.hq, reseller: split.reseller });
    }
  } catch (e) {
    if (e && e.code === 'ER_LOCK_DEADLOCK') throw e;
    logger.error('Router split failed (payment still fulfilled)', { orderReference, error: e.message });
  }

  // Record in payments ledger
  try {
    let businessId = null;
    let partnerId = null;
    if (userId && extra.router_id) {
      const [routers] = await executor.execute('SELECT business_id, partner_id FROM routers WHERE id = ?', [extra.router_id]);
      if (routers.length) {
        businessId = routers[0].business_id;
        partnerId = routers[0].partner_id;
      }
    }
    await executor.execute(
      `INSERT INTO payments (business_id, partner_id, customer_id, order_reference, clickpesa_transaction_id, type, amount, currency, status, provider, provider_ref, description, metadata)
       VALUES (?, ?, ?, ?, ?, 'payment', ?, ?, 'completed', 'clickpesa', ?, ?, ?)`,
      [businessId, partnerId, userId, orderReference, tx.id, tx.amount, orderCurrency, providerRef || null, purpose, JSON.stringify({ extra })]
    );
  } catch (e) {
    logger.warn('Failed to insert into payments ledger', { error: e.message });
  }

  return result;
}

module.exports = {
  activatePackage,
  fulfillClickPesaPayment
};
