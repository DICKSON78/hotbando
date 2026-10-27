const db = require('../config/database');
const logger = require('../utils/logger');
const crypto = require('crypto');
const pesapal = require('../utils/pesapal');
const Wallet = require('../models/Wallet');

function generateVoucherCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const group = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `HB-${group()}-${group()}-${group()}`;
}

async function _createGiftVoucher(packageId, price) {
  const code = generateVoucherCode();
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  await db.execute(
    'INSERT INTO vouchers (voucher_code, package_id, price, is_used, expires_at, created_at) VALUES (?, ?, ?, 0, ?, NOW())',
    [code, packageId, price, expiresAt]
  );
  logger.info(`🎁 Gift voucher generated: ${code} for package #${packageId}`);
  return code;
}

async function initPesapalFromSettings() {
  const [settings] = await db.execute(
    "SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'pesapal_%'"
  );
  const config = {};
  settings.forEach(s => { config[s.setting_key] = s.setting_value; });

  if (!config.pesapal_consumer_key || !config.pesapal_consumer_secret) {
    throw new Error('PesaPal is not configured');
  }

  pesapal.init({
    consumer_key: config.pesapal_consumer_key,
    consumer_secret: config.pesapal_consumer_secret,
    env: config.pesapal_env || 'sandbox',
    callback_url: config.pesapal_callback_url,
    ipn_url: config.pesapal_ipn_url,
  });

  return config;
}

async function initiatePayment(req, res) {
  try {
    const { package_id, phone_number, gift, recipient_phone } = req.body;
    const user = req.session.hotbando_user;
    if (!user) return res.status(401).json({ error: 'Ingia kwanza' });

    const [packages] = await db.execute('SELECT * FROM packages WHERE id = ? AND is_active = 1', [package_id]);
    if (!packages.length) return res.status(404).json({ error: 'Kifurushi hakipo' });

    const pkg = packages[0];
    const ref = `HB${Date.now()}${crypto.randomBytes(3).toString('hex')}`;
    const payerPhone = phone_number || user.phone_number || '';
    const isGift = !!gift;

    const [settings] = await db.execute(
      "SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'pesapal_%'"
    );
    const config = {};
    settings.forEach(s => { config[s.setting_key] = s.setting_value; });

    // DEMO MODE (explicit opt-in only): when PesaPal is not configured AND
    // DEMO_PAYMENTS=true, complete instantly for testing. Otherwise fail
    // closed so no real access is granted without real money.
    if (!config.pesapal_consumer_key || !config.pesapal_consumer_secret) {
      if (process.env.DEMO_PAYMENTS !== 'true') {
        return res.status(400).json({ error: 'Malipo ya mtandao hayajasanidiwa kwa sasa. Tumia voucher au wasiliana na msimamizi.' });
      }
      await db.execute(
        "INSERT INTO payment_requests (user_id, payment_method, amount, phone_number, reference_number, merchant_request_id, status, callback_data) VALUES (?, 'pesapal', ?, ?, ?, ?, 'completed', ?)",
        [user.id, pkg.price, payerPhone, ref, ref, JSON.stringify({ package_id, gift: isGift, demo: true, recipient_phone: isGift ? recipient_phone || null : null })]
      );

      if (isGift) {
        const voucher = await _createGiftVoucher(pkg.id, pkg.price);
        return res.json({ success: true, demo: true, voucher, message: `Voucher imegeneratiwa! Tuma kwa mtu unayemnunulia.` });
      }

      await _activatePackage(user.id, pkg.id, pkg.price);
      return res.json({ success: true, demo: true, activated: true, message: `Kifurushi "${pkg.name}" kimewashwa!` });
    }

    pesapal.init({
      consumer_key: config.pesapal_consumer_key,
      consumer_secret: config.pesapal_consumer_secret,
      env: config.pesapal_env || 'sandbox',
      callback_url: config.pesapal_callback_url,
      ipn_url: config.pesapal_ipn_url,
    });

    let notification_id = config.pesapal_ipn_id;
    if (!notification_id) {
      const ipnResult = await pesapal.registerIPN(config.pesapal_ipn_url || `${req.protocol}://${req.get('host')}/api/payments/ipn`);
      notification_id = ipnResult.ipn_id;
      await db.execute("INSERT INTO system_settings (setting_key, setting_value) VALUES ('pesapal_ipn_id', ?) ON DUPLICATE KEY UPDATE setting_value = ?", [notification_id, notification_id]);
    }

    const order = await pesapal.submitOrder({
      id: ref,
      amount: pkg.price,
      description: `HotBando ${pkg.name}`,
      notification_id,
      email: user.email || '',
      phone: payerPhone,
      firstName: (user.name || '').split(' ')[0],
      lastName: (user.name || '').split(' ').slice(1).join(' ') || 'HotBando',
    });

    await db.execute(
      "INSERT INTO payment_requests (user_id, payment_method, amount, phone_number, reference_number, merchant_request_id, status, callback_data) VALUES (?, 'pesapal', ?, ?, ?, ?, 'pending', ?)",
      [user.id, pkg.price, payerPhone, ref, order.order_tracking_id, JSON.stringify({ package_id, gift: isGift, recipient_phone: isGift ? recipient_phone || null : null })]
    );

    return res.json({ success: true, redirect_url: order.redirect_url, payment_url: order.redirect_url, order_tracking_id: order.order_tracking_id });
  } catch (e) {
    logger.error('Payment initiation error:', e.response?.data || e.message);
    res.status(500).json({ error: 'Hitilafu. Jaribu tena.' });
  }
}

