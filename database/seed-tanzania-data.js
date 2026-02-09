/**
 * Seed Tanzania Locations and Routers
 * Run: node database/seed-tanzania-data.js
 */

const db = require('../config/database');

const tanzaniaLocations = [
    // Dar es Salaam - Universities
    {
        name: 'UDSM Main Campus',
        location_type: 'university',
        address: 'University Road, Ubungo',
        city: 'Dar es Salaam',
        region: 'Dar es Salaam',
        latitude: -6.7724,
        longitude: 39.2406,
        is_active: 1
    },
    {
        name: 'Ardhi University',
        location_type: 'university',
        address: 'Observation Hill, Dar es Salaam',
        city: 'Dar es Salaam',
        region: 'Dar es Salaam',
        latitude: -6.7653,
        longitude: 39.2156,
        is_active: 1
    },
    {
        name: 'IFM - Institute of Finance Management',
        location_type: 'university',
        address: 'Shaaban Robert Street',
        city: 'Dar es Salaam',
        region: 'Dar es Salaam',
        latitude: -6.8160,
        longitude: 39.2890,
        is_active: 1
    },
    // Dar es Salaam - Hostels
    {
        name: 'Kijitonyama Hostels',
        location_type: 'hostel',
        address: 'Kijitonyama, Kinondoni',
        city: 'Dar es Salaam',
        region: 'Dar es Salaam',
        latitude: -6.7789,
        longitude: 39.2534,
        is_active: 1
    },
    {
        name: 'Mlimani City Residence',
        location_type: 'hostel',
        address: 'Sam Nujoma Road',
        city: 'Dar es Salaam',
        region: 'Dar es Salaam',
        latitude: -6.7745,
        longitude: 39.2298,
        is_active: 1
    },
    // Dar es Salaam - Malls
    {
        name: 'Mlimani City Mall',
        location_type: 'mall',
        address: 'Sam Nujoma Road, Ubungo',
        city: 'Dar es Salaam',
        region: 'Dar es Salaam',
        latitude: -6.7731,
        longitude: 39.2267,
        is_active: 1
    },
    {
        name: 'Slipway Shopping Centre',
        location_type: 'mall',
        address: 'Slipway Road, Msasani',
        city: 'Dar es Salaam',
        region: 'Dar es Salaam',
        latitude: -6.7452,
        longitude: 39.2678,
        is_active: 1
    },
    // Arusha
    {
        name: 'Nelson Mandela African Institution',
        location_type: 'university',
        address: 'Tengeru, Arusha',
        city: 'Arusha',
        region: 'Arusha',
        latitude: -3.3931,
        longitude: 36.8056,
        is_active: 1
    },
    {
        name: 'Arusha Technical College',
        location_type: 'university',
        address: 'Njiro Road, Arusha',
        city: 'Arusha',
        region: 'Arusha',
        latitude: -3.3756,
        longitude: 36.7014,
        is_active: 1
    },
    // Mwanza
    {
        name: 'St. Augustine University - SAUT',
        location_type: 'university',
        address: 'Nyegezi, Mwanza',
        city: 'Mwanza',
        region: 'Mwanza',
        latitude: -2.5567,
        longitude: 32.9067,
        is_active: 1
    },
    {
        name: 'Rock City Mall',
        location_type: 'mall',
        address: 'Kenyatta Road, Mwanza',
        city: 'Mwanza',
        region: 'Mwanza',
        latitude: -2.5166,
        longitude: 32.9000,
        is_active: 1
    },
    // Dodoma
    {
        name: 'University of Dodoma - UDOM',
        location_type: 'university',
        address: 'Chimwaga, Dodoma',
        city: 'Dodoma',
        region: 'Dodoma',
        latitude: -6.1833,
        longitude: 35.7500,
        is_active: 1
    },
    // Morogoro
    {
        name: 'Sokoine University of Agriculture',
        location_type: 'university',
        address: 'Chuo Kikuu, Morogoro',
        city: 'Morogoro',
        region: 'Morogoro',
        latitude: -6.8500,
        longitude: 37.6500,
        is_active: 1
    },
    {
        name: 'Mzumbe University',
        location_type: 'university',
        address: 'Mzumbe, Morogoro',
        city: 'Morogoro',
        region: 'Morogoro',
        latitude: -6.9167,
        longitude: 37.5667,
        is_active: 1
    },
    // Mbeya
    {
        name: 'Mbeya University of Science and Technology',
        location_type: 'university',
        address: 'Iyunga, Mbeya',
        city: 'Mbeya',
        region: 'Mbeya',
        latitude: -8.9167,
        longitude: 33.4500,
        is_active: 1
    }
];

