// Shared advertising rules: how long an ad runs, how long it is shown,
// how much free data one customer can earn from ads per day, and when
// expired or deleted ads are removed from the database.
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const MAX_AD_SECONDS = 45;
const MAX_DAILY_AD_REWARD_BYTES = 500 * 1024 * 1024;
const PURGE_AFTER_HOURS = 24;
const UPLOAD_ROOT = path.join(__dirname, '..', 'public', 'uploads', 'ads');

const DURATION_OPTIONS = {
    '1d': { label: '1 day', days: 1 },
    '5d': { label: '5 days', days: 5 },
    '1w': { label: '1 week', days: 7 },
    '2w': { label: '2 weeks', days: 14 },
    '1m': { label: '1 month', days: 30 },
};

const LIVE_AD_SQL = 'approved = 1 AND is_active = 1 AND deleted_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())';

function removeAdMedia(urlPath) {
    if (!urlPath || !urlPath.startsWith('/uploads/ads/')) return;
    const fileName = path.basename(urlPath);
    const filePath = path.join(UPLOAD_ROOT, fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

async function purgeExpiredAds() {
    const [rows] = await db.execute(
        `SELECT id, video_url, image_url FROM ads
         WHERE (expires_at IS NOT NULL AND expires_at < DATE_SUB(NOW(), INTERVAL ? HOUR))
            OR (deleted_at IS NOT NULL AND deleted_at < DATE_SUB(NOW(), INTERVAL ? HOUR))`,
        [PURGE_AFTER_HOURS, PURGE_AFTER_HOURS]
    );
    for (const ad of rows) {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            await conn.execute('DELETE FROM ad_views WHERE ad_id = ?', [ad.id]);
            await conn.execute('DELETE FROM ads WHERE id = ?', [ad.id]);
            await conn.commit();
        } catch (err) {
            await conn.rollback();
            console.warn(`⚠️ Could not purge ad ${ad.id}:`, err.message);
            continue;
        } finally {
            conn.release();
        }
        removeAdMedia(ad.video_url);
        removeAdMedia(ad.image_url);
    }
    return rows.length;
}

module.exports = {
    MAX_AD_SECONDS,
    MAX_DAILY_AD_REWARD_BYTES,
    PURGE_AFTER_HOURS,
    UPLOAD_ROOT,
    DURATION_OPTIONS,
    LIVE_AD_SQL,
    purgeExpiredAds,
    removeAdMedia,
};
