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

// Normalize and validate a MAC address (returns null when invalid)
function normalizeMAC(raw) {
    if (!raw) return null;
    const cleaned = String(raw).trim().toUpperCase().replace(/-/g, ':');
    return /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(cleaned) ? cleaned : null;
}

// Get real client MAC address from various sources.
// Never invent a MAC: an invented MAC can never be authorised on the router.
function getRealClientMAC(req) {
    if (req.query.mac) {
        const m = normalizeMAC(req.query.mac);
        if (m) return m;
    }
    
    if (req.headers['x-client-mac']) {
        const m = normalizeMAC(req.headers['x-client-mac']);
        if (m) return m;
    }
    
    if (req.headers['user-agent'] && req.headers['user-agent'].includes('mac=')) {
        const match = req.headers['user-agent'].match(/mac=([A-F0-9:]+)/i);
        if (match) {
            const m = normalizeMAC(match[1]);
            if (m) return m;
        }
    }
    
    return null;
}

// Only return routers that actually exist and are active. A stale or
// fabricated id (e.g. ROUTER_DEFAULT) must not be written to the user row.
async function resolveRegisteredRouter(routerID) {
    if (!routerID) return null;
    try {
        const [rows] = await db.execute(
            'SELECT router_id FROM mikrotiks WHERE router_id = ? AND is_active = 1',
            [routerID]
        );
        return rows.length > 0 ? rows[0].router_id : null;
    } catch (_) {
        return null;
    }
}

