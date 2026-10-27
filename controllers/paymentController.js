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

function currentUser(req) {
  return req.user
    || req.session?.hotbando_user
    || req.session?.reseller_user
    || req.session?.sponsor_user
    || req.session?.bank_user
    || req.session?.admin_user
    || req.session?.user
    || null;
}

function appBaseUrl() {
  const configured = String(process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(configured)) return configured;
  return 'https://hotbandowifi.online';
}

function normalizeReturnPath(value, fallback) {
  try {
    const base = appBaseUrl();
    const parsed = new URL(String(value || ''), `${base}/`);
    if (parsed.origin !== new URL(base).origin) return fallback;
    if (!/^\/(hotspot|reseller|sponsor|bank|admin)(\/|$)/.test(parsed.pathname)) return fallback;
    return `${parsed.pathname}${parsed.search}`;
  } catch (_) {
    return fallback;
  }
}

function paymentReturnUrl(path, trackingId, paymentState) {
  try {
    const parsed = new URL(path || '/hotspot/dashboard', `${appBaseUrl()}/`);
    parsed.searchParams.set('payment', paymentState);
    if (trackingId) parsed.searchParams.set('order_tracking_id', trackingId);
    return `${parsed.pathname}${parsed.search}`;
  } catch (_) {
    return `/hotspot/dashboard?payment=${encodeURIComponent(paymentState)}`;
  }
}

function parseCallbackData(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return {};
  }
}

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('255')) return digits;
  if (digits.startsWith('0')) return `255${digits.slice(1)}`;
  return digits;
}

function customerName(user) {
  const parts = String(user?.name || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || 'HotBando',
    lastName: parts.slice(1).join(' ') || 'Customer',
  };
}

async function getPesapalSettings() {
  const [settings] = await db.execute(
    "SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'pesapal_%'"
  );
  const config = {};
  settings.forEach(s => { config[s.setting_key] = s.setting_value; });
  return config;
}

function configurePesapal(config) {
  pesapal.init({
    consumer_key: config.pesapal_consumer_key,
    consumer_secret: config.pesapal_consumer_secret,
    env: config.pesapal_env || 'sandbox',
    callback_url: config.pesapal_callback_url,
    ipn_url: config.pesapal_ipn_url,
    ipn_secret: config.pesapal_ipn_secret || undefined,
  });
}

async function initPesapalFromSettings() {
  const config = await getPesapalSettings();
  if (!config.pesapal_consumer_key || !config.pesapal_consumer_secret) {
    throw new Error('PesaPal is not configured');
  }
  configurePesapal(config);
  return config;
}

async function ensureNotificationId(config) {
  if (config.pesapal_ipn_id) return config.pesapal_ipn_id;
  const ipnUrl = config.pesapal_ipn_url || `${appBaseUrl()}/api/payments/ipn`;
  const ipnResult = await pesapal.registerIPN(ipnUrl);
  if (!ipnResult?.ipn_id) throw new Error('PesaPal did not return an IPN id');
  await db.execute(
    "INSERT INTO system_settings (setting_key, setting_value) VALUES ('pesapal_ipn_id', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
    [ipnResult.ipn_id, ipnResult.ipn_id]
  );
  return ipnResult.ipn_id;
}

async function createPaymentRequest({ userId, amount, phone, reference, callbackData }) {
  const [result] = await db.execute(
    "INSERT INTO payment_requests (user_id, payment_method, amount, phone_number, reference_number, status, callback_data) VALUES (?, 'pesapal', ?, ?, ?, 'pending', ?)",
    [userId, amount, phone, reference, JSON.stringify(callbackData)]
  );
  return result.insertId;
}

async function submitPesapalOrder({ id, amount, description, user, phone, notificationId }) {
  const { firstName, lastName } = customerName(user);
  return pesapal.submitOrder({
    id,
    amount,
    description,
    notification_id: notificationId,
    email: user.email || 'no-reply@hotbandowifi.online',
    phone,
    firstName,
    lastName,
  });
}

