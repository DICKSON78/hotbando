'use strict';
// Splits a router-attributed package sale between HQ, an equipment partner (repayment) and the reseller.
// Runs inside the payment fulfillment transaction. A failure rolls back to a savepoint and is reported
// to the caller, so a customer's payment is never blocked by a split problem.

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const clampPct = (v) => Math.min(100, Math.max(0, Number(v) || 0));

function computeSplit(gross, hqPercent, repaymentPercent = 0, outstanding = 0) {
  const g = round2(gross);
  const pct = clampPct(hqPercent);
  const hq = round2((g * pct) / 100);
  const share = round2(g - hq);
  const owed = Math.max(0, Number(outstanding) || 0);
  let repay = owed > 0 ? round2((share * clampPct(repaymentPercent)) / 100) : 0;
  if (repay > owed) repay = round2(owed);
  const reseller = round2(share - repay);
  return { gross: g, hq, share, repay, reseller, pct };
}

async function recordRouterSplit(executor, conn, p) {
  if (process.env.ROUTER_SPLIT_ENABLED === 'false') return { skipped: 'disabled' };
  const { orderReference, purpose, routerId, amount, currency, customerId } = p;
  if (purpose !== 'package_purchase' || !routerId || routerId === 'null' || !(Number(amount) > 0)) {
    return { skipped: 'not_router_sale' };
  }
  const useSavepoint = !!(conn && typeof conn.query === 'function');
  if (useSavepoint) await conn.query('SAVEPOINT router_split');
  try {
    const [dup] = await executor.execute('SELECT id FROM router_sales WHERE order_reference = ? LIMIT 1', [orderReference]);
    if (dup.length) return { skipped: 'duplicate' };

    const [asg] = await executor.execute(
      'SELECT id, reseller_user_id, commission_percent FROM router_assignments WHERE router_id = ? AND unassigned_at IS NULL LIMIT 1',
      [String(routerId)]
    );
    const a = asg[0] || null;

    let fin = null;
    if (a) {
      const [f] = await executor.execute(
        "SELECT id, balance, repayment_percent, maintenance_percent, router_id FROM reseller_financings WHERE reseller_user_id = ? AND status = 'active' AND balance > 0 AND (router_id IS NULL OR router_id = ?) ORDER BY id LIMIT 1 FOR UPDATE",
        [a.reseller_user_id, String(routerId)]
      );
      fin = f[0] || null;
    }

    const s = computeSplit(amount, a ? a.commission_percent : 100, fin ? fin.repayment_percent : 0, fin ? fin.balance : 0);

    await executor.execute(
      'INSERT INTO router_sales (order_reference, router_id, assignment_id, reseller_user_id, customer_id, purpose, currency, gross_amount, hq_percent, hq_amount, reseller_amount, repayment_amount, financing_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [orderReference, String(routerId), a ? a.id : null, a ? a.reseller_user_id : null, customerId || null, purpose, currency || 'TZS', s.gross, s.pct, s.hq, s.reseller, s.repay, fin && s.repay > 0 ? fin.id : null]
    );

    if (a) {
      const [u] = await executor.execute(
        'UPDATE resellers SET balance = COALESCE(balance, 0) + ?, total_earned = COALESCE(total_earned, 0) + ?, total_vouchers_sold = COALESCE(total_vouchers_sold, 0) + 1 WHERE user_id = ?',
        [s.reseller, s.reseller, a.reseller_user_id]
      );
      if (!u.affectedRows) throw new Error('Reseller row not found for user ' + a.reseller_user_id);
    }

    let completed = false;
    if (fin && s.repay > 0) {
      const newBalance = round2(Number(fin.balance) - s.repay);
      await executor.execute(
        'INSERT INTO financing_repayments (financing_id, order_reference, amount, balance_after) VALUES (?,?,?,?)',
        [fin.id, orderReference, s.repay, Math.max(0, newBalance)]
      );
      if (newBalance <= 0) {
        completed = true;
        await executor.execute(
          "UPDATE reseller_financings SET balance = 0, status = 'completed', completed_at = NOW(), ownership_transferred_at = NOW() WHERE id = ?",
          [fin.id]
        );
        if (fin.router_id) {
          await executor.execute(
            'UPDATE router_assignments SET commission_percent = ? WHERE router_id = ? AND unassigned_at IS NULL',
            [clampPct(fin.maintenance_percent), String(fin.router_id)]
          );
        } else {
          await executor.execute(
            'UPDATE router_assignments SET commission_percent = ? WHERE reseller_user_id = ? AND unassigned_at IS NULL',
            [clampPct(fin.maintenance_percent), a.reseller_user_id]
          );
        }
      } else {
        await executor.execute('UPDATE reseller_financings SET balance = ? WHERE id = ?', [newBalance, fin.id]);
      }
    }
    return { recorded: true, hq: s.hq, reseller: s.reseller, repayment: s.repay, percent: s.pct, financing_completed: completed };
  } catch (e) {
    if (e && e.code === 'ER_LOCK_DEADLOCK') throw e; // whole tx is already rolled back; let the webhook retry
    if (useSavepoint) { try { await conn.query('ROLLBACK TO SAVEPOINT router_split'); } catch (_) {} }
    throw e;
  }
}

module.exports = { computeSplit, recordRouterSplit };
