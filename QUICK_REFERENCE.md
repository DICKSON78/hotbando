# HOTBANDO PORTAL - QUICK REFERENCE GUIDE

**Last Updated:** November 4, 2026  
**Status:** ✅ Production Ready

---

## MODALS

### Subscribe Modal
- **File:** `frontend/src/views/hotspot/Subscribe.vue`
- **Trigger:** Dashboard "Buy Package" button
- **Close:** X button, click outside, ESC key
- **Validation:** Phone (0776xxxxxx format), 10 digits
- **Price:** Shows package + ClickPesa fee + total
- **State:** Clear form on close (security)

### Notifications Bottom Sheet
- **File:** `frontend/src/views/hotspot/Dashboard.vue`
- **Trigger:** Bell icon in header
- **Shows:** 3-5 most recent notifications
- **Height:** Max 256px with scroll
- **Features:** Mark all read, unread badge
- **Close:** Click outside, ESC key, X button

---

## FREE BYTES (ADS)

### Earning
- **Source:** Watching ads
- **Reward:** 2-10MB per ad (sponsor-configured)
- **Daily Limit:** 8 ads/day
- **Daily Cap:** 500MB/day
- **Watch %:** 80% required (server-side check)
- **Anti-Spoof:** Elapsed time ≥ (duration × 0.8)
- **Anti-Duplicate:** 5-minute window between same ad
- **Stored:** `users.free_bytes` (in bytes)

### Display
- **Dashboard:** Purple color, MB format
- **Update:** Every 15 seconds (polling)
- **Real-time:** Immediate on ad completion
- **Notification:** "+X MB earned" alert

### Enforcement (RADIUS)
- **Auth Check:** `free_bytes > 0` allows access
- **Deduction:** Accounting deducts every 60s
- **Rate Limit:** 2 Mbps (free tier)
- **Rejection:** When free_bytes = 0

---

## PAID BYTES (PACKAGES)

### Purchase Flow
1. Dashboard → "Buy Package"
2. Modal shows price breakdown
3. User enters payment phone
4. ClickPesa fee calculated
5. User confirms via USSD
6. Webhook activates package
7. Dashboard refreshes

### Storage
- **Remaining:** `users.paid_bytes_remaining` (bytes)
- **Limit:** `users.paid_data_limit_bytes` (0 = unlimited)
- **Expiry:** `users.usage_until` (datetime)

### Display
- **Dashboard:** Orange color, time countdown
- **Format:** MB (or "Unlimited") + time remaining
- **Update:** Every 1 second (countdown)
- **Expiry:** Red if < 5 minutes

### Enforcement (RADIUS)
- **Auth Check:** `usage_until > NOW` allows access
- **Deduction:** Paid first, then free
- **Rate Limit:** 10 Mbps (paid tier)
- **Stacking:** Extends time if active, fresh if expired

---

## VOUCHERS

### Redemption
1. User enters code in "Enter Voucher Code" field
2. Code validated (alphanumeric, case-insensitive)
3. Server checks: valid, not expired, not used
4. Atomic mark as used (prevents double-redeem)
5. Package activated
6. Payment recorded
7. Reseller balance updated

### Protection
- **One-Time Use:** `is_used = 1` flag
- **Double-Redeem:** Atomic UPDATE WHERE is_used = 0
- **Expiry:** Checked before activation
- **Rollback:** If activation fails, is_used reset to 0

### Reseller
- **Price:** Set by reseller (min 500 TSh)
- **Margin:** 100% to reseller (no platform cut)
- **Withdrawal Fee:** 10% platform fee
- **Tracking:** Reseller can see total earned

---

## NOTIFICATIONS

### Types
| Type | Trigger | Message | Color |
|------|---------|---------|-------|
| Low Bundle | < 5 min | Bundle inaisha hivi karibuni | 🟡 Warn |
| Out of Data | No time, no free | Huna data | 🔴 Danger |
| Connected | Auth success | Umeunganishwa | 🟢 Info |
| Ad Earned | Ad completed | +X MB earned | 🔵 Success |
| Data Cap | Limit reached | Umeshazidi limit | 🟡 Warn |

### Channels
1. **Banner:** Auto-dismiss after 5s, colored
2. **Bell:** Icon with unread badge in header
3. **Browser:** System notification (if allowed)
4. **Badge:** App home screen icon count
5. **Inbox:** Bottom sheet with history

### Non-Intrusive
- No fullscreen popups
- Smart timing (once per session)
- One-click dismiss
- Optional browser notifications
- Mark as read functionality

---

## ACCESS CONTROL

### RADIUS Auth
```
IF usage_until > NOW AND (data_limit = 0 OR remaining > 0) THEN
  ALLOW (paid package active)
ELSIF free_bytes > 0 THEN
  ALLOW (free bytes available)
ELSE
  REJECT (no entitlement)
END IF
```

