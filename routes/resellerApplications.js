'use strict';
// Public reseller applications: list equipment plans, submit an application, look up its status.
// No account is created here. HQ reviews and approves in routes/resellerOnboarding.js.
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/database');
const { rateLimit } = require('../middleware/security');
const router = express.Router();

const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const num = (v) => Number(v || 0);
const normPhone = (p) => {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '255' + d.slice(1);
  return /^255[67]\d{8}$/.test(d) ? d : null;
};
const LABELS = {
  new: 'Limepokelewa',
  reviewing: 'Linakaguliwa',
  approved: 'Limeidhinishwa',
  scheduled: 'Ufungaji umepangwa',
  installed: 'Vifaa vimefungwa',
  rejected: 'Halijakubaliwa'
};

const submitIpLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 30 });
const submitPhoneLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  key: (req) => normPhone(req.body && req.body.phone) || ('x' + crypto.randomBytes(6).toString('hex'))
});
const statusLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 60 });

router.get('/plans', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT p.id, p.name, p.plan_type, p.equipment_list, p.total_price, p.deposit, p.financed_amount,
              p.repayment_percent, p.maintenance_percent, ep.name AS partner_name
       FROM equipment_plans p LEFT JOIN equipment_partners ep ON ep.id = p.partner_id
       WHERE p.is_active = 1 ORDER BY FIELD(p.plan_type, 'hq_supplied', 'outright', 'financed'), p.total_price`
    );
    res.json({
      plans: rows.map(r => ({
        ...r, total_price: num(r.total_price), deposit: num(r.deposit), financed_amount: num(r.financed_amount),
        repayment_percent: num(r.repayment_percent), maintenance_percent: num(r.maintenance_percent)
      }))
    });
  } catch (e) {
    console.error('reseller-applications plans error:', e);
    res.status(500).json({ error: 'Imeshindikana kupakia mipango' });
  }
});

router.post('/', submitIpLimit, submitPhoneLimit, async (req, res) => {
  try {
    const b = req.body || {};
    if (b.website) return res.json({ success: true, reference: 'RA00000000', message: 'Ombi limepokelewa' }); // honeypot

    const name = str(b.name, 100);
    const businessName = str(b.business_name, 150) || null;
    const phone = normPhone(b.phone);
    const email = str(b.email, 190).toLowerCase();
    const password = String(b.password || '');
    const region = str(b.region, 80);
    const district = str(b.district, 80);
    const ward = str(b.ward, 80) || null;
    const address = str(b.address, 255) || null;
    const landmark = str(b.landmark, 255) || null;
    const businessType = str(b.business_type, 80) || null;
    const notes = str(b.notes, 1000) || null;
    const expected = (b.expected_customers === '' || b.expected_customers == null) ? null : Math.floor(Number(b.expected_customers));
    const planId = (b.plan_id === '' || b.plan_id == null) ? null : Number(b.plan_id);

    if (name.length < 2) return res.status(400).json({ error: 'Andika jina lako kamili' });
    if (!phone) return res.status(400).json({ error: 'Namba ya simu si sahihi (mfano 0712345678)' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Barua pepe si sahihi' });
    if (password.length < 8 || password.length > 72) return res.status(400).json({ error: 'Nenosiri liwe na herufi 8 hadi 72' });
    if (!region || !district) return res.status(400).json({ error: 'Chagua mkoa na andika wilaya' });
    if (expected !== null && (!Number.isFinite(expected) || expected < 0 || expected > 100000)) {
      return res.status(400).json({ error: 'Idadi ya wateja si sahihi' });
    }
    if (planId !== null) {
      if (!Number.isInteger(planId)) return res.status(400).json({ error: 'Mpango si sahihi' });
      const [p] = await db.execute('SELECT id FROM equipment_plans WHERE id = ? AND is_active = 1', [planId]);
      if (!p.length) return res.status(400).json({ error: 'Mpango uliochagua haupatikani' });
    }

    const [u] = await db.execute('SELECT id FROM users WHERE phone_number IN (?, ?) OR email = ? LIMIT 1', [phone, '+' + phone, email]);
    if (u.length) return res.status(409).json({ error: 'Namba au barua pepe hii tayari ina akaunti. Ingia, au tumia nyingine.' });
    const [a] = await db.execute("SELECT id FROM reseller_applications WHERE (phone = ? OR email = ?) AND status <> 'rejected' LIMIT 1", [phone, email]);
    if (a.length) return res.status(409).json({ error: 'Tayari kuna ombi kwa namba au barua pepe hii. Angalia hali yake.' });

    const hash = await bcrypt.hash(password, 12);
    const ip = str(req.headers['x-forwarded-for'] || req.ip, 64);
    let ref = null; let id = null;
    for (let i = 0; i < 3 && !id; i++) {
      ref = 'RA' + crypto.randomBytes(4).toString('hex').toUpperCase();
      try {
        const [r] = await db.execute(
          `INSERT INTO reseller_applications
             (application_ref, name, business_name, phone, email, password_hash, region, district, ward, address, landmark,
              business_type, expected_customers, plan_id, notes, created_ip)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [ref, name, businessName, phone, email, hash, region, district, ward, address, landmark, businessType, expected, planId, notes, ip]
        );
        id = r.insertId;
      } catch (e) {
        if (e.code !== 'ER_DUP_ENTRY') throw e;
      }
    }
    if (!id) throw new Error('Could not allocate an application reference');
    res.status(201).json({ success: true, reference: ref, message: 'Ombi limepokelewa. HQ atakagua na kuwasiliana nawe.' });
  } catch (e) {
    console.error('reseller-applications submit error:', e);
    res.status(500).json({ error: 'Imeshindikana kutuma ombi. Jaribu tena.' });
  }
});

router.post('/status', statusLimit, async (req, res) => {
  try {
    const ref = str(req.body && req.body.reference, 20).toUpperCase();
    const phone = normPhone(req.body && req.body.phone);
    if (!ref || !phone) return res.status(400).json({ error: 'Andika namba ya ombi na simu' });
    const [rows] = await db.execute(
      `SELECT a.application_ref, a.name, a.status, a.rejection_reason, a.user_id, a.region, a.district,
              DATE_FORMAT(a.install_date, '%Y-%m-%d') AS install_date, a.install_time, a.technician, a.install_notes,
              a.created_at, p.name AS plan_name, p.plan_type
       FROM reseller_applications a LEFT JOIN equipment_plans p ON p.id = a.plan_id
       WHERE a.application_ref = ? AND a.phone = ? LIMIT 1`,
      [ref, phone]
    );
    if (!rows.length) return res.status(404).json({ error: 'Ombi halijapatikana. Hakikisha namba ya ombi na simu.' });
    const a = rows[0];
    res.json({
      reference: a.application_ref, name: a.name, status: a.status, status_label: LABELS[a.status] || a.status,
      rejection_reason: a.status === 'rejected' ? a.rejection_reason : null,
      can_login: !!a.user_id, region: a.region, district: a.district, plan_name: a.plan_name, plan_type: a.plan_type,
      schedule: a.install_date ? { date: a.install_date, time: a.install_time, technician: a.technician, notes: a.install_notes } : null,
      created_at: a.created_at
    });
  } catch (e) {
    console.error('reseller-applications status error:', e);
    res.status(500).json({ error: 'Imeshindikana kuangalia hali' });
  }
});

module.exports = router;
