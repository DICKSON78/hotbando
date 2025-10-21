const db = require('../config/database');
const bcrypt = require('bcryptjs');

class AdminAuthController {
    
    // Process admin login with database authentication
    async login(req, res) {
        try {
            const { email, password } = req.body;
            const errors = {};
            
            console.log('🔐 Admin login attempt:', { email });
            
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
            
            // Find admin/sponsor user by email
            const [users] = await db.execute(
                'SELECT * FROM users WHERE email = ? AND role IN ("admin", "sponsor") AND is_active = 1',
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
            
            // Store in session based on role
            if (user.role === 'admin') {
                req.session.admin_user = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    location: user.location,
                    login_time: new Date()
                };
                console.log(`✅ Admin logged in: ${user.name} (${user.email})`);
                return res.redirect('/admin/dashboard');
                
            } else if (user.role === 'sponsor') {
                req.session.sponsor_user = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    location: user.location,
                    login_time: new Date()
                };
                console.log(`✅ Sponsor logged in: ${user.name} (${user.email})`);
                return res.redirect('/sponsor/dashboard');
            }
            
        } catch (error) {
            console.error('Admin login error:', error);
            res.render('admin/login', {
                title: 'Ingia kama Admin',
                errors: { general: 'Tatizo limetokea. Tafadhali jaribu tena.' },
                formData: req.body
            });
        }
    }
    
    // Admin logout
    logout(req, res) {
        const user = req.session.admin_user || req.session.sponsor_user;
        if (user) {
            console.log(`👋 ${user.role} logged out: ${user.name}`);
        }
        
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout error:', err);
            }
            res.redirect('/admin/login');
        });
    }
}

module.exports = new AdminAuthController();