### Accounting (Every 60s)
```
delta = current_octets - last_octets
deduct_paid = min(delta, paid_bytes_remaining)
paid_bytes_remaining -= deduct_paid
delta -= deduct_paid
free_bytes -= delta
UPDATE users SET paid_bytes_remaining = ?, free_bytes = ?
```

### Rate Limits
- **Free:** 2 Mbps up/down
- **Paid:** 10 Mbps up/down

### Connection
- **Connect:** Adds user to RouterOS hotspot
- **Disconnect:** Removes user access
- **Router:** Tracks last_router_id

---

## DATABASE TRANSACTIONS

### Atomic Operations
| Operation | Tables | Guarantee |
|-----------|--------|-----------|
| Ad completion | ad_views, users, ads | All or nothing |
| Voucher redeem | vouchers, users, payments, resellers | All or nothing |
| Package activate | users, payments | All or nothing |
| Accounting | radius_sessions, users | All or nothing |

### Session Sync
- **Load:** Fresh from DB
- **Poll:** Every 15 seconds
- **Visibility:** Refresh when tab visible
- **Cache:** Updated on every action

---

## CONFIGURATION

### System Settings
```
daily_ad_limit = 8
minimum_watch_percentage = 80
max_daily_ad_reward_bytes = 524288000 (500MB)
free_user_rate_limit = 2M
paid_user_rate_limit = 10M
dashboard_poll_interval = 15000ms
accounting_poll_interval = 60000ms
voucher_min_price = 500
```

### Environment Variables
```
CLICKPESA_API_KEY = ...
CLICKPESA_MERCHANT_ID = ...
CLICKPESA_WEBHOOK_SECRET = ...
RADIUS_SERVER = ...
RADIUS_SECRET = ...
MIKROTIK_IP = ...
MIKROTIK_USER = ...
MIKROTIK_PASS = ...
```

---

## KEY FILES

| File | Purpose |
|------|---------|
| `frontend/src/views/hotspot/Dashboard.vue` | Main dashboard, countdown, alerts |
| `frontend/src/views/hotspot/Subscribe.vue` | Package modal, payment |
| `frontend/src/views/hotspot/Ads.vue` | Ad list, watch, completion |
| `controllers/hotspotController.js` | Backend logic (ads, vouchers, packages) |
| `routes/hotspotApi.js` | API endpoints (dashboard, subscribe, connect) |
| `freeradius/perl/hotbando_auth.pl` | RADIUS auth, accounting |
| `services/withdrawalPayouts.js` | Reseller payouts |
| `config/database.js` | Database config, timezone |

---

## TROUBLESHOOTING

### Free bytes not increasing
- Check ad is valid (live, not expired)
- Verify watch percentage ≥ 80%
- Check daily limit (8 ads)
- Check daily cap (500MB)
- Check for recent view (5-min window)
- Check database ad_views table

### Paid package not activating
- Verify ClickPesa webhook received
- Check webhook signature verification
- Verify payment status = SUCCESS
- Check database payments table
- Check user.usage_until updated

### Voucher won't redeem
- Check code is valid (exists in DB)
- Check not already used (is_used = 0)
- Check expiry date (expires_at > NOW)
- Check user not rate-limited
- Check for transaction in audit log

### RADIUS rejecting valid user
- Check usage_until > NOW
- Check free_bytes > 0 (if no paid)
- Check MAC address registered
- Check is_active = 1
- Check RADIUS server connection

### Notification not showing
- Check Notification.permission === 'granted'
- Check browser notification enabled
- Check not already sent in session
- Check message not empty
- Check app badge API supported

---

## TESTING CHECKLIST

- [ ] Create test user via registration
- [ ] Watch ad → verify free_bytes increase
- [ ] Check dashboard updates every 15s
- [ ] Buy package → verify payment flow
- [ ] Confirm USSD on phone → verify webhook
- [ ] Check package activation (usage_until set)
- [ ] Generate voucher → verify code generation
- [ ] Redeem voucher → verify activation
- [ ] Try redeem again → verify "already used"
- [ ] Connect to WiFi → verify RADIUS auth
- [ ] Check rate limit (speed should match tier)
- [ ] Wait for countdown → verify time decrement
- [ ] Check notifications for all 5 types
- [ ] Verify bell badge increments
- [ ] Mark all read → verify badge clears

---

## MONITORING

### Metrics to Watch
- Ad completion rate (per day)
- Free bytes earned (daily total)
- Packages purchased (per day)
- Voucher redemptions (per day)
- RADIUS auth success rate
- Notification delivery rate
- Average session duration
- Zero-byte rejections (should be low)
- Expired user rejections (should be consistent)

### Alerts to Set
- Zero ad completions in 1 hour
- RADIUS auth failure rate > 5%
- ClickPesa webhook failures
- Database transaction rollbacks
- Free bytes not increasing
- Voucher double-redeem attempts

---

**Status:** ✅ All systems operational  
**Last Verified:** November 4, 2026  
**Next Review:** As needed / on feature changes
