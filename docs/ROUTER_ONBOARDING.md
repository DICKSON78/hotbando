# Connecting a Fresh MikroTik Router via the Admin Portal

This guide walks a developer through connecting a **fresh, out-of-the-box MikroTik
router** to the HotBando platform using the **Admin Portal** (no manual RouterOS
typing beyond importing one bootstrap script).

The platform talks to each router over the **RouterOS API (port 8728)** for
management and live status, and the router talks to the central **FreeRADIUS**
server (UDP 1812/1813) for hotspot authentication and accounting.

```
   Admin Portal ──(API 8728)──▶ MikroTik Router ──(RADIUS 1812/1813 UDP)──▶ HotBando VPS
   (hotbando VPS)  ◀──────────┘        │  ◀──────────────────────────────┘  (FreeRADIUS)
        │                              └── WiFi clients connect here (captive portal)
```

## Prerequisites

1. **A running HotBando instance** (see [DEPLOYMENT.md](./DEPLOYMENT.md)) with a
   public IP or domain that the router can reach — e.g. `hotbando.example.com` or `196.192.x.x`.
2. **RADIUS is enabled** and the shared `RADIUS_SECRET` is set in `.env`:
   ```ini
   RADIUS_ENABLED=true
   RADIUS_SECRET=<your-32-char-secret>
   ```
3. The router is **powered and connected to the internet** (WAN), and has a fresh
   RouterOS install (factory defaults are fine — the bootstrap script cleans up).
4. **RouterOS API is reachable** from the HotBando server. Two common options:
   - The router has a public IP, **or**
   - The router is inside the **WireGuard** network (`10.7.0.0/24`) — the Admin
     Portal's *WireGuard Setup* tab generates the router-side config for you.
   - You can confirm reachability from the VPS with:
     ```bash
     nc -zv <router-ip> 8728
     ```

## Step 1 — Log in to the Admin Portal

Open `http://<your-host>/admin/login` and log in with an admin account.

## Step 2 — Add the router

1. Go to **Routers** (`/admin/routers`).
2. Click **Ongeza Router** (Add Router).
3. Fill in the form:
   | Field          | Example           | Notes                                              |
   |----------------|-------------------|----------------------------------------------------|
   | Router ID      | `RT-001`          | Unique, short ID                                   |
   | Jina la Router | `UDSM Main Router`| Human-readable name                                |
   | Host/IP        | `10.7.0.10`       | IP reachable from the HotBando server              |
   | Port           | `8728`            | RouterOS API port (8728 plain, 8729 TLS)           |
   | Username       | `admin`           | RouterOS user with full access                     |
   | Password       | `••••••••`        | RouterOS password                                  |
   | Eneo           | *(select)*        | Optional location (creates one if missing)         |
   | SSID           | `HotBando-UDSM`   | Optional WiFi name                                 |
4. Click **Hifadhi Router** (Save Router). The router is now stored in the
   database with status `offline` until the router-side config is applied.

> The portal also has a **Diagnostics** tab — after step 4 you can use *Ping* and
> *API Test* here to confirm the server can reach the router over port 8728.

## Step 3 — Configure the router (import the bootstrap script)

The full hotspot + RADIUS configuration lives in one script:

**`freeradius/mikrotik-hotbando-bootstrap.rsc`**

1. Copy the script from the repo (or download the raw file from GitHub).
2. Replace these placeholders:
   - `<HOTBANDO_SERVER_IP>` → your HotBando public IP **or domain**
   - `<RADIUS_SECRET>` → the same `RADIUS_SECRET` from `.env`
   - `<WAN_INTERFACE>` → the interface facing your modem (hAP: `ether1`)
   - `<HOTSPOT_INTERFACE>` → the client-facing interface (hAP: `bridge1`)
   - `<HOTSPOT_IP>` → hotspot gateway IP (default `10.5.50.1`)
   - `<HOTSPOT_NET>` → hotspot subnet (default `10.5.50.0/24`)
   - `<HOTSPOT_DNS>` → DNS server (default `8.8.8.8`)
3. Set the **WiFi SSID + WPA2 security** separately in WinBox:
   `Wireless → wlan1 → SSID + Security Profile`.
4. Import the script:
   - **WinBox:** drag the file onto the router, then in the **Terminal** run:
     ```
     /import file-name=mikrotik-hotbando-bootstrap.rsc
     ```
   - **SSH/CLI:**
     ```
     /tool fetch url="https://raw.githubusercontent.com/<org>/hotbando/main/freeradius/mikrotik-hotbando-bootstrap.rsc" dst-path=mikrotik-hotbando-bootstrap.rsc
     /import file-name=mikrotik-hotbando-bootstrap.rsc
     ```

The script performs a clean setup: removes leftover IPs/DHCP, creates the
hotspot gateway + DHCP pool, captive-portal DNS, NAT redirect, the hotspot
server with `use-radius=yes`, registers the FreeRADIUS server, and installs a
watchdog scheduler.

## Step 4 — Verify RADIUS on the router

On the router (Terminal):

```
/radius print
```

You should see one entry with:
- `Service: hotspot`
- `Address: <HOTBANDO_SERVER_IP>`
- `Authentication-Port: 1812`, `Accounting-Port: 1813`

Also confirm the router can reach the RADIUS server:

```
/ping address=<HOTBANDO_SERVER_IP> count=3
```

> **Firewall note:** the VPS must allow incoming **UDP 1812/1813** (FreeRADIUS)
> and the server→router **TCP 8728** (RouterOS API). See
> [DEPLOYMENT.md](./DEPLOYMENT.md) for the exact firewall rules.

## Step 5 — Confirm the router is online in the portal

Back in the Admin Portal **Routers** page, click **Refresh**. The router card
should flip from `OFFLINE` to `ONLINE`. Open **Details** to see live CPU,
memory, uptime, active users, and revenue.

## Step 6 — End-to-end test

1. Connect a phone/laptop to the router's WiFi.
2. The device is redirected to the captive portal
   `http://<HOTBANDO_SERVER_IP>:3000/hotspot` (the bootstrap script installs a
   `login.html` that redirects unauthenticated clients to the HotBando portal).
3. Register / redeem a voucher in the portal.
4. The RADIUS + mac-auth flow grants access — verify the session appears under
   **Router Details → Watumiaji wa Sasa** (Active Users).

## Troubleshooting

| Symptom                              | Check                                                        |
|--------------------------------------|--------------------------------------------------------------|
| Router stays `OFFLINE`               | Server can't reach `router-ip:8728`. Ping/API-test in Diagnostics; check WireGuard. |
| Clients stuck on "obtaining IP"      | Old default DHCP (192.168.88.x) left behind → re-import bootstrap script on the hotspot interface. |
| No captive-portal redirect           | NAT dst-nat rules + walled garden must exist; check `/ip firewall nat print`. |
| RADIUS "Access-Reject"               | Router secret ≠ `RADIUS_SECRET` in `.env`; check `/radius print`. |
| No accounting in portal              | VPS must accept UDP 1813; check `docker compose logs freeradius`. |
| Router not visible after import      | Router ID / Host in the portal must match what the router reports (identity is not auto-linked). |

## Related scripts

- `freeradius/mikrotik-hotbando-bootstrap.rsc` — full hotspot + RADIUS bootstrap (this guide).
- `freeradius/mikrotik-config.rsc` — lighter hotspot-only config for routers
  that are already network-ready.
- `freeradius/mikrotik-auto-register.rsc` — optional hourly heartbeat/registration
  script (requires a `/api/routers/register` endpoint on the server).