async function initiatePayment(req, res) {
  try {
    const { package_id, phone_number, gift, recipient_phone } = req.body;
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Ingia kwanza' });

    const [packages] = await db.execute('SELECT * FROM packages WHERE id = ? AND is_active = 1', [package_id]);
    if (!packages.length) return res.status(404).json({ error: 'Kifurushi hakipo' });

    const pkg = packages[0];
    const ref = `HB${Date.now()}${crypto.randomBytes(3).toString('hex')}`;
    const isGift = !!gift;
    const phone = normalizePhone(phone_number || user.phone_number || '');
    if (!phone) return res.status(400).json({ error: 'Namba ya simu inahitajika' });

    const returnPath = normalizeReturnPath(
      req.body.return_path,
      isGift ? '/hotspot/subscribe' : '/hotspot/dashboard'
    );
    const callbackData = {
      type: 'package_purchase',
      package_id: pkg.id,
      package_name: pkg.name,
      gift: isGift,
      recipient_phone: isGift ? recipient_phone || null : null,
      return_path: returnPath,
      mac_address: user.mac_address || req.session?.mac || null,
      router_id: user.last_router_id || req.session?.routerID || null,
      phone,
    };

    const config = await getPesapalSettings();
    if (!config.pesapal_consumer_key || !config.pesapal_consumer_secret) {
      // DEMO MODE (explicit opt-in only): when PesaPal is not configured AND
      // DEMO_PAYMENTS=true, complete instantly for testing. Otherwise fail
      // closed so no real access is granted without real money.
      if (process.env.DEMO_PAYMENTS !== 'true') {
        return res.status(400).json({ error: 'Malipo ya mtandao hayajasanidiwa kwa sasa. Tumia voucher au wasiliana na msimamizi.' });
      }

      await db.execute(
        "INSERT INTO payment_requests (user_id, payment_method, amount, phone_number, reference_number, merchant_request_id, status, callback_data) VALUES (?, 'pesapal', ?, ?, ?, ?, 'completed', ?)",
        [user.id, pkg.price, phone, ref, ref, JSON.stringify({ ...callbackData, demo: true })]
      );

      if (isGift) {
        const voucher = await _createGiftVoucher(pkg.id, pkg.price);
        return res.json({ success: true, demo: true, voucher, message: 'Voucher imegeneratiwa! Tuma kwa mtu unayemnunulia.' });
      }

      await _activatePackage(user.id, pkg.id, pkg.price, callbackData);
      return res.json({ success: true, demo: true, activated: true, message: `Kifurushi "${pkg.name}" kimewashwa!` });
    }

    configurePesapal(config);
    const notificationId = await ensureNotificationId(config);
    const paymentRequestId = await createPaymentRequest({
      userId: user.id,
      amount: pkg.price,
      phone,
      reference: ref,
      callbackData,
    });

    let order;
    try {
      order = await submitPesapalOrder({
        id: ref,
        amount: pkg.price,
        description: `HotBando ${pkg.name}`,
        user,
        phone,
        notificationId,
      });
      if (!order?.order_tracking_id || !order?.redirect_url) {
        throw new Error('PesaPal did not return a checkout URL');
      }
    } catch (error) {
      await db.execute(
        "UPDATE payment_requests SET status = 'failed', status_message = ? WHERE id = ?",
        [String(error.response?.data?.message || error.message || 'PesaPal order failed').slice(0, 500), paymentRequestId]
      );
      throw error;
    }

    await db.execute(
      'UPDATE payment_requests SET merchant_request_id = ? WHERE id = ?',
      [order.order_tracking_id, paymentRequestId]
    );

    return res.json({
      success: true,
      redirect_url: order.redirect_url,
      payment_url: order.redirect_url,
      order_tracking_id: order.order_tracking_id,
    });
  } catch (e) {
    logger.error('Payment initiation error:', e.response?.data || e.message);
    res.status(500).json({ error: 'Hitilafu. Jaribu tena.' });
  }
}

