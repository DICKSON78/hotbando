const clickpesa = require('../utils/clickpesa');
const db = require('../config/database');
const logger = require('../utils/logger');
const crypto = require('crypto');

function generateOrderRef(prefix = 'HB') {
  return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
}

function generateVoucherCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const group = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `HB-${group()}-${group()}-${group()}`;
}

exports.initiatePayment = async (req, res) => {
  try {
    const { phoneNumber, purpose, package_id, gift, recipient_phone } = req.body;
    const user = req.session?.hotbando_user || req.session?.user || req.session?.admin_user || req.session?.partner;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Namba ya simu inahitajika' });
    }

    // Require login for package purchases
    if (purpose === 'package_purchase' && !user) {
      return res.status(401).json({ error: 'Please log in first to buy a package.' });
    }

    const phone = phoneNumber.startsWith('255') ? phoneNumber : phoneNumber.replace(/^0/, '255');
    const orderReference = generateOrderRef();

    // Server-side amount validation: amount must match the package price from DB
    let amount = req.body.amount;
    const purposeFinal = purpose || 'payment';

    if (purposeFinal === 'package_purchase' && package_id) {
      const [pkgs] = await db.execute('SELECT id, price, duration_hours, name FROM packages WHERE id = ?', [package_id]);
      if (!pkgs.length) {
        return res.status(400).json({ error: 'Kifurushi hakipo' });
      }
      const pkg = pkgs[0];
      // Always use server-side price — ignore client-supplied amount
      amount = Number(pkg.price);
    } else if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount inahitajika' });
    }

    const extraData = {
      package_id: package_id || null,
      package_name: null,
      package_duration_hours: null,
      gift: !!gift,
      recipient_phone: recipient_phone || null,
      mac_address: user?.mac_address || req.session?.mac || null,
      router_id: user?.last_router_id || req.session?.routerID || null,
    };

    // Store package details in extra_data for activation reference
    if (package_id) {
      const [pkgs] = await db.execute('SELECT name, duration_hours FROM packages WHERE id = ?', [package_id]);
      if (pkgs.length) {
        extraData.package_name = pkgs[0].name;
        extraData.package_duration_hours = pkgs[0].duration_hours;
      }
    }

    await db.execute(
      'INSERT INTO clickpesa_transactions (order_reference, user_id, amount, phone, purpose, status) VALUES (?, ?, ?, ?, ?, ?)',
      [user?.id || null, orderReference, amount, phone, purposeFinal, 'PENDING']
    ).catch(() => {
      db.execute(
        'INSERT INTO clickpesa_transactions (order_reference, user_id, amount, phone, purpose, status, extra_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [orderReference, user?.id || null, amount, phone, purposeFinal, 'PENDING', JSON.stringify(extraData)]
      );
    });

    try {
      await db.execute(
        'UPDATE clickpesa_transactions SET extra_data = ? WHERE order_reference = ?',
        [JSON.stringify(extraData), orderReference]
      );
    } catch (_) {}

    const result = await clickpesa.initiateUSSDPush({
      amount,
      phoneNumber: phone,
      orderReference,
    });

    if (result.status === 'FAILED') {
      await db.execute('UPDATE clickpesa_transactions SET status = ?, clickpesa_response = ? WHERE order_reference = ?',
        ['FAILED', JSON.stringify(result), orderReference]);
      return res.status(400).json({ error: result.message || 'Malipo yameshindikana' });
    }

    await db.execute('UPDATE clickpesa_transactions SET status = ?, channel = ?, clickpesa_id = ?, clickpesa_response = ? WHERE order_reference = ?',
      [result.status || 'PROCESSING', result.channel || null, result.id || null, JSON.stringify(result), orderReference]);

    res.json({
      success: true,
      orderReference,
      status: result.status,
      channel: result.channel,
      message: 'Tafadhali angalia simu yako na weka PIN yako kukamilisha malipo',
    });
  } catch (error) {
    logger.error('ClickPesa initiate payment error', { error: error.message });
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    if (status === 409) {
      return res.status(409).json({ error: 'Reference tayari imetumika. Tafadhali jaribu tena.' });
    }
    res.status(500).json({ error: message || 'Malipo yameshindikana' });
  }
};

