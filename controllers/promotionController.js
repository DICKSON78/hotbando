const db = require('../config/database');

class PromotionsController {
    async redeemPromotion(req, res) {
        try {
            const { code } = req.body;
            const user = req.session.hotbando_user;
            const now = new Date();
            
            const [promos] = await db.execute(
                'SELECT * FROM promotions WHERE code = ? AND start_date <= ? AND end_date >= ?',
                [code, now, now]
            );
            
            if (promos.length === 0) {
                return res.json({ success: false, message: 'Invalid or expired promotion code' });
            }
            
            const promo = promos[0];
            const newUsageUntil = new Date(now.getTime() + promo.duration_seconds * 1000);
            
            await db.execute(
                'UPDATE users SET usage_until = GREATEST(usage_until, ?), updated_at = ? WHERE id = ?',
                [newUsageUntil, now, user.id]
            );
            
            req.session.hotbando_user.usage_until = newUsageUntil;
            res.json({ success: true, message: 'Promotion redeemed successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async addPromotion(req, res) {
        try {
            const { code, description, duration_seconds, start_date, end_date } = req.body;
            await db.execute(
                'INSERT INTO promotions (code, description, duration_seconds, start_date, end_date, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                [code, description, duration_seconds, start_date, end_date]
            );
            res.json({ success: true, message: 'Promotion added successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new PromotionsController();