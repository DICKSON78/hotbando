/**
 * Comprehensive Seed Script - Adds data to ALL tables
 * Run: node database/seed-comprehensive.js
 */

const db = require('../config/database');
const bcrypt = require('bcryptjs');

async function seedComprehensive() {
    console.log('🌱 Starting comprehensive database seeding...\n');

    try {
        const hashedPassword = await bcrypt.hash('password123', 10);

        // ========================================
        // 1. PACKAGES - Internet Packages
        // ========================================
        console.log('📦 Seeding packages...');
        const packages = [
            { name: 'MASAA 6', price: 1000, duration_hours: 6, description: 'Pakiti la masaa 6 - 2GB' },
            { name: 'MASAA 24', price: 2000, duration_hours: 24, description: 'Pakiti la siku moja - 5GB' },
            { name: 'WIKI 1', price: 10000, duration_hours: 168, description: 'Pakiti la wiki moja - 20GB' },
            { name: 'MWEEZI 1', price: 35000, duration_hours: 720, description: 'Pakiti la mwezi mmoja - 100GB' }
        ];

        for (const pkg of packages) {
            const [existing] = await db.execute('SELECT id FROM packages WHERE name = ?', [pkg.name]);
            if (existing.length === 0) {
                await db.execute(
                    'INSERT INTO packages (name, price, duration_hours, description, is_active, created_at) VALUES (?, ?, ?, ?, 1, NOW())',
                    [pkg.name, pkg.price, pkg.duration_hours, pkg.description]
                );
                console.log(`  ✅ Created package: ${pkg.name}`);
            }
        }

        // ========================================
        // 2. MIKROTIKS - Routers
        // ========================================
        console.log('\n🔌 Seeding mikrotiks...');
        const routers = [
            { router_id: 'ROUTER_DAR_001', router_name: 'Dar es Salaam - Mlimani', host: '192.168.1.1', port: 8728, user: 'admin', password: 'admin123', location: 'Mlimani City Mall', ssid: 'HotBando-Mlimani', status: 'online' },
            { router_id: 'ROUTER_MWANZA_001', router_name: 'Mwanza - City Center', host: '192.168.2.1', port: 8728, user: 'admin', password: 'admin123', location: 'Mwanza', ssid: 'HotBando-Mwanza', status: 'online' },
            { router_id: 'ROUTER_ARUSHA_001', router_name: 'Arusha - Safari', host: '192.168.3.1', port: 8728, user: 'admin', password: 'admin123', location: 'Safari Hostel', ssid: 'HotBando-Arusha', status: 'online' },
            { router_id: 'ROUTER_DODOMA_001', router_name: 'Dodoma - Central', host: '192.168.4.1', port: 8728, user: 'admin', password: 'admin123', location: 'Dodoma', ssid: 'HotBando-Dodoma', status: 'offline' }
        ];

        for (const router of routers) {
            const [existing] = await db.execute('SELECT id FROM mikrotiks WHERE router_id = ?', [router.router_id]);
            if (existing.length === 0) {
                await db.execute(
                    'INSERT INTO mikrotiks (router_id, router_name, host, port, user, password, location, ssid, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
                    [router.router_id, router.router_name, router.host, router.port, router.user, router.password, router.location, router.ssid, router.status]
                );
                console.log(`  ✅ Created router: ${router.router_name}`);
            }
        }

        // ========================================
        // 3. USERS - Add more diverse users
        // ========================================
        console.log('\n👥 Seeding additional users...');
        const additionalUsers = [
            // Customers
            { name: 'Ahmed Mohamed', phone_number: '0712111111', role: 'customer', user_type: 'student', location: 'Dar es Salaam', package: 'MASAA 24', gender: 'male', age: 21, is_active: 1 },
            { name: 'Fatuma Hassan', phone_number: '0713222222', role: 'customer', user_type: 'student', location: 'Dar es Salaam', package: 'WIKI 1', gender: 'female', age: 23, is_active: 1 },
            { name: 'Joseph Mwamba', phone_number: '0714333333', role: 'customer', user_type: 'tenant', location: 'Mwanza', package: 'MASAA 6', gender: 'male', age: 28, is_active: 1 },
            { name: 'Grace Komba', phone_number: '0715444444', role: 'customer', user_type: 'tenant', location: 'Arusha', package: 'MWEEZI 1', gender: 'female', age: 30, is_active: 1 },
            { name: 'Daniel Kileo', phone_number: '0716555555', role: 'customer', user_type: 'other', location: 'Dodoma', package: 'MASAA 24', gender: 'male', age: 35, is_active: 1 },
            // Sponsors
            { name: 'Vodacom Tanzania', phone_number: '0717666666', email: 'vodacom@sponsor.com', role: 'sponsor', company_name: 'Vodacom Tanzania', location: 'Dar es Salaam', is_active: 1 },
            { name: 'Airtel Tanzania', phone_number: '0718777777', email: 'airtel@sponsor.com', role: 'sponsor', company_name: 'Airtel Tanzania', location: 'Dar es Salaam', is_active: 1 },
            // Agents
            { name: 'Michael Franchise', phone_number: '0719888888', email: 'michael@agent.com', role: 'agent', location: 'Mwanza', commission_rate: 12.00, is_active: 1 }
        ];

        const userIds = [];
        for (const user of additionalUsers) {
            const [existing] = await db.execute('SELECT id FROM users WHERE phone_number = ?', [user.phone_number]);
            if (existing.length === 0) {
                const [result] = await db.execute(
                    `INSERT INTO users (name, phone_number, email, password, role, user_type, location, package, company_name,
                     commission_rate, gender, age, is_active, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [user.name, user.phone_number, user.email || null, hashedPassword, user.role, user.user_type || 'other',
                     user.location, user.package || null, user.company_name || null, user.commission_rate || 0,
                     user.gender || null, user.age || null, user.is_active]
                );
                userIds.push(result.insertId);
                console.log(`  ✅ Created user: ${user.name}`);
            } else {
                userIds.push(existing[0].id);
            }
        }

        // ========================================
        // 4. ADS - Video Advertisements
        // ========================================
        console.log('\n📺 Seeding ads...');
        const [sponsors] = await db.execute("SELECT id FROM users WHERE role = 'sponsor' LIMIT 5");

        if (sponsors.length > 0) {
            const ads = [
                { title: 'Vodacom 5G Launch', video_url: 'https://example.com/vodacom-5g.mp4', duration: 30, reward_bytes: 52428800, description: 'Experience the power of 5G with Vodacom' },
                { title: 'Airtel Money Promo', video_url: 'https://example.com/airtel-money.mp4', duration: 45, reward_bytes: 78643200, description: 'Send money instantly with Airtel Money' },
                { title: 'Coca Cola Ramadan', video_url: 'https://example.com/cocacola.mp4', duration: 20, reward_bytes: 31457280, description: 'Taste the feeling this Ramadan' },
                { title: 'Samsung Galaxy S24', video_url: 'https://example.com/samsung.mp4', duration: 60, reward_bytes: 104857600, description: 'The new Samsung Galaxy S24 - Epic in every way' },
                { title: 'CRDB Bank Loan', video_url: 'https://example.com/crdb.mp4', duration: 40, reward_bytes: 62914560, description: 'Get instant loans from CRDB Bank' }
            ];

            for (let i = 0; i < ads.length; i++) {
                const ad = ads[i];
                const sponsorId = sponsors[i % sponsors.length].id;

                const [existing] = await db.execute('SELECT id FROM ads WHERE title = ?', [ad.title]);
                if (existing.length === 0) {
                    await db.execute(
                        `INSERT INTO ads (sponsor_id, title, video_url, duration, reward_bytes, description,
                         is_active, views_count, clicks_count, created_at)
                         VALUES (?, ?, ?, ?, ?, ?, 1, ${Math.floor(Math.random() * 500)}, ${Math.floor(Math.random() * 300)}, NOW())`,
                        [sponsorId, ad.title, ad.video_url, ad.duration, ad.reward_bytes, ad.description]
                    );
                    console.log(`  ✅ Created ad: ${ad.title}`);
                }
            }

            // Add ad views
            const [allAds] = await db.execute('SELECT id FROM ads LIMIT 5');
            const [customers] = await db.execute("SELECT id FROM users WHERE role = 'customer' LIMIT 10");

            if (allAds.length > 0 && customers.length > 0) {
                console.log('\n👁️  Adding ad views...');
                for (let i = 0; i < 50; i++) {
                    const adId = allAds[Math.floor(Math.random() * allAds.length)].id;
                    const userId = customers[Math.floor(Math.random() * customers.length)].id;
                    const watchPercentage = Math.floor(Math.random() * 100) + 1;

                    try {
                        await db.execute(
                            `INSERT INTO ad_views (ad_id, user_id, watch_percentage, completed, rewarded, ip_address, created_at)
                             VALUES (?, ?, ?, ?, ?, '192.168.1.${Math.floor(Math.random() * 255)}', DATE_SUB(NOW(), INTERVAL ${Math.floor(Math.random() * 30)} DAY))`,
                            [adId, userId, watchPercentage, watchPercentage >= 80 ? 1 : 0, watchPercentage >= 80 ? 1 : 0]
                        );
                    } catch (err) {
                        // Skip duplicates
                    }
                }
                console.log('  ✅ Added 50 ad views');
            }
        }

        // ========================================
        // 5. VOUCHERS - Voucher codes
        // ========================================
        console.log('\n🎫 Seeding vouchers...');
        const [pkgs] = await db.execute('SELECT id, name, price FROM packages');

        if (pkgs.length > 0) {
            for (let i = 1; i <= 20; i++) {
                const pkg = pkgs[Math.floor(Math.random() * pkgs.length)];
                const voucherCode = `HBND${Date.now()}${i}`.substring(0, 16);
                const isUsed = Math.random() > 0.6;

                const [existing] = await db.execute('SELECT id FROM vouchers WHERE voucher_code = ?', [voucherCode]);
                if (existing.length === 0) {
                    await db.execute(
                        'INSERT INTO vouchers (voucher_code, package_id, price, is_used, created_at) VALUES (?, ?, ?, ?, NOW())',
                        [voucherCode, pkg.id, pkg.price, isUsed ? 1 : 0]
                    );
                }
            }
            console.log('  ✅ Created 20 vouchers');
        }

        // ========================================
        // 6. PAYMENTS - Payment records
        // ========================================
        console.log('\n💳 Seeding payments...');
        const [allUsers] = await db.execute("SELECT id FROM users WHERE role = 'customer' LIMIT 10");

        if (allUsers.length > 0) {
            for (let i = 0; i < 30; i++) {
                const user = allUsers[Math.floor(Math.random() * allUsers.length)];
                const amount = [1000, 2000, 5000, 10000, 20000][Math.floor(Math.random() * 5)];
                const method = ['mpesa', 'tigopesa', 'airtel_money'][Math.floor(Math.random() * 3)];
                const status = ['completed', 'completed', 'completed', 'pending', 'failed'][Math.floor(Math.random() * 5)];

                try {
                    await db.execute(
                        `INSERT INTO payments (user_id, amount, payment_method, transaction_id, status, created_at)
                         VALUES (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ${Math.floor(Math.random() * 60)} DAY))`,
                        [user.id, amount, method, `TXN${Date.now()}${i}`, status]
                    );
                } catch (err) {
                    // Skip errors
                }
            }
            console.log('  ✅ Created 30 payments');
        }

        // ========================================
        // 7. NOTIFICATIONS
        // ========================================
        console.log('\n🔔 Seeding notifications...');
        if (allUsers.length > 0) {
            const notifications = [
                { title: 'Karibu HotBando', message: 'Karibu kwenye huduma yetu ya intaneti. Furahia data yako!', type: 'info' },
                { title: 'Pakiti Imeisha', message: 'Pakiti yako ya intaneti imeisha. Nunua pakiti mpya kuendelea.', type: 'warning' },
                { title: 'Malipo Yamekamilika', message: 'Malipo yako ya TZS 10,000 yamekamilika kikamilifu.', type: 'success' },
                { title: 'Ofa Maalum', message: 'Pata 50% off kwenye pakiti za wiki hii. Hakikisha unanunua leo!', type: 'promotion' }
            ];

            for (let i = 0; i < 20; i++) {
                const user = allUsers[Math.floor(Math.random() * allUsers.length)];
                const notif = notifications[Math.floor(Math.random() * notifications.length)];
                const isRead = Math.random() > 0.5;

                try {
                    await db.execute(
                        `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
                         VALUES (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ${Math.floor(Math.random() * 15)} DAY))`,
                        [user.id, notif.title, notif.message, notif.type, isRead ? 1 : 0]
                    );
                } catch (err) {
                    // Skip errors
                }
            }
            console.log('  ✅ Created 20 notifications');
        }

        // ========================================
        // 8. SYSTEM SETTINGS
        // ========================================
        console.log('\n⚙️  Seeding system settings...');
        const settings = [
            { setting_key: 'site_name', setting_value: 'HotBando WiFi', description: 'Site name' },
            { setting_key: 'currency', setting_value: 'TZS', description: 'Default currency' },
            { setting_key: 'default_data_reward', setting_value: '50', description: 'Default data reward in MB' },
            { setting_key: 'min_ad_watch_percentage', setting_value: '80', description: 'Minimum ad watch percentage for reward' },
            { setting_key: 'session_timeout', setting_value: '3600', description: 'Session timeout in seconds' }
        ];

        for (const setting of settings) {
            const [existing] = await db.execute('SELECT id FROM system_settings WHERE setting_key = ?', [setting.setting_key]);
            if (existing.length === 0) {
                await db.execute(
                    'INSERT INTO system_settings (setting_key, setting_value, description) VALUES (?, ?, ?)',
                    [setting.setting_key, setting.setting_value, setting.description]
                );
                console.log(`  ✅ Created setting: ${setting.setting_key}`);
            }
        }

        console.log('\n✅ Comprehensive seeding completed successfully!\n');
        console.log('📊 Summary:');
        console.log('   ✅ Packages ready');
        console.log('   ✅ Routers ready');
        console.log('   ✅ Users expanded');
        console.log('   ✅ Ads created with views');
        console.log('   ✅ Vouchers generated');
        console.log('   ✅ Payments recorded');
        console.log('   ✅ Notifications added');
        console.log('   ✅ System settings configured\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

seedComprehensive();
