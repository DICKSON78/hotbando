/**
 * Seed Router Data with Coordinates for Map
 */

const db = require('../config/database');

async function seedRouterData() {
    try {
        console.log('🌱 Seeding router data with map coordinates...\n');

        // First, update locations with coordinates
        const locationUpdates = [
            { id: 1, name: 'Dar es Salaam - Kariakoo', latitude: -6.8161, longitude: 39.2803 },
            { id: 2, name: 'Arusha - Njiro', latitude: -3.3869, longitude: 36.6830 },
            { id: 3, name: 'Mwanza - Isamilo', latitude: -2.5164, longitude: 32.9175 }
        ];

        for (const loc of locationUpdates) {
            await db.execute(`
                UPDATE locations 
                SET name = ?, latitude = ?, longitude = ?
                WHERE id = ?
            `, [loc.name, loc.latitude, loc.longitude, loc.id]);
        }
        console.log('✅ Updated locations with coordinates');

        // Update mikrotiks with is_active and active_users
        await db.execute(`
            UPDATE mikrotiks 
            SET is_active = 1, active_users = FLOOR(RAND() * 20) + 5
            WHERE id <= 5
        `);
        console.log('✅ Updated mikrotiks with active status and users');

        // Check current data
        const [routers] = await db.execute(`
            SELECT m.*, l.name as location_name, l.latitude, l.longitude
            FROM mikrotiks m
            LEFT JOIN locations l ON m.location_id = l.id
            LIMIT 5
        `);

        console.log('\n📊 Current Router Data:');
        routers.forEach(r => {
            console.log(`  - ${r.router_name} at ${r.location_name} (${r.latitude}, ${r.longitude}) - ${r.active_users} users`);
        });

        console.log('\n✅ Router data seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding data:', error.message);
        process.exit(1);
    }
}

seedRouterData();
