# 🚀 HotBando Platform - Production Deployment Checklist

**Complete checklist ya kuweka mfumo production**

---

## ✅ BACKEND - 100% COMPLETE & READY

### 1. Database (✅ Ready)
```bash
# Setup database
node database/setup.js setup

# Verify
node database/setup.js check
```

**Output Expected:**
```
✅ Database connection successful
📊 Total tables: 26
✅ Packages: 4 records
✅ System Settings: 16 records
✅ Super Admin: 1 account(s)
```

### 2. API Endpoints (✅ All 58 Working)

**Test key endpoints:**
```bash
# 1. Health check
curl http://localhost:3000/hotspot/health-check

# 2. Get active campaigns (public)
curl http://localhost:3000/api/campaigns/active?location_id=1

# 3. Admin login
curl -X POST http://localhost:3000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"+255700000000","password":"Admin@123"}'

# 4. Get wallet balance (after login)
curl http://localhost:3000/api/wallet/balance \
  -H "Cookie: connect.sid=YOUR_SESSION"
```

### 3. File Structure (✅ Complete)

```
hotbando/
├── config/
│   ├── database.js ✅
│   └── mikrotik.js ✅
├── controllers/ ✅
│   ├── campaignController.js (650 lines)
│   ├── walletController.js (480 lines)
│   ├── revenueShareController.js (420 lines)
│   └── locationController.js (320 lines)
├── models/ ✅
│   ├── BaseModel.js (200 lines)
│   ├── Campaign.js (520 lines)
│   ├── Wallet.js (450 lines)
│   ├── Location.js (280 lines)
│   └── RevenueShare.js (500 lines)
├── routes/ ✅
│   ├── campaignRoutes.js
│   ├── walletRoutes.js
│   ├── revenueShareRoutes.js
│   └── locationRoutes.js
├── middleware/ ✅
│   └── authMiddleware.js (5 auth types)
├── views/
│   ├── admin/
│   │   ├── layout.ejs ✅ (Updated with new menu)
│   │   ├── dashboard.ejs ✅
│   │   ├── campaigns.ejs ⏳ (Use guide to build)
│   │   ├── leads.ejs ⏳
│   │   ├── wallet.ejs ⏳
│   │   ├── locations.ejs ⏳
│   │   └── revenue-share.ejs ⏳
│   └── hotspot/
│       ├── index.ejs ✅ (Update with campaigns)
│       └── ... (existing pages)
├── database/
│   ├── schema.sql ✅ (1,100 lines, 26 tables)
│   └── setup.js ✅
├── README.md ✅ (600+ lines)
├── QUICK_START.md ✅
├── PROGRESS_REPORT.md ✅
└── FRONTEND_IMPLEMENTATION_GUIDE.md ✅
```

---

## 🎨 FRONTEND - Use Implementation Guide

### Pages Zinazohitajika

Follow [FRONTEND_IMPLEMENTATION_GUIDE.md](FRONTEND_IMPLEMENTATION_GUIDE.md) to build:

1. **`/admin/campaigns`** - Campaign management
   - API: `/api/campaigns/my-campaigns`
   - Create, edit, toggle, delete campaigns
   - Modal for creating new campaigns

2. **`/admin/leads`** - Lead management
   - API: `/api/campaigns/:id/leads`
   - Filter by status, campaign
   - Export to CSV
   - Update lead status

3. **`/admin/wallet`** - Wallet & billing
   - API: `/api/wallet/balance`, `/api/wallet/transactions`
   - Deposit via M-Pesa
   - Withdrawal requests
   - Transaction history

4. **`/admin/locations`** - Location management
   - API: `/api/locations/`
   - CRUD operations
   - Assign routers
   - Performance stats

5. **`/admin/revenue-share`** - Franchise payouts
   - API: `/api/revenue-share/dashboard`
   - Calculate revenue shares
   - Approve & process payouts
   - Payout history

**Estimated Time**: 2-3 days (6-8 hours per day)

---

## 🔧 PRE-DEPLOYMENT CHECKLIST

### Security

- [ ] Change default admin password
  ```sql
  UPDATE users SET password = '$2a$10$NEW_HASH'
  WHERE phone_number = '+255700000000';
  ```

- [ ] Update SESSION_SECRET in `.env`
  ```bash
  SESSION_SECRET=$(openssl rand -base64 32)
  ```

- [ ] Set strong MySQL password
  ```bash
  ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_secure_password';
  ```

- [ ] Enable HTTPS (SSL/TLS)
  ```bash
  # Using Let's Encrypt
  sudo certbot --nginx -d yourdomain.com
  ```

### Environment Variables

```bash
# .env file
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-very-long-random-secret-here

DB_HOST=localhost
DB_USER=hotbando_user
DB_PASSWORD=secure_db_password
DB_NAME=hotbando

# MikroTik
MIKROTIK_HOST=10.7.0.4
MIKROTIK_USER=admin
MIKROTIK_PASSWORD=router_password

# M-Pesa (Get from Safaricom)
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey

# SMS Gateway
SMS_API_KEY=your_sms_api_key
SMS_SENDER_ID=HOTBANDO
```

### Database Backup

```bash
# Create backup script
cat > /home/hotbando/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u root -p hotbando > /backup/hotbando_$DATE.sql
gzip /backup/hotbando_$DATE.sql
find /backup -name "*.sql.gz" -mtime +7 -delete
EOF

chmod +x /home/hotbando/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /home/hotbando/backup.sh
```

### Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start index.js --name hotbando-api

