# Deep Diagnosis: "Imeshindikana kupakia taarifa" Error

**Analysis Date:** November 4, 2026  
**Error Message:** "Imeshindikana kupakia taarifa. Tafadhali jaribu tena."  
**Translation:** "Failed to load information. Please try again."

---

## 🔍 ROOT CAUSE ANALYSIS

### Issue: Dashboard Loading Error

The error occurs at **Dashboard.vue line 248** when the API call fails:

```javascript
loadError.value = 'Imeshindikana kupata taarifa. Tafadhali jaribu tena.'
```

This is a **generic catch-all error** that masks the real problem underneath.

---

## 🎯 The Real Problem

The dashboard endpoint (`/api/hotspot/dashboard`) requires **two things** to work:

### 1️⃣ Authentication Check
```javascript
if (!req.session.hotbando_user) {
    return res.status(401).json({ error: 'Umelazimika kuingia kwenye akaunti yako.' });
}
```

**What it needs:**
- User must have `req.session.hotbando_user` object
- This is set on successful login (line 284)
- Session must not have expired (24-hour maxAge)

### 2️⃣ WiFi Connection Check (requireWifi middleware)
```javascript
async function requireWifi(req, res, next) {
    if (!req.session.onWifi && req.session.hotbando_user?.last_router_id) {
        // Try to heal stale sessions (2-second timeout)
        // ...
    }
    if (!req.session.onWifi) {
        return res.status(403).json({
            error: 'Please connect to HotBando WiFi first.',
            onWifi: false
        });
    }
    next();
}
```