async function checkPaymentStatus(req, res) {
  try {
    const { order_tracking_id } = req.body;
    const user = req.session.hotbando_user || req.session.admin_user;
    if (!user) return res.status(401).json({ error: 'Ingia kwanza' });

    const [requests] = await db.execute(
      'SELECT * FROM payment_requests WHERE merchant_request_id = ? AND user_id = ?',
      [order_tracking_id, user.id]
    );

    if (!requests.length) {
      return res.json({ success: false, status: 'not_found' });
    }

    const payment = requests[0];

    if (payment.status === 'completed') {
      let voucher = null;
      try {
        const data = typeof payment.callback_data === 'string' ? JSON.parse(payment.callback_data) : payment.callback_data;
        voucher = data.gift_voucher || null;
      } catch (e) { /* ignore */ }
      return res.json({ success: true, status: 'completed', message: 'Malipo yamekamilika kikamilifu!', voucher });
    }

    if (payment.status === 'pending' && payment.merchant_request_id) {
      try {
        const [settings] = await db.execute(
          "SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'pesapal_%'"
        );
        const config = {};
        settings.forEach(s => { config[s.setting_key] = s.setting_value; });
        if (config.pesapal_consumer_key) {
          pesapal.init({
            consumer_key: config.pesapal_consumer_key,
            consumer_secret: config.pesapal_consumer_secret,
            env: config.pesapal_env || 'sandbox',
            callback_url: config.pesapal_callback_url,
            ipn_url: config.pesapal_ipn_url,
          });
          const status = await pesapal.getPaymentStatus(order_tracking_id);
          if (status.status_code === 1) {
            await _processCompletedPayment(payment, status);
            return res.json({ success: true, status: 'completed', message: 'Malipo yamekamilika kikamilifu!' });
          }
          return res.json({ success: false, status: 'pending', message: 'Malipo bado hayajakamilika' });
        }
      } catch (e) {
        logger.warn('Payment status check failed:', e.message);
      }
      return res.json({ success: false, status: 'pending', message: 'Malipo bado hayajakamilika' });
    }

    return res.json({ success: false, status: payment.status });
  } catch (e) {
    logger.error('Payment status check error:', e.message);
    res.status(500).json({ error: 'Hitilafu. Jaribu tena.' });
  }
}