function paymentStatusResponse(payment, data, status) {
  const isCompleted = status === 'completed';
  const voucher = data.gift_voucher || null;
  let message = 'Malipo yamekamilika kikamilifu!';
  if (status === 'failed') message = 'Malipo hayajakamilika. Tafadhali jaribu tena.';
  else if (status === 'pending') message = 'Malipo bado hayajakamilika.';
  else if (voucher) message = 'Malipo yamekamilika! Voucher imegeneratiwa.';
  else if (data.type === 'wallet_topup') message = 'Malipo yamekamilika! Salio limeongezwa.';
  else if (data.package_id) message = 'Malipo yamekamilika! Kifurushi kimewashwa.';

  return {
    success: isCompleted,
    status,
    message,
    voucher,
    package_id: data.package_id || null,
    type: data.type || (data.package_id ? 'package_purchase' : null),
    amount: payment.amount,
    order_tracking_id: payment.merchant_request_id,
  };
}

async function checkPaymentStatus(req, res) {
  try {
    const orderTrackingId = req.params?.order_tracking_id || req.body?.order_tracking_id;
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Ingia kwanza' });
    if (!orderTrackingId) return res.status(400).json({ error: 'Order tracking id inahitajika' });

    const [requests] = await db.execute(
      'SELECT * FROM payment_requests WHERE merchant_request_id = ? AND user_id = ?',
      [orderTrackingId, user.id]
    );

    if (!requests.length) {
      return res.json({ success: false, status: 'not_found' });
    }

    const payment = requests[0];
    const data = parseCallbackData(payment.callback_data);

    if (payment.status === 'completed') {
      return res.json(paymentStatusResponse(payment, data, 'completed'));
    }
    if (['failed', 'cancelled', 'timeout'].includes(payment.status)) {
      return res.json(paymentStatusResponse(payment, data, 'failed'));
    }

    if (payment.status === 'pending' && payment.merchant_request_id) {
      try {
        await initPesapalFromSettings();
        const status = await pesapal.getPaymentStatus(orderTrackingId);
        if (Number(status.status_code) === 1) {
          await _processCompletedPayment(payment, status);
          const [fresh] = await db.execute('SELECT * FROM payment_requests WHERE id = ?', [payment.id]);
          const freshPayment = fresh[0] || payment;
          const freshData = parseCallbackData(freshPayment.callback_data);
          if (freshPayment.status === 'completed') {
            return res.json(paymentStatusResponse(freshPayment, freshData, 'completed'));
          }
          return res.json({ success: false, status: 'pending', message: 'Malipo bado hayajakamilika' });
        }
        if (Number(status.status_code) === 2 || Number(status.status_code) === 3) {
          await db.execute(
            "UPDATE payment_requests SET status = 'failed', status_message = ? WHERE id = ?",
            [String(status.payment_status_description || 'PesaPal reported failure').slice(0, 500), payment.id]
          );
          return res.json(paymentStatusResponse(payment, data, 'failed'));
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
  // Claim the request atomically so a callback and an IPN arriving together
  // cannot credit the same payment twice.
  const [claim] = await db.execute(
    "UPDATE payment_requests SET status = 'processing' WHERE id = ? AND status = 'pending'",
    [reqData.id]
  );
  if (claim.affectedRows !== 1) return false;

  try {
    const data = parseCallbackData(reqData.callback_data);

    if (data.type === 'wallet_topup') {
      const [existing] = await db.execute(
        'SELECT id FROM transactions WHERE user_id = ? AND payment_reference = ? LIMIT 1',
        [reqData.user_id, reqData.reference_number]
      );
      if (!existing.length) {
        await Wallet.deposit(
          reqData.user_id,
          reqData.amount,
          'pesapal',
          reqData.reference_number,
          `Wallet top-up via Pesapal - TSH ${Number(reqData.amount).toLocaleString()}`
        );
      }
      logger.info(`✅ Wallet top-up: User #${reqData.user_id} +TSH ${reqData.amount}`);
    } else if (data.gift) {
      if (!data.gift_voucher) {
        data.gift_voucher = await _createGiftVoucher(data.package_id, reqData.amount);
        await db.execute(
          'UPDATE payment_requests SET callback_data = ? WHERE id = ?',
          [JSON.stringify(data), reqData.id]
        );
      }
    } else if (data.package_id && !data.activated) {
      await _activatePackage(reqData.user_id, data.package_id, reqData.amount, data);
      data.activated = true;
      await db.execute(
        'UPDATE payment_requests SET callback_data = ? WHERE id = ?',
        [JSON.stringify(data), reqData.id]
      );
    }

    await db.execute(
      "UPDATE payment_requests SET status = 'completed', completed_at = NOW(), callback_data = JSON_SET(IFNULL(callback_data, '{}'), '$.pesapal_status', ?) WHERE id = ?",
      [JSON.stringify(status), reqData.id]
    );
    return true;
  } catch (error) {
    await db.execute(
      "UPDATE payment_requests SET status = 'pending', status_message = ? WHERE id = ? AND status = 'processing'",
      [String(error.message || 'Payment processing failed').slice(0, 500), reqData.id]
    );
    throw error;
  }
}

async function paymentCallback(req, res) {
  const orderTrackingId = req.query.OrderTrackingId || req.query.orderTrackingId;
  if (!orderTrackingId) return res.status(400).send('Missing tracking ID');

  let returnPath = '/hotspot/dashboard';
  let paymentState = 'failed';

  try {
    const [existing] = await db.execute(
      'SELECT * FROM payment_requests WHERE merchant_request_id = ?',
      [orderTrackingId]
    );
    const existingPayment = existing[0] || null;
    let callbackData = parseCallbackData(existingPayment?.callback_data);
    returnPath = callbackData.return_path || returnPath;

    if (existingPayment?.status === 'completed') {
      return res.redirect(paymentReturnUrl(returnPath, orderTrackingId, 'completed'));
    }

    await initPesapalFromSettings();
    const status = await pesapal.getPaymentStatus(orderTrackingId);

    if (Number(status.status_code) === 1) {
      const [requests] = await db.execute(
        "SELECT * FROM payment_requests WHERE merchant_request_id = ? AND status = 'pending'",
        [orderTrackingId]
      );
      if (requests.length) {
        await _processCompletedPayment(requests[0], status);
      }
      const [fresh] = await db.execute(
        'SELECT status, callback_data FROM payment_requests WHERE merchant_request_id = ?',
        [orderTrackingId]
      );
      callbackData = parseCallbackData(fresh[0]?.callback_data);
      returnPath = callbackData.return_path || returnPath;
      paymentState = fresh[0]?.status === 'completed' ? 'completed' : 'pending';
    } else if (Number(status.status_code) === 2 || Number(status.status_code) === 3) {
      await db.execute(
        "UPDATE payment_requests SET status = 'failed', status_message = ? WHERE merchant_request_id = ?",
        [String(status.payment_status_description || 'PesaPal reported failure').slice(0, 500), orderTrackingId]
      );
      paymentState = 'failed';
    } else {
      paymentState = 'pending';
    }

    return res.redirect(paymentReturnUrl(returnPath, orderTrackingId, paymentState));
  } catch (e) {
    logger.error('Callback error:', e.message);
    const fallback = normalizeReturnPath(returnPath, '/hotspot/subscribe');
    return res.redirect(paymentReturnUrl(fallback, orderTrackingId, 'failed'));
  }
}

async function paymentIPN(req, res) {
  const payload = { ...(req.query || {}), ...(req.body || {}) };
  const orderTrackingId = payload.OrderTrackingId || payload.orderTrackingId;
  if (!orderTrackingId) return res.status(400).send('Missing tracking ID');

  try {
    await initPesapalFromSettings();
    const merchantReference = payload.OrderMerchantReference || payload.MerchantReference;
    const notificationStatus = payload.OrderNotificationType || payload.Status;
    const signature = payload.Signature || payload.signature;

    if (!pesapal.verifyIPNSignature(orderTrackingId, merchantReference, notificationStatus, signature)) {
      logger.warn('Invalid IPN signature:', { orderTrackingId, ip: req.ip });
      return res.status(403).send('Invalid signature');
    }

    const [existing] = await db.execute(
      'SELECT id, status FROM payment_requests WHERE merchant_request_id = ?',
      [orderTrackingId]
    );
    if (existing.length && existing[0].status === 'completed') {
      return res.status(200).send('OK');
    }

    const status = await pesapal.getPaymentStatus(orderTrackingId);
    if (Number(status.status_code) === 1) {
      const [requests] = await db.execute(
        "SELECT * FROM payment_requests WHERE merchant_request_id = ? AND status = 'pending'",
        [orderTrackingId]
      );
      if (requests.length) {
        await _processCompletedPayment(requests[0], status);
      }
    } else if (Number(status.status_code) === 2 || Number(status.status_code) === 3) {
      await db.execute(
        "UPDATE payment_requests SET status = 'failed', status_message = ? WHERE merchant_request_id = ? AND status = 'pending'",
        [String(status.payment_status_description || 'PesaPal reported failure').slice(0, 500), orderTrackingId]
      );
    }
    res.status(200).send('OK');
  } catch (e) {
    logger.error('IPN error:', e.message);
    res.status(500).send('Error');
  }
}

async function _activatePackage(userId, packageId, amount, callbackData = {}) {
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

  const mac = callbackData.mac_address || user.mac_address;
  const routerID = callbackData.router_id || user.last_router_id;
  if (mac && routerID) {
    try {
      const mikrotikService = require('../utils/mikrotik');
      const uptime = Math.max(0, (newUsageUntil.getTime() - now.getTime()) / 1000);
      await mikrotikService.addUserToRouter(mac, routerID, uptime, 0);
      logger.info(`Auto-connected after Pesapal payment: mac=${mac}, router=${routerID}`);
    } catch (routerErr) {
      logger.error('Auto-connect after Pesapal payment failed (non-critical)', { error: routerErr.message, mac, routerID });
    }
  }
}

function defaultWalletReturnPath(user) {
  if (user?.role === 'reseller') return '/reseller/topup';
  if (user?.role === 'admin' || user?.role === 'super_admin') return '/admin/overview';
  return '/sponsor/wallet';
}

async function initiateWalletTopup(req, res) {
  try {
    const amount = Number(req.body.amount);
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Ingia kwanza' });

    if (!Number.isFinite(amount) || amount < 1000) {
      return res.status(400).json({ error: 'Kiasi cha chini ni TSH 1,000' });
    }

    const phone = normalizePhone(req.body.phone_number || user.phone_number || '');
    if (!phone) return res.status(400).json({ error: 'Namba ya simu inahitajika' });

    const returnPath = normalizeReturnPath(
      req.body.return_path,
      defaultWalletReturnPath(user)
    );
    const ref = `TW${Date.now()}${crypto.randomBytes(3).toString('hex')}`;
    const callbackData = {
      type: 'wallet_topup',
      user_id: user.id,
      amount,
      return_path: returnPath,
      phone,
    };

    const config = await getPesapalSettings();
    if (!config.pesapal_consumer_key || !config.pesapal_consumer_secret) {
      return res.status(400).json({ error: 'PesaPal haijasanidiwa. Wasiliana na msimamizi.' });
    }

    configurePesapal(config);
    const notificationId = await ensureNotificationId(config);
    const paymentRequestId = await createPaymentRequest({
      userId: user.id,
      amount,
      phone,
      reference: ref,
      callbackData,
    });

    let order;
    try {
      order = await submitPesapalOrder({
        id: ref,
        amount,
        description: `HotBando Wallet Top-up - TSH ${Number(amount).toLocaleString()}`,
        user,
        phone,
        notificationId,
      });
      if (!order?.order_tracking_id || !order?.redirect_url) {
        throw new Error('PesaPal did not return a checkout URL');
      }
    } catch (error) {
      await db.execute(
        "UPDATE payment_requests SET status = 'failed', status_message = ? WHERE id = ?",
        [String(error.response?.data?.message || error.message || 'PesaPal order failed').slice(0, 500), paymentRequestId]
      );
      throw error;
    }

    await db.execute(
      'UPDATE payment_requests SET merchant_request_id = ? WHERE id = ?',
      [order.order_tracking_id, paymentRequestId]
    );

    return res.json({
      success: true,
      redirect_url: order.redirect_url,
      payment_url: order.redirect_url,
      order_tracking_id: order.order_tracking_id,
    });
  } catch (e) {
    logger.error('Topup initiation error:', e.response?.data || e.message);
    res.status(500).json({ error: 'Hitilafu. Jaribu tena.' });
  }
}

module.exports = { initiatePayment, initiateWalletTopup, checkPaymentStatus, paymentCallback, paymentIPN };
