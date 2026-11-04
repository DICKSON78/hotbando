// Packages bought for another registered customer. The package is attached
// to the friend's account at payment time and the countdown starts when the
// friend first connects to a HotBando router (see claimPendingGrants).
const { extendUserPackage } = require('./packageEntitlement');

function phoneVariants(normalized255) {
  const digits = String(normalized255 || '').replace(/\D/g, '');
  if (!digits.startsWith('255') || digits.length !== 12) return [];
  const local = `0${digits.slice(3)}`;
  return [digits, `+${digits}`, local];
}

async function findCustomerByPhone(executor, normalized255) {
  const variants = phoneVariants(normalized255);
  if (!variants.length) return null;
  const [rows] = await executor.execute(
    `SELECT id, name, phone_number FROM users
     WHERE phone_number IN (?, ?, ?) AND role = 'customer' AND is_active = 1 LIMIT 1`,
    variants
  );
  return rows[0] || null;
}

async function createGiftGrant(executor, recipientUserId, packageId, orderReference, buyerPhone) {
  await executor.execute(
    `INSERT INTO pending_package_grants (user_id, package_id, order_reference, purchased_by_phone, status, created_at)
     VALUES (?, ?, ?, ?, 'pending', NOW())`,
    [recipientUserId, packageId, orderReference, buyerPhone || null]
  );
}

async function claimPendingGrants(executor, userId) {
  const [grants] = await executor.execute(
    `SELECT g.id, g.package_id FROM pending_package_grants g
     WHERE g.user_id = ? AND g.status = 'pending' ORDER BY g.id`,
    [userId]
  );
  let claimed = 0;
  for (const grant of grants) {
    const [packages] = await executor.execute('SELECT * FROM packages WHERE id = ?', [grant.package_id]);
    if (!packages.length) continue;
    await extendUserPackage(executor, userId, packages[0]);
    await executor.execute(
      "UPDATE pending_package_grants SET status = 'claimed', claimed_at = NOW() WHERE id = ? AND status = 'pending'",
      [grant.id]
    );
    claimed += 1;
  }
  return claimed;
}

module.exports = { phoneVariants, findCustomerByPhone, createGiftGrant, claimPendingGrants };
