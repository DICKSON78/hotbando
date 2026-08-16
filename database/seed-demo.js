const db = require('../config/database');

async function seed() {
    console.log('Seeding demo data...');

    // 1. Locations for franchise owner (id=4)
    const locations = [
        ['UDSM Main Campus', 'university', 'University of Dar es Salaam', 'Dar es Salaam', 'Dar es Salaam', 4, 1],
        ['Safari Hostel', 'hostel', 'Sokoine Road', 'Arusha', 'Arusha', 4, 1],
        ['Mlimani City Mall', 'mall', 'Sam Nujoma Road', 'Dar es Salaam', 'Dar es Salaam', null, 1],
    ];

    for (const l of locations) {
        const [existing] = await db.execute('SELECT id FROM locations WHERE name = ? AND city = ?', [l[0], l[3]]);
        if (existing.length === 0) {
            await db.execute(
                `INSERT INTO locations (name, location_type, address, city, region, franchise_owner_id, is_active, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`, l);
            console.log(`  Created location: ${l[0]}`);
        } else {
            console.log(`  Location exists: ${l[0]}`);
        }
    }

    // 2. Campaign for sponsor (id=2) - Coca Cola style video ad
    const [sponsorCamp] = await db.execute("SELECT id FROM campaigns WHERE campaign_name = 'Coca Cola Summer Promo'");
    if (sponsorCamp.length === 0) {
        await db.execute(
            `INSERT INTO campaigns (campaign_name, campaign_type, owner_id, owner_type, description, start_date, is_active, requires_approval, total_budget, spent_budget, cost_per_action, reward_type, reward_bytes, views, completions, created_at)
             VALUES ('Coca Cola Summer Promo', 'ad_video', 2, 'advertiser', 'Watch our summer promo video and earn free data', NOW(), 1, 0, 50000, 8000, 100, 'data_bytes', 52428800, 120, 45, NOW())`,
        );
        console.log('  Created sponsor campaign: Coca Cola Summer Promo');
    }

    const [sponsorCamp2] = await db.execute("SELECT id FROM campaigns WHERE campaign_name = 'Download Jumia App'");
    if (sponsorCamp2.length === 0) {
        await db.execute(
            `INSERT INTO campaigns (campaign_name, campaign_type, owner_id, owner_type, description, start_date, is_active, requires_approval, total_budget, spent_budget, cost_per_action, reward_type, reward_bytes, created_at)
             VALUES ('Download Jumia App', 'app_install', 2, 'advertiser', 'Install the Jumia app and get 200MB free data', NOW(), 1, 0, 75000, 12000, 300, 'data_bytes', 209715200, NOW())`,
        );
        console.log('  Created sponsor campaign: Download Jumia App');
    }

    // 3. Campaign for bank partner (id=3) - CRDB Student Loan
    const [bankCamp] = await db.execute("SELECT id FROM campaigns WHERE campaign_name = 'CRDB Student Loan Application'");
    if (bankCamp.length === 0) {
        await db.execute(
            `INSERT INTO campaigns (campaign_name, campaign_type, owner_id, owner_type, description, start_date, is_active, requires_approval, total_budget, spent_budget, cost_per_action, reward_type, reward_bytes, target_user_types, created_at)
             VALUES ('CRDB Student Loan Application', 'bank_form', 3, 'bank', 'Apply for student loans with CRDB Bank - up to TZS 5,000,000 per academic year', NOW(), 1, 0, 100000, 15000, 500, 'data_bytes', 104857600, '["student","tenant"]', NOW())`,
        );
        console.log('  Created bank campaign: CRDB Student Loan Application');
    }

    const [bankCampId] = await db.execute("SELECT id FROM campaigns WHERE campaign_name = 'CRDB Student Loan Application'");

    // 4. Revenue sharing records for franchise owner
    const [existingRev] = await db.execute('SELECT id FROM partner_revenue_shares WHERE partner_id = 4');
    if (existingRev.length === 0) {
        const [loc1] = await db.execute("SELECT id FROM locations WHERE name = 'UDSM Main Campus'");
        const locId = loc1[0]?.id;

        await db.execute(
            `INSERT INTO partner_revenue_shares (partner_id, partner_type, location_id, period_start, period_end, total_revenue, share_percentage, share_amount, status, created_at)
             VALUES (4, 'franchise_owner', ?, DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 25000, 15, 3750, 'pending', NOW())`,
            [locId]
        );

        await db.execute(
            `INSERT INTO partner_revenue_shares (partner_id, partner_type, location_id, period_start, period_end, total_revenue, share_percentage, share_amount, status, payment_reference, paid_at, created_at)
             VALUES (4, 'franchise_owner', ?, DATE_SUB(NOW(), INTERVAL 60 DAY), DATE_SUB(NOW(), INTERVAL 31 DAY), 18000, 15, 2700, 'paid', 'MPESA-ABC123', DATE_SUB(NOW(), INTERVAL 25 DAY), NOW())`,
            [locId]
        );
        console.log('  Created revenue sharing records');
    }

    // 5. Leads for bank campaign
    if (bankCampId.length > 0) {
        const bcId = bankCampId[0].id;
        const [existingLeads] = await db.execute('SELECT COUNT(*) as cnt FROM campaign_completions WHERE campaign_id = ?', [bcId]);
        if (existingLeads[0].cnt === 0) {
            const statuses = ['new', 'contacted', 'qualified', 'converted', 'rejected'];
            for (let i = 0; i < 15; i++) {
                const status = statuses[i % statuses.length];
                await db.execute(
                    `INSERT INTO campaign_completions (campaign_id, user_id, completion_type, lead_status, lead_data, ip_address, user_agent, completed_at)
                     VALUES (?, ?, 'form_submit', ?, ?, '192.168.1.1', 'Mozilla/5.0', DATE_SUB(NOW(), INTERVAL ? DAY))`,
                    [
                        bcId,
                        i % 2 === 0 ? 5 : 6,
                        status,
                        JSON.stringify({
                            full_name: `Student ${i + 1}`,
                            phone: `071234567${i}`,
                            email: `student${i}@example.com`,
                            institution: i % 2 === 0 ? 'UDSM' : 'DIT',
                            year_of_study: (i % 4) + 1,
                            loan_amount: (i + 1) * 500000
                        }),
                        i % 7
                    ]
                );
            }
            console.log('  Created 15 sample leads');
        }
    }

    // 6. Commission for franchise - create a wallet transaction
    const [fwal] = await db.execute('SELECT id FROM wallets WHERE user_id = 4');
    if (fwal.length > 0) {
        const [existingTxn] = await db.execute('SELECT id FROM transactions WHERE user_id = 4 AND transaction_type = "commission"');
        if (existingTxn.length === 0) {
            await db.execute(
                `INSERT INTO transactions (wallet_id, user_id, transaction_type, amount, description, status, created_at)
                 VALUES (?, 4, 'commission', 3750, 'Revenue share - UDSM Main Campus (Jun 2026)', 'completed', NOW())`,
                [fwal[0].id]
            );
            console.log('  Created commission transaction');
        }
    }

    console.log('\nDemo data seeding complete!');
    process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
