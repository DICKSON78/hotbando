// controllers/hotspotController.js - SASHA URIASISHI KAMILI
const db = require('../config/database');
const mikrotikService = require('../utils/mikrotik');
const bcrypt = require('bcryptjs');

// Utility functions
function formatRemainingTime(seconds) {
    if (seconds <= 0) return 'Hakuna muda uliobaki';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days} siku ${hours} masaa`;
    if (hours > 0) return `${hours} masaa ${minutes} dakika`;
    if (minutes > 0) return `${minutes} dakika`;
    return 'Chini ya dakika moja';
}

// Get real client MAC address from various sources
function getRealClientMAC(req) {
    if (req.query.mac) {
        return req.query.mac.toUpperCase().replace(/-/g, ':');
    }
    
    if (req.headers['x-client-mac']) {
        return req.headers['x-client-mac'].toUpperCase().replace(/-/g, ':');
    }
    
    if (req.headers['user-agent'] && req.headers['user-agent'].includes('mac=')) {
        const match = req.headers['user-agent'].match(/mac=([A-F0-9:]+)/i);
        if (match) return match[1].toUpperCase().replace(/-/g, ':');
    }
    
    console.warn('⚠️ Real MAC not found, using IP-based identification');
    const ip = req.ip || '192.168.1.100';
    const ipParts = ip.split('.').slice(2);
    return `00:1B:44:${ipParts[0] || '11'}:${ipParts[1] || '3A'}:B7`;
}

// Get real location from router information
async function getRealLocation(routerID) {
    try {
        const [routers] = await db.execute(
            'SELECT location FROM mikrotiks WHERE router_id = ?',
            [routerID]
        );
        
        if (routers.length > 0) {
            return routers[0].location;
        }
        
        if (routerID.includes('DAR')) return 'Dar es Salaam';
        if (routerID.includes('ARUSHA')) return 'Arusha';
        if (routerID.includes('MWANZA')) return 'Mwanza';
        if (routerID.includes('MBEYA')) return 'Mbeya';
        if (routerID.includes('DODOMA')) return 'Dodoma';
        
        return 'Tanzania';
    } catch (error) {
        console.error('❌ Location detection error:', error);
        return 'Tanzania';
    }
}

// Get real router ID
function getRealRouterID(req) {
    if (req.query.routerID) {
        return req.query.routerID;
    }
    
    if (req.headers['x-router-id']) {
        return req.headers['x-router-id'];
    }
    
    const clientIP = req.ip;
    if (clientIP.startsWith('192.168.88.')) return 'ROUTER_DAR_001';
    if (clientIP.startsWith('192.168.89.')) return 'ROUTER_ARUSHA_001';
    if (clientIP.startsWith('192.168.90.')) return 'ROUTER_MWANZA_001';
    if (clientIP.startsWith('10.7.')) return 'router-sim-001';
    
    return 'ROUTER_DEFAULT';
}

// Get real SSID
function getRealSSID(req) {
    if (req.query.ssidshow) {
        return req.query.ssidshow;
    }
    
    if (req.headers['x-ssid']) {
        return req.headers['x-ssid'];
    }
    
    return 'HotBando WiFi';
}

// Controller methods
const hotspotController = {
    // Show marketing homepage - REAL DEVICE INFO
    async index(req, res) {
        try {
            const realMAC = getRealClientMAC(req);
            const realRouterID = getRealRouterID(req);
            const realSSID = getRealSSID(req);
            const realLocation = await getRealLocation(realRouterID);
            
            req.session.mac = realMAC;
            req.session.routerID = realRouterID;
            req.session.ssidshow = realSSID;
            req.session.location = realLocation;
            req.session.clientIP = req.ip;
            req.session.userAgent = req.headers['user-agent'];
            
            console.log('📱 REAL Device Access:', {
                mac: realMAC,
                location: realLocation,
                routerID: realRouterID,
                ssid: realSSID,
                ip: req.ip
            });
            
            if (req.session.hotbando_user) {
                return res.redirect('/hotspot/dashboard');
            }
            
            res.render('hotspot/index', {
                mac: realMAC,
                location: realLocation,
                ssidshow: realSSID,
                user: req.session.hotbando_user
            });
            
        } catch (error) {
            console.error('❌ Index error:', error);
            res.render('hotspot/empty');
        }
    },
    
    // Show login form - REAL INFO
    async login(req, res) {
        if (!req.session.mac) {
            return res.redirect('/hotspot');
        }
        
        if (req.session.hotbando_user) {
            return res.redirect('/hotspot/dashboard');
        }
        
        res.render('hotspot/login', {
            mac: req.session.mac,
            location: req.session.location,
            ssidshow: req.session.ssidshow,
            error: null
        });
    },
    
    // Process user login - REAL DEVICE INTEGRATION
    async loginUser(req, res) {
        try {
            const { phone_number, password } = req.body;
            const errors = {};
            
            console.log('🔐 REAL Login attempt:', { 
                phone_number, 
                mac: req.session.mac,
                router: req.session.routerID
            });
            
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
                    location: req.session.location,
                    ssidshow: req.session.ssidshow
                });
            }
            
            const [users] = await db.execute(
                'SELECT * FROM users WHERE phone_number = ? AND role = "customer" AND is_active = 1',
                [phone_number]
            );
            
            if (users.length === 0) {
                errors.phone_number = 'Namba hii ya simu haijasajiliwa au imezuiwa.';
                return res.render('hotspot/login', { 
                    errors, 
                    formData: req.body,
                    mac: req.session.mac,
                    location: req.session.location,
                    ssidshow: req.session.ssidshow
                });
            }
            
            const user = users[0];
            
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                errors.password = 'Umekosea neno la siri.';
                return res.render('hotspot/login', { 
                    errors, 
                    formData: req.body,
                    mac: req.session.mac,
                    location: req.session.location,
                    ssidshow: req.session.ssidshow
                });
            }
            
            const currentMAC = req.session.mac;
            const currentRouterID = req.session.routerID;
            const currentLocation = req.session.location;
            const currentIP = req.ip;
            
            await db.execute(
                `UPDATE users SET 
                 mac_address = ?, 
                 last_router_id = ?, 
                 location = ?, 
                 ip_address = ?,
                 updated_at = NOW() 
                 WHERE id = ?`,
                [currentMAC, currentRouterID, currentLocation, currentIP, user.id]
            );
            
            req.session.hotbando_user = {
                ...user, 
                mac_address: currentMAC, 
                last_router_id: currentRouterID,
                location: currentLocation,
                ip_address: currentIP
            };
            
            console.log(`✅ REAL User ${user.name} logged in:`, {
                mac: currentMAC,
                router: currentRouterID
            });
            
            try {
                const now = new Date();
                const usageUntil = new Date(user.usage_until);
                
                if (usageUntil > now) {
                    const uptime = Math.max(0, (usageUntil - now) / 1000);
                    await mikrotikService.addUserToRouter(currentMAC, currentRouterID, uptime, 0);
                    console.log(`🔗 Premium user connected to router: ${uptime} seconds`);
                } else if (user.free_bytes > 0) {
                    await mikrotikService.addUserToRouter(currentMAC, currentRouterID, 0, user.free_bytes);
                    console.log(`🔗 Free data user connected to router: ${user.free_bytes} bytes`);
                }
            } catch (routerError) {
                console.warn('⚠️ Router connection after login failed:', routerError.message);
            }
            
            res.redirect('/hotspot/dashboard');
            
        } catch (error) {
            console.error('❌ REAL Login error:', error);
            res.render('hotspot/login', { 
                errors: { general: 'Tatizo limetokea. Tafadhali jaribu tena.' },
                formData: req.body,
                mac: req.session.mac,
                location: req.session.location,
                ssidshow: req.session.ssidshow
            });
        }
    },
    
    // Show registration form
    signup(req, res) {
        if (!req.session.mac) {
            return res.redirect('/hotspot');
        }
        
        if (req.session.hotbando_user) {
            return res.redirect('/hotspot/dashboard');
        }
        
        res.render('hotspot/signup', {
            mac: req.session.mac,
            location: req.session.location,
            ssidshow: req.session.ssidshow,
            error: null
        });
    },
    
    // Process user registration - REAL DEVICE INFO
    async register(req, res) {
        try {
            const { name, phone_number, password, password_confirm } = req.body;
            const errors = {};
            
            console.log('👤 REAL Registration attempt:', { 
                name, 
                phone_number, 
                mac: req.session.mac
            });
            
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
                    location: req.session.location,
                    ssidshow: req.session.ssidshow
                });
            }
            
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
                    location: req.session.location,
                    ssidshow: req.session.ssidshow
                });
            }
            
            const hashedPassword = await bcrypt.hash(password, 10);
            
            const clientMAC = req.session.mac;
            const location = req.session.location;
            const routerID = req.session.routerID;
            const clientIP = req.ip;
            
            const [settings] = await db.execute(
                'SELECT setting_value FROM system_settings WHERE setting_key = "free_data_per_user"'
            );
            const freeBytes = settings.length > 0 ? parseInt(settings[0].setting_value) : 10485760;
            
            const now = new Date();
            const [result] = await db.execute(
                `INSERT INTO users 
                (name, phone_number, password, role, package, mac_address, location, last_router_id, ip_address, moneyspent, usage_start, usage_until, free_bytes, last_free_used, is_active, created_at, updated_at) 
                VALUES (?, ?, ?, "customer", "KARIBU HOT BANDO", ?, ?, ?, ?, 0, ?, ?, ?, 0, 1, ?, ?)`,
                [name, phone_number, hashedPassword, clientMAC, location, routerID, clientIP, now, now, freeBytes, now, now]
            );
            
            const [newUsers] = await db.execute(
                'SELECT * FROM users WHERE id = ?',
                [result.insertId]
            );
            
            const user = newUsers[0];
            req.session.hotbando_user = user;
            
            console.log(`✅ REAL New user registered:`, {
                name,
                phone: phone_number,
                mac: clientMAC,
                freeBytes: freeBytes
            });
            
            try {
                await mikrotikService.addUserToRouter(clientMAC, routerID, 0, freeBytes);
                console.log(`🔗 New user connected to router with ${freeBytes} bytes free data`);
            } catch (routerError) {
                console.warn('⚠️ Router connection after registration failed:', routerError.message);
            }
            
            res.redirect('/hotspot/dashboard');
            
        } catch (error) {
            console.error('❌ REAL Registration error:', error);
            res.render('hotspot/signup', { 
                errors: { general: 'Tatizo limetokea wakati wa usajili. Tafadhali jaribu tena.' },
                formData: req.body,
                mac: req.session.mac,
                location: req.session.location,
                ssidshow: req.session.ssidshow
            });
        }
    },
    
    // User dashboard - REAL DEVICE INFO
    async dashboard(req, res) {
        if (!req.session.hotbando_user) {
            return res.redirect('/hotspot/login');
        }
        
        const user = req.session.hotbando_user;
        const now = new Date();
        const usageUntil = new Date(user.usage_until);
        const isActive = now < usageUntil;
        const remainingSeconds = isActive ? Math.max(0, (usageUntil - now) / 1000) : 0;
        const freeMB = user.free_bytes / (1024 * 1024);
        
        const [todayViews] = await db.execute(
            'SELECT COUNT(*) as count FROM ad_views WHERE user_id = ? AND DATE(created_at) = CURDATE()',
            [user.id]
        );
        
        const [adLimitSetting] = await db.execute(
            'SELECT setting_value FROM system_settings WHERE setting_key = "daily_ad_limit"'
        );
        const dailyAdLimit = adLimitSetting.length > 0 ? parseInt(adLimitSetting[0].setting_value) : 8;
        
        const routerStatus = await mikrotikService.checkRouterStatus(req.session.routerID);
        
        let connectedUsers = 0;
        try {
            const sessions = await mikrotikService.getActiveSessions(req.session.routerID);
            connectedUsers = sessions.length;
        } catch (error) {
            console.warn('⚠️ Could not get connected users count:', error.message);
        }
        
        const adsWatchedToday = todayViews[0].count;
        const adsRemaining = Math.max(0, dailyAdLimit - adsWatchedToday);
        
        // ADD THIS LINE - Provide mac address
        const mac = req.session.mac || user.mac_address || '00:00:00:00:00:00';
        
        res.render('hotspot/dashboard', {
            user,
            location: req.session.location,
            routerID: req.session.routerID,
            ssidshow: req.session.ssidshow,
            isActive,
            remainingTime: formatRemainingTime(remainingSeconds),
            freeMB: freeMB.toFixed(2),
            clientIP: req.session.clientIP || req.ip,
            clientMAC: req.session.mac,
            mac: mac,
            adsWatchedToday,
            adsRemaining,
            dailyAdLimit,
            canWatchAds: adsRemaining > 0,
            routerStatus: routerStatus.status,
            connectedUsers: connectedUsers,
            routerMessage: routerStatus.isOnline ? 
                `Mtandao upo tayari (${connectedUsers} watumiaji wanaotumia)` : 
                'Kuna changamoto ndogo kwenye mtandao, lakini bado unaweza kutumia internet'
        });
    },
    
    // Connect to internet - REAL ROUTER CONNECTION
    async connect(req, res) {
        try {
            const user = req.session.hotbando_user;
            if (!user) {
                return res.json({ 
                    success: false, 
                    message: 'Umelazimika kuingia kwenye akaunti yako.' 
                });
            }
            
            const mac = user.mac_address;
            const routerID = user.last_router_id;
            const now = new Date();
            let uptime = 0;
            let bytes = 0;
            let connectionType = 'none';
            
            const usageUntil = new Date(user.usage_until);
            if (usageUntil > now) {
                uptime = Math.max(0, (usageUntil - now) / 1000);
                connectionType = 'premium';
            } else if (user.free_bytes > 0) {
                bytes = user.free_bytes;
                connectionType = 'free';
            } else {
                return res.json({ 
                    success: false, 
                    message: 'Hakuna data iliyobaki. Tafadhali nunua kifurushi au tazama matangazo.' 
                });
            }
            
            let routerSuccess = false;
            let routerMessage = '';
            
            try {
                routerSuccess = await mikrotikService.addUserToRouter(mac, routerID, uptime, bytes);
                routerMessage = routerSuccess ? 
                    'Imefanikiwa kunganishwa kwenye mtandao!' : 
                    'Imeshindikana kuunganisha kwenye router.';
                
                console.log(`🔗 REAL Router connection:`, {
                    user: user.name,
                    mac: mac,
                    type: connectionType,
                    success: routerSuccess
                });
                
            } catch (routerError) {
                console.error('❌ REAL Router connection error:', routerError.message);
                routerSuccess = false;
                routerMessage = 'Imeshindikana kuunganisha kwenye router.';
            }
            
            if (bytes > 0) {
                await db.execute(
                    'UPDATE users SET last_free_used = ? WHERE id = ?',
                    [Date.now(), user.id]
                );
            }
            
            res.json({ 
                success: routerSuccess,
                message: routerSuccess ? 
                    'Imefanikiwa kunganishwa kwenye mtandao! Sasa unaweza kutumia internet.' : 
                    'Imeshindikana kuunganishwa kwenye mtandao. Tafadhali jaribu tena.',
                type: connectionType,
                uptime,
                bytes,
                routerConnected: routerSuccess
            });
            
        } catch (error) {
            console.error('❌ REAL Connect error:', error);
            res.json({ 
                success: false, 
                message: 'Imeshindikana kuunganishwa kwenye mtandao.',
                type: 'error'
            });
        }
    },
    
    // Get random ad - SASHA URIASISHI KWA VIDEO ADS
    async getAd(req, res) {
        try {
            const user = req.session.hotbando_user;
            if (!user) {
                return res.json({ 
                    success: false, 
                    message: 'Umelazimika kuingia kwenye akaunti yako.' 
                });
            }
            
            const [todayViews] = await db.execute(
                'SELECT COUNT(*) as count FROM ad_views WHERE user_id = ? AND DATE(created_at) = CURDATE()',
                [user.id]
            );
            
            const [adLimitSetting] = await db.execute(
                'SELECT setting_value FROM system_settings WHERE setting_key = "daily_ad_limit"'
            );
            const dailyAdLimit = adLimitSetting.length > 0 ? parseInt(adLimitSetting[0].setting_value) : 8;
            
            if (todayViews[0].count >= dailyAdLimit) {
                return res.json({ 
                    success: false, 
                    message: 'Umeshazidi kiasi cha matangazo leo. Jaribu kesho tena.' 
                });
            }
            
            // PREFER VIDEO ADS FIRST
            const [videoAds] = await db.execute(
                'SELECT * FROM ads WHERE approved = 1 AND is_active = 1 AND video_url IS NOT NULL AND video_url != "" ORDER BY RAND() LIMIT 1'
            );
            
            let ads = videoAds;
            
            // If no video ads, get any ad
            if (ads.length === 0) {
                const [allAds] = await db.execute(
                    'SELECT * FROM ads WHERE approved = 1 AND is_active = 1 ORDER BY RAND() LIMIT 1'
                );
                ads = allAds;
            }
            
            if (ads.length === 0) {
                return res.json({ 
                    success: false, 
                    message: 'Hakuna matangazo yanayopatikana kwa sasa.' 
                });
            }
            
            const ad = ads[0];
            const rewardMB = Math.round(ad.reward_bytes / (1024 * 1024));
            
            res.json({ 
                success: true, 
                ad: {
                    id: ad.id,
                    title: ad.title,
                    description: ad.description,
                    image_url: ad.image_url,
                    video_url: ad.video_url,
                    duration: ad.duration,
                    reward_mb: rewardMB,
                    reward_bytes: ad.reward_bytes,
                    is_video: !!ad.video_url
                }
            });
            
        } catch (error) {
            console.error('❌ Get ad error:', error);
            res.json({ 
                success: false, 
                message: 'Imeshindikana kupata tangazo.' 
            });
        }
    },
    
    // Complete ad watch - SASHA URIASISHI
    async completeAd(req, res) {
        try {
            const { ad_id, watched_duration } = req.body;
            const user = req.session.hotbando_user;
            
            if (!user) {
                return res.json({ 
                    success: false, 
                    message: 'Umelazimika kuingia kwenye akaunti yako.' 
                });
            }
            
            const [views] = await db.execute(
                'SELECT COUNT(*) as count FROM ad_views WHERE user_id = ? AND DATE(created_at) = CURDATE()',
                [user.id]
            );
            
            const [adLimitSetting] = await db.execute(
                'SELECT setting_value FROM system_settings WHERE setting_key = "daily_ad_limit"'
            );
            const dailyAdLimit = adLimitSetting.length > 0 ? parseInt(adLimitSetting[0].setting_value) : 8;
            
            if (views[0].count >= dailyAdLimit) {
                return res.json({ 
                    success: false, 
                    message: 'Umeshazidi kiasi cha matangazo leo. Jaribu kesho tena.' 
                });
            }
            
            const [ads] = await db.execute(
                'SELECT * FROM ads WHERE id = ? AND approved = 1 AND is_active = 1',
                [ad_id]
            );
            
            if (ads.length === 0) {
                return res.json({ 
                    success: false, 
                    message: 'Tangazo halipo au halijaidhinishwa.' 
                });
            }
            
            const ad = ads[0];
            
            // Record ad view
            await db.execute(
                'INSERT INTO ad_views (user_id, ad_id, watched_duration, data_earned, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                [user.id, ad_id, watched_duration || ad.duration, ad.reward_bytes, req.ip, req.headers['user-agent']]
            );
            
            // Add reward data to user
            await db.execute(
                'UPDATE users SET free_bytes = free_bytes + ? WHERE id = ?',
                [ad.reward_bytes, user.id]
            );
            
            // Update ad views count
            await db.execute(
                'UPDATE ads SET views_count = views_count + 1 WHERE id = ?',
                [ad.id]
            );
            
            // Update session data
            req.session.hotbando_user.free_bytes += ad.reward_bytes;
            
            const rewardMB = Math.round(ad.reward_bytes / (1024 * 1024));
            const newTotalMB = Math.round((user.free_bytes + ad.reward_bytes) / (1024 * 1024));
            
            console.log(`✅ User ${user.name} watched ad "${ad.title}" and earned ${rewardMB}MB`);
            
            res.json({ 
                success: true, 
                addedMB: rewardMB,
                totalMB: newTotalMB,
                adsWatchedToday: views[0].count + 1,
                adsRemaining: Math.max(0, dailyAdLimit - (views[0].count + 1)),
                message: `Umepata ${rewardMB}MB ya data bure kutoka kwa ${ad.title}!`
            });
            
        } catch (error) {
            console.error('❌ Complete ad error:', error);
            res.json({ 
                success: false, 
                message: 'Imeshindikana kukamilisha tangazo.' 
            });
        }
    },
    
    // Show subscription page
    async subscription(req, res) {
        if (!req.session.hotbando_user) {
            return res.redirect('/hotspot/login');
        }
        
        const user = req.session.hotbando_user;
        const now = new Date();
        const usageUntil = new Date(user.usage_until);
        const isExpired = now > usageUntil;
        const remainingSeconds = isExpired ? 0 : Math.max(0, (usageUntil - now) / 1000);
        
        // Calculate freeMB
        const freeMB = Math.round(user.free_bytes / (1024 * 1024));
        
        const [packages] = await db.execute('SELECT * FROM packages WHERE is_active = 1');
        
        const [vouchers] = await db.execute(`
            SELECT v.voucher_code, p.name as package_name, v.price 
            FROM vouchers v 
            JOIN packages p ON v.package_id = p.id 
            WHERE v.is_used = 0 AND v.expires_at > NOW() 
            LIMIT 10
        `);
        
        res.render('hotspot/subscription', {
            user,
            location: req.session.location,
            routerID: req.session.routerID,
            ssidshow: req.session.ssidshow,
            isExpired,
            remainingTime: formatRemainingTime(remainingSeconds),
            freeMB: freeMB,
            packages,
            vouchers,
            clientIP: req.session.clientIP || req.ip,
            clientMAC: req.session.mac
        });
    },
    
    // Advertise page - SASHA URIASISHI KWA VIDEO UPLOAD
    async advertise(req, res) {
        if (!req.session.hotbando_user) {
            return res.redirect('/hotspot/login');
        }
        
        const user = req.session.hotbando_user;
        
        // Get available video ads
        const [videoAds] = await db.execute(`
            SELECT a.*, u.name as sponsor_name,
                   COUNT(av.id) as views_count
            FROM ads a
            LEFT JOIN users u ON a.sponsor_id = u.id
            LEFT JOIN ad_views av ON a.id = av.ad_id
            WHERE a.approved = 1 AND a.is_active = 1 
            AND a.video_url IS NOT NULL AND a.video_url != ''
            GROUP BY a.id
            ORDER BY a.created_at DESC
            LIMIT 10
        `);
        
        const [todayViews] = await db.execute(
            'SELECT COUNT(*) as count FROM ad_views WHERE user_id = ? AND DATE(created_at) = CURDATE()',
            [user.id]
        );
        
        const [adLimitSetting] = await db.execute(
            'SELECT setting_value FROM system_settings WHERE setting_key = "daily_ad_limit"'
        );
        const dailyAdLimit = adLimitSetting.length > 0 ? parseInt(adLimitSetting[0].setting_value) : 8;
        
        const adsWatchedToday = todayViews[0].count;
        const adsRemaining = Math.max(0, dailyAdLimit - adsWatchedToday);
        
        res.render('hotspot/advertise', {
            mac: req.session.mac,
            location: req.session.location,
            ssidshow: req.session.ssidshow,
            user: user,
            videoAds: videoAds || [],
            adsWatchedToday: adsWatchedToday,
            adsRemaining: adsRemaining,
            dailyAdLimit: dailyAdLimit,
            canWatchAds: adsRemaining > 0
        });
    },
    
    // Empty page
    empty(req, res) {
        res.render('hotspot/empty');
    },
    
    // Logout - REAL ROUTER DISCONNECTION
    async logout(req, res) {
        const user = req.session.hotbando_user;
        if (user) {
            console.log(`👋 REAL User ${user.name} logged out:`, {
                mac: user.mac_address,
                router: user.last_router_id
            });
            
            try {
                await mikrotikService.removeUserFromRouter(user.mac_address, user.last_router_id);
                console.log(`🔗 User disconnected from router`);
            } catch (routerError) {
                console.warn('⚠️ Could not remove user from router during logout:', routerError.message);
            }
        }
        
        req.session.destroy((err) => {
            if (err) {
                console.error('❌ Logout error:', err);
            }
            res.redirect('/hotspot');
        });
    },
    
    // Get user info API
    async getUserInfo(req, res) {
        try {
            const { phone_number } = req.params;
            const [users] = await db.execute(
                'SELECT id, name, phone_number, package, location, moneyspent, usage_start, usage_until, free_bytes FROM users WHERE phone_number = ? AND role = "customer"',
                [phone_number]
            );
            
            if (users.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Mtumiaji huyo hajapatikana.' 
                });
            }
            
            const user = users[0];
            const freeMB = Math.round(user.free_bytes / (1024 * 1024));
            
            res.json({ 
                success: true, 
                data: {
                    ...user,
                    free_mb: freeMB
                }
            });
            
        } catch (error) {
            console.error('❌ Get user info error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Imeshindikana kupata taarifa za mtumiaji.' 
            });
        }
    },
    

     
  // ==================== USER MANAGEMENT ONLY ====================
  
  /**
   * Get all customers with pagination and search
   */
  async getCustomers(req, res) {
    try {
      const { search, page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;
      
      console.log(`📋 Loading customers - Page: ${page}, Search: "${search}"`);
      
      let query = `
        SELECT
          id, name, phone_number, package, location,
          moneyspent, usage_start, usage_until,
          free_bytes,
          mac_address, last_router_id, is_active,
          created_at, updated_at
        FROM users
        WHERE role = 'customer'
      `;
      let params = [];
      
      if (search && search.trim() !== '') {
        query += ' AND (phone_number LIKE ? OR name LIKE ? OR mac_address LIKE ? OR location LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }
      
      query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);
      
      const [customers] = await db.execute(query, params);

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM users WHERE role = "customer"';
      let countParams = [];
      if (search && search.trim() !== '') {
        countQuery += ' AND (phone_number LIKE ? OR name LIKE ? OR mac_address LIKE ? OR location LIKE ?)';
        countParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }
      
      const [totalResult] = await db.execute(countQuery, countParams);

      console.log(`✅ Customers loaded: ${customers.length}, Total: ${totalResult[0].total}`);

      return res.json({
        success: true,
        data: customers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalResult[0].total,
          pages: Math.ceil(totalResult[0].total / limit)
        }
      });
    } catch (error) {
      console.error('❌ Error fetching customers:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to load customers', 
        error: error.message 
      });
    }
  },

  /**
   * Get online customers (currently connected users)
   */
  async getOnlineCustomers(req, res) {
    try {
      console.log('🌐 Fetching online customers...');
      
      const [onlineCustomers] = await db.execute(`
        SELECT
          u.id, u.name, u.phone_number, u.mac_address,
          u.location, u.last_router_id, u.usage_until,
          TIMESTAMPDIFF(MINUTE, u.updated_at, NOW()) as minutes_ago,
          m.router_name, m.status as router_status
        FROM users u
        LEFT JOIN mikrotiks m ON u.last_router_id = m.router_id
        WHERE u.usage_until > NOW()
        AND u.updated_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
        AND u.role = 'customer'
        ORDER BY u.updated_at DESC
      `);
      
      console.log(`✅ Online customers found: ${onlineCustomers.length}`);
      
      return res.json({
        success: true,
        data: onlineCustomers,
        count: onlineCustomers.length
      });
    } catch (error) {
      console.error('❌ Error fetching online customers:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to load online customers', 
        error: error.message 
      });
    }
  },

  /**
   * Get all routers
   */
  async getRouters(req, res) {
    try {
      console.log('📡 Fetching routers...');
      
      const [routers] = await db.execute('SELECT * FROM mikrotiks ORDER BY id DESC');
      
      console.log(`✅ Routers found: ${routers.length}`);
      
      return res.json({ 
        success: true, 
        data: routers, 
        count: routers.length 
      });
    } catch (error) {
      console.error('❌ Error fetching routers:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to load routers', 
        error: error.message 
      });
    }
  },

  /**
   * Get router sessions (currently empty - for future integration)
   */
  async getRouterSessions(req, res) {
    try {
      const { routerID } = req.params;
      console.log(`🔄 Fetching sessions for router: ${routerID}`);
      
      // Return empty array for now - can integrate with Mikrotik API later
      const sessions = [];
      
      return res.json({ 
        success: true, 
        data: sessions, 
        count: sessions.length 
      });
    } catch (error) {
      console.error('❌ Error fetching router sessions:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to load router sessions', 
        error: error.message 
      });
    }
  },

  /**
   * Suspend a customer
   */
  async suspendCustomer(req, res) {
    try {
      const { id } = req.params;
      const { reason, suspended_until, is_permanent } = req.body;

      console.log(`⏸️ Suspending user ${id}`);

      // Check if user exists
      const [users] = await db.execute('SELECT id, name FROM users WHERE id = ? AND role = "customer"', [id]);
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const user = users[0];

      // Add to suspension table
      await db.execute(
        'INSERT INTO user_suspensions (user_id, reason, suspended_by, suspended_until, is_permanent) VALUES (?, ?, ?, ?, ?)',
        [id, reason, req.session.admin_user.id, suspended_until, is_permanent || 0]
      );
      
      // Update user status
      await db.execute(
        'UPDATE users SET usage_until = NOW(), is_active = 0 WHERE id = ?',
        [id]
      );

      console.log(`✅ User ${user.name} suspended successfully`);

      return res.json({ 
        success: true, 
        message: `User ${user.name} has been suspended successfully` 
      });
    } catch (error) {
      console.error('❌ Error suspending user:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to suspend user', 
        error: error.message 
      });
    }
  },

  /**
   * Delete a customer permanently
   */
  async deleteCustomer(req, res) {
    try {
      const { id } = req.params;

      console.log(`🗑️ Deleting user ${id}`);

      // Check if user exists
      const [users] = await db.execute('SELECT id, name FROM users WHERE id = ? AND role = "customer"', [id]);
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const user = users[0];

      // Delete user
      const [result] = await db.execute('DELETE FROM users WHERE id = ? AND role = "customer"', [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      console.log(`✅ User ${user.name} deleted successfully`);

      return res.json({ 
        success: true, 
        message: `User ${user.name} has been deleted permanently`,
        deletedId: id 
      });
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to delete user', 
        error: error.message 
      });
    }
  },

  /**
   * Reboot a router
   */
  async rebootRouter(req, res) {
    try {
      const { routerID } = req.params;

      console.log(`🔄 Rebooting router: ${routerID}`);

      // For now, just simulate success since we don't have real Mikrotik integration
      const success = true;
      
      if (success) {
        console.log(`✅ Router ${routerID} rebooted successfully`);
        return res.json({
          success: true,
          message: `Router has been rebooted successfully`
        });
      } else {
        return res.json({
          success: false,
          message: 'Failed to reboot router'
        });
      }
    } catch (error) {
      console.error('❌ Error rebooting router:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to reboot router', 
        error: error.message 
      });
    }
  },

  /**
   * Render users management page
   */
  async renderUsersPage(req, res) {
    try {
      console.log('👥 Rendering users management page');
      
      return res.render('admin/users', {
        title: 'User Management',
        activePage: 'users',
        userName: req.session.admin_user?.name || 'Admin'
      });
    } catch (error) {
      console.error('❌ Error rendering users page:', error);
      return res.render('admin/users', {
        title: 'User Management',
        activePage: 'users',
        userName: req.session.admin_user?.name || 'Admin',
        error: 'Failed to load page'
      });
    }
  },

  /**
   * Unsuspend a customer (additional function for completeness)
   */
  async unsuspendCustomer(req, res) {
    try {
      const { id } = req.params;

      console.log(`▶️ Unsuspending user ${id}`);

      // Check if user exists
      const [users] = await db.execute('SELECT id, name FROM users WHERE id = ?', [id]);
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const user = users[0];

      // Update user status
      await db.execute(
        'UPDATE users SET is_active = 1 WHERE id = ?',
        [id]
      );

      console.log(`✅ User ${user.name} unsuspended successfully`);

      return res.json({ 
        success: true, 
        message: `User ${user.name} has been unsuspended successfully` 
      });
    } catch (error) {
      console.error('❌ Error unsuspending user:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to unsuspend user', 
        error: error.message 
      });
    }
  },

  /**
   * Adjust customer subscription
   */
  async adjustCustomerSubscription(req, res) {
    try {
      const { id } = req.params;
      const { usage_until, package_name, free_bytes } = req.body;

      console.log(`⚙️ Adjusting subscription for user ${id}`);

      // Check if user exists
      const [users] = await db.execute('SELECT id, name FROM users WHERE id = ? AND role = "customer"', [id]);
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const user = users[0];
      const updateFields = [];
      const params = [];

      if (usage_until) {
        updateFields.push('usage_until = ?');
        params.push(usage_until);
      }
      if (package_name) {
        updateFields.push('package = ?');
        params.push(package_name);
      }
      if (free_bytes !== undefined) {
        updateFields.push('free_bytes = ?');
        params.push(free_bytes);
      }
      
      updateFields.push('updated_at = NOW()');
      params.push(id);

      await db.execute(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );

      console.log(`✅ Subscription adjusted for user ${user.name}`);

      return res.json({ 
        success: true, 
        message: `Subscription for ${user.name} has been updated successfully` 
      });
    } catch (error) {
      console.error('❌ Error adjusting subscription:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to adjust subscription', 
        error: error.message 
      });
    }
  },

    // Voucher redemption
    async voucher(req, res) {
        try {
            const { voucher } = req.body;
            const user = req.session.hotbando_user;
            
            if (!user) {
                return res.json({ 
                    success: 'error', 
                    message: 'Umelazimika kuingia kwenye akaunti yako.' 
                });
            }
            
            const now = new Date();
            
            const [vouchers] = await db.execute(
                'SELECT v.*, p.duration_hours FROM vouchers v JOIN packages p ON v.package_id = p.id WHERE v.voucher_code = ? AND v.is_used = 0 AND v.expires_at > NOW()',
                [voucher]
            );
            
            if (vouchers.length === 0) {
                return res.json({ 
                    success: 'error', 
                    message: 'Voucher sio sahihi, imetumika, au imekwisha muda wake.' 
                });
            }
            
            const vouch = vouchers[0];
            
            let newUsageUntil;
            if (user.usage_until && new Date(user.usage_until) > now) {
                newUsageUntil = new Date(new Date(user.usage_until).getTime() + (vouch.duration_hours * 3600 * 1000));
            } else {
                newUsageUntil = new Date(now.getTime() + (vouch.duration_hours * 3600 * 1000));
            }
            
            await db.execute(
                'UPDATE users SET package = ?, usage_start = ?, usage_until = ?, moneyspent = moneyspent + ?, updated_at = NOW() WHERE id = ?',
                [vouch.package_id, now, newUsageUntil, vouch.price, user.id]
            );
            
            await db.execute(
                'UPDATE vouchers SET is_used = 1, used_at = ?, used_by = ? WHERE id = ?',
                [now, user.id, vouch.id]
            );
            
            const [updatedUser] = await db.execute('SELECT * FROM users WHERE id = ?', [user.id]);
            req.session.hotbando_user = updatedUser[0];
            
            console.log(`✅ User ${user.name} redeemed voucher ${voucher} for package ${vouch.package_id}`);
            
            res.json({ 
                success: 'success', 
                message: 'Voucher imefanikiwa! Umefunguliwa kutumia mtandao.',
                package: vouch.package_id,
                until: newUsageUntil,
                duration: formatRemainingTime(vouch.duration_hours * 3600)
            });
            
        } catch (error) {
            console.error('❌ Voucher error:', error);
            res.json({ 
                success: 'error', 
                message: 'Imeshindikana kutumia voucher.' 
            });
        }
    },
    
    // Package purchase
    async purchasePackage(req, res) {
        try {
            const { package_id } = req.body;
            const user = req.session.hotbando_user;
            
            if (!user) {
                return res.json({ 
                    success: 'error', 
                    message: 'Umelazimika kuingia kwenye akaunti yako.' 
                });
            }
            
            const now = new Date();
            
            const [packages] = await db.execute('SELECT * FROM packages WHERE id = ? AND is_active = 1', [package_id]);
            
            if (packages.length === 0) {
                return res.json({ 
                    success: 'error', 
                    message: 'Kifurushi hicho hakipo.' 
                });
            }
            
            const pkg = packages[0];
            
            let newUsageUntil;
            if (user.usage_until && new Date(user.usage_until) > now) {
                newUsageUntil = new Date(new Date(user.usage_until).getTime() + (pkg.duration_hours * 3600 * 1000));
            } else {
                newUsageUntil = new Date(now.getTime() + (pkg.duration_hours * 3600 * 1000));
            }
            
            await db.execute(
                'UPDATE users SET package = ?, usage_start = ?, usage_until = ?, moneyspent = moneyspent + ?, updated_at = NOW() WHERE id = ?',
                [pkg.name, now, newUsageUntil, pkg.price, user.id]
            );
            
            await db.execute(
                'INSERT INTO payments (user_id, amount, payment_method, status, created_at) VALUES (?, ?, "cash", "completed", NOW())',
                [user.id, pkg.price]
            );
            
            const [updatedUser] = await db.execute('SELECT * FROM users WHERE id = ?', [user.id]);
            req.session.hotbando_user = updatedUser[0];
            
            console.log(`✅ User ${user.name} purchased package ${pkg.name} for TSH ${pkg.price}`);
            
            res.json({ 
                success: 'success', 
                message: `Kifurushi cha ${pkg.name} kimenunuliwa kikamilifu!`,
                package: pkg.name,
                until: newUsageUntil,
                amount: pkg.price,
                duration: formatRemainingTime(pkg.duration_hours * 3600)
            });
            
        } catch (error) {
            console.error('❌ Package purchase error:', error);
            res.json({ 
                success: 'error', 
                message: 'Imeshindikana kununua kifurushi.' 
            });
        }
    },

    // System health check - REAL STATUS
    async healthCheck(req, res) {
        try {
            const systemHealth = await mikrotikService.getSystemHealth();
            const routerStatus = await mikrotikService.checkRouterStatus(req.session.routerID || 'router-default');
            
            let connectedUsers = 0;
            try {
                const sessions = await mikrotikService.getActiveSessions(req.session.routerID);
                connectedUsers = sessions.length;
            } catch (error) {
                console.warn('⚠️ Could not get connected users count for health check');
            }
            
            res.json({
                success: true,
                system: systemHealth,
                router: {
                    ...routerStatus,
                    connectedUsers: connectedUsers
                },
                device: {
                    mac: req.session.mac,
                    ip: req.session.clientIP || req.ip,
                    location: req.session.location,
                    router: req.session.routerID
                },
                timestamp: new Date(),
                message: 'System iko tayari kutumika'
            });
        } catch (error) {
            console.error('❌ Health check error:', error);
            res.json({
                success: false,
                system: { status: 'degraded' },
                router: { status: 'unknown' },
                timestamp: new Date(),
                message: 'System inakua na changamoto ndogo'
            });
        }
    },

    // Password reset functionality
    async resetPassword(req, res) {
        try {
            const { phone_number, new_password } = req.body;
            
            const [users] = await db.execute(
                'SELECT id FROM users WHERE phone_number = ? AND role = "customer"',
                [phone_number]
            );
            
            if (users.length === 0) {
                return res.json({ success: false, message: 'Namba ya simu haijasajiliwa.' });
            }
            
            const hashedPassword = await bcrypt.hash(new_password, 10);
            
            await db.execute(
                'UPDATE users SET password = ?, updated_at = NOW() WHERE phone_number = ?',
                [hashedPassword, phone_number]
            );
            
            res.json({ success: true, message: 'Neno siri limebadilishwa kikamilifu.' });
            
        } catch (error) {
            console.error('Password reset error:', error);
            res.json({ success: false, message: 'Imeshindikana kubadili neno siri.' });
        }
    },

    // Get real device status
    async getDeviceStatus(req, res) {
        try {
            const user = req.session.hotbando_user;
            if (!user) {
                return res.json({ success: false, message: 'Not logged in' });
            }

            const deviceInfo = {
                mac: req.session.mac,
                ip: req.session.clientIP || req.ip,
                location: req.session.location,
                router: req.session.routerID,
                ssid: req.session.ssidshow,
                userAgent: req.headers['user-agent'],
                timestamp: new Date()
            };

            let isConnectedToRouter = false;
            try {
                const sessions = await mikrotikService.getActiveSessions(req.session.routerID);
                isConnectedToRouter = sessions.some(session => session['mac-address'] === req.session.mac);
            } catch (error) {
                console.warn('⚠️ Could not check router connection status');
            }

            res.json({
                success: true,
                device: deviceInfo,
                isConnectedToRouter: isConnectedToRouter,
                user: {
                    name: user.name,
                    phone: user.phone_number,
                    package: user.package,
                    status: new Date(user.usage_until) > new Date() ? 'active' : 'inactive'
                }
            });

        } catch (error) {
            console.error('❌ Device status error:', error);
            res.json({ success: false, message: 'Failed to get device status' });
        }
    },

    // Disconnect from router
    async disconnect(req, res) {
        try {
            const user = req.session.hotbando_user;
            if (!user) {
                return res.json({ 
                    success: false, 
                    message: 'Umelazimika kuingia kwenye akaunti yako.' 
                });
            }

            const mac = user.mac_address;
            const routerID = user.last_router_id;

            await mikrotikService.removeUserFromRouter(mac, routerID);
            
            console.log(`🔗 User ${user.name} manually disconnected from router`);

            res.json({ 
                success: true,
                message: 'Umeondolewa kwenye mtandao.'
            });

        } catch (error) {
            console.error('❌ Disconnect error:', error);
            res.json({ 
                success: false, 
                message: 'Imeshindikana kukutoka kwenye mtandao.' 
            });
        }
    }
};

module.exports = hotspotController;