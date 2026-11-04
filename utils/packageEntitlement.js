async function extendUserPackage(executor, userId, pkg) {
  // Check if paid_bytes columns exist (production DB may not have them)
  let hasPaidBytesCols = false;
  try {
    const [cols] = await executor.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME IN ('paid_bytes_remaining', 'paid_data_limit_bytes')"
    );
    hasPaidBytesCols = cols.length >= 2;
  } catch (e) {
    hasPaidBytesCols = false;
  }

  const selectCols = hasPaidBytesCols
    ? 'usage_start, usage_until, paid_bytes_remaining, paid_data_limit_bytes'
    : 'usage_start, usage_until';
  const [rows] = await executor.execute(
    `SELECT ${selectCols} FROM users WHERE id = ? FOR UPDATE`,
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
  if (hasPaidBytesCols && packageLimit > 0 && currentlyPaid && Number(user.paid_data_limit_bytes || 0) > 0) {
    paidDataLimit += Number(user.paid_data_limit_bytes || 0);
    paidBytesRemaining += Number(user.paid_bytes_remaining || 0);
  }

  if (hasPaidBytesCols) {
    await executor.execute(
      `UPDATE users SET package = ?, usage_start = ?, usage_until = ?,
         paid_data_limit_bytes = ?, paid_bytes_remaining = ?, updated_at = NOW()
       WHERE id = ?`,
      [pkg.name, usageStart, usageUntil, paidDataLimit, paidBytesRemaining, userId]
    );
  } else {
    await executor.execute(
      `UPDATE users SET package = ?, usage_start = ?, usage_until = ?, updated_at = NOW()
       WHERE id = ?`,
      [pkg.name, usageStart, usageUntil, userId]
    );
  }
  return { usageStart, usageUntil, paidDataLimit, paidBytesRemaining };
}

module.exports = { extendUserPackage };