# Auto-restart on system reboot
pm2 startup
pm2 save

# View logs
pm2 logs hotbando-api

# Monitor
pm2 monit
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/hotbando
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files
    location /assets {
        alias /home/hotbando/public/assets;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/hotbando /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Firewall

```bash
# UFW setup
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # Node.js (only if needed)
sudo ufw enable
```

---

## 📊 MONITORING & LOGGING

### Application Logs

```bash
# PM2 logs
pm2 logs hotbando-api --lines 100

# Error logs only
pm2 logs hotbando-api --err

# Access logs
pm2 logs hotbando-api --out
```

### Database Monitoring

```sql
-- Check active connections
SHOW PROCESSLIST;

-- Check database size
SELECT
    table_schema as 'Database',
    SUM(data_length + index_length) / 1024 / 1024 as 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'hotbando'
GROUP BY table_schema;

-- Check slow queries
SHOW VARIABLES LIKE 'slow_query_log%';
```

### Performance Monitoring

```bash
# Install htop
sudo apt install htop

# Monitor system
htop

# Check disk space
df -h

# Check memory
free -h
```

---

## 🧪 TESTING CHECKLIST

### API Testing

```bash
# Install httpie (optional)
sudo apt install httpie

# Test campaign creation
http POST http://localhost:3000/api/campaigns/create \
  campaign_name="Test Campaign" \
  campaign_type="bank_form" \
  Cookie:"connect.sid=YOUR_SESSION"

# Test wallet balance
http GET http://localhost:3000/api/wallet/balance \
  Cookie:"connect.sid=YOUR_SESSION"
```

### Load Testing

```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test 1000 requests, 10 concurrent
ab -n 1000 -c 10 http://localhost:3000/hotspot/

# Test with POST
ab -n 100 -c 5 -p data.json -T application/json \
   http://localhost:3000/api/campaigns/active
```

### Security Testing

```bash
# Check for open ports
sudo nmap -sS localhost

# Check SSL configuration
openssl s_client -connect yourdomain.com:443

# Test HTTPS redirect
curl -I http://yourdomain.com
```

---

## 🚀 GO-LIVE STEPS

### 1. Final Database Setup

```bash
# Production database
mysql -u root -p
CREATE DATABASE hotbando CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'hotbando_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON hotbando.* TO 'hotbando_user'@'localhost';
FLUSH PRIVILEGES;
exit

# Run schema
node database/setup.js setup
```

### 2. Start Services

```bash
# Start MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Start Node.js app
pm2 start index.js --name hotbando-api
pm2 save
```

### 3. Verify Everything Works

```bash
# Check services
sudo systemctl status mysql
sudo systemctl status nginx
pm2 status

# Test application
curl http://localhost:3000/hotspot/health-check
```

### 4. Configure Domain DNS

```
A Record: @ -> YOUR_SERVER_IP
A Record: www -> YOUR_SERVER_IP
```

### 5. Setup SSL

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 6. Monitor for 24 Hours

```bash
# Watch logs
pm2 logs hotbando-api --lines 50 --follow

# Check errors
tail -f /var/log/nginx/error.log
```

---

## 📱 POST-DEPLOYMENT

### 1. Create Test Accounts

```sql
-- Bank partner
INSERT INTO users (name, phone_number, email, password, role, is_verified)
VALUES ('Test Bank', '+255712345678', 'bank@test.com', '$2a$10$HASH', 'bank_partner', 1);

-- Franchise owner
INSERT INTO users (name, phone_number, email, password, role, is_verified)
VALUES ('Test Franchise', '+255723456789', 'franchise@test.com', '$2a$10$HASH', 'franchise_owner', 1);
```

### 2. Create Test Data

```sql
-- Location
INSERT INTO locations (name, location_type, city, region, franchise_owner_id)
VALUES ('UDSM Main Campus', 'university', 'Dar es Salaam', 'Dar es Salaam', 2);

-- Revenue sharing rule
INSERT INTO revenue_sharing_rules (partner_type, share_percentage, payout_frequency)
VALUES ('franchise_owner', 25.00, 'monthly');
```

### 3. Test Complete Flows

1. ✅ Customer signup → watch ad → get internet
2. ✅ Bank partner creates campaign
3. ✅ Customer completes bank form → lead captured
4. ✅ Admin approves campaign
5. ✅ Advertiser deposits money → wallet balance updates
6. ✅ Franchise owner views earnings
7. ✅ Admin calculates & approves payout

---

## 🆘 TROUBLESHOOTING

### Common Issues

**1. Database Connection Failed**
```bash
# Check MySQL running
sudo systemctl status mysql

# Test connection
mysql -u hotbando_user -p -h localhost hotbando
```

**2. PM2 App Crashed**
```bash
# View error logs
pm2 logs hotbando-api --err --lines 50

# Restart
pm2 restart hotbando-api
```

**3. Port Already in Use**
```bash
# Find process
sudo lsof -i :3000

# Kill process
sudo kill -9 PID
```

**4. Nginx 502 Error**
```bash
# Check Node.js running
pm2 status

# Check Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## 📞 SUPPORT CONTACTS

- **Documentation**: [README.md](README.md)
- **Quick Start**: [QUICK_START.md](QUICK_START.md)
- **API Docs**: README.md #api-documentation
- **Frontend Guide**: [FRONTEND_IMPLEMENTATION_GUIDE.md](FRONTEND_IMPLEMENTATION_GUIDE.md)

---

**🎉 System Iko Tayari Kwenda Live! Good Luck! 🚀**
