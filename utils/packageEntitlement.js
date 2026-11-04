async function extendUserPackage(executor, userId, pkg) {
  const [rows] = await executor.execute(
    'SELECT usage_start, usage_until, paid_bytes_remaining, paid_data_limit_bytes FROM users WHERE id = ? FOR UPDATE',
    [userId]
  );
  if (!rows.length) throw new Error(`Customer ${userId} was not found for package activation`);

  const user = rows[0];
  const now = new Date();
  const currentlyPaid = user.usage_until && new Date(user.usage_until) > now;
  const usageStart = currentlyPaid && user.usage_start ? user.usage_start : now;
  const usageUntil = new Date((currentlyPaid ? new Date(user.usage_until).getTime() : now.getTime())
    + Math.max(0, Number(pkg.duration_hours || 0)) * 3600 * 1000);
  const packageLimit = Math.max(0, Number(pkg.data_limit_mb || 0)) * 1024 * 1024;

  let paidDataLimit = packageLimit;
  let paidBytesRemaining = packageLimit;
  if (packageLimit > 0 && currentlyPaid && Number(user.paid_data_limit_bytes || 0) > 0) {
    paidDataLimit += Number(user.paid_data_limit_bytes || 0);
    paidBytesRemaining += Number(user.paid_bytes_remaining || 0);
  }

  await executor.execute(
    `UPDATE users SET package = ?, usage_start = ?, usage_until = ?,
       paid_data_limit_bytes = ?, paid_bytes_remaining = ?, updated_at = NOW()
     WHERE id = ?`,
    [pkg.name, usageStart, usageUntil, paidDataLimit, paidBytesRemaining, userId]
  );
  return { usageStart, usageUntil, paidDataLimit, paidBytesRemaining };
}

module.exports = { extendUserPackage };
