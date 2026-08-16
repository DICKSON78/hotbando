const db = require('../config/database');
const logger = require('../utils/logger');
const crypto = require('crypto');
const pesapal = require('../utils/pesapal');
const Wallet = require('../models/Wallet');

async function initiatePayment(req, res) {
  try {
    const { package_id } = req.body;
    const user = req.session.hotbando_user;
    if (!user) return res.status(401).json({ error: 'Ingia kwanza' });

    const [packages] = await db.execute('SELECT * FROM packages WHERE id = ? AND is_active = 1', [package_id]);
    if (!packages.length) return res.status(404).json({ error: 'Kifurushi hakipo' });

    const pkg = packages[0];
    const ref = `HB${Date.now()}${crypto.randomBytes(3).toString('hex')}`;

    const [settings] = await db.execute(
      "SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'pesapal_%'"
    );
    const config = {};
    settings.forEach(s => { config[s.setting_key] = s.setting_value; });

    if (config.pesapal_consumer_key && config.pesapal_consumer_secret) {
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
        phone: user.phone_number || '',
        firstName: (user.name || '').split(' ')[0],
        lastName: (user.name || '').split(' ').slice(1).join(' ') || 'HotBando',
      });

      await db.execute(
        "INSERT INTO payment_requests (user_id, payment_method, amount, phone_number, reference_number, merchant_request_id, status, callback_data) VALUES (?, 'pesapal', ?, ?, ?, ?, 'pending', ?)",
        [user.id, pkg.price, user.phone_number || '', order.order_tracking_id, ref, JSON.stringify({ package_id, order })]
      );

      return res.json({ success: true, redirect_url: order.redirect_url, payment_url: order.redirect_url, order_tracking_id: order.order_tracking_id });
    }

    return res.status(400).json({ error: 'PesaPal haijasanidiwa. Wasiliana na msimamizi.' });
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
      return res.json({ success: true, status: 'completed', message: 'Malipo yamekamilika kikamilifu!' });
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
      "SELECT id, status FROM payment_requests WHERE reference_number = ?",
      [OrderTrackingId]
    );

    if (existing.length && existing[0].status === 'completed') {
      const [r] = await db.execute("SELECT callback_data FROM payment_requests WHERE reference_number = ?", [OrderTrackingId]);
      const callbackData = r.length ? (typeof r[0].callback_data === 'string' ? JSON.parse(r[0].callback_data) : r[0].callback_data) : {};
      return res.redirect(callbackData.type === 'wallet_topup' ? '/reseller/dashboard' : '/hotspot/dashboard');
    }

    const status = await pesapal.getPaymentStatus(OrderTrackingId);
    if (status.status_code === 1) {
      const [requests] = await db.execute(
        "SELECT * FROM payment_requests WHERE reference_number = ? AND status = 'pending'",
        [OrderTrackingId]
      );
      if (requests.length) {
        await _processCompletedPayment(requests[0], status);
      }
    }
    const [r] = await db.execute("SELECT callback_data FROM payment_requests WHERE reference_number = ?", [OrderTrackingId]);
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
      "SELECT id, status FROM payment_requests WHERE reference_number = ?",
      [OrderTrackingId]
    );

    if (existing.length && existing[0].status === 'completed') {
      return res.status(200).send('OK');
    }

    const status = await pesapal.getPaymentStatus(OrderTrackingId);
    if (status.status_code === 1) {
      const [requests] = await db.execute(
        "SELECT * FROM payment_requests WHERE reference_number = ? AND status = 'pending'",
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
    'INSERT INTO payments (user_id, amount, payment_method, status, created_at) VALUES (?, ?, "pesapal", "completed", NOW())',
    [userId, amount]
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
      [user.id, amount, user.phone_number || '', order.order_tracking_id, ref, JSON.stringify({ type: 'wallet_topup', user_id: user.id, amount })]
    );

    return res.json({ success: true, redirect_url: order.redirect_url, payment_url: order.redirect_url, order_tracking_id: order.order_tracking_id });
  } catch (e) {
    logger.error('Topup initiation error:', e.response?.data || e.message);
    res.status(500).json({ error: 'Hitilafu. Jaribu tena.' });
  }
}

module.exports = { initiatePayment, initiateWalletTopup, checkPaymentStatus, paymentCallback, paymentIPN };
