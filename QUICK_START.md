# 🚀 Quick Start Guide - HotBando Platform

Mwongozo wa haraka wa kuanza kutumia mfumo wa HotBando.

## ⚡ Hatua za Haraka (5 Dakika)

### 1️⃣ Setup Database

```bash
# Anza MySQL service
sudo systemctl start mysql

# Create database na tables
node database/setup.js setup
```

**Output utaona:**
```
✅ Database 'hotbando' ready
✅ Schema created successfully
✅ Created 26 tables
✅ Packages: 4 records
✅ System Settings: 16 records
✅ Super Admin: 1 account(s)

📝 Default Admin Credentials:
   Phone: +255700000000
   Password: Admin@123
```

### 2️⃣ Start Server

```bash
# Install dependencies (mara ya kwanza tu)
npm install

# Anza server
npm start
```

**Server itaanza:**
```
🚀 HotBando server inafanya kazi kwenye http://localhost:3000
📱 Hotspot: http://localhost:3000/hotspot
👨‍💼 Admin: http://localhost:3000/admin
✅ Mfumo upo tayari kutumika!
```

### 3️⃣ Login kama Admin

1. Fungua browser: http://localhost:3000/admin/login
2. Simu: `+255700000000`
3. Password: `Admin@123`
4. **MUHIMU**: Badilisha password baada ya kuingia!

---

## 📱 User Flows

### Kwa Customer (Hotspot User)

1. **Connect to WiFi** → Itafungua splash page automatically
2. **Sign Up** → Jaza jina, simu, na password
3. **Choose Action**:
   - Tazama ad → Pata 15MB free data
   - Jaza form ya bank → Pata 50MB + 24hrs internet
   - Install app → Pata 100MB + 3 days internet
4. **Connect** → Enjoy free internet!

### Kwa Bank Partner

1. **Register** → Admin atakuidhinisha
2. **Login** → `/admin/login` (role: bank_partner)
3. **Create Campaign**:
   ```
   POST /api/campaigns/create
   {
     "campaign_name": "Student Account Opening",
     "campaign_type": "bank_form",
     "target_user_types": ["student"],
     "reward_bytes": 52428800,  // 50MB
     "reward_duration_hours": 24,
     "form_fields": [...]
   }
   ```
4. **View Leads** → `/admin/campaigns` → Select campaign → View leads
5. **Export** → Download CSV ya leads
6. **Update Status** → Mark as contacted/converted

### Kwa Advertiser (Sponsor)

1. **Register** → Role: sponsor
2. **Deposit Money**:
   - Go to Wallet → Deposit
   - Choose M-Pesa/Tigo Pesa/Airtel Money
   - Enter amount (min TZS 10,000)
   - Lipa kwa simu yako
3. **Create Ad Campaign**:
   - Upload video (< 60 seconds) au image
   - Set target: location, age, gender
   - Set budget: CPM/CPC/CPA
   - Wait for approval
4. **Monitor Performance** → Dashboard → Analytics

### Kwa Franchise Owner

1. **Setup Location** → Admin atatengeneza location yako
2. **Install Router** → MikroTik router configured
3. **Assign Router** → Admin ataconnect router to your location
4. **Monitor Earnings**:
   - Login → Dashboard
   - View revenue share (default 25%)
   - Track pending payouts
5. **Request Payout** → When balance >= TZS 10,000

---

## 🔧 Common Tasks

### 1. Add New Location

```bash
# Via API (Admin only)
POST /api/locations/
{
  "name": "UDSM Main Campus",
  "location_type": "university",
  "city": "Dar es Salaam",
  "region": "Dar es Salaam",
  "franchise_owner_id": 5,
  "max_users": 500,
  "bandwidth_limit_mbps": 1000
}
```

### 2. Add MikroTik Router

```bash
# Via Admin Panel
1. Go to: Admin → Routers → Add Router
2. Enter:
   - Router Name: "UDSM-Router-01"
   - IP Address: 192.168.88.1
   - Username: admin
   - Password: ****
   - Location: Select location
3. Test Connection → Save
```

### 3. Generate Vouchers

```bash
# Via Admin Panel
1. Admin → Vouchers → Generate
2. Select Package: MASAA 6 (TZS 500)
3. Quantity: 100
4. Issued To: "University Cafe"
5. Generate → Download PDF
```

### 4. Approve Campaign

```bash
# Via Admin Panel
1. Admin → Campaigns → Pending
2. Review campaign details
3. Check targeting rules
4. Click "Approve" or "Reject"
```

### 5. Process Withdrawal

```bash
# Via Admin Panel
1. Admin → Wallet → Pending Withdrawals
2. Select withdrawal request
3. Send money via M-Pesa
4. Enter M-Pesa reference
5. Mark as "Completed"
```

