// Sends reseller withdrawals through ClickPesa mobile money payouts.
// One payout is created at most every 60 seconds (ClickPesa limit). A failed
// payout returns the full amount to the reseller's balance.
const db = require('../config/database');
const clickpesa = require('../utils/clickpesa');
const logger = require('../utils/logger');

const CREATE_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 20;
let lastCreateAt = 0;

function errorMessage(err) {
  return String(err?.response?.data?.message || err?.message || 'Unknown payout error').slice(0, 255);
}

function errorStatus(err) {
  return err?.response?.status || 0;
}

function normalizePhone(input) {
  let digits = String(input || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `255${digits.slice(1)}`;
  return /^255\d{9}$/.test(digits) ? digits : null;
}

async function refund(withdrawal) {
  await db.execute('UPDATE resellers SET balance = balance + ? WHERE id = ?', [withdrawal.amount, withdrawal.reseller_id]);
}

async function markFailed(withdrawal, message) {
  // Refund only once: the status change must succeed before the balance moves.
  const [result] = await db.execute(
    "UPDATE reseller_withdrawals SET status = 'failed', last_error = ? WHERE id = ? AND status IN ('sending', 'sent')",
    [message, withdrawal.id]
  );
  if (result.affectedRows === 0) return;
  await refund(withdrawal);
  logger.warn('Withdrawal payout failed, balance refunded', { withdrawal: withdrawal.id, message });
}

async function returnToPending(withdrawal, message) {
  await db.execute("UPDATE reseller_withdrawals SET status = 'pending', last_error = ? WHERE id = ? AND status = 'sending'", [message, withdrawal.id]);
}

async function reconcile(withdrawal) {
  const state = await clickpesa.queryPayoutStatus(withdrawal.order_reference);
  const status = String(state?.status || '').toUpperCase();
  if (status === 'SUCCESS') {
    await db.execute("UPDATE reseller_withdrawals SET status = 'processed', last_error = NULL WHERE id = ?", [withdrawal.id]);
  } else if (status === 'AUTHORIZED') {
    await db.execute("UPDATE reseller_withdrawals SET status = 'sent', last_error = NULL WHERE id = ?", [withdrawal.id]);
  } else if (status === 'REVERSED') {
    await markFailed(withdrawal, 'Payout reversed by provider');
  } else {
    await returnToPending(withdrawal, 'Payout status unknown, will retry');
  }
}

async function sendOne(withdrawal) {
  const phone = normalizePhone(withdrawal.payment_phone);
  if (!phone) return markFailed(withdrawal, 'Invalid mobile money number');

  const params = { amount: withdrawal.payout_amount, phoneNumber: phone, orderReference: withdrawal.order_reference };

  try {
    await clickpesa.previewMobilePayout(params);
  } catch (err) {
    const message = errorMessage(err);
    const code = errorStatus(err);
    if (code === 0 || code >= 500 || code === 404 || /insufficient|in progress|retry after/i.test(message)) {
      return returnToPending(withdrawal, message);
    }
    return markFailed(withdrawal, message);
  }

  lastCreateAt = Date.now();
  try {
    const created = await clickpesa.createMobilePayout(params);
    await db.execute(
      "UPDATE reseller_withdrawals SET status = 'sent', provider_ref = ?, sent_at = NOW(), last_error = NULL WHERE id = ?",
      [String(created?.id || withdrawal.order_reference).slice(0, 64), withdrawal.id]
    );
  } catch (err) {
    const message = errorMessage(err);
    const code = errorStatus(err);
    if (code === 409) {
      // The order reference was already used, so an earlier attempt may have gone through.
      try {
        return await reconcile(withdrawal);
      } catch (_) {
        return returnToPending(withdrawal, 'Could not confirm earlier payout, will retry');
      }
    }
    if (code === 0 || code >= 500 || /in progress|retry after|insufficient/i.test(message)) {
      return returnToPending(withdrawal, message);
    }
    return markFailed(withdrawal, message);
  }
}

async function reconcileSent() {
  const [rows] = await db.execute(
    "SELECT * FROM reseller_withdrawals WHERE status = 'sent' AND sent_at < DATE_SUB(NOW(), INTERVAL 2 MINUTE) ORDER BY sent_at LIMIT 1"
  );
  if (!rows.length) return;
  try {
    await reconcile(rows[0]);
  } catch (err) {
    logger.warn('Payout status check failed', { withdrawal: rows[0].id, error: errorMessage(err) });
  }
}

async function processWithdrawalPayouts() {
  await reconcileSent();

  if (Date.now() - lastCreateAt < CREATE_COOLDOWN_MS) return 0;

  const [rows] = await db.execute(
    "SELECT * FROM reseller_withdrawals WHERE status = 'pending' AND order_reference IS NOT NULL ORDER BY id LIMIT 1"
  );
  if (!rows.length) return 0;

  const withdrawal = rows[0];
  if (withdrawal.attempts >= MAX_ATTEMPTS) {
    await db.execute("UPDATE reseller_withdrawals SET status = 'sending' WHERE id = ? AND status = 'pending'", [withdrawal.id]);
    await markFailed(withdrawal, 'Too many attempts');
    return 1;
  }

  const [claimed] = await db.execute(
    "UPDATE reseller_withdrawals SET status = 'sending', attempts = attempts + 1 WHERE id = ? AND status = 'pending'",
    [withdrawal.id]
  );
  if (claimed.affectedRows === 0) return 0;

  await sendOne({ ...withdrawal, attempts: withdrawal.attempts + 1 });
  return 1;
}

module.exports = { processWithdrawalPayouts, normalizePhone };
