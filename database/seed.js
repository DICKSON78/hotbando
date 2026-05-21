/**
 * Seed Database with Sample Data
 * IMPORTANT: Run migrate.js first before running this script
 * Run: node database/seed.js
 */

//os

const db = require('../config/database');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
    console.log('🌱 Starting database seeding...\n');

    try {
        // Check if migration has been run
        console.log('🔍 Checking database schema...');
        try {
            await db.execute('SELECT user_type FROM users LIMIT 1');
            console.log('✅ Database schema is ready\n');
        } catch (err) {
            console.error('❌ Error: Please run migration first!');
            console.error('   Run: node database/migrate.js\n');
            process.exit(1);
        }

        // 1. Create sample users (only new ones, don't duplicate)
        console.log('👤 Creating sample users...');
        const hashedPassword = await bcrypt.hash('password123', 10);

        const users = [
            {
                name: 'John Doe - Sponsor',
                phone_number: '0712345678',
                email: 'john@example.com',
                password: hashedPassword,
                role: 'sponsor',
                user_type: 'other',
                location: 'Dar es Salaam',
                is_active: 1
            },
            {
                name: 'Jane Smith - Bank Partner',
                phone_number: '0723456789',
                email: 'jane@bank.co.tz',
                password: hashedPassword,
                role: 'sponsor',
                user_type: 'other',
                company_name: 'CRDB Bank',
                location: 'Dar es Salaam',
                is_active: 1
            },
            {
                name: 'Peter Franchise',
                phone_number: '0734567890',
                email: 'peter@franchise.com',
                password: hashedPassword,
                role: 'agent',
                user_type: 'other',
                location: 'Arusha',
                commission_rate: 15.00,
                is_active: 1
            },
            {
                name: 'Mary Student',
                phone_number: '0745678901',
                email: null,
                password: hashedPassword,
                role: 'customer',
                user_type: 'student',
                location: 'Dar es Salaam',
                gender: 'female',
                age: 22,
                is_active: 1
            },
            {
                name: 'David Tenant',
                phone_number: '0756789012',
                email: null,
                password: hashedPassword,
                role: 'customer',
                user_type: 'tenant',
                location: 'Mwanza',
                gender: 'male',
                age: 28,
                is_active: 1
            }
        ];

        const userIds = [];
        for (const user of users) {
            // Check if user already exists
            const [existing] = await db.execute(
                'SELECT id FROM users WHERE phone_number = ? OR (email IS NOT NULL AND email = ?)',
                [user.phone_number, user.email]
            );

            if (existing.length > 0) {
                console.log(`  ℹ️  User ${user.name} already exists, skipping...`);
                userIds.push({
                    id: existing[0].id,
                    role: user.role,
                    user_type: user.user_type,
                    name: user.name
                });
                continue;
            }

            const [result] = await db.execute(
                `INSERT INTO users (name, phone_number, email, password, role, user_type, location,
                 company_name, commission_rate, gender, age, is_active, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                    user.name,
                    user.phone_number,
                    user.email,
                    user.password,
                    user.role,
                    user.user_type,
                    user.location,
                    user.company_name || null,
                    user.commission_rate || 0.00,
                    user.gender || null,
                    user.age || null,
                    user.is_active
                ]
            );
            userIds.push({
                id: result.insertId,
                role: user.role,
                user_type: user.user_type,
                name: user.name
            });
            console.log(`  ✅ Created user: ${user.name}`);
        }

        // Get specific user IDs
        const sponsorId = userIds.find(u => u.role === 'sponsor' && u.name.includes('Sponsor'))?.id;
        const bankPartnerId = userIds.find(u => u.name.includes('Bank'))?.id;
        const franchiseOwnerId = userIds.find(u => u.role === 'agent')?.id;
        const customerId = userIds.find(u => u.role === 'customer' && u.user_type === 'student')?.id;

        console.log(`✅ Users ready (${userIds.length} users)\n`);

        // 2. Create locations
        console.log('📍 Creating locations...');
        const locations = [
            {
                location_name: 'UDSM Main Campus',
                city: 'Dar es Salaam',
                region: 'Dar es Salaam',
                address: 'University of Dar es Salaam',
                location_type: 'university',
                owner_id: franchiseOwnerId,
                commission_rate: 15.00
            },
            {
                location_name: 'Mlimani City Mall',
                city: 'Dar es Salaam',
                region: 'Dar es Salaam',
                address: 'Sam Nujoma Road',
                location_type: 'mall',
                owner_id: null,
                commission_rate: 10.00
            },
            {
                location_name: 'Safari Hostel',
                city: 'Arusha',
                region: 'Arusha',
                address: 'Sokoine Road',
                location_type: 'hostel',
                owner_id: franchiseOwnerId,
                commission_rate: 15.00
            }
        ];

        const locationIds = [];
        for (const loc of locations) {
            // Check if location exists
            const [existing] = await db.execute(
                'SELECT id FROM locations WHERE location_name = ? AND city = ?',
                [loc.location_name, loc.city]
            );

            if (existing.length > 0) {
                console.log(`  ℹ️  Location ${loc.location_name} already exists`);
                locationIds.push(existing[0].id);
                continue;
            }

            const [result] = await db.execute(
                `INSERT INTO locations (location_name, city, region, address, location_type,
                 owner_id, commission_rate, is_active, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
                [loc.location_name, loc.city, loc.region, loc.address, loc.location_type,
                 loc.owner_id, loc.commission_rate]
            );
            locationIds.push(result.insertId);
            console.log(`  ✅ Created location: ${loc.location_name}`);
        }
        console.log(`✅ Locations ready (${locationIds.length} locations)\n`);

        // 3. Create wallets for sponsors and bank partners
        console.log('💰 Creating wallets...');
        const walletUsers = [sponsorId, bankPartnerId].filter(id => id);

        for (const userId of walletUsers) {
            // Check if wallet exists
            const [existing] = await db.execute(
                'SELECT id FROM wallets WHERE user_id = ?',
                [userId]
            );

            if (existing.length > 0) {
                console.log(`  ℹ️  Wallet for user ${userId} already exists`);
                continue;
            }

            await db.execute(
                `INSERT INTO wallets (user_id, balance, low_balance_threshold, created_at)
                 VALUES (?, 50000.00, 10000.00, NOW())`,
                [userId]
            );

            // Add deposit transaction
            await db.execute(
                `INSERT INTO transactions (wallet_id, transaction_type, amount, description, status, created_at)
                 SELECT id, 'deposit', 50000.00, 'Initial deposit', 'completed', NOW()
                 FROM wallets WHERE user_id = ?`,
                [userId]
            );
            console.log(`  ✅ Created wallet for user ${userId} with TZS 50,000`);
        }
        console.log(`✅ Wallets ready (${walletUsers.length} wallets)\n`);

        // 4. Create campaigns
        console.log('📢 Creating campaigns...');

        if (!sponsorId || !bankPartnerId) {
            console.log('  ⚠️  Skipping campaigns (sponsor/bank user not found)\n');
        } else {
            // Bank Form Campaign
            const [existingBank] = await db.execute(
                'SELECT id FROM campaigns WHERE campaign_name = ?',
                ['CRDB Student Loan Application']
            );

            let bankCampaignId;
            if (existingBank.length > 0) {
                console.log('  ℹ️  Bank campaign already exists');
                bankCampaignId = existingBank[0].id;
            } else {
                const [bankCampaign] = await db.execute(
                    `INSERT INTO campaigns (
                        campaign_name, description, campaign_type, owner_type, owner_id,
                        company_name, total_budget, spent_budget, cost_per_completion,
                        reward_bytes, target_user_types, is_active, created_at
                    ) VALUES (
                        'CRDB Student Loan Application',
                        'Apply for student loans with CRDB Bank',
                        'bank_form', 'bank', ?,
                        'CRDB Bank', 100000.00, 15000.00, 500.00,
                        104857600, ?, 1, NOW()
                    )`,
                    [bankPartnerId, JSON.stringify(['student', 'tenant'])]
                );
                bankCampaignId = bankCampaign.insertId;

                // Add campaign content
                await db.execute(
                    `INSERT INTO campaign_content (
                        campaign_id, form_fields, product_details, created_at
                    ) VALUES (?, ?, ?, NOW())`,
                    [
                        bankCampaignId,
                        JSON.stringify([
                            { field_name: 'full_name', field_type: 'text', field_label: 'Jina Kamili', required: true },
                            { field_name: 'phone', field_type: 'tel', field_label: 'Namba ya Simu', required: true },
                            { field_name: 'email', field_type: 'email', field_label: 'Barua Pepe', required: true },
                            { field_name: 'institution', field_type: 'text', field_label: 'Chuo', required: true },
                            { field_name: 'year_of_study', field_type: 'number', field_label: 'Mwaka wa Masomo', required: true },
                            { field_name: 'loan_amount', field_type: 'number', field_label: 'Kiasi cha Mkopo (TZS)', required: true }
                        ]),
                        'Get affordable student loans with flexible repayment terms. Up to TZS 5,000,000 per academic year.'
                    ]
                );
                console.log('  ✅ Created bank form campaign');
            }

            // Video Ad Campaign
            const [existingVideo] = await db.execute(
                'SELECT id FROM campaigns WHERE campaign_name = ?',
                ['Coca Cola Summer Promo']
            );

            let videoCampaignId;
            if (existingVideo.length > 0) {
                console.log('  ℹ️  Video campaign already exists');
                videoCampaignId = existingVideo[0].id;
            } else {
                const [videoCampaign] = await db.execute(
                    `INSERT INTO campaigns (
                        campaign_name, description, campaign_type, owner_type, owner_id,
                        company_name, total_budget, spent_budget, cost_per_completion,
                        reward_bytes, is_active, created_at
                    ) VALUES (
                        'Coca Cola Summer Promo',
                        'Watch our summer promo video',
                        'ad_video', 'advertiser', ?,
                        'Coca Cola Tanzania', 50000.00, 8000.00, 100.00,
                        52428800, 1, NOW()
                    )`,
                    [sponsorId]
                );
                videoCampaignId = videoCampaign.insertId;

                await db.execute(
                    `INSERT INTO campaign_content (
                        campaign_id, video_url, video_duration, created_at
                    ) VALUES (?, ?, ?, NOW())`,
                    [videoCampaignId, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 30]
                );
                console.log('  ✅ Created video ad campaign');
            }

            // App Install Campaign
            const [existingApp] = await db.execute(
                'SELECT id FROM campaigns WHERE campaign_name = ?',
                ['Download Jumia App']
            );

            if (existingApp.length > 0) {
                console.log('  ℹ️  App campaign already exists');
            } else {
                const [appCampaign] = await db.execute(
                    `INSERT INTO campaigns (
                        campaign_name, description, campaign_type, owner_type, owner_id,
                        company_name, total_budget, spent_budget, cost_per_completion,
                        reward_bytes, is_active, created_at
                    ) VALUES (
                        'Download Jumia App',
                        'Install Jumia app and get 200MB free',
                        'app_install', 'advertiser', ?,
                        'Jumia Tanzania', 75000.00, 12000.00, 300.00,
                        209715200, 1, NOW()
                    )`,
                    [sponsorId]
                );

                await db.execute(
                    `INSERT INTO campaign_content (
                        campaign_id, app_name, app_url, app_icon_url, created_at
                    ) VALUES (?, ?, ?, ?, NOW())`,
                    [
                        appCampaign.insertId,
                        'Jumia',
                        'https://play.google.com/store/apps/details?id=com.jumia.android',
                        'https://example.com/jumia-icon.png'
                    ]
                );
                console.log('  ✅ Created app install campaign');
            }

            console.log('✅ Campaigns ready\n');

            // 5. Create campaign completions (leads) if customer exists
            if (customerId) {
                console.log('👥 Creating sample leads...');

                // Check existing leads count
                const [existingLeads] = await db.execute(
                    'SELECT COUNT(*) as count FROM campaign_completions WHERE campaign_id = ?',
                    [bankCampaignId]
                );

                const existingCount = existingLeads[0].count;
                const leadsToCreate = Math.max(0, 30 - existingCount);

                if (leadsToCreate > 0) {
                    for (let i = 0; i < leadsToCreate; i++) {
                        const statuses = ['new', 'contacted', 'qualified', 'converted', 'rejected'];
                        const status = statuses[Math.floor(Math.random() * statuses.length)];

                        try {
                            await db.execute(
                                `INSERT INTO campaign_completions (
                                    campaign_id, user_id, lead_status, lead_data, ip_address, user_agent, created_at
                                ) VALUES (?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
                                [
                                    bankCampaignId,
                                    customerId,
                                    status,
                                    JSON.stringify({
                                        full_name: `Student ${existingCount + i + 1}`,
                                        phone: `071234567${(existingCount + i) % 10}`,
                                        email: `student${existingCount + i}@example.com`,
                                        institution: i % 2 === 0 ? 'UDSM' : 'DIT',
                                        year_of_study: (i % 4) + 1,
                                        loan_amount: (i + 1) * 1000000
                                    }),
                                    '192.168.1.1',
                                    'Mozilla/5.0',
                                    i % 7
                                ]
                            );
                        } catch (err) {
                            // Skip if duplicate
                            if (err.code !== 'ER_DUP_ENTRY') throw err;
                        }
                    }
                    console.log(`  ✅ Created ${leadsToCreate} new leads`);
                } else {
                    console.log('  ℹ️  Sufficient leads already exist');
                }

                console.log('✅ Leads ready\n');
            }
        }

        // 6. Create revenue sharing records
        if (franchiseOwnerId && locationIds.length > 0) {
            console.log('💸 Creating revenue sharing records...');

            const [existingRevenue] = await db.execute(
                'SELECT COUNT(*) as count FROM partner_revenue_shares WHERE partner_id = ?',
                [franchiseOwnerId]
            );

            if (existingRevenue[0].count === 0) {
                await db.execute(
                    `INSERT INTO partner_revenue_shares (
                        partner_id, location_id, period_start, period_end,
                        total_revenue, share_percentage, share_amount,
                        status, created_at
                    ) VALUES (?, ?, DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY),
                             25000.00, 15.00, 3750.00, 'pending', NOW())`,
                    [franchiseOwnerId, locationIds[0]]
                );

                await db.execute(
                    `INSERT INTO partner_revenue_shares (
                        partner_id, location_id, period_start, period_end,
                        total_revenue, share_percentage, share_amount,
                        status, payment_reference, paid_at, created_at
                    ) VALUES (?, ?, DATE_SUB(NOW(), INTERVAL 60 DAY), DATE_SUB(NOW(), INTERVAL 31 DAY),
                             18000.00, 15.00, 2700.00, 'paid', 'MPESA-ABC123',
                             DATE_SUB(NOW(), INTERVAL 25 DAY), DATE_SUB(NOW(), INTERVAL 30 DAY))`,
                    [franchiseOwnerId, locationIds[0]]
                );
                console.log('  ✅ Created 2 revenue sharing records');
            } else {
                console.log('  ℹ️  Revenue shares already exist');
            }

            console.log('✅ Revenue shares ready\n');
        }

        console.log('✅ Database seeding completed successfully!\n');
        console.log('📊 Summary:');
        console.log(`   - ${userIds.length} users ready`);
        console.log(`   - ${locationIds.length} locations ready`);
        console.log(`   - ${walletUsers.length} wallets with TZS 50,000 each`);
        console.log(`   - Campaigns and leads ready`);
        console.log(`   - Revenue sharing records ready\n`);

        console.log('🔑 Test Login Credentials:');
        console.log('   Sponsor: john@example.com / password123');
        console.log('   Bank Partner: jane@bank.co.tz / password123');
        console.log('   Franchise: peter@franchise.com / password123\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}

// Run seeding
seedDatabase();