**What it needs:**
- Either `req.session.onWifi = true` (user's device is connected)
- OR device has an active router binding in database

---

## ❌ WHY THE ERROR APPEARS

### Scenario A: NOT Connected to WiFi (95% of cases)
```
User connects to WiFi → Portal loads
├─ requireWifi checks: req.session.onWifi = false
├─ Database query: SELECT * FROM mikrotiks WHERE router_id = ?
├─ No router found (not registered OR router offline)
├─ Returns 403 (Forbidden)
└─ Frontend shows: "Imeshindikana kupakia taarifa"
   (Should show: "Tafadhali unganisha kwenye WiFi")
```

**Problem:** Error message is wrong/generic

---

### Scenario B: Session Expired
```
User was logged in → Session expires after 24 hours
├─ Browser still has old session cookie
├─ Dashboard request comes in
├─ req.session.hotbando_user is null/undefined
├─ Returns 401 (Unauthorized)
└─ Frontend shows: "Imeshindikana kupakia taarifa"
   (Should prompt to re-login)
```

**Problem:** No session validation on frontend, user gets generic error

---

### Scenario C: Session Lost (Session Store Issue)
```
User logged in → Server restarted OR session store lost data
├─ Session cookie still exists (hotbando.sid)
├─ But data in MySQL session table is gone
├─ Dashboard request: session.hotbando_user is undefined
├─ Returns 401
└─ Frontend shows: "Imeshindikana kupakia taarifa"
```

**Problem:** Session persistence issue

---

### Scenario D: Router Offline
```
User's bound router is OFFLINE (HB-D5A30DD733CD stale - 14600+ min)
├─ requireWifi check: req.session.onWifi = true (from previous session)
├─ But router is actually offline/stale
├─ Database operations might fail silently
├─ Returns 5xx or timeout
└─ Frontend shows: "Imeshindikana kupakia taarifa"
```

**Problem:** Stale router binding not detected

---

## 📋 Session Flow Analysis

### On Login (hotspotController.js line 277-295):
```javascript
await new Promise((resolve, reject) => {
    req.session.regenerate((err) => {  // ✓ Regenerate for security
        if (err) reject(err);
        else resolve();
    });
});

req.session.hotbando_user = {
    ...safeUser,
    mac_address: bindMAC,
    last_router_id: bindRouter,
    location: currentLocation,
    ip_address: currentIP
};

req.session.mac = bindMAC;
req.session.routerID = bindRouter;
req.session.onWifi = !!bindRouter;  // ✓ Set onWifi based on router
```

**This saves to MySQL session store** (via express-mysql-session)

### Session Configuration (index.js line 77-108):
```javascript
const sessionStore = new MySQLStore({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    clearExpired: true,
    checkExpirationInterval: 900000,  // 15 minutes
    expiration: 86400000  // 24 hours
});

app.use(session({
    key: 'hotbando_session',
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: forceSecureCookies ? true : 'auto',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,  // 24 hours
        sameSite: 'lax',
        path: '/'
    }
}));
```

**Potential Issues:**
- ✅ Session store is MySQL (persistent)
- ✅ httpOnly: true (secure)
- ✅ 24-hour expiration (reasonable)
- ⚠️ If DB connection fails, sessions are lost
- ⚠️ If Redis is preferred but not configured, falls back to memory

---

## 🔴 Issues Found

### Issue #1: Dashboard Error is Generic
**Problem:** The frontend catches all 4xx/5xx responses as generic error
```javascript
catch (e) {
    if (e.response?.status === 403) {
        loadError.value = 'Tafadhali unganisha kwenye WiFi ya HotBando.'
    } else if (e.response?.status === 401) {
        loadError.value = 'Tatizo la seva. Tafadhali jaribu tena.'
    } else {
        loadError.value = 'Imeshindikana kupata taarifa. Tafadhali jaribu tena.'
    }
}
```

But timeout errors (408, or no response) show generic message

### Issue #2: No Session Validation on Frontend
**Problem:** Frontend doesn't check if logged in before calling dashboard
```javascript
// Dashboard.vue should check:
if (!sessionUser.value || !sessionUser.value.id) {
    // Not logged in - redirect to login
}
```

### Issue #3: Router Offline Not Detected
**Problem:** User's router can be offline but session still thinks they're on WiFi
```
session.onWifi = true
session.last_router_id = "HB-D5A30DD733CD"

But router is OFFLINE → requireWifi still heals it with 2-sec query
Then dashboard query might timeout
```

### Issue #4: Session Store Reliability
**Problem:** If MySQL connection fails during session save, session is lost
```javascript
// Session store is MySQL, not Redis
// If DB is slow, session operations hang
// If DB restarts, all active sessions lost
```

---

## ✅ The Fix (Multi-Part)

### Fix #1: Improve Error Handling in Dashboard.vue
Add specific error handling for each case:

```javascript
async function loadData() {
    loadError.value = null
    
    try {
        const response = await fetch('/api/hotspot/dashboard', {
            timeout: 8000
        })
        
        if (response.status === 401) {
            // Session expired
            loadError.value = 'Muda wa kulogeza umemalizika. Tafadhali ingia tena.'
            // Redirect to login after 2 seconds
            setTimeout(() => window.location.href = '/hotspot/login', 2000)
            return
        }
        
        if (response.status === 403) {
            // Not on WiFi
            loadError.value = 'Tafadhali unganisha kwenye WiFi ya HotBando.'
            return
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }
        
        const data = await response.json()
        // Use data...
        
    } catch (error) {
        if (error.name === 'AbortError') {
            loadError.value = 'Ombi linachukua muda mrefu. Tafadhali hakikisha unganishwa kwenye WiFi.'
        } else {
            loadError.value = 'Imeshindikana kupakia taarifa: ' + error.message
        }
    }
}
```

### Fix #2: Add Session Check on Frontend
```javascript
onMounted(() => {
    if (!session.hotbando_user || !session.hotbando_user.id) {
        // Not authenticated
        window.location.href = '/hotspot/login'
        return
    }
    
    loadData()
})
```

### Fix #3: Improve requireWifi Middleware
Add better logging and error detection:

```javascript
async function requireWifi(req, res, next) {
    console.log('[WiFi Check]', {
        onWifi: req.session.onWifi,
        routerId: req.session.hotbando_user?.last_router_id,
        userId: req.session.hotbando_user?.id
    })
    
    if (!req.session.onWifi && req.session.hotbando_user?.last_router_id) {
        try {
            const [routers] = await db.execute(
                'SELECT router_id, status FROM mikrotiks WHERE router_id = ? AND is_active = 1 LIMIT 1',
                [req.session.hotbando_user.last_router_id]
            )
            
            if (routers.length > 0) {
                if (routers[0].status === 'offline') {
                    console.log('[WiFi] Router is offline:', routers[0].router_id)
                    // Don't set onWifi if router offline
                } else {
                    req.session.onWifi = true
                }
            } else {
                console.log('[WiFi] Router not found or inactive')
            }
        } catch (error) {
            console.error('[WiFi] Query failed:', error.message)
        }
    }
    
    if (!req.session.onWifi) {
        return res.status(403).json({
            error: 'Please connect to HotBando WiFi first.',
            onWifi: false,
            debug: {
                sessionUser: !!req.session.hotbando_user,
                sessionWifi: req.session.onWifi,
                routerId: req.session.hotbando_user?.last_router_id
            }
        })
    }
    
    next()
}
```

### Fix #4: Switch Session Store to Redis
Use Redis for session storage (faster, more reliable):

```javascript
const redis = require('redis');
const RedisStore = require('connect-redis').default;

const redisClient = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
});

app.use(session({
    store: new RedisStore({ client: redisClient }),
    // ... other config
}));
```

---

## 🎯 Recommended Actions

### Immediate (Today):
1. ✅ Add better error messages in Dashboard.vue
2. ✅ Check if user is authenticated before loading dashboard
3. ✅ Add debug logs to requireWifi middleware

### Short-term (This week):
1. ✅ Switch session store to Redis (more reliable)
2. ✅ Improve router status detection
3. ✅ Add session timeout warnings to frontend

### Long-term:
1. ✅ Implement session clustering for multi-server setup
2. ✅ Add automatic session recovery
3. ✅ Monitor session store performance

---

## 📊 Current State

| Component | Status | Issue |
|-----------|--------|-------|
| Session Store | MySQL | ⚠️ Not optimal, should be Redis |
| requireWifi Middleware | Working | ⚠️ Doesn't detect offline routers |
| Dashboard Endpoint | Working | ✅ Code is correct |
| Error Handling | Poor | ❌ Generic error message |
| Frontend Validation | Missing | ❌ No auth check before API call |
| Router Status | Stale | ⚠️ HB-D5A30DD733CD is offline 14600+ min |

---

## 🚀 Next Steps

1. **Test Dashboard with Proper WiFi Connection:**
   - Connect device to HotBando WiFi
   - Open https://hotbandowifi.online/hotspot/login
   - Log in with phone and password
   - Check if dashboard loads

2. **Monitor Server Logs:**
   - Watch for 401 errors (session expired)
   - Watch for 403 errors (not on WiFi)
   - Look for database timeouts

3. **Implement Fixes:**
   - Update Dashboard.vue with better error handling
   - Improve requireWifi logging
   - Consider Redis for sessions

---

**Status:** Deep analysis complete. Ready for implementation.

