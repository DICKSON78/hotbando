const db = require('../config/database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
    console.log('Seeding minimal test data...\n');

    const hash = await bcrypt.hash(process.env.SEED_PASSWORD || 'password123', 10);

    // 1. Users
    const users = [
        ['John Sponsor', '0712345680', 'john@example.com', hash, 'sponsor', 'other', 'Dar es Salaam', null, 0, 1],
        ['Jane Bank Partner', '0723456790', 'jane@bank.co.tz', hash, 'bank_partner', 'other', 'Dar es Salaam', 'CRDB Bank', 0, 1],
        ['Peter Franchise', '0734567891', 'peter@franchise.com', hash, 'franchise_owner', 'other', 'Arusha', null, 15, 1],
        ['Mary Student', '0745678901', 'mary@student.com', hash, 'customer', 'student', 'Dar es Salaam', null, 0, 1],
        ['David Tenant', '0756789012', 'david@tenant.com', hash, 'customer', 'tenant', 'Mwanza', null, 0, 1],
    ];

    for (const u of users) {
        const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [u[2]]);
        if (existing.length > 0) {
            console.log(`  Skipping ${u[0]} (exists)`);
            continue;
        }
        const [r] = await db.execute(
            `INSERT INTO users (name, phone_number, email, password, role, user_type, location, company_name, commission_rate, is_active, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            u
        );
        console.log(`  Created ${u[0]} (${u[4]}) id=${r.insertId}`);
    }

    // 2. Get user IDs
    const [sponsor] = await db.execute("SELECT id FROM users WHERE email='john@example.com'");
    const [bank] = await db.execute("SELECT id FROM users WHERE email='jane@bank.co.tz'");
    const [franchise] = await db.execute("SELECT id FROM users WHERE email='peter@franchise.com'");
    const [student] = await db.execute("SELECT id FROM users WHERE email='mary@student.com'");

    const sponsorId = sponsor[0]?.id;
    const bankId = bank[0]?.id;
    const franchiseId = franchise[0]?.id;
    const studentId = student[0]?.id;

    // 3. Wallets for sponsor & bank
    for (const uid of [sponsorId, bankId].filter(Boolean)) {
        const [existing] = await db.execute('SELECT id FROM wallets WHERE user_id = ?', [uid]);
        if (existing.length === 0) {
            await db.execute('INSERT INTO wallets (user_id, balance, low_balance_threshold, created_at) VALUES (?, 50000, 10000, NOW())', [uid]);
            const [wal] = await db.execute('SELECT id FROM wallets WHERE user_id = ?', [uid]);
            const wid = wal[0].id;
            await db.execute('INSERT INTO transactions (wallet_id, user_id, transaction_type, amount, description, status, created_at) VALUES (?, ?, "deposit", 50000, "Initial deposit", "completed", NOW())', [wid, uid]);
            console.log(`  Wallet created for user ${uid}`);
        } else {
            console.log(`  Wallet exists for user ${uid}`);
        }
    }

    // 4. Locations (check actual columns)
    const [locCols] = await db.execute('DESCRIBE locations');
    console.log('\nLocation columns:', locCols.map(c => c.Field).join(', '));

    // 5. Check franchise owner wallets
    if (franchiseId) {
        const [fwal] = await db.execute('SELECT id FROM wallets WHERE user_id = ?', [franchiseId]);
        if (fwal.length === 0) {
            await db.execute('INSERT INTO wallets (user_id, balance, low_balance_threshold, created_at) VALUES (?, 0, 0, NOW())', [franchiseId]);
            console.log(`  Empty wallet created for franchise ${franchiseId}`);
        }
    }

    console.log('\nDone!');
    console.log('\nCredentials:');
    console.log('  Admin:      admin@hotbando.com / Admin@123');
    console.log('  Sponsor:    john@example.com / password123');
    console.log('  Bank:       jane@bank.co.tz / password123');
    console.log('  Franchise:  peter@franchise.com / password123');
    console.log('  Reseller:   (Test Reseller in DB, no email set)');
    process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
