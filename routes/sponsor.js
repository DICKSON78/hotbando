const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../config/database');

// Sponsor authentication middleware
const sponsorAuth = (req, res, next) => {
    if (!req.session.sponsor_user) {
        return res.redirect('/sponsor/login');
    }
    next();
};

// Upload config
const upload = multer({ dest: 'public/ads/' });

// Sponsor login page
router.get('/login', (req, res) => {
    if (req.session.sponsor_user) {
        return res.redirect('/sponsor/dashboard');
    }
    res.render('sponsor/login', {
        title: 'Sponsor Login'
    });
});

// Sponsor login processing
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (email === 'sponsor@hotbando.com' && password === 'sponsor123') {
            req.session.sponsor_user = {
                id: 1,
                email: 'sponsor@hotbando.com',
                name: 'Demo Sponsor',
                company: 'Demo Company',
                role: 'sponsor'
            };
            
            console.log('✅ Sponsor login successful');
            return res.redirect('/sponsor/dashboard');
        } else {
            console.log('❌ Sponsor login failed');
            return res.render('sponsor/login', {
                title: 'Sponsor Login',
                error: 'Invalid email or password',
                formData: req.body
            });
        }
    } catch (error) {
        console.error('Sponsor login error:', error);
        res.render('sponsor/login', {
            title: 'Sponsor Login',
            error: 'Login failed. Please try again.',
            formData: req.body
        });
    }
});

// Sponsor dashboard
router.get('/dashboard', sponsorAuth, (req, res) => {
    res.render('sponsor/dashboard', {
        title: 'Sponsor Dashboard',
        sponsor: req.session.sponsor_user
    });
});

// My ads page
router.get('/my-ads', sponsorAuth, (req, res) => {
    res.render('sponsor/my_ads', {
        title: 'My Ads',
        sponsor: req.session.sponsor_user
    });
});

// Upload video page
router.get('/upload-video', sponsorAuth, (req, res) => {
    res.render('sponsor/upload-video', {
        title: 'Upload Video',
        sponsor: req.session.sponsor_user
    });
});

// Upload video processing
router.post('/upload-video', sponsorAuth, upload.single('video'), async (req, res) => {
    try {
        const { title, duration } = req.body;
        const file = req.file;
        
        if (!file) {
            return res.render('sponsor/upload-video', { error: 'No video uploaded' });
        }
        
        const videoPath = '/ads/' + file.filename;
        
        await db.execute(
            'INSERT INTO ads (sponsor_id, title, duration, video_path, approved, created_at) VALUES (?, ?, ?, ?, 0, NOW())',
            [req.session.sponsor_user.id, title, duration, videoPath]
        );
        
        res.redirect('/sponsor/my-ads');
    } catch (error) {
        console.error('Upload error:', error);
        res.render('sponsor/upload-video', { error: 'Failed to upload video' });
    }
});

// Analytics page
router.get('/analytics', sponsorAuth, (req, res) => {
    res.render('sponsor/analytics', {
        title: 'Analytics',
        sponsor: req.session.sponsor_user
    });
});

// Settings page
router.get('/settings', sponsorAuth, (req, res) => {
    res.render('sponsor/settings', {
        title: 'Settings',
        sponsor: req.session.sponsor_user
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

// Sponsor home redirect
router.get('/', (req, res) => {
    if (req.session.sponsor_user) {
        res.redirect('/sponsor/dashboard');
    } else {
        res.redirect('/sponsor/login');
    }
});

module.exports = router;