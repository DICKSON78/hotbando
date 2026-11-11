# HotBando Session & WiFi Flow Diagram

## 🔄 User Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER CONNECTS TO WIFI                                    │
├─────────────────────────────────────────────────────────────┤
│ Device joins HotBando WiFi network                          │
│ Gets IP from DHCP: 192.168.x.x                             │
│ Captures gateway: 192.168.1.1                              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CAPTIVE PORTAL TRIGGERED                                │
├─────────────────────────────────────────────────────────────┤
│ Browser redirects to: /hotspot/login                        │
│ Page loads: Login form with phone & password               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. USER SUBMITS LOGIN FORM                                 │
├─────────────────────────────────────────────────────────────┤
│ POST /api/hotspot/login {phone, password}                  │
│ ✓ Validates credentials against users table                │
│ ✓ Gets MAC address from browser: FF:FF:FF:FF:FF:FF        │
│ ✓ Gets router ID from request: HB-D5A30DD733CD           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. SESSION CREATED (hotspotController.js:277-295)          │
├─────────────────────────────────────────────────────────────┤
│ req.session.regenerate() - security measure                │
│                                                             │
│ req.session.hotbando_user = {                              │
│     id: 34,                                                 │
│     name: 'Stanslaus Emmanuel',                             │
│     phone_number: '0776126464',                             │
│     package: 'MASAA 6',                                     │
│     usage_until: '2026-11-04 20:21:06',                    │
│     free_bytes: 10485760,                                   │
│     paid_bytes_remaining: 0,                                │
│     mac_address: 'FF:FF:FF:FF:FF:FF',                      │
│     last_router_id: 'HB-D5A30DD733CD'                      │
│ }                                                           │
│                                                             │
│ req.session.mac = 'FF:FF:FF:FF:FF:FF'                      │
│ req.session.routerID = 'HB-D5A30DD733CD'                   │
│ req.session.onWifi = true                                   │
│ req.session.location = 'Tanzania'                           │
│                                                             │
│ SAVE to MySQL session store:                               │
│ → sessions table (hotbando_session cookie)                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. BROWSER RECEIVES RESPONSE                               │
├─────────────────────────────────────────────────────────────┤
│ HTTP 200: {success: true}                                   │
│ Set-Cookie: hotbando.sid={session_id}; HttpOnly           │
│ Browser stores cookie locally                              │
│ Redirects to: /hotspot/dashboard                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. DASHBOARD PAGE LOADS (Dashboard.vue)                    │
├─────────────────────────────────────────────────────────────┤
│ onMounted() called:                                         │
│                                                             │
│ ✓ Check 1: Is user authenticated?                          │
│   if (!store.user || !store.user.id)                       │
│     → Show error & redirect to login                       │
│                                                             │
│ ✓ Check 2: Load dashboard data                             │
│   GET /api/hotspot/dashboard                               │
│   (Browser sends: Cookie: hotbando.sid=xxx)                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. BACKEND RECEIVES DASHBOARD REQUEST                      │
├─────────────────────────────────────────────────────────────┤
│ GET /api/hotspot/dashboard                                 │
│ Cookie: hotbando.sid=xxx (browser sends this)              │
│                                                             │
│ Step 1: Load session from MySQL session store              │
│   ├─ If session expired → req.session.hotbando_user = null │
│   ├─ If session valid → load user data                     │
│   └─ If session not found → req.session.hotbando_user = undefined
│                                                             │
│ Step 2: requireWifi middleware check                       │
│   ├─ Is req.session.onWifi = true? (from login)            │
│   ├─ If false, heal with 2-sec DB query:                   │
│   │  SELECT router_id, status FROM mikrotiks WHERE ...     │
│   ├─ If router.status = 'online' → set onWifi = true       │
│   ├─ If router.status = 'offline' → return 503             │
│   └─ If not onWifi → return 403 (Forbidden)                │
│                                                             │
│ Step 3: Check authentication                               │
│   ├─ If req.session.hotbando_user = null → return 401      │
│   └─ If defined → proceed with dashboard                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. DASHBOARD ENDPOINT RETURNS DATA (hotspotApi.js:138)     │
├─────────────────────────────────────────────────────────────┤
│ Queries:                                                    │
│ 1. Fetch fresh user data from users table                  │
│ 2. Get today's ad count from ad_views table                │
│ 3. Get daily ad limit from system_settings                 │
│                                                             │
│ Calculate:                                                  │
│ • remainingTime = usage_until - NOW                        │
│ • freeMB = free_bytes / (1024 * 1024)                      │
│ • paidMB = paid_bytes_remaining / (1024 * 1024)            │
│ • adsRemaining = dailyAdLimit - adsWatchedToday            │
│                                                             │
│ Response: HTTP 200 {                                        │
│   user: {id, name, phone, package, ...},                   │
│   remainingTime: '1 saa 32 dakika',                        │
│   freeMB: '10.00',                                          │
│   paidMB: 'Unlimited',                                      │
│   adsRemaining: 6,                                          │
│   isActive: true,                                           │
│   connected: true                                           │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. FRONTEND PROCESSES RESPONSE                             │
├─────────────────────────────────────────────────────────────┤
│ if (response.ok) {                                          │
│   const data = await response.json()                       │
│   user.value = data.user                                   │
│   remainingTime.value = data.remainingTime                 │
│   freeMB.value = data.freeMB                               │
│   adsRemaining.value = data.adsRemaining                   │
│   connected.value = data.connected                         │
│   // Update Vue state → re-render                          │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 10. DASHBOARD RENDERED                                     │
├─────────────────────────────────────────────────────────────┤
│ Shows user: Stanslaus Emmanuel                             │
│ Time: 1 saa 32 dakika                                      │
│ Free Data: 10 MB (purple)                                  │
│ Paid Data: Unlimited (orange)                              │
│ Ads Left: 6                                                │
│ Status: ✅ Connected                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## ❌ Error Scenarios

### Scenario A: User NOT on WiFi

```
┌─────────────────────────────────────────────────────────────┐
│ User NOT connected to HotBando WiFi                        │
├─────────────────────────────────────────────────────────────┤
│ req.session.onWifi = false (from login)                    │
│ req.session.hotbando_user?.last_router_id = 'HB-D5A30DD' │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ requireWifi middleware checks router status:                │
│ SELECT router_id, status FROM mikrotiks WHERE ...           │
│ → Router not found OR is_active = 0                        │
├─────────────────────────────────────────────────────────────┤
│ req.session.onWifi remains false                           │
│ Return: 403 {                                               │
│   error: 'Please connect to HotBando WiFi first.',         │
│   onWifi: false                                             │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Frontend catch block:                                       │
│ if (e.response?.status === 403) {                          │
│   loadError.value =                                         │
│     'Tafadhali unganisha kwenye WiFi ya HotBando.'        │
│ }                                                           │
├─────────────────────────────────────────────────────────────┤
│ User sees: Clear message to connect to WiFi               │
└─────────────────────────────────────────────────────────────┘
```

### Scenario B: Session Expired

```
┌─────────────────────────────────────────────────────────────┐
│ User session cookie: hotbando.sid=xxx                      │
│ But session > 24 hours old (expired)                       │
├─────────────────────────────────────────────────────────────┤
│ MySQL session store clears expired sessions every 15 min   │
│ When request comes in, session not found                   │
│ req.session.hotbando_user = undefined                      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Dashboard endpoint checks:                                  │
│ if (!req.session.hotbando_user) {                          │
│   return 401 { error: 'Umelazimika kuingia...' }           │
│ }                                                           │
├─────────────────────────────────────────────────────────────┤
│ Returns: 401 Unauthorized                                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Frontend catch block:                                       │
│ if (e.response?.status === 401) {                          │
│   loadError.value =                                         │
│     'Muda wa kulogeza umemalizika...'                      │
│   setTimeout(() => router.push('/login'), 2000)            │
│ }                                                           │
├─────────────────────────────────────────────────────────────┤
│ User sees: Message that session expired                    │
│ User is: Auto-redirected to login after 2 seconds          │
└─────────────────────────────────────────────────────────────┘
```

### Scenario C: Router Offline

```
┌─────────────────────────────────────────────────────────────┐
│ User was on WiFi, but router went offline                  │
│ req.session.onWifi = true (from earlier login)             │
│ req.session.last_router_id = 'HB-D5A30DD733CD'            │
├─────────────────────────────────────────────────────────────┤
│ Router is now: OFFLINE (14,623+ minutes stale)             │
│ But session still thinks user is on it                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ requireWifi middleware checks router:                       │
│ SELECT router_id, status FROM mikrotiks WHERE ...           │
│ → Found! But status = 'offline'                            │
│                                                             │
│ if (router.status === 'online') {                          │
│   req.session.onWifi = true                                │
│ } else {                                                    │
│   return 503 { error: 'Router offline' }                   │
│ }                                                           │
├─────────────────────────────────────────────────────────────┤
│ Returns: 503 Service Unavailable                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Frontend catch block:                                       │
│ if (e.response?.status === 503) {                          │
│   loadError.value =                                         │
│     'Router iko offline. Tafadhali jaribu baadaye.'        │
│ }                                                           │
├─────────────────────────────────────────────────────────────┤
│ User sees: Clear message router is offline                 │
│ User knows: To try again later (not their problem)         │
└─────────────────────────────────────────────────────────────┘
```

### Scenario D: Timeout (API takes > 8 seconds)

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend sends: GET /api/hotspot/dashboard                 │
│ With timeout: 8000 milliseconds                            │
├─────────────────────────────────────────────────────────────┤
│ Backend is slow:                                            │
│ Database query for user data takes 9 seconds               │
│ OR network is very slow                                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Frontend times out after 8 seconds:                         │
│ Error: AbortError or ECONNABORTED                           │
├─────────────────────────────────────────────────────────────┤
│ catch (e) {                                                 │
│   if (e.code === 'ECONNABORTED' ||                         │
│       e.message?.includes('timeout')) {                     │
│     loadError.value =                                       │
│       'Ombi linachukua muda mrefu...'                      │
│   }                                                         │
│ }                                                           │
├─────────────────────────────────────────────────────────────┤
│ User sees: Message that request is taking too long          │
│ Suggestion: Check WiFi connection                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Session Store Architecture

### Current (MySQL):
```
Browser sends:    Cookie: hotbando.sid=abc123
                       ↓
            Express-session middleware
                       ↓
        MySQL sessions table (slow)
        ┌──────────────────────────┐
        │ sid: abc123              │
        │ data: {...user data...}  │
        │ expires: 2026-11-05...   │
        └──────────────────────────┘
                       ↓
              User object loaded ✓
```

### Recommended (Redis):
```
Browser sends:    Cookie: hotbando.sid=abc123
                       ↓
            Express-session middleware
                       ↓
         Redis cache (very fast)
         abc123 → {...user data...}
                       ↓
              User object loaded ✓✓ (faster)
```

---

## 🔐 Security Checklist

- ✅ Session ID regenerated on login (prevents fixation attacks)
- ✅ Session stored server-side (not in cookie)
- ✅ HttpOnly cookie (JavaScript can't access)
- ✅ SameSite: lax (CSRF protection)
- ✅ Secure cookie in production (HTTPS only)
- ✅ Session expires after 24 hours
- ✅ onWifi flag prevents unauthorized access
- ✅ Router status checked before allowing access

---

## 📈 Performance Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Login to dashboard | 2-3 seconds | ✅ Good |
| Dashboard load | 1-2 seconds | ✅ Good |
| API timeout | 8 seconds | ✅ Reasonable |
| Session lookup | < 100ms (MySQL) | ⚠️ Could be faster |
| | < 10ms (Redis) | ✅ Recommended |

---

## 🎯 Summary

HotBando uses a **session-based authentication** system:

1. **Login** → Session created with user data
2. **API Calls** → Browser sends session cookie
3. **Validation** → Backend loads session, checks WiFi
4. **Access Control** → Returns 403 if not on WiFi, 401 if expired
5. **Error Messages** → Frontend shows specific error based on status code

The new fixes ensure users get **clear, actionable error messages** instead of generic "failed to load information" messages.

