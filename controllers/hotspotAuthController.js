const db = require('../config/database');
const bcrypt = require('bcryptjs');

class HotspotAuthController {
    
    // Show customer login page
    showLogin(req, res) {
        if (!req.session.mac) {
            return res.render('hotspot/empty');
        }
        
        res.render('hotspot/login', {
            mac: req.session.mac,
            location: req.session.location,
            ssidshow: req.session.ssidshow,
            error: null
        });
    }
    
    // Process customer login (phone number & password)
    async login(req, res) {
        try {
            const { phone_number, password } = req.body;
            const errors = {};
            
            console.log('📱 Customer login attempt:', { phone_number });
            
            // Validation
            if (!phone_number || !/^[0-9]{9,15}$/.test(phone_number)) {
                errors.phone_number = 'Namba ya simu sio sahihi.';
            }
            
            if (!password || password.length < 4) {
                errors.password = 'Neno la siri linahitajika.';
            }
            
            if (Object.keys(errors).length > 0) {
                return res.render('hotspot/login', {
                    errors,
                    formData: req.body,
                    mac: req.session.mac,
                    location: req.session.location
                });
            }
            
            // Find customer by phone number
            const [users] = await db.execute(
                'SELECT * FROM users WHERE phone_number = ? AND role = "customer"',
                [phone_number]
            );
            
            if (users.length === 0) {
                errors.phone_number = 'Namba hii ya simu haijasajiliwa.';
                return res.render('hotspot/login', {
                    errors,
                    formData: req.body,
                    mac: req.session.mac,
                    location: req.session.location
                });
            }
            
            const user = users[0];
            
            // Check password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                errors.password = 'Umekosea neno la siri.';
                return res.render('hotspot/login', {
                    errors,
                    formData: req.body,
                    mac: req.session.mac,
                    location: req.session.location
                });
            }
            
            // Update MAC and last_router_id with current device info
            const currentMAC = req.session.mac;
            const currentRouterID = req.session.routerID;
            
            await db.execute(
                'UPDATE users SET mac_address = ?, last_router_id = ?, location = ? WHERE id = ?',
                [currentMAC, currentRouterID, req.session.location, user.id]
            );
            
            // Store customer in session
            req.session.hotbando_user = {
                ...user,
                mac_address: currentMAC,
                last_router_id: currentRouterID,
                location: req.session.location
            };
            
            console.log(`✅ Customer logged in: ${user.name} (${user.phone_number}) from ${currentMAC}`);
            
            res.redirect('/hotspot/dashboard');
            
        } catch (error) {
            console.error('Customer login error:', error);
            res.render('hotspot/login', {
                errors: { general: 'Tatizo limetokea. Tafadhali jaribu tena.' },
                formData: req.body,
                mac: req.session.mac,
                location: req.session.location
            });
        }
    }
    
    // Customer registration (phone number & password)
    async register(req, res) {
        try {
            const { name, phone_number, password, password_confirm } = req.body;
            const errors = {};
            
            console.log('👤 Customer registration:', { name, phone_number });
            
            // Validation
            if (!name || name.length < 3 || name.length > 255) {
                errors.name = 'Jina linapaswa kuwa na herufi kati ya 3 hadi 255.';
            }
            
            if (!phone_number || !/^0[0-9]{9}$/.test(phone_number)) {
                errors.phone_number = 'Namba ya simu inapaswa kuwa na tarakimu 10 na kuanza na 0.';
            }
            
            if (!password || password.length < 4) {
                errors.password = 'Neno siri linapaswa kuwa na angalau tarakimu 4.';
            }
            
            if (password !== password_confirm) {
                errors.password_confirm = 'Neno siri hazifanani.';
            }
            
            if (Object.keys(errors).length > 0) {
                return res.render('hotspot/signup', {
                    errors,
                    formData: req.body,
                    mac: req.session.mac,
                    location: req.session.location
                });
            }
            
            // Check if customer exists
            const [existingUsers] = await db.execute(
                'SELECT id FROM users WHERE phone_number = ? AND role = "customer"',
                [phone_number]
            );
            
            if (existingUsers.length > 0) {
                errors.phone_number = 'Namba hii ya simu tayari imesajiliwa.';
                return res.render('hotspot/signup', {
                    errors,
                    formData: req.body,
                    mac: req.session.mac,
                    location: req.session.location
                });
            }
            
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Get device info from session
            const clientMAC = req.session.mac;
            const location = req.session.location;
            const routerID = req.session.routerID;
            
            // Insert new customer with 10MB free data
            const now = new Date();
            const [result] = await db.execute(
                'INSERT INTO users (name, phone_number, password, role, mac_address, location, last_router_id, moneyspent, usage_start, usage_until, free_bytes, last_free_used, created_at, updated_at) VALUES (?, ?, ?, "customer", ?, ?, ?, 0, ?, ?, 10485760, 0, ?, ?)',
                [name, phone_number, hashedPassword, clientMAC, location, routerID, now, now, now, now]
            );
            
            // Fetch new customer
            const [newUsers] = await db.execute(
                'SELECT * FROM users WHERE id = ?',
                [result.insertId]
            );
            
            req.session.hotbando_user = newUsers[0];
            
            console.log(`✅ New customer registered: ${name} (${phone_number}) from ${clientMAC}`);
            
            res.redirect('/hotspot/dashboard');
            
        } catch (error) {
            console.error('Customer registration error:', error);
            res.render('hotspot/signup', {
                errors: { general: 'Tatizo limetokea wakati wa usajili. Tafadhali jaribu tena.' },
                formData: req.body,
                mac: req.session.mac,
                location: req.session.location
            });
        }
    }
    
    // Customer logout
    logout(req, res) {
        const user = req.session.hotbando_user;
        if (user) {
            console.log(`👋 Customer logged out: ${user.name} (${user.phone_number})`);
        }
        
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout error:', err);
            }
            res.redirect('/hotspot/login');
        });
    }
}

module.exports = new HotspotAuthController();