// Sample routers for each location (will be assigned after locations are created)
const routerTemplates = [
    { router_name: 'Main Gateway', ssid: 'HotBando-WiFi', model: 'MikroTik hAP ac²', port: 8728 },
    { router_name: 'Library Router', ssid: 'HotBando-Library', model: 'MikroTik RB750Gr3', port: 8728 },
    { router_name: 'Hostel Block A', ssid: 'HotBando-HostelA', model: 'MikroTik hAP lite', port: 8728 },
    { router_name: 'Cafeteria Router', ssid: 'HotBando-Cafe', model: 'MikroTik RB951Ui-2HnD', port: 8728 }
];

async function seedData() {
    try {
        console.log('🌍 Seeding Tanzania Locations and Routers...\n');

        // First, insert locations
        console.log('📍 Adding locations...');
        const locationIds = [];

        for (const loc of tanzaniaLocations) {
            try {
                const [result] = await db.execute(
                    `INSERT INTO locations (name, location_name, location_type, address, city, region, latitude, longitude, is_active, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                     ON DUPLICATE KEY UPDATE
                        latitude = VALUES(latitude),
                        longitude = VALUES(longitude),
                        is_active = VALUES(is_active)`,
                    [loc.name, loc.name, loc.location_type, loc.address, loc.city, loc.region, loc.latitude, loc.longitude, loc.is_active]
                );

                let locationId;
                if (result.insertId) {
                    locationId = result.insertId;
                } else {
                    // Get existing location ID
                    const [existing] = await db.execute('SELECT id FROM locations WHERE name = ?', [loc.name]);
                    locationId = existing[0]?.id;
                }

                if (locationId) {
                    locationIds.push({ id: locationId, name: loc.name, city: loc.city });
                    console.log(`  ✅ ${loc.name} (${loc.city})`);
                }
            } catch (err) {
                console.log(`  ⚠️  ${loc.name} - ${err.message}`);
            }
        }

        console.log(`\n📍 ${locationIds.length} maeneo yameongezwa!\n`);

        // Now add routers for each location
        console.log('📡 Adding routers...');
        let routerCount = 0;

        for (const location of locationIds) {
            // Randomly select 1-3 routers per location
            const numRouters = Math.floor(Math.random() * 3) + 1;
            const selectedRouters = routerTemplates.slice(0, numRouters);

            for (let i = 0; i < selectedRouters.length; i++) {
                const template = selectedRouters[i];
                const routerId = `RT-${location.id}-${String(i + 1).padStart(2, '0')}`;
                const routerName = `${location.name} - ${template.router_name}`;

                // Generate a WireGuard-style IP for demo (10.7.0.x)
                const wireguardIP = `10.7.0.${10 + routerCount}`;

                try {
                    await db.execute(
                        `INSERT INTO mikrotiks (router_id, router_name, location, location_id, host, port, user, password, ssid, status, is_active, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'online', 1, NOW(), NOW())
                         ON DUPLICATE KEY UPDATE
                            router_name = VALUES(router_name),
                            location_id = VALUES(location_id)`,
                        [routerId, routerName, location.city, location.id, wireguardIP, template.port, 'admin', 'admin123', template.ssid]
                    );
                    console.log(`  ✅ ${routerName} (${wireguardIP})`);
                    routerCount++;
                } catch (err) {
                    console.log(`  ⚠️  ${routerName} - ${err.message}`);
                }
            }
        }

        console.log(`\n📡 ${routerCount} routers zimeongezwa!\n`);

        // Update some routers to be offline for variety
        await db.execute(`UPDATE mikrotiks SET status = 'offline' WHERE id % 5 = 0`);
        console.log('📊 Status za routers zimewekwa (baadhi offline)\n');

        // Summary
        const [locCount] = await db.execute('SELECT COUNT(*) as count FROM locations');
        const [routerCountResult] = await db.execute('SELECT COUNT(*) as count FROM mikrotiks');
        const [onlineCount] = await db.execute("SELECT COUNT(*) as count FROM mikrotiks WHERE status = 'online'");

        console.log('═══════════════════════════════════════');
        console.log('📊 MUHTASARI:');
        console.log(`   📍 Maeneo: ${locCount[0].count}`);
        console.log(`   📡 Routers: ${routerCountResult[0].count}`);
        console.log(`   🟢 Online: ${onlineCount[0].count}`);
        console.log(`   🔴 Offline: ${routerCountResult[0].count - onlineCount[0].count}`);
        console.log('═══════════════════════════════════════\n');

        console.log('✅ Data imeongezwa kikamilifu! Unaweza kuona kwenye ramani.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

seedData();
