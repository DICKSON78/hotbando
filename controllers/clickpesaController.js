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

function currentPaymentUser(req) {
  return req.session?.hotbando_user || req.session?.user || req.session?.admin_user || req.session?.partner;
}

function normalizeTanzanianPhone(input) {
  let phone = String(input || '').replace(/\D/g, '');
  if (phone.startsWith('0')) phone = `255${phone.slice(1)}`;
  if (!phone.startsWith('255') || phone.length !== 12) return null;
  return phone;
}

function formatFeeQuote(preview, amount) {
  const methods = Array.isArray(preview?.activeMethods) ? preview.activeMethods : [];
  const senderProvider = String(preview?.sender?.accountProvider || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const available = methods.filter(method => String(method.status || '').toUpperCase() === 'AVAILABLE');
  const selected = available.find(method => String(method.name || '').toUpperCase().replace(/[^A-Z0-9]/g, '') === senderProvider)
    || (available.length === 1 ? available[0] : null);
  if (!selected) throw new Error('ClickPesa haikuweza kuthibitisha njia ya malipo kwa namba hii.');
  const fee = Number(selected.fee || 0);
  return {
    amount: Number(amount),
    fee,
    total: Number(amount) + fee,
    channel: selected.name || preview?.sender?.accountProvider || null,
  };
}

async function getPackageAmount(packageId) {
  if (!packageId) return null;
  const [rows] = await db.execute('SELECT id, price FROM packages WHERE id = ? AND is_active = 1', [packageId]);
  return rows.length ? Number(rows[0].price) : null;
}

exports.previewPayment = async (req, res) => {
  try {
    const { purpose, package_id, amount: requestedAmount } = req.body;
    const user = currentPaymentUser(req);
    if (purpose === 'package_purchase' && !user && !req.body.gift) {
      return res.status(401).json({ error: 'Ingia kwanza ili kununua kifurushi.' });
    }
    const phone = normalizeTanzanianPhone(req.body.phoneNumber || req.body.phone_number);
    if (!phone) return res.status(400).json({ error: 'Namba ya simu si sahihi.' });

    let amount = Number(requestedAmount);
    if (purpose === 'package_purchase') {
      amount = await getPackageAmount(package_id);
      if (!amount) return res.status(400).json({ error: 'Kifurushi hakipo au hakitumiki.' });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Kiasi cha malipo si sahihi.' });
    }

    const orderReference = generateOrderRef();
    const preview = await clickpesa.previewUSSDPush({ amount, phoneNumber: phone, orderReference });
    const quote = formatFeeQuote(preview, amount);
    return res.json({ success: true, ...quote, currency: 'TZS' });
  } catch (error) {
    logger.error('ClickPesa fee preview error', { error: error.response?.data?.message || error.message });
    return res.status(502).json({ error: error.response?.data?.message || error.message || 'Imeshindikana kukokotoa ada ya malipo.' });
  }
};

exports.initiatePayment = async (req, res) => {
  try {
    const { phoneNumber, purpose, package_id, gift, recipient_phone } = req.body;
    const user = currentPaymentUser(req);

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Namba ya simu inahitajika' });
    }

    // Require login for package purchases
    if (purpose === 'package_purchase' && !user && !gift) {
      return res.status(401).json({ error: 'Please log in first to buy a package.' });
    }

    const phone = normalizeTanzanianPhone(phoneNumber);
    if (!phone) return res.status(400).json({ error: 'Namba ya simu si sahihi.' });
    const recipientPhone = gift ? normalizeTanzanianPhone(recipient_phone) : null;
    if (gift && !recipientPhone) return res.status(400).json({ error: 'Weka namba sahihi ya mpokeaji wa voucher.' });
    const orderReference = generateOrderRef();

    // Server-side amount validation: amount must match the package price from DB
    let amount = req.body.amount;
    const purposeFinal = purpose || 'payment';

    if (purposeFinal === 'package_purchase' && package_id) {
      const [pkgs] = await db.execute('SELECT id, price, duration_hours, name FROM packages WHERE id = ? AND is_active = 1', [package_id]);
      if (!pkgs.length) {
        return res.status(400).json({ error: 'Kifurushi hakipo' });
      }
      const pkg = pkgs[0];
      // Always use server-side price — ignore client-supplied amount
      amount = Number(pkg.price);
    } else if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount inahitajika' });
    }

    const preview = await clickpesa.previewUSSDPush({ amount, phoneNumber: phone, orderReference });
    const feeQuote = formatFeeQuote(preview, amount);
    if (req.body.expectedTotal !== undefined && req.body.expectedTotal !== null
      && Math.abs(Number(req.body.expectedTotal) - feeQuote.total) > 0.01) {
      return res.status(409).json({
        error: 'Ada ya malipo imebadilika. Tafadhali kagua jumla mpya kabla ya kuendelea.',
        quote: { ...feeQuote, currency: 'TZS' },
      });
    }

    const extraData = {
      package_id: package_id || null,
      package_name: null,
      package_duration_hours: null,
      gift: !!gift,
      recipient_phone: recipientPhone,
      mac_address: user?.mac_address || req.session?.mac || null,
      router_id: user?.last_router_id || req.session?.routerID || null,
      provider_fee: feeQuote?.fee ?? null,
      customer_total: feeQuote?.total ?? null,
      fee_channel: feeQuote?.channel ?? null,
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
      'INSERT INTO clickpesa_transactions (order_reference, user_id, amount, phone, purpose, status, extra_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [orderReference, user?.id || null, amount, phone, purposeFinal, 'PENDING', JSON.stringify(extraData)]
    );

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
      amount: Number(amount),
      providerFee: feeQuote?.fee ?? null,
      customerTotal: feeQuote?.total ?? null,
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
  const conn = await db.getConnection();
  try {
    const { fulfillClickPesaPayment } = require('../services/paymentFulfillment');
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT amount, clickpesa_id FROM clickpesa_transactions WHERE order_reference = ? FOR UPDATE', [orderReference]);
    if (!rows.length) throw new Error(`ClickPesa order not found: ${orderReference}`);
    const result = await fulfillClickPesaPayment({
      orderReference,
      amount: rows[0].amount,
      currency: 'TZS',
      providerRef: rows[0].clickpesa_id,
    }, conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    logger.error('Process and activate error', { error: error.message, orderReference });
    throw error;
  } finally {
    conn.release();
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
    const { usageUntil: newUsageUntil } = await require('../utils/packageEntitlement').extendUserPackage(db, userId, pkg);
    await db.execute('UPDATE users SET moneyspent = moneyspent + ?, updated_at = NOW() WHERE id = ?', [amount, userId]);
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
