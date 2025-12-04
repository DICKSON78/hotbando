# 🔥 HotBando Platform - Complete System Documentation

**Version:** 2.0
**Last Updated:** 2025-12-03
**Status:** Production Ready

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [System Architecture](#system-architecture)
4. [Installation & Setup](#installation--setup)
5. [User Roles](#user-roles)
6. [API Documentation](#api-documentation)
7. [Database Schema](#database-schema)
8. [Configuration](#configuration)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

HotBando is a comprehensive WiFi hotspot management platform that provides **free internet** to users in exchange for engagement (watching ads, filling forms, installing apps). The platform monetizes through:

- **Bank Partners**: Pay for qualified leads (form submissions, app installs)
- **Advertisers**: Pay per ad engagement (views, clicks)
- **Franchise Model**: Location owners earn revenue share
- **Telecom Partnerships**: Commission on bandwidth sales

### Key Value Propositions

✅ **For Students/Users**: Free WiFi in exchange for simple actions
✅ **For Banks**: Qualified leads with detailed demographics
✅ **For Advertisers**: Targeted ad delivery with engagement tracking
✅ **For Franchise Owners**: Passive income from location revenue
✅ **For Platform**: Scalable, multi-revenue stream business model

---

## 🚀 Features

### Core Features (v1.0 - Existing)

- ✅ User registration and authentication
- ✅ WiFi captive portal with MikroTik integration
- ✅ Watch ads to earn free data
- ✅ Voucher system (time-based packages)
- ✅ Admin dashboard with analytics
- ✅ Sponsor portal for ad management
- ✅ Multi-router support

### New Features (v2.0 - Just Built!)

#### 🏦 Bank Campaign System
- Create form-based lead generation campaigns
- App install tracking campaigns
- Configurable form fields (JSON-based)
- Lead status tracking (new → contacted → qualified → converted)
- Lead export to CSV
- Real-time lead dashboard
- Campaign budget management

#### 💰 Advertiser Billing System
- Pre-pay wallet system
- Deposit via M-Pesa/Tigo Pesa/Airtel Money
- Automatic campaign charging (CPM/CPC/CPA)
- Withdrawal requests
- Transaction history
- Low balance alerts
- Admin withdrawal processing

#### 📍 Multi-Location Management
- Location-based campaign targeting
- Performance tracking per location
- Franchise owner assignment
- Router-to-location mapping
- Operating hours configuration
- Bandwidth management per location

#### 💸 Revenue Sharing Engine
- Automatic calculation of franchise earnings
- Configurable commission rates (global or per-location)
- Pending/approved/paid payout tracking
- Batch payout approval
- Revenue reports for partners
- Multi-partner type support (franchise, landlord, broker, telecom)

#### 🎯 Advanced Campaign Management
- Demographic targeting (age, gender, user type)
- Location-based targeting
- Daily and total completion limits
- Multiple campaign types:
  - **Bank Forms**: Collect leads with custom fields
  - **Video Ads**: Engagement-based rewards
  - **Image Ads**: Click-based rewards
  - **App Install**: Track downloads with referral links
  - **Surveys**: Multi-question surveys
- Campaign approval workflow
- Budget tracking and auto-pause when exhausted

#### 📊 Enhanced Analytics
- Campaign performance metrics
- Conversion rate tracking
- ROI calculations
- Revenue by source
- Partner payout summaries
- Location performance reports

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────┤
│  Hotspot Users  │  Bank Partners  │  Advertisers  │  Admin  │
│  (Customers)    │  (Lead Gen)     │  (Sponsors)   │  (Ops)  │
└──────────┬──────────────┬──────────────┬───────────┬────────┘
           │              │              │           │
           v              v              v           v
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
├─────────────────────────────────────────────────────────────┤
│                     Express.js Server                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Controllers │  │  Middleware  │  │    Routes    │     │
│  │  - Campaign  │  │  - Auth      │  │  - API       │     │
│  │  - Wallet    │  │  - Session   │  │  - Admin     │     │
│  │  - Revenue   │  │  - Logging   │  │  - Hotspot   │     │
│  │  - Location  │  └──────────────┘  └──────────────┘     │
│  └──────────────┘                                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            v
┌─────────────────────────────────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                     │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Campaign   │  │    Wallet    │  │   Location   │     │
│  │    Model     │  │    Model     │  │    Model     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ RevenueShare │  │   BaseModel  │                        │
│  │    Model     │  │  (Abstract)  │                        │
│  └──────────────┘  └──────────────┘                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            v
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
├─────────────────────────────────────────────────────────────┤
│                    MySQL Database                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  26 Tables: users, campaigns, wallets, locations... │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            v
┌─────────────────────────────────────────────────────────────┐
│                   INTEGRATION LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   MikroTik   │  │    M-Pesa    │  │  Bank APIs   │     │
│  │   Routers    │  │   Payment    │  │     (CRM)    │     │
│  │  (RouterOS)  │  │   Gateway    │  │  Webhooks    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Backend**: Node.js + Express.js
- **Database**: MySQL 5.7+
- **Template Engine**: EJS
- **Session Store**: express-mysql-session
- **Router Integration**: node-routeros (MikroTik API)
- **Frontend**: HTML5, TailwindCSS, Chart.js
- **Authentication**: Session-based with bcrypt

---

## 📦 Installation & Setup

### Prerequisites

- Node.js 16+ and npm
- MySQL 5.7+ or MariaDB 10+
- MikroTik Router (for production)
- Linux/Windows/Mac OS

### Step 1: Clone & Install Dependencies

```bash
# Clone repository
cd /path/to/hotbando

# Install dependencies
npm install
```

### Step 2: Configure Environment

Create `.env` file:

```bash
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=hotbando

# Application
NODE_ENV=development
PORT=3000
SESSION_SECRET=your-super-secret-key-change-this

# MikroTik Router (Default)
MIKROTIK_HOST=10.7.0.4
MIKROTIK_USER=admin
MIKROTIK_PASSWORD=your_router_password
MIKROTIK_PORT=8728

# Payment Gateway (M-Pesa, Tigo Pesa, Airtel Money)
# TODO: Add API keys when integrating
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=

# SMS Gateway (Optional)
SMS_API_KEY=
SMS_SENDER_ID=HOTBANDO

# Email (Optional)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

### Step 3: Set Up Database

```bash
# Run database setup (creates tables + default data)
node database/setup.js setup

# Or reset database (⚠️ DESTRUCTIVE - deletes all data)
node database/setup.js reset

# Check database status
node database/setup.js check
```

**Default Admin Credentials:**
- Phone: +255700000000
- Password: Admin@123
- ⚠️ **CHANGE THIS IMMEDIATELY AFTER FIRST LOGIN!**

### Step 4: Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

Server will start at:
- 🌐 **Hotspot Portal**: http://localhost:3000/hotspot
- 👨‍💼 **Admin Panel**: http://localhost:3000/admin
- 📡 **API Endpoints**: http://localhost:3000/api/*

---

## 👥 User Roles

### 1. **Customer** (Hotspot Users)
- Register via splash page
- Watch ads to earn free data
- Fill bank forms for internet time
- Redeem vouchers
- Purchase packages
- Track usage history

### 2. **Admin** (System Administrator)
- Full system access
- Approve campaigns
- Manage users, locations, routers
- Process payouts
- Generate reports
- System configuration

### 3. **Super Admin**
- All admin permissions
- Access to sensitive operations
- Revenue sharing rules
- Franchise management

### 4. **Sponsor** (Advertiser)
- Create ad campaigns (video/image)
- Manage wallet (deposits/withdrawals)
- View campaign analytics
- Target demographics
- Budget management

### 5. **Bank Partner**
- Create form-based campaigns
- App install campaigns
- View and export leads
- Track lead status
- Campaign analytics

### 6. **Franchise Owner**
- View revenue earnings
- Track location performance
- Request payouts
- Monitor user activity
- Access revenue reports

---

## 🔌 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication
All API endpoints use session-based authentication. Include session cookie in requests.

---

### 📋 Campaign API

#### Get Active Campaigns (Public)
```http
GET /api/campaigns/active?location_id=1&user_type=student
```

**Response:**
```json
{
  "success": true,
  "campaigns": [
    {
      "id": 1,
      "campaign_name": "Open Bank Account",
      "campaign_type": "bank_form",
      "reward_bytes": 52428800,
      "reward_duration_hours": 24,
      "content_type": "form",
      "form_fields": [...]
    }
  ]
}
```

#### Complete Campaign (Authenticated Customer)
```http
POST /api/campaigns/:campaign_id/complete
Content-Type: application/json

{
  "completion_type": "form_submit",
  "lead_data": {
    "name": "John Doe",
    "phone": "+255712345678",
    "email": "john@example.com"
  },
  "location_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign completed successfully!",
  "reward": {
    "type": "both",
    "bytes": 52428800,
    "duration_hours": 24
  }
}
```

#### Get My Campaigns (Partner)
```http
GET /api/campaigns/my-campaigns?campaign_type=bank_form&is_active=1
```

#### Create Campaign (Partner)
```http
POST /api/campaigns/create
Content-Type: application/json

{
  "campaign_name": "Student Credit Card Campaign",
  "campaign_type": "bank_form",
  "description": "Apply for student credit card",
  "start_date": "2025-12-03",
  "end_date": "2026-01-03",
  "target_locations": [1, 2, 3],
  "target_user_types": ["student"],
  "target_age_min": 18,
  "target_age_max": 30,
  "total_budget": 1000000,
  "cost_per_action": 5000,
  "reward_bytes": 52428800,
  "reward_duration_hours": 24,
  "content_type": "form",
  "form_fields": [
    {"name": "full_name", "type": "text", "required": true},
    {"name": "phone", "type": "tel", "required": true},
    {"name": "email", "type": "email", "required": true}
  ]
}
```

#### Get Campaign Leads (Bank Partner)
```http
GET /api/campaigns/:campaign_id/leads?page=1&per_page=50&status=new
```

**Response:**
```json
{
  "success": true,
  "leads": [
    {
      "id": 1,
      "user_name": "John Doe",
      "phone_number": "+255712345678",
      "email": "john@example.com",
      "lead_status": "new",
      "lead_data": {...},
      "completed_at": "2025-12-03T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

#### Export Leads to CSV
```http
GET /api/campaigns/:campaign_id/leads/export
```

#### Update Lead Status
```http
PUT /api/campaigns/leads/:completion_id/status
Content-Type: application/json

{
  "status": "contacted",
  "notes": "Called customer, interested in product"
}
```

---

### 💰 Wallet API

#### Get Wallet Balance
```http
GET /api/wallet/balance
```

**Response:**
```json
{
  "success": true,
  "balance": 250000.00
}
```

#### Request Deposit
```http
POST /api/wallet/deposit/request
Content-Type: application/json

{
  "amount": 100000,
  "phone_number": "+255712345678",
  "payment_method": "mpesa"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment request initiated. Please complete payment on your phone.",
  "payment_request_id": 123,
  "amount": 100000,
  "expires_in_seconds": 600
}
```

#### Request Withdrawal
```http
POST /api/wallet/withdraw/request
Content-Type: application/json

{
  "amount": 50000,
  "phone_number": "+255712345678",
  "payment_method": "mpesa"
}
```

#### Get Transactions
```http
GET /api/wallet/transactions?page=1&per_page=50&transaction_type=deposit
```

---

### 📍 Location API

#### Get All Locations (Admin)
```http
GET /api/locations/
```

#### Get Location Performance
```http
GET /api/locations/:id/performance?start_date=2025-12-01&end_date=2025-12-31
```

#### Create Location (Admin)
```http
POST /api/locations/
Content-Type: application/json

{
  "name": "University of Dar es Salaam",
  "location_type": "university",
  "city": "Dar es Salaam",
  "region": "Dar es Salaam",
  "franchise_owner_id": 5,
  "max_users": 500,
  "bandwidth_limit_mbps": 1000
}
```

---

### 💸 Revenue Share API

#### Get Dashboard Stats (Franchise Owner)
```http
GET /api/revenue-share/dashboard
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "pending_amount": 125000.00,
    "approved_amount": 50000.00,
    "paid_amount": 300000.00,
    "total_revenue_generated": 2000000.00
  },
  "pending_payouts": [...]
}
```

#### Get Revenue Reports
```http
GET /api/revenue-share/reports?start_date=2025-11-01&end_date=2025-11-30
```

#### Calculate Revenue Shares (Admin)
```http
POST /api/revenue-share/admin/calculate
Content-Type: application/json

{
  "start_date": "2025-11-01",
  "end_date": "2025-11-30"
}
```

#### Approve Payout (Admin)
```http
POST /api/revenue-share/admin/payouts/:share_id/approve
```

#### Process Payout (Admin)
```http
POST /api/revenue-share/admin/payouts/:share_id/process
Content-Type: application/json

{
  "payment_reference": "MPESA-12345-ABCDE",
  "notes": "Payment sent via M-Pesa"
}
```

---

## 💾 Database Schema

### Key Tables

1. **users** - All system users (customers, admins, partners)
2. **locations** - Physical locations with routers
3. **mikrotiks** - Router configurations
4. **campaigns** - Bank & advertiser campaigns
5. **campaign_content** - Forms, videos, images
6. **campaign_completions** - User actions & leads
7. **wallets** - Partner wallet balances
8. **transactions** - All financial transactions
9. **payment_requests** - M-Pesa payment tracking
10. **partner_revenue_shares** - Franchise earnings
11. **revenue_sharing_rules** - Commission configuration
12. **packages** - Internet packages
13. **vouchers** - Pre-paid vouchers
14. **user_connection_logs** - WiFi connection history

**Total: 26 tables**

See [database/schema.sql](database/schema.sql) for complete schema.

---

## ⚙️ Configuration

### System Settings (via Admin Panel)

Navigate to: **Admin → Settings**

- `default_free_data_mb`: Default free data for new users (10 MB)
- `daily_ad_limit`: Max ads per user per day (8)
- `ad_watch_reward_mb`: Data per ad watched (15 MB)
- `franchise_default_share_percentage`: Default commission (25%)
- `min_payout_amount`: Minimum withdrawal (TZS 10,000)

### Revenue Sharing Rules

Navigate to: **Admin → Revenue Share → Rules**

Configure commission rates:
- Per location or global
- By partner type (franchise owner, landlord, broker)
- Percentage or fixed amount
- Minimum payout threshold
- Payout frequency (daily/weekly/monthly)

---

## 🚀 Deployment

### Production Checklist

- [ ] Change default admin password
- [ ] Set strong `SESSION_SECRET` in .env
- [ ] Configure MySQL with secure password
- [ ] Set up SSL/TLS (HTTPS)
- [ ] Configure firewall rules
- [ ] Set up automated backups
- [ ] Configure process manager (PM2)
- [ ] Set up monitoring (logs, uptime)
- [ ] Configure payment gateway APIs
- [ ] Test all payment flows
- [ ] Set up SMS notifications
- [ ] Configure email server

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start index.js --name hotbando

# View logs
pm2 logs hotbando

# Restart
pm2 restart hotbando

# Auto-start on system reboot
pm2 startup
pm2 save
```

---

## 🐛 Troubleshooting

### Database Connection Failed

```bash
# Check MySQL is running
sudo systemctl status mysql

# Test connection
mysql -u root -p -e "SELECT 1"

# Verify credentials in .env match MySQL
```

### MikroTik Router Connection Issues

```bash
# Test router connectivity
ping 10.7.0.4

# Verify API port is open
telnet 10.7.0.4 8728

# Check router API is enabled:
# - Login to router via Winbox/WebFig
# - IP → Services → API (port 8728 enabled)
```

### Session Not Persisting

```bash
# Check sessions table exists
node database/setup.js check

# Clear old sessions
# MySQL: DELETE FROM sessions WHERE expires < UNIX_TIMESTAMP()
```

### Low Performance

- Enable MySQL query cache
- Add database indexes (already included in schema)
- Use connection pooling (already configured)
- Enable compression for static assets
- Consider Redis for session storage

---

## 📞 Support

For issues and questions:
- **Email**: info@hotbando.com
- **Phone**: +255 XXX XXX XXX
- **Documentation**: See `/docs` folder

---

## 📝 License

Proprietary - All rights reserved

---

**Built with ❤️ for Tanzania's Digital Future**
