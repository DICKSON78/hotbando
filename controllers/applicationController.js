const db = require('../config/database');
const logger = require('../utils/logger');
const clickpesa = require('../utils/clickpesa');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const APPLICATION_FEES = {
  franchise_owner: 50000,
  sponsor: 30000,
  bank_partner: 0,
  investor: 100000,
  reseller: 20000,
};

const ROLE_LABELS = {
  franchise_owner: 'Franchise Owner',
  sponsor: 'Sponsor / Advertiser',
  bank_partner: 'Bank Partner',
  investor: 'Investor',
  reseller: 'Reseller',
};

exports.getApplicationTypes = async (req, res) => {
  try {
    const types = Object.entries(APPLICATION_FEES).map(([role, fee]) => ({
      role,
      label: ROLE_LABELS[role],
      fee,
      description: getDescription(role),
    }));
    res.json({ success: true, types });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load application types' });
  }
};

exports.submitApplication = async (req, res) => {
  try {
    const { role, name, email, phone, password, company, location, business_type, notes } = req.body;

    if (!role || !name || !phone || !password) {
      return res.status(400).json({ error: 'Jaza sehemu zote zinazohitajika' });
    }
    if (!APPLICATION_FEES.hasOwnProperty(role)) {
      return res.status(400).json({ error: 'Aina ya usajili si sahihi' });
    }

    const normalizedPhone = phone.startsWith('255') ? phone : phone.replace(/^0/, '255');
    const fee = APPLICATION_FEES[role];

    const [existing] = await db.execute(
      'SELECT id FROM applications WHERE phone = ? AND status IN ("pending","payment_made","approved")',
      [normalizedPhone]
    );
    if (existing.length) {
      return res.status(409).json({ error: 'Ombi tayari limewasilishwa kwa namba hii. Subiri ukaguzi.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await db.execute(
      `INSERT INTO applications (role, name, email, phone, password_hash, company, location, business_type, notes, fee_amount, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [role, name, email || null, normalizedPhone, hashedPassword, company || null, location || null, business_type || null, notes || null, fee]
    );

    const applicationId = result.insertId;
    const orderRef = `AP${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    await db.execute(
      'UPDATE applications SET order_reference = ? WHERE id = ?',
      [orderRef, applicationId]
    );

    if (fee === 0) {
      await db.execute('UPDATE applications SET status = "submitted" WHERE id = ?', [applicationId]);
      return res.json({
        success: true,
        applicationId,
        noPayment: true,
        message: 'Ombi limewasilishwa! Utapewa akaunti baada ya ukaguzi.',
      });
    }

    const payResult = await clickpesa.initiateUSSDPush({
      amount: fee,
      phoneNumber: normalizedPhone,
      orderReference: orderRef,
    });

    if (payResult.status === 'FAILED') {
      await db.execute('UPDATE applications SET status = "payment_failed" WHERE id = ?', [applicationId]);
      return res.status(400).json({ error: payResult.message || 'Malipo yameshindikana' });
    }

    await db.execute(
      'UPDATE applications SET status = "payment_pending", clickpesa_response = ? WHERE id = ?',
      [JSON.stringify(payResult), applicationId]
    );

    await db.execute(
      'INSERT INTO clickpesa_transactions (order_reference, user_id, amount, phone, purpose, status, extra_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [orderRef, null, fee, normalizedPhone, 'application_fee', payResult.status || 'PROCESSING',
       JSON.stringify({ application_id: applicationId, role })]
    );

    res.json({
      success: true,
      applicationId,
      orderReference: orderRef,
      status: payResult.status,
      channel: payResult.channel,
      fee,
      message: 'Tafadhali angalia simu yako na weka PIN kukamilisha malipo ya ada',
    });
  } catch (error) {
    logger.error('Submit application error', { error: error.message });
    res.status(500).json({ error: 'Imeshindikana kuwasilisha ombi' });
  }
};

exports.checkApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const [rows] = await db.execute('SELECT * FROM applications WHERE id = ?', [applicationId]);
    if (!rows.length) return res.status(404).json({ error: 'Ombi halijapatikana' });

    const app = rows[0];

    if (app.status === 'payment_pending' && app.order_reference) {
      const txResult = await clickpesa.queryPaymentStatus(app.order_reference);
      const paymentData = Array.isArray(txResult) ? txResult[0] : txResult;
      const newStatus = paymentData?.status || 'UNKNOWN';

      await db.execute('UPDATE clickpesa_transactions SET status = ?, clickpesa_response = ? WHERE order_reference = ?',
        [newStatus, JSON.stringify(txResult), app.order_reference]);

      if (newStatus === 'SUCCESS' || newStatus === 'SETTLED') {
        await db.execute('UPDATE applications SET status = "payment_made" WHERE id = ?', [applicationId]);

        await createAccount(app);

        return res.json({ success: true, status: 'approved', message: 'Malipo yamekamilika! Akaunti yako imeundwa.' });
      }

      if (newStatus === 'FAILED') {
        await db.execute('UPDATE applications SET status = "payment_failed" WHERE id = ?', [applicationId]);
        return res.json({ success: false, status: 'payment_failed', message: 'Malipo yameshindikana' });
      }
    }

    res.json({
      success: true,
      status: app.status,
      role: app.role,
      name: app.name,
    });
  } catch (error) {
    logger.error('Check application status error', { error: error.message });
    res.status(500).json({ error: 'Imeshindikana kuangalia hali' });
  }
};

exports.getApplications = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, role, name, email, phone, company, location, business_type, status, fee_amount, created_at FROM applications ORDER BY created_at DESC'
    );
    res.json({ success: true, applications: rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

exports.updateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const [rows] = await db.execute('SELECT * FROM applications WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Application not found' });

    const app = rows[0];

    if (status === 'approved' && app.status !== 'approved') {
      await createAccount(app);
    }

    await db.execute('UPDATE applications SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, message: 'Application updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update application' });
  }
};

async function createAccount(app) {
  try {
    const [existing] = await db.execute('SELECT id FROM users WHERE phone_number = ?', [app.phone]);
    if (existing.length) {
      await db.execute('UPDATE users SET role = ?, is_active = 1 WHERE id = ?', [app.role, existing[0].id]);
      return existing[0].id;
    }

    const email = app.email || `${app.phone}@hotbando.co.tz`;
    const [result] = await db.execute(
      `INSERT INTO users (name, email, phone_number, password, role, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, NOW())`,
      [app.name, email, app.phone, app.password_hash, app.role]
    );

    const userId = result.insertId;

    await db.execute(
      'INSERT INTO wallets (user_id, balance, total_deposited, created_at) VALUES (?, 0, 0, NOW())',
      [userId]
    );

    await db.execute('UPDATE applications SET user_id = ?, status = "approved" WHERE id = ?', [userId, app.id]);

    logger.info(`New ${app.role} account created from application #${app.id}: ${app.name}`);
    return userId;
  } catch (error) {
    logger.error('Create account error', { error: error.message, applicationId: app.id });
    return null;
  }
}

function getDescription(role) {
  const descs = {
    franchise_owner: 'Ununua sehemu na uendeshe HotBando WiFi. Pata mapato kutoka kwa wateja.',
    sponsor: 'Tangaza bidhaa yako kwenye HotBando WiFi. Fikia maelfu ya wateja.',
    bank_partner: 'Ushirikiano wa benki kupitia HotBando WiFi platform.',
    investor: 'Wekeza kwenye HotBando WiFi na upate faida ya kila mwezi.',
    reseller: 'uuze voucher za HotBando WiFi na upate kamisheni.',
  };
  return descs[role] || '';
}