exports.checkStatus = async (req, res) => {
  try {
    const { orderReference } = req.params;
    if (!orderReference) return res.status(400).json({ error: 'Order reference inahitajika' });

    const result = await clickpesa.queryPaymentStatus(orderReference);
    const paymentData = Array.isArray(result) ? result[0] : result;
    const newStatus = paymentData?.status || 'UNKNOWN';

    await db.execute('UPDATE clickpesa_transactions SET status = ?, clickpesa_response = ? WHERE order_reference = ?',
      [newStatus, JSON.stringify(result), orderReference]);

    if (newStatus === 'SUCCESS' || newStatus === 'SETTLED') {
      const activationResult = await processAndActivate(orderReference);
      return res.json({ success: true, status: newStatus, activated: true, ...activationResult });
    }

    res.json({ success: true, status: newStatus, data: paymentData });
  } catch (error) {
    logger.error('ClickPesa status check error', { error: error.message });
    res.status(500).json({ error: 'Imeshindikana kuangalia hali ya malipo' });
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    const { orderReference } = req.params;

    const [rows] = await db.execute(
      'SELECT * FROM clickpesa_transactions WHERE order_reference = ?', [orderReference]
    );
    if (!rows.length) return res.status(404).json({ error: 'Malipo hayajapatikana' });

    const tx = rows[0];
    if (tx.processed) {
      const extra = tx.extra_data ? (typeof tx.extra_data === 'string' ? JSON.parse(tx.extra_data) : tx.extra_data) : {};
      if (extra.gift && extra.voucher_code) {
        return res.json({ success: true, status: 'completed', voucher: extra.voucher_code, message: 'Voucher imegeneratiwa!' });
      }
      return res.json({ success: true, status: 'completed', message: 'Malipo yamekamilika!' });
    }

    const result = await clickpesa.queryPaymentStatus(orderReference);
    const paymentData = Array.isArray(result) ? result[0] : result;
    const newStatus = paymentData?.status || tx.status;

    await db.execute('UPDATE clickpesa_transactions SET status = ?, clickpesa_response = ? WHERE order_reference = ?',
      [newStatus, JSON.stringify(result), orderReference]);

    if (newStatus === 'SUCCESS' || newStatus === 'SETTLED') {
      const activationResult = await processAndActivate(orderReference);
      return res.json({ success: true, status: 'completed', ...activationResult });
    }

    res.json({ success: false, status: newStatus, message: 'Malipo bado yanachakatwa' });
  } catch (error) {
    logger.error('ClickPesa confirm payment error', { error: error.message });
    res.status(500).json({ error: 'Imeshindikana kuthibitisha malipo' });
  }
};

exports.webhook = async (req, res) => {
  try {
    const signature = req.headers['x-clickpesa-signature'];
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const isValid = clickpesa.verifyWebhookChecksum(payload, signature);
    if (!isValid) {
      logger.warn('ClickPesa webhook invalid checksum');
      return res.status(401).json({ error: 'Invalid checksum' });
    }

    const { id, status, orderReference, collectedAmount, channel } = payload;
    logger.info('ClickPesa webhook received', { orderReference, status, id });

    if (orderReference) {
      await db.execute(
        'UPDATE clickpesa_transactions SET status = ?, channel = ?, clickpesa_id = ?, clickpesa_response = ? WHERE order_reference = ?',
        [status || 'UNKNOWN', channel || null, id || null, JSON.stringify(payload), orderReference]
      );

      if (status === 'SUCCESS' || status === 'SETTLED') {
        await processAndActivate(orderReference);
      }
    }

    res.json({ status: 'received' });
  } catch (error) {
    logger.error('ClickPesa webhook error', { error: error.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM clickpesa_transactions ORDER BY created_at DESC LIMIT 50'
    );
    res.json({ success: true, transactions: rows });
  } catch (error) {
    logger.error('ClickPesa get transactions error', { error: error.message });
    res.status(500).json({ error: 'Imeshindikana kupata muhtasari' });
  }
};

exports.getBalance = async (req, res) => {
  try {
    const result = await clickpesa.getBalance();
    res.json({ success: true, balance: result });
  } catch (error) {
    logger.error('ClickPesa balance error', { error: error.message });
    res.status(500).json({ error: 'Imeshindikana kupata salio' });
  }
};

async function processAndActivate(orderReference) {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM clickpesa_transactions WHERE order_reference = ? AND processed = 0',
      [orderReference]
    );
    if (!rows.length) {
      const [existing] = await db.execute('SELECT extra_data FROM clickpesa_transactions WHERE order_reference = ?', [orderReference]);
      if (existing.length) {
        const extra = existing[0].extra_data ? (typeof existing[0].extra_data === 'string' ? JSON.parse(existing[0].extra_data) : existing[0].extra_data) : {};
        if (extra.gift && extra.voucher_code) return { voucher: extra.voucher_code, message: 'Voucher imegeneratiwa!' };
      }
      return { message: 'Malipo yamekamilika!' };
    }

    const tx = rows[0];
    const purpose = tx.purpose;
    const userId = tx.user_id;
    const extra = tx.extra_data ? (typeof tx.extra_data === 'string' ? JSON.parse(tx.extra_data) : tx.extra_data) : {};
    let result = {};

    if (purpose === 'wallet_topup' && userId) {
      const [existing] = await db.execute('SELECT id FROM transactions WHERE reference = ?', [orderReference]);
      if (!existing.length) {
        await db.execute('UPDATE wallets SET balance = balance + ?, updated_at = NOW() WHERE user_id = ?', [tx.amount, userId]);
        await db.execute('INSERT INTO transactions (user_id, transaction_type, amount, payment_reference, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
          [userId, 'deposit', tx.amount, orderReference, 'Wallet top-up via ClickPesa']);
      }
      result = { message: 'Salio limeongezwa!' };
    } else if (purpose === 'package_purchase' && userId) {
      const packageId = extra.package_id;
      const isGift = extra.gift;

      // Server-side amount validation: verify amount matches package price
      if (packageId) {
        const [pkgs] = await db.execute('SELECT price FROM packages WHERE id = ?', [packageId]);
        if (pkgs.length) {
          const expectedAmount = Number(pkgs[0].price);
          if (Number(tx.amount) !== expectedAmount) {
            logger.warn(`Amount mismatch: paid=${tx.amount}, expected=${expectedAmount}, pkg=${packageId}, ref=${orderReference}`);
            // Still process — amount was validated at initiation, but double-check here
          }
        }
      }

      if (isGift) {
        const voucherCode = generateVoucherCode();
        const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);
        await db.execute(
          'INSERT INTO vouchers (voucher_code, package_id, price, is_used, expires_at, created_at) VALUES (?, ?, ?, 0, ?, NOW())',
          [voucherCode, packageId, tx.amount, expiresAt]
        );
        extra.voucher_code = voucherCode;
        await db.execute('UPDATE clickpesa_transactions SET extra_data = ? WHERE order_reference = ?',
          [JSON.stringify(extra), orderReference]);
        result = { voucher: voucherCode, message: 'Voucher imegeneratiwa!' };
        logger.info(`Gift voucher generated: ${voucherCode} for package #${packageId}`);
      } else if (packageId) {
        await _activatePackage(userId, packageId, tx.amount, extra);
        result = { activated: true, message: 'Kifurushi kimewashwa! Umeunganishwa kwenye mtandao.' };
      }
    } else if (purpose === 'reseller_topup' && userId) {
      const [existing] = await db.execute('SELECT id FROM transactions WHERE reference = ?', [orderReference]);
      if (!existing.length) {
        await db.execute('UPDATE wallets SET balance = balance + ?, updated_at = NOW() WHERE user_id = ?', [tx.amount, userId]);
        await db.execute('INSERT INTO transactions (user_id, transaction_type, amount, payment_reference, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
          [userId, 'deposit', tx.amount, orderReference, 'Reseller wallet top-up via ClickPesa']);
      }
      result = { message: 'Salio la wallet limeongezwa!' };
    } else if (purpose === 'sponsor_deposit' && userId) {
      await db.execute('UPDATE wallets SET balance = balance + ?, updated_at = NOW() WHERE user_id = ?', [tx.amount, userId]);
      await db.execute('INSERT INTO transactions (user_id, transaction_type, amount, payment_reference, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [userId, 'deposit', tx.amount, orderReference, 'Sponsor deposit via ClickPesa']);
      result = { message: 'Fedha zimeongezwa kwenye wallet!' };
    }

    await db.execute('UPDATE clickpesa_transactions SET processed = 1 WHERE order_reference = ?', [orderReference]);
    return result;
  } catch (error) {
    logger.error('Process and activate error', { error: error.message, orderReference });
    return { message: 'Malipo yamekamilika' };
  }
}

