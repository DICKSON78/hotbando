// routes/sponsor.js - Sponsor portal (advertisers, banks, corporates)
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const { sponsorAuth } = require('../middleware/authMiddleware');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'ads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Upload config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.mp4';
        cb(null, `sponsor-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 150 * 1024 * 1024 } // 150MB
});

function currentSponsor(req) {
    return req.session.sponsor_user || req.session.bank_user || req.session.admin_user;
}

// ==================== PUBLIC ROUTES ====================

// Sponsor login page
router.get('/login', (req, res) => {
    if (currentSponsor(req)) {
        return res.redirect('/sponsor/dashboard');
    }
    res.render('sponsor/login', { title: 'Sponsor Login' });
});

// Sponsor login processing (DB-backed, roles: sponsor/bank_partner/admin/super_admin)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.render('sponsor/login', {
                title: 'Sponsor Login',
                error: 'Barua pepe na neno la siri vinahitajika',
                formData: req.body
            });
        }

        const [users] = await db.execute(
            'SELECT * FROM users WHERE email = ? AND role IN ("sponsor", "bank_partner", "admin", "super_admin") AND is_active = 1',
            [email]
        );

        if (users.length === 0) {
            return res.render('sponsor/login', {
                title: 'Sponsor Login',
                error: 'Barua pepe au neno la siri si sahihi',
                formData: req.body
            });
        }

        const user = users[0];
        const bcrypt = require('bcryptjs');
        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
            return res.render('sponsor/login', {
                title: 'Sponsor Login',
                error: 'Barua pepe au neno la siri si sahihi',
                formData: req.body
            });
        }

        req.session.sponsor_user = {
            id: user.id,
            email: user.email,
            name: user.name,
            company_name: user.company_name || null,
            role: user.role,
            phone_number: user.phone_number
        };

        return res.redirect('/sponsor/dashboard');
    } catch (error) {
        console.error('Sponsor login error:', error);
        res.render('sponsor/login', {
            title: 'Sponsor Login',
            error: 'Login imeshindikana. Jaribu tena.',
            formData: req.body
        });
    }
});

// ==================== PROTECTED ROUTES ====================

// Sponsor dashboard
router.get('/dashboard', sponsorAuth, (req, res) => {
    res.render('sponsor/dashboard', {
        title: 'Sponsor Dashboard',
        sponsor: currentSponsor(req)
    });
});

// My ads page
router.get('/my-ads', sponsorAuth, (req, res) => {
    res.render('sponsor/my_ads', {
        title: 'Maudhui Yangu',
        sponsor: currentSponsor(req)
    });
});

// Upload video page
router.get('/upload-video', sponsorAuth, (req, res) => {
    res.render('sponsor/upload-video', {
        title: 'Pakia Maudhui',
        sponsor: currentSponsor(req)
    });
});

// Upload video processing
router.post('/upload-video', sponsorAuth, upload.single('video'), async (req, res) => {
    try {
        const { title, duration } = req.body;
        const file = req.file;
        const sponsor = currentSponsor(req);

        if (!file) {
            return res.status(400).json({ success: false, message: 'Hakuna faili la video lililochaguliwa' });
        }

        const videoUrl = '/ads/' + file.filename;

        await db.execute(
            'INSERT INTO ads (sponsor_id, title, description, video_url, duration, approved, created_at) VALUES (?, ?, ?, ?, ?, 0, NOW())',
            [sponsor.id, title, null, videoUrl, parseInt(duration) || 30]
        );

        res.redirect('/sponsor/my-ads');
    } catch (error) {
        console.error('Upload error:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Kupakia kumeshindikana: ' + error.message });
        }
    }
});

// Analytics page
router.get('/analytics', sponsorAuth, (req, res) => {
    res.render('sponsor/analytics', {
        title: 'Takwimu',
        sponsor: currentSponsor(req)
    });
});

// Settings page
router.get('/settings', sponsorAuth, (req, res) => {
    res.render('sponsor/settings', {
        title: 'Mipangilio',
        sponsor: currentSponsor(req)
    });
});

// Sponsor logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/sponsor/login');
    });
});

// ==================== SPONSOR API ====================

// Dashboard stats
router.get('/api/dashboard-stats', sponsorAuth, async (req, res) => {
    try {
        const sponsor = currentSponsor(req);

        const [adsRows] = await db.execute(
            'SELECT COUNT(*) AS total, COALESCE(SUM(views_count), 0) AS views FROM ads WHERE sponsor_id = ?',
            [sponsor.id]
        );

        const [campaignRows] = await db.execute(
            'SELECT COUNT(*) AS total FROM campaigns WHERE owner_id = ? AND is_active = 1',
            [sponsor.id]
        );

        let balance = 0;
        try {
            const Wallet = require('../models/Wallet');
            balance = await Wallet.getBalance(sponsor.id);
        } catch (e) {
            balance = 0;
        }

        res.json({
            success: true,
            ads: adsRows[0].total || 0,
            views: adsRows[0].views || 0,
            campaigns: campaignRows[0].total || 0,
            balance
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// List sponsor ads
router.get('/api/ads', sponsorAuth, async (req, res) => {
    try {
        const sponsor = currentSponsor(req);
        const [ads] = await db.execute(
            'SELECT * FROM ads WHERE sponsor_id = ? ORDER BY created_at DESC',
            [sponsor.id]
        );
        res.json({ success: true, ads });
    } catch (error) {
        console.error('List ads error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Analytics for sponsor campaigns + ads
router.get('/api/analytics', sponsorAuth, async (req, res) => {
    try {
        const sponsor = currentSponsor(req);
        const days = Math.min(parseInt(req.query.days) || 30, 365);

        const [ads] = await db.execute(
            'SELECT id, title, views_count AS views FROM ads WHERE sponsor_id = ? ORDER BY views_count DESC',
            [sponsor.id]
        );

        const [campaigns] = await db.execute(
            `SELECT c.id, c.campaign_name, c.campaign_type, c.is_active,
                    COUNT(cc.id) AS completions
             FROM campaigns c
             LEFT JOIN campaign_completions cc ON cc.campaign_id = c.id
             WHERE c.owner_id = ? AND cc.completed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY c.id
             ORDER BY completions DESC`,
            [sponsor.id, days]
        );

        const [completionsRow] = await db.execute(
            `SELECT COUNT(*) AS total,
                    SUM(CASE WHEN cc.completion_type IN ('form_submit', 'survey_complete') THEN 1 ELSE 0 END) AS leads
             FROM campaign_completions cc
             JOIN campaigns c ON c.id = cc.campaign_id
             WHERE c.owner_id = ? AND cc.completed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [sponsor.id, days]
        );

        res.json({
            success: true,
            views: ads.reduce((sum, a) => sum + (a.views || 0), 0),
            completions: completionsRow[0].total || 0,
            leads: completionsRow[0].leads || 0,
            ads,
            campaigns
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Sponsor home redirect
router.get('/', (req, res) => {
    if (currentSponsor(req)) {
        res.redirect('/sponsor/dashboard');
    } else {
        res.redirect('/sponsor/login');
    }
});

module.exports = router;