### 6. Calculate Monthly Revenue Share

```bash
# Via API (Admin)
POST /api/revenue-share/admin/calculate
{
  "start_date": "2025-12-01",
  "end_date": "2025-12-31"
}

# Then approve payouts
POST /api/revenue-share/admin/payouts/:id/approve
```

---

## 🧪 Testing

### Test Customer Flow

```bash
# 1. Register user
curl -X POST http://localhost:3000/hotspot/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "phone_number": "+255712345678",
    "password": "Test@123",
    "user_type": "student"
  }'

# 2. Login
curl -X POST http://localhost:3000/hotspot/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+255712345678",
    "password": "Test@123"
  }'

# 3. Get active campaigns
curl http://localhost:3000/api/campaigns/active?location_id=1

# 4. Complete campaign (need session cookie)
curl -X POST http://localhost:3000/api/campaigns/1/complete \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=..." \
  -d '{
    "completion_type": "form_submit",
    "lead_data": {"name": "Test", "phone": "+255712345678"}
  }'
```

### Check Database

```bash
# Check system status
node database/setup.js check

# Output:
# ✅ Database connection successful
# 📊 Total tables: 26
# 📈 Table Statistics:
#    users                     : 10 records
#    campaigns                 : 3 records
#    campaign_completions      : 150 records
#    wallets                   : 5 records
#    ...
```

---

## 📊 Sample Data for Testing

### Create Test Bank Campaign

```javascript
// Run in Node.js or via API
const campaignData = {
  campaign_name: "CRDB Student Account",
  campaign_type: "bank_form",
  description: "Open student account and get free banking",
  start_date: new Date().toISOString().split('T')[0],
  end_date: null,
  target_locations: [1, 2],
  target_user_types: ["student"],
  target_age_min: 18,
  target_age_max: 30,
  total_budget: 500000,
  cost_per_action: 5000,
  reward_bytes: 52428800,
  reward_duration_hours: 24,
  content_type: "form",
  form_fields: [
    { name: "full_name", type: "text", label: "Full Name", required: true },
    { name: "phone", type: "tel", label: "Phone Number", required: true },
    { name: "email", type: "email", label: "Email Address", required: true },
    { name: "id_number", type: "text", label: "ID/Student Number", required: true },
    { name: "institution", type: "text", label: "University/College", required: true }
  ]
};

// POST to /api/campaigns/create
```

### Create Test Location

```javascript
const locationData = {
  name: "UDSM Main Campus",
  location_type: "university",
  address: "University Road, Dar es Salaam",
  city: "Dar es Salaam",
  region: "Dar es Salaam",
  latitude: -6.7765,
  longitude: 39.2495,
  max_users: 500,
  bandwidth_limit_mbps: 1000,
  contact_person: "IT Manager",
  contact_phone: "+255712345678",
  contact_email: "it@udsm.ac.tz"
};

// POST to /api/locations/ (Admin only)
```

---

## 🔍 Debugging

### Enable Debug Logs

```bash
# Edit .env
DEBUG=hotbando:*
NODE_ENV=development

# Restart server
npm start
```

### Check MikroTik Connection

```bash
# Test ping
ping YOUR_ROUTER_IP

# Test API port
telnet YOUR_ROUTER_IP 8728

# Check router status via API
curl http://localhost:3000/admin/routers
```

### View Database Queries

```javascript
// Add to config/database.js
const pool = mysql.createPool({
  ...config,
  debug: true  // Enables query logging
});
```

---

## 📚 Next Steps

1. ✅ **Setup Complete** → System is running
2. 📝 **Create Test Data** → Add locations, campaigns, users
3. 🧪 **Test All Flows** → Customer, Bank, Advertiser, Admin
4. 🎨 **Customize UI** → Update branding, colors, logos
5. 🔐 **Security Hardening** → SSL, firewall, backups
6. 💳 **Payment Integration** → M-Pesa API setup
7. 📱 **SMS Notifications** → SMS gateway integration
8. 📊 **Production Deploy** → PM2, monitoring, logs
9. 🚀 **Go Live!** → Launch to users

---

## 🆘 Quick Help

**Problem**: Database error
**Solution**: Run `node database/setup.js check`

**Problem**: Session not working
**Solution**: Check `sessions` table exists

**Problem**: MikroTik not connecting
**Solution**: Verify IP, port, credentials, API enabled

**Problem**: API returns 401
**Solution**: Check user is logged in, correct role

**Problem**: Campaign not showing
**Solution**: Check `is_active=1`, `approved_by IS NOT NULL`, dates valid

---

**Maswali? Wasiliana nasi:** info@hotbando.com

**Happy Coding! 🎉**