// Get real location from router information
async function getRealLocation(routerID) {
    if (!routerID) return 'Tanzania';
    try {
        const [routers] = await db.execute(
            `SELECT COALESCE(l.name, m.router_name, 'Tanzania') AS location
             FROM mikrotiks m
             LEFT JOIN locations l ON m.location_id = l.id
             WHERE m.router_id = ?`,
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

// Get router id from the captive-portal redirect / header / session.
// Callers must validate it with resolveRegisteredRouter before persisting.
function getRealRouterID(req) {
    return req.query.routerID || req.query.routerid || req.query.router_id ||
        req.headers['x-router-id'] || req.session?.routerID || null;
}

// Get real SSID
function getRealSSID(req) {
    if (req.query.ssidshow || req.query.ssid) {
        return req.query.ssidshow || req.query.ssid;
    }
    
    if (req.headers['x-ssid']) {
        return req.headers['x-ssid'];
    }
    
    return 'HotBando WiFi';
}

function secondsUntilMidnight() {
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    return Math.floor((next - now) / 1000);
}

// Controller methods
const hotspotController = {
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
                return res.status(400).json({ error: Object.values(errors)[0] });
            }
            
            const [users] = await db.execute(
                'SELECT * FROM users WHERE phone_number = ? AND role = "customer" AND is_active = 1',
                [phone_number]
            );
            
            if (users.length === 0) {
                // Dummy bcrypt to prevent timing side-channel
                await bcrypt.compare('dummy-notreal', '$2a$12$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
                return res.status(400).json({ error: 'Neno la siri au namba ya simu si sahihi.' });
            }
            
            const user = users[0];
            
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(400).json({ error: 'Neno la siri au namba ya simu si sahihi.' });
            }
            
            let currentMAC = normalizeMAC(req.body.mac) || normalizeMAC(req.session.mac) || getRealClientMAC(req);

            // Explicit router (captive redirect ?router_id= / header / form) wins
            // over a possibly stale session value; only registered routers are accepted.
            const explicitRouter = req.body.router_id || req.query.routerID || req.query.routerid ||
                req.query.router_id || req.headers['x-router-id'] || null;
            let currentRouterID = await resolveRegisteredRouter(explicitRouter);
            if (!currentRouterID) {
                currentRouterID = await resolveRegisteredRouter(req.session.routerID);
            }
            if (!currentRouterID) {
                currentRouterID = await resolveRegisteredRouter(user.last_router_id);
            }

            // Resolve the real device MAC from the router when the redirect did
            // not carry it. Never persist a fabricated MAC.
            if (!currentMAC && currentRouterID) {
                currentMAC = await mikrotikService.resolveClientMAC(currentRouterID, req.ip);
            }

            const currentLocation = req.session.location || await getRealLocation(currentRouterID);
            const currentIP = req.ip;

            // Keep a known-good binding when this request came from outside the
            // hotspot, but never preserve a fabricated legacy value
            // (ROUTER_DEFAULT / non-MAC text) that the router can never match.
            const bindMAC = currentMAC || normalizeMAC(user.mac_address) || null;
            const bindRouter = currentRouterID || null;

            await db.execute(
                `UPDATE users SET 
                 mac_address = ?, 
                 last_router_id = ?, 
                 location = ?, 
                 ip_address = ?,
                 updated_at = NOW() 
                 WHERE id = ?`,
                [bindMAC, bindRouter, currentLocation, currentIP, user.id]
            );
            
            await new Promise((resolve, reject) => {
                req.session.regenerate((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            const { password: _pw, ...safeUser } = user;
            req.session.hotbando_user = {
                ...safeUser, 
                mac_address: bindMAC,
                last_router_id: bindRouter,
                location: currentLocation,
                ip_address: currentIP
            };
            req.session.mac = bindMAC;
            req.session.routerID = bindRouter;
            req.session.location = currentLocation;
            req.session.onWifi = !!bindRouter;
            req.session.ssidshow = req.session.ssidshow || getRealSSID(req);
            
            console.log(`✅ REAL User ${user.name} logged in:`, {
                mac: bindMAC,
                router: bindRouter
            });
            
            try {
                const now = new Date();
                const usageUntil = new Date(user.usage_until);
                
                if (bindMAC && bindRouter && usageUntil > now) {
                    const uptime = Math.max(0, (usageUntil - now) / 1000);
                    await mikrotikService.addUserToRouter(bindMAC, bindRouter, uptime, 0);
                    console.log(`🔗 Premium user connected to router: ${uptime} seconds`);
                } else if (bindMAC && bindRouter && user.free_bytes > 0) {
                    await mikrotikService.addUserToRouter(bindMAC, bindRouter, 0, user.free_bytes, true);
                    console.log(`🔗 Free data user connected to router: ${user.free_bytes} bytes`);
                }
            } catch (routerError) {
                console.warn('⚠️ Router connection after login failed:', routerError.message);
            }
            
            return res.json({ success: true });
            
        } catch (error) {
            console.error('❌ REAL Login error:', error);
            return res.status(500).json({ error: 'Tatizo limetokea. Tafadhali jaribu tena.' });
        }
    },
    
    // Process user registration - REAL DEVICE INFO
    async register(req, res) {
        try {
            const { name, phone_number, password } = req.body;
            const password_confirm = req.body.password_confirm || req.body.passwordConfirm || req.body.password_confirmation;
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
            
            if (!password || password.length < 6) {
                errors.password = 'Neno siri linapaswa kuwa na angalau tarakimu 6.';
            }
            
            if (password !== password_confirm) {
                errors.password_confirm = 'Neno siri hazifanani.';
            }
            
            if (Object.keys(errors).length > 0) {
                return res.status(400).json({ error: Object.values(errors)[0] });
            }
            
            const [existingUsers] = await db.execute(
                'SELECT id FROM users WHERE phone_number = ? AND role = "customer"',
                [phone_number]
            );
            
            if (existingUsers.length > 0) {
                return res.status(400).json({ error: 'Neno la siri au namba ya simu si sahihi.' });
            }
            
            const hashedPassword = await bcrypt.hash(password, 12);
            
            const routerID = await resolveRegisteredRouter(req.body.router_id || getRealRouterID(req));
            let clientMAC = normalizeMAC(req.body.mac) || getRealClientMAC(req) || normalizeMAC(req.session.mac) || null;
            if (!clientMAC && routerID) {
                clientMAC = await mikrotikService.resolveClientMAC(routerID, req.ip);
            }
            const location = routerID ? await getRealLocation(routerID) : (req.session.location || null);
            const clientIP = req.ip || null;
            
            // Admin-facing setting is `default_free_data_mb` (see schema.sql).
            // Keep `free_data_per_user` as a legacy fallback; stored value is bytes.
            const [settings] = await db.execute(
                `SELECT setting_key, setting_value FROM system_settings
                 WHERE setting_key IN ('default_free_data_mb', 'free_data_per_user')`
            );
            const settingMap = Object.fromEntries(settings.map(s => [s.setting_key, s.setting_value]));
            const freeBytes = settingMap.free_data_per_user
                ? parseInt(settingMap.free_data_per_user, 10)
                : (settingMap.default_free_data_mb ? parseInt(settingMap.default_free_data_mb, 10) * 1024 * 1024 : 10485760);
            
            const now = new Date();
            const [result] = await db.execute(
                `INSERT INTO users 
                (name, phone_number, password, role, package, mac_address, location, last_router_id, ip_address, moneyspent, usage_start, usage_until, free_bytes, last_free_used, is_active, created_at, updated_at) 
                VALUES (?, ?, ?, "customer", "KARIBU HOT BANDO", ?, ?, ?, ?, 0, ?, ?, ?, NULL, 1, ?, ?)`,
                [name, phone_number, hashedPassword, clientMAC, location, routerID, clientIP, now, now, freeBytes, now, now]
            );
            
            const [newUsers] = await db.execute(
                'SELECT * FROM users WHERE id = ?',
                [result.insertId]
            );
            
            const user = newUsers[0];
            await new Promise((resolve, reject) => {
                req.session.regenerate((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            const { password: _pw, ...safeRegUser } = user;
            req.session.hotbando_user = safeRegUser;
            req.session.mac = clientMAC;
            req.session.routerID = routerID;
            req.session.location = location;
            req.session.onWifi = !!routerID;
            req.session.ssidshow = req.session.ssidshow || getRealSSID(req);
            
            console.log(`✅ REAL New user registered:`, {
                name,
                phone: phone_number,
                mac: clientMAC,
                router: routerID,
                freeBytes: freeBytes
            });
            
            let routerConnected = false;
            if (clientMAC && routerID) {
                try {
                    routerConnected = await mikrotikService.addUserToRouter(clientMAC, routerID, 0, freeBytes);
                    if (routerConnected) {
                        console.log(`🔗 New user connected to router with ${freeBytes} bytes free data`);
                    }
                } catch (routerError) {
                    console.warn('⚠️ Router connection after registration failed:', routerError.message);
                }
            } else {
                console.warn('⚠️ Registration has no router/MAC binding; device will need to reconnect from HotBando WiFi.');
            }
            
            return res.json({
                success: true,
                routerConnected,
                mac: clientMAC,
                routerID,
                freeBytes
            });
            
        } catch (error) {
            console.error('❌ REAL Registration error:', error);
            return res.status(500).json({ error: 'Tatizo limetokea wakati wa usajili. Tafadhali jaribu tena.' });
        }
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
            
            // A captive portal redirect on another registered router carries
            // the current station MAC. Prefer it over the account's previous
            // router binding so an existing login can roam between hotspots.
            let routerID = await resolveRegisteredRouter(req.session.routerID) ||
                await resolveRegisteredRouter(user.last_router_id);

            let mac = normalizeMAC(req.session.mac);
            if (!mac && routerID) {
                mac = await mikrotikService.resolveClientMAC(routerID, req.ip);
            }
            if (!mac) mac = normalizeMAC(user.mac_address);
            if (!mac || !routerID) {
                return res.json({
                    success: false,
                    message: 'Kifaa hiki hakionekani kwenye Mtandao wa HotBando. Tafadhali unganishe kwenye WiFi ya HotBando kisha ujaribu tena.'
                });
            }

            // Refresh from DB so ad rewards / vouchers credited after login
            // are reflected even if the session copy is stale.
            try {
                const [fresh] = await db.execute('SELECT * FROM users WHERE id = ?', [user.id]);
                if (fresh.length > 0) {
                    const { password: _p, ...safe } = fresh[0];
                    req.session.hotbando_user = safe;
                    Object.assign(user, safe);
                }
            } catch (_) { /* keep session copy */ }

            const now = new Date();
            let uptime = 0;
            let bytes = 0;
            let connectionType = 'none';
            
            const usageUntil = user.usage_until ? new Date(user.usage_until) : null;
            if (usageUntil && usageUntil > now) {
                uptime = Math.max(0, (usageUntil - now) / 1000);
                connectionType = 'premium';
            } else if (Number(user.free_bytes) > 0) {
                bytes = Number(user.free_bytes);
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
                const preserveBytes = (uptime === 0 && bytes > 0);
                routerSuccess = await mikrotikService.addUserToRouter(mac, routerID, uptime, bytes, preserveBytes);
                routerMessage = routerSuccess ? 
                    'Imefanikiwa kunganishwa kwenye mtandao!' : 
                    'Imeshindikana kuunganisha kwenye router.';
                
                console.log(`🔗 REAL Router connection:`, {
                    user: user.name,
                    mac: mac,
                    router: routerID,
                    type: connectionType,
                    success: routerSuccess
                });
                
            } catch (routerError) {
                console.error('❌ REAL Router connection error:', routerError.message);
                routerSuccess = false;
                routerMessage = 'Imeshindikana kuunganisha kwenye router.';
            }
            
            if (routerSuccess) {
                await db.execute(
                    'UPDATE users SET mac_address = ?, last_router_id = ?, last_free_used = ?, updated_at = NOW() WHERE id = ?',
                    [mac, routerID, now, user.id]
                );
                req.session.mac = mac;
                req.session.routerID = routerID;
                req.session.hotbando_user.mac_address = mac;
                req.session.hotbando_user.last_router_id = routerID;
            }
            
            res.json({ 
                success: routerSuccess,
                message: routerSuccess ? 
                    'Imefanikiwa kunganishwa kwenye mtandao! Sasa unaweza kutumia internet.' : 
                    'Imeshindikana kuunganishwa kwenye mtandao. Tafadhali jaribu tena.',
                type: connectionType,
                uptime,
                bytes,
                routerConnected: routerSuccess,
                mac: routerSuccess ? mac : null,
                routerID: routerSuccess ? routerID : null
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
                    adsWatchedToday: todayViews[0].count,
                    adsRemaining: 0,
                    resetIn: secondsUntilMidnight(),
                    message: 'Umeshazidi kiasi cha matangazo leo. Jaribu kesho tena.' 
                });
            }
            
            let ads = [];

            // The SPA lets the customer choose an ad from the list. Start that
            // specific ad so completeAd() can verify it was actually served.
            const requestedAdId = parseInt(req.query.ad_id || req.body?.ad_id, 10);
            if (requestedAdId) {
                const [requestedAds] = await db.execute(
                    'SELECT * FROM ads WHERE id = ? AND approved = 1 AND is_active = 1 LIMIT 1',
                    [requestedAdId]
                );
                ads = requestedAds;
                if (ads.length === 0) {
                    return res.json({
                        success: false,
                        adsWatchedToday: todayViews[0].count,
                        adsRemaining: Math.max(0, dailyAdLimit - todayViews[0].count),
                        message: 'Tangazo hilo halipo au halijaidhinishwa.'
                    });
                }
            } else {
                // PREFER VIDEO ADS FIRST
                const [videoAds] = await db.execute(
                    'SELECT * FROM ads WHERE approved = 1 AND is_active = 1 AND video_url IS NOT NULL AND video_url != "" ORDER BY RAND() LIMIT 1'
                );

                ads = videoAds;

                // If no video ads, get any ad
                if (ads.length === 0) {
                    const [allAds] = await db.execute(
                        'SELECT * FROM ads WHERE approved = 1 AND is_active = 1 ORDER BY RAND() LIMIT 1'
                    );
                    ads = allAds;
                }
            }
            
            if (ads.length === 0) {
                return res.json({ 
                    success: false, 
                    adsWatchedToday: todayViews[0].count,
                    adsRemaining: Math.max(0, dailyAdLimit - todayViews[0].count),
                    message: 'Hakuna matangazo yanayopatikana kwa sasa.' 
                });
            }
            
            const ad = ads[0];
            const rewardMB = Math.round(ad.reward_bytes / (1024 * 1024));
            
            // Server-side start tracking: record when this ad was served.
            // completeAd will verify enough wall-clock time has passed.
            req.session.ad_start = {
                ad_id: ad.id,
                started_at: Date.now()
            };
            
            res.json({ 
                success: true, 
                adsWatchedToday: todayViews[0].count,
                adsRemaining: Math.max(0, dailyAdLimit - todayViews[0].count),
                resetIn: secondsUntilMidnight(),
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

    // List all available ads (video list) - SASHA URIASISHAJI
    async getAdsList(req, res) {
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

            const [ads] = await db.execute(
                'SELECT a.*, u.name AS sponsor_name, u.company_name FROM ads a JOIN users u ON a.sponsor_id = u.id WHERE a.approved = 1 AND a.is_active = 1 ORDER BY a.created_at DESC, a.id DESC'
            );

            res.json({
                success: true,
                ads: ads.map(ad => ({
                    id: ad.id,
                    title: ad.title,
                    description: ad.description,
                    image_url: ad.image_url,
                    video_url: ad.video_url,
                    duration: ad.duration,
                    reward_mb: Math.round(ad.reward_bytes / (1024 * 1024)),
                    reward_bytes: ad.reward_bytes,
                    is_video: !!ad.video_url,
                    sponsor_name: ad.sponsor_name,
                    company_name: ad.company_name,
                    views_count: ad.views_count
                })),
                adsWatchedToday: todayViews[0].count,
                adsRemaining: Math.max(0, dailyAdLimit - todayViews[0].count),
                resetIn: secondsUntilMidnight()
            });
        } catch (error) {
            console.error('❌ Get ads list error:', error);
            res.json({ 
                success: false, 
                message: 'Imeshindikana kupata matangazo.' 
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

            // Validate watched_duration: must watch at least 80% of ad duration
            const [minPctSetting] = await db.execute(
                'SELECT setting_value FROM system_settings WHERE setting_key = "min_ad_watch_percentage"'
            );
            const minWatchPct = minPctSetting.length > 0 ? parseInt(minPctSetting[0].setting_value) : 80;
            const minRequiredDuration = Math.ceil((ad.duration * minWatchPct) / 100);
            const actualDuration = parseInt(watched_duration) || 0;

            if (actualDuration < minRequiredDuration) {
                return res.json({
                    success: false,
                    message: `Tazama tangazo kwa angalau ${minRequiredDuration} sekundi ili upate reward.`
                });
            }

            // Server-side time check: ad must have been served by getAd, and enough
            // wall-clock time must have elapsed since. This prevents spoofing
            // watched_duration without actually waiting.
            const adStart = req.session.ad_start;
            if (!adStart || adStart.ad_id !== ad.id) {
                return res.json({
                    success: false,
                    message: 'Tangazo halijaanza. Jaza kutoka kwenye ukurasa wa matangazo.'
                });
            }
            const elapsedSeconds = Math.floor((Date.now() - adStart.started_at) / 1000);
            if (elapsedSeconds < minRequiredDuration) {
                return res.json({
                    success: false,
                    message: `Subiri angalau ${minRequiredDuration} sekundi (kimepita ${elapsedSeconds}) kisha maliza tangazo.`
                });
            }
            // Clear the start so the same served ad cannot be completed twice
            delete req.session.ad_start;

            // Prevent duplicate completions within 5 minutes
            const [recentViews] = await db.execute(
                'SELECT id FROM ad_views WHERE user_id = ? AND ad_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE) LIMIT 1',
                [user.id, ad_id]
            );

            if (recentViews.length > 0) {
                return res.json({
                    success: false,
                    message: 'Umeshatizama tangazo hili hivi karibuni. Subiri kidogo.'
                });
            }
            
            // Record ad view + add reward + bump views in a single transaction
            const conn = await db.getConnection();
            try {
                await conn.beginTransaction();

                await conn.execute(
                    'INSERT INTO ad_views (user_id, ad_id, watched_duration, data_earned, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                    [user.id, ad_id, actualDuration, ad.reward_bytes, req.ip, req.headers['user-agent']]
                );

                await conn.execute(
                    'UPDATE users SET free_bytes = free_bytes + ? WHERE id = ?',
                    [ad.reward_bytes, user.id]
                );

                await conn.execute(
                    'UPDATE ads SET views_count = views_count + 1 WHERE id = ?',
                    [ad.id]
                );

                await conn.commit();
            } catch (txError) {
                await conn.rollback();
                throw txError;
            } finally {
                conn.release();
            }
            
            // Update session data
            const newFreeBytes = Number(user.free_bytes) + Number(ad.reward_bytes);
            req.session.hotbando_user.free_bytes = newFreeBytes;

            // Push the new allowance to the router too. Without this the DB
            // shows the extra MBs but RouterOS keeps the old byte cap.
            let routerConnected = false;
            try {
                const mac = normalizeMAC(user.mac_address) || normalizeMAC(req.session.mac);
                const routerID = await resolveRegisteredRouter(req.session.routerID) ||
                    await resolveRegisteredRouter(user.last_router_id);
                if (mac && routerID) {
                    const usageUntil = user.usage_until ? new Date(user.usage_until) : null;
                    const isPaid = usageUntil && usageUntil > new Date();
                    const uptime = isPaid ? Math.max(0, (usageUntil - new Date()) / 1000) : 0;
                    routerConnected = await mikrotikService.addUserToRouter(
                        mac, routerID, uptime, isPaid ? 0 : newFreeBytes
                    );
                }
            } catch (routerErr) {
                console.warn('⚠️ Could not extend router data after ad:', routerErr.message);
            }
            
            const rewardMB = Math.round(ad.reward_bytes / (1024 * 1024));
            const newTotalMB = Math.round(newFreeBytes / (1024 * 1024));
            
            res.json({ 
                success: true, 
                addedMB: rewardMB,
                totalMB: newTotalMB,
                routerConnected,
                adsWatchedToday: views[0].count + 1,
                adsRemaining: Math.max(0, dailyAdLimit - (views[0].count + 1)),
                message: `Umepata ${rewardMB}MB ya data bure kutoka kwa ${ad.title}!`
            });
            
        } catch (error) {
            console.error('Complete ad error:', error);
            res.json({ 
                success: false, 
                message: 'Imeshindikana kukamilisha tangazo.' 
            });
        }
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

            // Only allow a customer to view their own info, or an admin to view any
            const customer = req.session.hotbando_user;
            const admin = req.session.admin_user;
            const isOwnAccount = customer && customer.phone_number === phone_number;
            const isAdmin = admin && (admin.role === 'admin' || admin.role === 'super_admin');

            if (!isOwnAccount && !isAdmin) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: unajihitaji kuingia kwenye akaunti yako.'
                });
            }

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
            const { password: _pw3, ...safeUserData } = user;
            
            res.json({ 
                success: true, 
                data: {
                    ...safeUserData,
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
      
      query += ` ORDER BY id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
      
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
            const { voucher_code, voucher } = req.body;
            const voucherCode = voucher_code || voucher;
            const user = req.session.hotbando_user;
            
            if (!user) {
                return res.status(401).json({ success: 'error', message: 'Umelazimika kuingia kwenye akaunti yako.' });
            }
            
            if (!voucherCode) {
                return res.status(400).json({ success: 'error', message: 'Tafadhali ingiza namba ya vocha.' });
            }
            
            const now = new Date();
            
            const [vouchers] = await db.execute(
                'SELECT v.*, p.duration_hours, p.name AS package_name FROM vouchers v JOIN packages p ON v.package_id = p.id WHERE v.voucher_code = ? AND v.is_used = 0 AND v.expires_at > NOW()',
                [voucherCode]
            );
            
            if (vouchers.length === 0) {
                return res.status(400).json({ success: 'error', message: 'Voucher sio sahihi, imetumika, au imekwisha muda wake.' });
            }
            
            const vouch = vouchers[0];

            // Atomic redeem: mark used first to prevent double-redeem
            const [redeemResult] = await db.execute(
                'UPDATE vouchers SET is_used = 1, used_at = ?, used_by = ? WHERE id = ? AND is_used = 0',
                [now, user.id, vouch.id]
            );
            if (redeemResult.affectedRows === 0) {
                return res.status(400).json({ success: 'error', message: 'Voucher imekwisha kutumika na mtu mwingine.' });
            }

            let newUsageUntil;
            if (user.usage_until && new Date(user.usage_until) > now) {
                newUsageUntil = new Date(new Date(user.usage_until).getTime() + (vouch.duration_hours * 3600 * 1000));
            } else {
                newUsageUntil = new Date(now.getTime() + (vouch.duration_hours * 3600 * 1000));
            }

            await db.execute(
                'UPDATE users SET package = ?, usage_start = ?, usage_until = ?, moneyspent = moneyspent + ?, updated_at = NOW() WHERE id = ?',
                [vouch.package_name, now, newUsageUntil, vouch.price, user.id]
            );

            await db.execute(
                'INSERT INTO payments (user_id, package_id, amount, payment_method, status, activated, created_at) VALUES (?, ?, ?, "voucher", "completed", 1, NOW())',
                [user.id, vouch.package_id, vouch.price]
            );

            // Track reseller sales + platform commission (20%) when voucher was generated by a reseller
            try {
                const [batchRows] = await db.execute(
                    'SELECT vb.created_by FROM voucher_batches vb WHERE vb.id = ?',
                    [vouch.batch_id]
                );
                if (batchRows.length && batchRows[0].created_by) {
                    const creatorId = batchRows[0].created_by;
                    const [creatorRows] = await db.execute('SELECT role FROM users WHERE id = ?', [creatorId]);
                    if (creatorRows.length && creatorRows[0].role === 'reseller') {
                        const commission = parseFloat(vouch.price) * 0.2;
                        await db.execute(
                            'UPDATE resellers SET total_vouchers_sold = total_vouchers_sold + 1, total_earned = total_earned + ? WHERE user_id = ?',
                            [parseFloat(vouch.price) * 0.8, creatorId]
                        );
                        await db.execute(
                            `INSERT INTO transactions (user_id, transaction_type, amount, description, status, created_at)
                             VALUES (?, 'commission', ?, ?, 'completed', NOW())`,
                            [creatorId, commission, `Platform commission 20% on voucher ${vouch.voucher_code}`]
                        );
                    }
                }
            } catch (e) {
                console.error('Reseller commission tracking error:', e.message);
            }

            const [updatedUser] = await db.execute('SELECT * FROM users WHERE id = ?', [user.id]);
            const { password: _pw2, ...safeUpdated } = updatedUser[0];
            req.session.hotbando_user = safeUpdated;

            // Auto-connect to router after voucher redemption. Use the fresh
            // DB row so a binding repaired during this request is honoured.
            let mac = normalizeMAC(updatedUser[0].mac_address) || normalizeMAC(req.session.mac);
            let routerID = await resolveRegisteredRouter(req.session.routerID) ||
                await resolveRegisteredRouter(updatedUser[0].last_router_id);
            if (!mac && routerID) {
                mac = await mikrotikService.resolveClientMAC(routerID, req.ip);
            }

            let routerConnected = false;
            if (mac && routerID) {
                try {
                    const uptime = Math.max(0, (newUsageUntil.getTime() - now.getTime()) / 1000);
                    routerConnected = await mikrotikService.addUserToRouter(mac, routerID, uptime, 0);
                    console.log(`🔗 Auto-connected ${user.name} after voucher redemption`);
                    await db.execute(
                        'UPDATE users SET mac_address = ?, last_router_id = ?, updated_at = NOW() WHERE id = ?',
                        [mac, routerID, user.id]
                    );
                    req.session.mac = mac;
                    req.session.routerID = routerID;
                    req.session.hotbando_user.mac_address = mac;
                    req.session.hotbando_user.last_router_id = routerID;
                } catch (routerErr) {
                    console.warn('⚠️ Auto-connect after voucher failed (non-critical):', routerErr.message);
                }
            }

            console.log(`✅ User ${user.name} redeemed voucher ${voucherCode} for package ${vouch.package_name}, duration: ${vouch.duration_hours}h`);
            
            res.json({ 
                success: 'success', 
                message: routerConnected
                    ? 'Voucher imefanikiwa! Umefunguliwa kutumia mtandao.'
                    : 'Voucher imehifadhiwa. Bonyeza "Wasiliana na Mtandao" kukamilisha muunganisho.',
                package: vouch.package_name,
                until: newUsageUntil,
                routerConnected,
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

            // C2 FIX: Verify a real, UNCLAIMED payment exists (ClickPesa or voucher).
            // Atomic claim (activated=1) guarantees one payment extends time once.
            const [verifiedPayments] = await db.execute(
                'SELECT id FROM payments WHERE user_id = ? AND package_id = ? AND status = "completed" AND activated = 0 AND payment_method IN ("clickpesa","voucher") AND created_at > DATE_SUB(NOW(), INTERVAL 30 MINUTE) LIMIT 1',
                [user.id, package_id]
            );
            if (verifiedPayments.length === 0) {
                // No unclaimed payment — maybe the webhook already activated it.
                const [done] = await db.execute(
                    'SELECT id FROM payments WHERE user_id = ? AND package_id = ? AND status = "completed" AND activated = 1 AND payment_method IN ("clickpesa","voucher","pesapal") AND created_at > DATE_SUB(NOW(), INTERVAL 30 MINUTE) LIMIT 1',
                    [user.id, package_id]
                );
                if (done.length > 0) {
                    const [fresh] = await db.execute('SELECT usage_until FROM users WHERE id = ?', [user.id]);
                    return res.json({
                        success: 'success',
                        message: 'Kifurushi tayari kimewashwa.',
                        package: pkg.name,
                        until: fresh[0]?.usage_until || null
                    });
                }
                return res.status(400).json({ 
                    success: 'error', 
                    message: 'Lipa kupitia ClickPesa kwanza kabla ya kuamilisha kifurushi.' 
                });
            }
            const [claim] = await db.execute(
                'UPDATE payments SET activated = 1 WHERE id = ? AND activated = 0',
                [verifiedPayments[0].id]
            );
            if (claim.affectedRows === 0) {
                const [fresh] = await db.execute('SELECT usage_until FROM users WHERE id = ?', [user.id]);
                return res.json({
                    success: 'success',
                    message: 'Kifurushi tayari kimewashwa.',
                    package: pkg.name,
                    until: fresh[0]?.usage_until || null
                });
            }
            
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
            
            // Verified payment (clickpesa/voucher) is already recorded — no extra row.
            
            const [updatedUser] = await db.execute('SELECT * FROM users WHERE id = ?', [user.id]);
            const { password: _pw2, ...safeUpdated } = updatedUser[0];
            req.session.hotbando_user = safeUpdated;

            // Activate the package on the router as part of the purchase so it
            // is not left as a DB-only entitlement.
            let mac = normalizeMAC(updatedUser[0].mac_address) || normalizeMAC(req.session.mac);
            let routerID = await resolveRegisteredRouter(req.session.routerID) ||
                await resolveRegisteredRouter(updatedUser[0].last_router_id);
            if (!mac && routerID) {
                mac = await mikrotikService.resolveClientMAC(routerID, req.ip);
            }
            let routerConnected = false;
            if (mac && routerID) {
                try {
                    const uptime = Math.max(0, (newUsageUntil.getTime() - now.getTime()) / 1000);
                    routerConnected = await mikrotikService.addUserToRouter(mac, routerID, uptime, 0);
                    await db.execute(
                        'UPDATE users SET mac_address = ?, last_router_id = ?, updated_at = NOW() WHERE id = ?',
                        [mac, routerID, user.id]
                    );
                    req.session.mac = mac;
                    req.session.routerID = routerID;
                    req.session.hotbando_user.mac_address = mac;
                    req.session.hotbando_user.last_router_id = routerID;
                } catch (routerErr) {
                    console.warn('⚠️ Auto-connect after package purchase failed:', routerErr.message);
                }
            }
            
            console.log(`✅ User ${user.name} purchased package ${pkg.name} for TSH ${pkg.price}`);
            
            res.json({ 
                success: 'success', 
                message: routerConnected
                    ? `Kifurushi cha ${pkg.name} kimenunuliwa kikamilifu!`
                    : `Kifurushi cha ${pkg.name} kimehifadhiwa. Bonyeza "Wasiliana na Mtandao" kukamilisha muunganisho.`,
                package: pkg.name,
                until: newUsageUntil,
                amount: pkg.price,
                routerConnected,
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
                const sessions = await mikrotikService.getActiveSessions(req.session.routerID || 'router-default');
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
            const { phone_number, old_password, new_password } = req.body;

            // Require the caller to be the account owner (no unauthenticated resets)
            const customer = req.session.hotbando_user;
            const admin = req.session.admin_user;
            const isAdmin = admin && (admin.role === 'admin' || admin.role === 'super_admin');
            const isOwnAccount = customer && customer.phone_number === phone_number;

            if (!isOwnAccount && !isAdmin) {
                return res.status(401).json({ success: false, message: 'Unauthorized: neno siri hubadilishwa kutoka kwenye akaunti yako mwenyewe.' });
            }

            const [users] = await db.execute(
                'SELECT id, password FROM users WHERE phone_number = ? AND role = "customer"',
                [phone_number]
            );
            
            if (users.length === 0) {
                return res.json({ success: false, message: 'Namba ya simu haijasajiliwa.' });
            }

            // Non-admin users must confirm their current password
            if (!isAdmin) {
                const currentPassword = users[0].password;
                const passwordMatch = await bcrypt.compare(old_password || '', currentPassword);
                if (!passwordMatch) {
                    return res.json({ success: false, message: 'Neno siri la sasa si sahihi.' });
                }
            }
            
            const hashedPassword = await bcrypt.hash(new_password, 12);
            
            await db.execute(
                'UPDATE users SET password = ?, updated_at = NOW() WHERE phone_number = ? AND role = "customer"',
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
                const sessions = await mikrotikService.getActiveSessions(req.session.routerID || 'router-default');
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
module.exports.helpers = { getRealClientMAC, getRealRouterID, getRealSSID, getRealLocation, formatRemainingTime };
