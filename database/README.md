# Database Migration & Seeding Guide

## Overview

This folder contains scripts to migrate and seed your HotBando database with the new campaign management features.

## Files

- **`migrate.js`** - Adds new tables and columns to existing database
- **`seed.js`** - Populates database with sample data for testing

---

## Step-by-Step Setup

### 1️⃣ Run Migration (FIRST)

This adds new tables and columns to your existing database without affecting current data:

```bash
node database/migrate.js
```

**What it does:**
- ✅ Adds 6 new columns to `users` table (user_type, company_name, commission_rate, gender, age)
- ✅ Creates 8 new tables (locations, campaigns, campaign_content, campaign_completions, wallets, transactions, payment_requests, partner_revenue_shares)
- ✅ Creates performance indexes
- ✅ Preserves ALL existing data

**Safe to run multiple times** - Checks if columns/tables exist before creating.

---

### 2️⃣ Run Seed Script (SECOND)

This populates the new tables with sample data for testing:

```bash
node database/seed.js
```

**What it creates:**
- 👤 5 test users (sponsor, bank partner, franchise owner, 2 customers)
- 📍 3 locations (UDSM Campus, Mlimani Mall, Safari Hostel)
- 💰 2 wallets with TZS 50,000 balance each
- 📢 3 campaigns (bank form, video ad, app install)
- 👥 30+ sample leads
- 💸 2 revenue sharing records

**Safe to run multiple times** - Checks for existing data before inserting.

---

## Test Login Credentials

After seeding, you can login with these accounts:

| Role | Email | Phone | Password |
|------|-------|-------|----------|
| **Sponsor** | john@example.com | 0712345678 | password123 |
| **Bank Partner** | jane@bank.co.tz | 0723456789 | password123 |
| **Franchise Owner** | peter@franchise.com | 0734567890 | password123 |

---

## New Tables Created

### 1. `locations`
Stores WiFi hotspot locations (universities, malls, hostels, etc.)

### 2. `campaigns`
Stores marketing campaigns (ads, bank forms, app installs)

### 3. `campaign_content`
Stores campaign-specific content (videos, forms, app details)

### 4. `campaign_completions`
Tracks user interactions with campaigns (leads)

### 5. `wallets`
Sponsor/bank partner wallet balances

### 6. `transactions`
Wallet transaction history

### 7. `payment_requests`
M-Pesa deposit/withdrawal requests

### 8. `partner_revenue_shares`
Franchise owner commission tracking

---

## Troubleshooting

### Error: "Please run migration first!"
- Run `node database/migrate.js` before seed.js

### Error: "Cannot find module"
- Run `npm install` to install dependencies

### Error: Database connection failed
- Check `config/database.js` settings
- Ensure MySQL/MariaDB is running
- Verify database credentials

### Error: Column already exists
- Safe to ignore - migration checks for existing columns

---

## What's Preserved

Migration is **100% backward compatible**:
- ✅ All existing users remain unchanged
- ✅ All existing ads remain unchanged
- ✅ All existing vouchers remain unchanged
- ✅ All existing payments remain unchanged
- ✅ All existing mikrotiks remain unchanged
- ✅ All existing packages remain unchanged

Only NEW tables are added, existing data is **never modified**.

---

## Next Steps

After migration & seeding:

1. ✅ Test the new admin pages:
   - `/admin/campaigns` - Campaign management
   - `/admin/leads` - Lead management
   - `/admin/wallet` - Wallet interface
   - `/admin/locations` - Location management
   - `/admin/revenue-share` - Revenue sharing

2. ✅ Verify custom notifications work (no more alert() popups)

3. ✅ Check sidebar dropdown menus

4. ✅ Test creating campaigns and leads

---

## Production Deployment

Before deploying to production:

1. **Backup your database:**
   ```bash
   mysqldump -u root -p hotbando > hotbando_backup_$(date +%Y%m%d).sql
   ```

2. **Run migration on production:**
   ```bash
   node database/migrate.js
   ```

3. **DO NOT run seed.js on production** (only for testing)

4. **Verify migration success:**
   ```sql
   SHOW TABLES;
   DESCRIBE users;
   DESCRIBE campaigns;
   ```

---

## Support

If you encounter issues:
1. Check database logs
2. Verify MySQL version (5.7+ or MariaDB 10.2+)
3. Ensure user has CREATE/ALTER privileges
4. Check `config/database.js` connection settings

---

**Status**: ✅ Ready for testing
**Version**: 1.0
**Last Updated**: 2025-12-03
