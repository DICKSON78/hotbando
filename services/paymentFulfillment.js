const db = require('../config/database');
const logger = require('../utils/logger');
const crypto = require('crypto');

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

  let newUsageUntil;
  if (user.usage_until && new Date(user.usage_until) > now) {
    newUsageUntil = new Date(new Date(user.usage_until).getTime() + (pkg.duration_hours * 3600 * 1000));
  } else {
    newUsageUntil = new Date(now.getTime() + (pkg.duration_hours * 3600 * 1000));
  }

  await executor.execute(
    'UPDATE users SET package = ?, usage_start = ?, usage_until = ?, moneyspent = moneyspent + ?, updated_at = NOW() WHERE id = ?',
    [pkg.name, now, newUsageUntil, amount, userId]
  );
  await executor.execute(
    'INSERT INTO payments (user_id, package_id, amount, payment_method, status, activated, created_at) VALUES (?, ?, ?, "clickpesa", "completed", 1, NOW())',
    [userId, packageId, amount]
  );

  try {
    const mac = extraData.mac_address || user.mac_address;
    const routerID = extraData.router_id || user.last_router_id;
    if (mac && routerID) {
      const mikrotikService = require('../utils/mikrotik');
      const uptime = Math.max(0, (newUsageUntil.getTime() - now.getTime()) / 1000);
      await mikrotikService.addUserToRouter(mac, routerID, uptime, 0);
    }
  } catch (e) {
    logger.error('Auto-connect after ClickPesa payment failed (non-critical)', { error: e.message });
  }
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

  // Verify amount/currency if provided
  const orderAmount = Number(tx.amount);
  const paidAmount = amount !== undefined && amount !== null ? Number(amount) : orderAmount;
  const orderCurrency = tx.currency || 'TZS';
  const paidCurrency = currency || orderCurrency;
  if (Math.abs(paidAmount - orderAmount) > 0.01) {
    throw new Error('Amount mismatch');
  }
  if (paidCurrency !== orderCurrency) {
    throw new Error('Currency mismatch');
  }

  const purpose = tx.purpose;
  const userId = tx.user_id;
  const extra = tx.extra_data ? (typeof tx.extra_data === 'string' ? JSON.parse(tx.extra_data) : tx.extra_data) : {};

  let result = {};

  if (purpose === 'wallet_topup' && userId) {
    const [existing] = await executor.execute('SELECT id FROM transactions WHERE reference = ? FOR UPDATE', [orderReference]);
    if (!existing.length) {
      await executor.execute('UPDATE wallets SET balance = balance + ?, updated_at = NOW() WHERE user_id = ?', [tx.amount, userId]);
      await executor.execute('INSERT INTO transactions (user_id, transaction_type, amount, payment_reference, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [userId, 'deposit', tx.amount, orderReference, 'Wallet top-up via ClickPesa']);
    }
    result = { message: 'Salio limeongezwa!' };
  } else if (purpose === 'package_purchase' && userId) {
    const packageId = extra.package_id;
    const isGift = extra.gift;
    if (isGift) {
      const voucherCode = generateVoucherCode();
      const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);
      await executor.execute(
        'INSERT INTO vouchers (voucher_code, package_id, price, is_used, expires_at, created_at) VALUES (?, ?, ?, 0, ?, NOW())',
        [voucherCode, packageId, tx.amount, expiresAt]
      );
      extra.voucher_code = voucherCode;
      await executor.execute('UPDATE clickpesa_transactions SET extra_data = ? WHERE order_reference = ?',
        [JSON.stringify(extra), orderReference]);
      result = { voucher: voucherCode, message: 'Voucher imegeneratiwa!' };
    } else if (packageId) {
      await activatePackage(userId, packageId, tx.amount, extra, executor);
      result = { activated: true, message: 'Kifurushi kimewashwa! Umeunganishwa kwenye mtandao.' };
    }
  } else if (purpose === 'reseller_topup' && userId) {
    const [existing] = await executor.execute('SELECT id FROM transactions WHERE reference = ? FOR UPDATE', [orderReference]);
    if (!existing.length) {
      await executor.execute('UPDATE wallets SET balance = balance + ?, updated_at = NOW() WHERE user_id = ?', [tx.amount, userId]);
      await executor.execute('INSERT INTO transactions (user_id, transaction_type, amount, payment_reference, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [userId, 'deposit', tx.amount, orderReference, 'Reseller wallet top-up via ClickPesa']);
    }
    result = { message: 'Salio la wallet limeongezwa!' };
  } else if (purpose === 'sponsor_deposit' && userId) {
    await executor.execute('UPDATE wallets SET balance = balance + ?, updated_at = NOW() WHERE user_id = ?', [tx.amount, userId]);
    await executor.execute('INSERT INTO transactions (user_id, transaction_type, amount, payment_reference, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [userId, 'deposit', tx.amount, orderReference, 'Sponsor deposit via ClickPesa']);
    result = { message: 'Fedha zimeongezwa kwenye wallet!' };
  }

  // Update transaction
  await executor.execute('UPDATE clickpesa_transactions SET status = ?, processed = 1, clickpesa_id = COALESCE(?, clickpesa_id) WHERE order_reference = ?',
    ['SUCCESS', providerRef || null, orderReference]);

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
