const db = require('../config/database');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

// Default password hash from schema.sql for detecting unchanged passwords
const DEFAULT_ADMIN_PASSWORD_HASH = '$2a$10$XqZJ9xUjXW8h.P5yGvYiA.R4yK7W1qN5kF8hD9xL2mV3bC6tE7uHm';

class AdminAuthController {
    
    // Process admin login with database authentication
    async login(req, res) {
        try {
            const { email, password } = req.body;
            const errors = {};
            
            logger.info('Admin login attempt', { email });
            
            // Validation
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                errors.email = 'Barua pepe sio sahihi.';
            }
            
            if (!password || password.length < 4) {
                errors.password = 'Neno la siri linahitajika.';
            }
            
            if (Object.keys(errors).length > 0) {
                return res.render('admin/login', {
                    title: 'Ingia kama Admin',
                    errors,
                    formData: req.body
                });
            }
            
            // Find admin/sponsor/super_admin user by email
            const [users] = await db.execute(
                'SELECT * FROM users WHERE email = ? AND role IN ("admin", "sponsor", "super_admin") AND is_active = 1',
                [email]
            );
            
            if (users.length === 0) {
                errors.email = 'Barua pepe au neno la siri sio sahihi.';
                return res.render('admin/login', {
                    title: 'Ingia kama Admin',
                    errors,
                    formData: req.body
                });
            }
            
            const user = users[0];
            
            // Check password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                errors.password = 'Barua pepe au neno la siri sio sahihi.';
                return res.render('admin/login', {
                    title: 'Ingia kama Admin',
                    errors,
                    formData: req.body
                });
            }

            // Check if password is the default unchanged password
            const isDefaultPassword = await bcrypt.compare(password, DEFAULT_ADMIN_PASSWORD_HASH) || user.password === DEFAULT_ADMIN_PASSWORD_HASH;
            
            // Store in session based on role
            const sessionData = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                location: user.location,
                login_time: new Date()
            };

            if (user.role === 'super_admin') {
                req.session.admin_user = sessionData;
                logger.info('Super admin logged in', { user: user.name, email: user.email });
                if (isDefaultPassword) {
                    return res.redirect('/admin/change-password');
                }
                return res.redirect('/admin/dashboard');
                
            } else if (user.role === 'admin') {
                req.session.admin_user = sessionData;
                logger.info('Admin logged in', { user: user.name, email: user.email });
                if (isDefaultPassword) {
                    return res.redirect('/admin/change-password');
                }
                return res.redirect('/admin/dashboard');
                
            } else if (user.role === 'sponsor') {
                req.session.sponsor_user = sessionData;
                logger.info('Sponsor logged in', { user: user.name, email: user.email });
                return res.redirect('/sponsor/dashboard');
            }
            
        } catch (error) {
            logger.error('Admin login error', { message: error.message });
            res.render('admin/login', {
                title: 'Ingia kama Admin',
                errors: { general: 'Tatizo limetokea. Tafadhali jaribu tena.' },
                formData: req.body
            });
        }
    }

    // Show change password page
    async showChangePassword(req, res) {
        if (!req.session.admin_user) {
            return res.redirect('/admin/login');
        }
        res.render('admin/change-password', {
            title: 'Badilisha Neno la Siri',
            error: null,
            success: null
        });
    }

    // Process password change
    async changePassword(req, res) {
        if (!req.session.admin_user) {
            return res.redirect('/admin/login');
        }

        try {
            const { current_password, new_password, confirm_password } = req.body;

            if (!current_password || !new_password || !confirm_password) {
                return res.render('admin/change-password', {
                    title: 'Badilisha Neno la Siri',
                    error: 'Jaza sehemu zote.',
                    success: null
                });
            }

            if (new_password !== confirm_password) {
                return res.render('admin/change-password', {
                    title: 'Badilisha Neno la Siri',
                    error: 'Neno la siri jipya halifanani.',
                    success: null
                });
            }

            if (new_password.length < 8) {
                return res.render('admin/change-password', {
                    title: 'Badilisha Neno la Siri',
                    error: 'Neno la siri linahkuwa na herufi angalau 8.',
                    success: null
                });
            }

            // Verify current password
            const [users] = await db.execute(
                'SELECT password FROM users WHERE id = ?',
                [req.session.admin_user.id]
            );

            if (users.length === 0) {
                return res.redirect('/admin/login');
            }

            const isCurrentValid = await bcrypt.compare(current_password, users[0].password);
            if (!isCurrentValid) {
                return res.render('admin/change-password', {
                    title: 'Badilisha Neno la Siri',
                    error: 'Neno la siri la sasa sio sahihi.',
                    success: null
                });
            }

            // Update password
            const newHash = await bcrypt.hash(new_password, 12);
            await db.execute(
                'UPDATE users SET password = ? WHERE id = ?',
                [newHash, req.session.admin_user.id]
            );

            logger.info('Admin password changed', { userId: req.session.admin_user.id });

            return res.render('admin/change-password', {
                title: 'Badilisha Neno la Siri',
                error: null,
                success: 'Neno la siri limebadilishwa. Tumia neno jipya unapotaka kuingia tena.'
            });
        } catch (error) {
            logger.error('Password change error', { message: error.message });
            return res.render('admin/change-password', {
                title: 'Badilisha Neno la Siri',
                error: 'Tatizo limetokea. Tafadhali jaribu tena.',
                success: null
            });
        }
    }
    
    // Admin logout
    logout(req, res) {
        const user = req.session.admin_user || req.session.sponsor_user;
        if (user) {
            logger.info(`${user.role} logged out`, { user: user.name });
        }
        
        req.session.destroy((err) => {
            if (err) {
                logger.error('Logout error', { message: err.message });
            }
            res.redirect('/admin/login');
        });
    }
}

module.exports = new AdminAuthController();