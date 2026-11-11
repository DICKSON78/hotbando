const db = require('../config/database');
const logger = require('../utils/logger');
const crypto = require('crypto');
const { extendUserPackage } = require('../utils/packageEntitlement');
const { recordRouterSplit } = require('./routerSplit');
const { createGiftGrant } = require('../utils/pendingGrants');

async function notifyGiftRecipient(executor, recipientUserId, amount) {
  await executor.execute(
    `INSERT INTO notifications (user_id, notification_type, title, message, action_url, action_text, created_at)
     VALUES (?, 'success', 'Umepewa kifurushi', ?, '/hotspot/dashboard', 'Fungua dashboard', NOW())`,
    [recipientUserId, `Umepewa kifurushi chenye thamani ya TSh ${Number(amount).toLocaleString()}. Kitaanza kuhesabu ukiunganishwa WiFi ya HotBando.`]
  );
}

// RouterOS auto-connect is best-effort and must never run inside an open DB
// transaction. When a router is unreachable the password-retry loop inside
// getRouterConnection can block for 20s+; holding a pooled connection (and
// FOR UPDATE row locks) for that long starves the pool and freezes the whole
// portal ("Inapakia taarifa..." forever). All router connects therefore run
// AFTER the surrounding transaction commits, with a hard time cap.
const ROUTER_CONNECT_TIMEOUT_MS = 12000;

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
    if (timer.unref) timer.unref();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function connectUserToRouterBestEffort({ mac, routerID, uptimeSeconds = 0, bytes = 0, preserveBytes = false, orderReference = null }) {
  if (!mac || !routerID) return false;
  try {
    const mikrotikService = require('../utils/mikrotik');
    const ok = await withTimeout(
      mikrotikService.addUserToRouter(mac, routerID, uptimeSeconds, bytes, preserveBytes),
      ROUTER_CONNECT_TIMEOUT_MS
    );
    if (ok) {
      logger.info('Auto-connected to router after fulfillment', { mac, router: routerID, uptimeSeconds, orderReference });
    } else {
      logger.warn('Auto-connect to router after fulfillment did not complete (router slow/unreachable)', { mac, router: routerID, orderReference });
    }
    return !!ok;
  } catch (routerErr) {
    logger.error('Auto-connect after payment fulfillment failed (non-critical)', { error: routerErr.message, mac, router: routerID, orderReference });
    return false;
  }
}

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
  const [users] = await executor.execute('SELECT * FROM users WHERE id = ?', [userId]);
  if (!users.length) return;
  const user = users[0];
  const now = new Date();
  const { usageUntil: newUsageUntil } = await extendUserPackage(executor, userId, pkg);

  await executor.execute(
    'UPDATE users SET moneyspent = moneyspent + ?, updated_at = NOW() WHERE id = ?',
    [amount, userId]
  );
  await executor.execute(
    'INSERT INTO payments (user_id, package_id, amount, payment_method, status, activated, created_at) VALUES (?, ?, ?, "clickpesa", "completed", 1, NOW())',
    [userId, packageId, amount]
  );

  // The router auto-connect info is RETURNED, not executed: the caller must
  // run it only after the surrounding transaction commits (see
  // connectUserToRouterBestEffort / fulfillOrder).
  const mac = extraData.mac_address || user.mac_address;
  const routerID = extraData.router_id || user.last_router_id;
  const connect = (mac && routerID)
    ? {
        mac,
        routerID,
        uptimeSeconds: Math.max(0, (newUsageUntil.getTime() - now.getTime()) / 1000),
        bytes: 0
      }
    : null;
  return { connect };
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
    if (isGift && extra.recipient_user_id) {
      await createGiftGrant(executor, extra.recipient_user_id, packageId, orderReference, tx.phone || null);
      await notifyGiftRecipient(executor, extra.recipient_user_id, tx.amount);
      result = { gifted: true, message: 'Kifurushi kimetumwa kwa mpokeaji. Kitaanza kuhesabu mara atakapounganishwa WiFi ya HotBando.' };
    } else if (isGift) {
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
      const activation = await activatePackage(userId, packageId, tx.amount, extra, executor);
      if (activation && activation.connect) {
        result.__connect = activation.connect;
      }
      result = { ...result, activated: true, message: 'Kifurushi chako kimewashwa. Unganisha tena au refresh Wi-Fi ili kuanza kutumia.' };
    }
  } else if (purpose === 'package_purchase' && extra.gift && !userId && extra.recipient_user_id && extra.package_id) {
    await createGiftGrant(executor, extra.recipient_user_id, extra.package_id, orderReference, tx.phone || null);
    await notifyGiftRecipient(executor, extra.recipient_user_id, tx.amount);
    result = { gifted: true, message: 'Kifurushi kimetumwa kwa mpokeaji. Kitaanza kuhesabu mara atakapounganishwa WiFi ya HotBando.' };
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
    const title = result.gifted ? 'Zawadi imetumwa' : isGift ? 'Vocha yako iko tayari' : 'Malipo yamefanikiwa';
    const details = result.gifted
      ? `Malipo ya TSh ${orderAmount.toLocaleString()} yamepokelewa. ${result.message}`
      : result.voucher
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
      `INSERT INTO payment_ledger (business_id, partner_id, customer_id, order_reference, clickpesa_transaction_id, type, amount, currency, status, provider, provider_ref, description, metadata)
       VALUES (?, ?, ?, ?, ?, 'payment', ?, ?, 'completed', 'clickpesa', ?, ?, ?)`,
      [businessId, partnerId, userId, orderReference, tx.id, tx.amount, orderCurrency, providerRef || null, purpose, JSON.stringify({ extra })]
    );
  } catch (e) {
    logger.warn('Failed to insert into payments ledger', { error: e.message });
  }

  // Gift purchases carry their voucher code for display to the buyer.
  if (result.voucher) {
    try {
      const [stored] = await executor.execute(
        'SELECT extra_data FROM clickpesa_transactions WHERE order_reference = ?',
        [orderReference]
      );
      const storedExtra = stored.length && stored[0].extra_data
        ? (typeof stored[0].extra_data === 'string' ? JSON.parse(stored[0].extra_data) : stored[0].extra_data)
        : {};
      if (storedExtra.voucher_code) result.voucher = storedExtra.voucher_code;
    } catch (e) { /* keep the in-memory voucher */ }
  }

  return result;
}

// Fulfill an order in its own transaction, then connect the customer's device
// to the router AFTER the commit. This is the safe entry point for callers
// that do not manage their own transaction (reconciler, dashboard fallback).
async function fulfillOrder(orderReference, { amount, currency, providerRef } = {}) {
  const conn = await db.getConnection();
  let result;
  let connect = null;
  try {
    await conn.beginTransaction();
    result = await fulfillClickPesaPayment({ orderReference, amount, currency, providerRef }, conn);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    conn.release();
    throw error;
  }
  conn.release();

  if (result && result.__connect) {
    connect = result.__connect;
    delete result.__connect;
    connect.orderReference = orderReference;
    // Fire-and-forget with a hard cap: a slow router must never stall the
    // HTTP response or the next DB operation.
    setImmediate(() => { connectUserToRouterBestEffort(connect); });
  }
  return result;
}

module.exports = {
  activatePackage,
  fulfillClickPesaPayment,
  fulfillOrder,
  connectUserToRouterBestEffort
};