async function _processCompletedPayment(reqData, status) {
  const data = typeof reqData.callback_data === 'string' ? JSON.parse(reqData.callback_data) : reqData.callback_data;

  if (data.type === 'wallet_topup') {
    await Wallet.deposit(reqData.user_id, reqData.amount, 'pesapal', reqData.reference_number,
      `Reseller wallet top-up via Pesapal - TSH ${Number(reqData.amount).toLocaleString()}`);
    logger.info(`✅ Wallet top-up: User #${reqData.user_id} +TSH ${reqData.amount}`);
  } else if (data.gift) {
    const voucher = await _createGiftVoucher(data.package_id, reqData.amount);
    data.gift_voucher = voucher;
    await db.execute(
      'UPDATE payment_requests SET callback_data = ? WHERE id = ?',
      [JSON.stringify(data), reqData.id]
    );
  } else if (data.package_id) {
    await _activatePackage(reqData.user_id, data.package_id, reqData.amount);
  }

  await db.execute(
    "UPDATE payment_requests SET status = 'completed', completed_at = NOW(), callback_data = JSON_SET(IFNULL(callback_data, '{}'), '$.pesapal_status', ?) WHERE id = ?",
    [JSON.stringify(status), reqData.id]
  );
}

async function paymentCallback(req, res) {
  const { OrderTrackingId } = req.query;
  if (!OrderTrackingId) return res.status(400).send('Missing tracking ID');

  try {
    // Check idempotency - skip if already processed
    const [existing] = await db.execute(
      "SELECT id, status FROM payment_requests WHERE merchant_request_id = ?",
      [OrderTrackingId]
    );

    if (existing.length && existing[0].status === 'completed') {
      const [r] = await db.execute("SELECT callback_data FROM payment_requests WHERE merchant_request_id = ?", [OrderTrackingId]);
      const callbackData = r.length ? (typeof r[0].callback_data === 'string' ? JSON.parse(r[0].callback_data) : r[0].callback_data) : {};
      return res.redirect(callbackData.type === 'wallet_topup' ? '/reseller/dashboard' : '/hotspot/dashboard');
    }

    await initPesapalFromSettings();
    const status = await pesapal.getPaymentStatus(OrderTrackingId);
    if (status.status_code === 1) {
      const [requests] = await db.execute(
        "SELECT * FROM payment_requests WHERE merchant_request_id = ? AND status = 'pending'",
        [OrderTrackingId]
      );
      if (requests.length) {
        await _processCompletedPayment(requests[0], status);
      }
    }
    const [r] = await db.execute("SELECT callback_data FROM payment_requests WHERE merchant_request_id = ?", [OrderTrackingId]);
    const callbackData = r.length ? (typeof r[0].callback_data === 'string' ? JSON.parse(r[0].callback_data) : r[0].callback_data) : {};
    res.redirect(callbackData.type === 'wallet_topup' ? '/reseller/dashboard' : '/hotspot/dashboard');
  } catch (e) {
    logger.error('Callback error:', e.message);
    res.redirect('/hotspot/subscribe');
  }
}

async function paymentIPN(req, res) {
  const { OrderTrackingId, MerchantReference, Status, Signature } = req.query;
  if (!OrderTrackingId) return res.status(400).send('Missing tracking ID');

  try {
    // Verify IPN signature before processing
    if (!pesapal.verifyIPNSignature(OrderTrackingId, MerchantReference, Status, Signature)) {
      logger.warn('Invalid IPN signature:', { OrderTrackingId, ip: req.ip });
      return res.status(403).send('Invalid signature');
    }

    // Check idempotency
    const [existing] = await db.execute(
      "SELECT id, status FROM payment_requests WHERE merchant_request_id = ?",
      [OrderTrackingId]
    );

    if (existing.length && existing[0].status === 'completed') {
      return res.status(200).send('OK');
    }

    await initPesapalFromSettings();
    const status = await pesapal.getPaymentStatus(OrderTrackingId);
    if (status.status_code === 1) {
      const [requests] = await db.execute(
        "SELECT * FROM payment_requests WHERE merchant_request_id = ? AND status = 'pending'",
        [OrderTrackingId]
      );
      if (requests.length) {
        await _processCompletedPayment(requests[0], status);
      }
    }
    res.status(200).send('OK');
  } catch (e) {
    logger.error('IPN error:', e.message);
    res.status(500).send('Error');
  }
}

