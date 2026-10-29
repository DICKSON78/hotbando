'use strict';
// Splits a router-attributed package sale between HQ and the reseller who owns the router.
// Runs inside the payment fulfillment transaction. Failures roll back to a savepoint and are
// reported to the caller, so a customer's payment is never blocked by a split problem.

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

function computeSplit(gross, hqPercent) {
  const g = round2(gross);
  const pct = Math.min(100, Math.max(0, Number(hqPercent)));
  const hq = round2((g * pct) / 100);
  const reseller = round2(g - hq);
  return { gross: g, hq, reseller, pct };
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
    const s = computeSplit(amount, a ? a.commission_percent : 100);

    await executor.execute(
      'INSERT INTO router_sales (order_reference, router_id, assignment_id, reseller_user_id, customer_id, purpose, currency, gross_amount, hq_percent, hq_amount, reseller_amount) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [orderReference, String(routerId), a ? a.id : null, a ? a.reseller_user_id : null, customerId || null, purpose, currency || 'TZS', s.gross, s.pct, s.hq, s.reseller]
    );

    if (a && s.reseller > 0) {
      const [u] = await executor.execute(
        'UPDATE resellers SET balance = COALESCE(balance, 0) + ?, total_earned = COALESCE(total_earned, 0) + ?, total_vouchers_sold = COALESCE(total_vouchers_sold, 0) + 1 WHERE user_id = ?',
        [s.reseller, s.reseller, a.reseller_user_id]
      );
      if (!u.affectedRows) throw new Error('Reseller row not found for user ' + a.reseller_user_id);
    }
    return { recorded: true, hq: s.hq, reseller: s.reseller, percent: s.pct };
  } catch (e) {
    if (e && e.code === 'ER_LOCK_DEADLOCK') throw e; // whole tx is already rolled back; let the webhook retry
    if (useSavepoint) { try { await conn.query('ROLLBACK TO SAVEPOINT router_split'); } catch (_) {} }
    throw e;
  }
}

module.exports = { computeSplit, recordRouterSplit };