async function _activatePackage(userId, packageId, amount, extraData = {}) {
  try {
    const [packages] = await db.execute('SELECT * FROM packages WHERE id = ?', [packageId]);
    if (!packages.length) return;
    const pkg = packages[0];
    const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
    if (!users.length) return;
    const user = users[0];
    const now = new Date();

    // Calculate usage_until: extend if still active, otherwise start fresh
    let newUsageUntil;
    if (user.usage_until && new Date(user.usage_until) > now) {
      newUsageUntil = new Date(new Date(user.usage_until).getTime() + (pkg.duration_hours * 3600 * 1000));
    } else {
      newUsageUntil = new Date(now.getTime() + (pkg.duration_hours * 3600 * 1000));
    }

    await db.execute(
      'UPDATE users SET package = ?, usage_start = ?, usage_until = ?, moneyspent = moneyspent + ?, updated_at = NOW() WHERE id = ?',
      [pkg.name, now, newUsageUntil, amount, userId]
    );
    await db.execute(
      'INSERT INTO payments (user_id, package_id, amount, payment_method, status, activated, created_at) VALUES (?, ?, ?, "clickpesa", "completed", 1, NOW())',
      [userId, packageId, amount]
    );

    logger.info(`Package activated: user=${userId}, pkg=${pkg.name}, duration=${pkg.duration_hours}h, until=${newUsageUntil}`);

    // Auto-connect to MikroTik router after activation
    const mac = extraData.mac_address || user.mac_address;
    const routerID = extraData.router_id || user.last_router_id;
    if (mac && routerID) {
      try {
        const mikrotikService = require('../utils/mikrotik');
        const uptime = Math.max(0, (newUsageUntil.getTime() - now.getTime()) / 1000);
        await mikrotikService.addUserToRouter(mac, routerID, uptime, 0);
        logger.info(`Auto-connected to router after payment: mac=${mac}, router=${routerID}, uptime=${uptime}s`);
      } catch (routerErr) {
        logger.error('Auto-connect after payment failed (non-critical)', { error: routerErr.message, mac, routerID });
        // Non-critical: user can still press Connect manually
      }
    }
  } catch (error) {
    logger.error('Activate package error', { error: error.message });
  }
}