async function _activatePackage(userId, packageId, amount) {
  const [packages] = await db.execute('SELECT * FROM packages WHERE id = ?', [packageId]);
  if (!packages.length) return;
  const pkg = packages[0];
  const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
  if (!users.length) return;
  const user = users[0];
  const now = new Date();
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
    'INSERT INTO payments (user_id, package_id, amount, payment_method, status, activated, created_at) VALUES (?, ?, ?, "pesapal", "completed", 1, NOW())',
    [userId, packageId, amount]
  );
}

async function initiateWalletTopup(req, res) {
  try {
    const { amount } = req.body;
    const user = req.session.hotbando_user || req.session.admin_user;
    if (!user) return res.status(401).json({ error: 'Ingia kwanza' });

    if (!amount || amount < 1000) {
      return res.status(400).json({ error: 'Kiasi cha chini ni TSH 1,000' });
    }

    const ref = `TW${Date.now()}${crypto.randomBytes(3).toString('hex')}`;

    const [settings] = await db.execute(
      "SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'pesapal_%'"
    );
    const config = {};
    settings.forEach(s => { config[s.setting_key] = s.setting_value; });

    if (!config.pesapal_consumer_key || !config.pesapal_consumer_secret) {
      return res.status(400).json({ error: 'PesaPal haijasanidiwa. Wasiliana na msimamizi.' });
    }

    pesapal.init({
      consumer_key: config.pesapal_consumer_key,
      consumer_secret: config.pesapal_consumer_secret,
      env: config.pesapal_env || 'sandbox',
      callback_url: config.pesapal_callback_url,
      ipn_url: config.pesapal_ipn_url,
    });

    let notification_id = config.pesapal_ipn_id;
    if (!notification_id) {
      const ipnResult = await pesapal.registerIPN(config.pesapal_ipn_url || `${req.protocol}://${req.get('host')}/api/payments/ipn`);
      notification_id = ipnResult.ipn_id;
      await db.execute("INSERT INTO system_settings (setting_key, setting_value) VALUES ('pesapal_ipn_id', ?) ON DUPLICATE KEY UPDATE setting_value = ?", [notification_id, notification_id]);
    }

    const order = await pesapal.submitOrder({
      id: ref,
      amount,
      description: `HotBando Wallet Top-up - TSH ${Number(amount).toLocaleString()}`,
      notification_id,
      email: user.email || '',
      phone: user.phone_number || '',
      firstName: (user.name || '').split(' ')[0],
      lastName: (user.name || '').split(' ').slice(1).join(' ') || 'HotBando',
    });

    await db.execute(
      "INSERT INTO payment_requests (user_id, payment_method, amount, phone_number, reference_number, merchant_request_id, status, callback_data) VALUES (?, 'pesapal', ?, ?, ?, ?, 'pending', ?)",
      [user.id, amount, user.phone_number || '', ref, order.order_tracking_id, JSON.stringify({ type: 'wallet_topup', user_id: user.id, amount })]
    );

    return res.json({ success: true, redirect_url: order.redirect_url, payment_url: order.redirect_url, order_tracking_id: order.order_tracking_id });
  } catch (e) {
    logger.error('Topup initiation error:', e.response?.data || e.message);
    res.status(500).json({ error: 'Hitilafu. Jaribu tena.' });
  }
}

module.exports = { initiatePayment, initiateWalletTopup, checkPaymentStatus, paymentCallback, paymentIPN };
