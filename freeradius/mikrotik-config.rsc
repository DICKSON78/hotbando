# HotBando MikroTik Router RADIUS Configuration
# ============================================================================
# Run these commands on each MikroTik router via WinBox/WebFig/SSH
#
# This configures the router to use FreeRADIUS for hotspot authentication
# instead of the local user database. The router sends the username (phone number)
# and password to FreeRADIUS, which checks against the HotBando DB.
# ============================================================================

# --- 1. Add RADIUS server ---------------------------------------------------
# Replace <freeradius-ip> and <radius-secret> with actual values
# The secret must match the RADIUS_SECRET env on your FreeRADIUS server
/radius add \
    address=<freeradius-ip> \
    secret=<radius-secret> \
    service=hotspot \
    authentication-port=1812 \
    accounting-port=1813 \
    timeout=3000ms \
    src-address=0.0.0.0

# --- 2. Enable RADIUS incoming ----------------------------------------------
/radius incoming set accept=yes port=1700

# --- 3. Configure hotspot to use RADIUS -------------------------------------
# Find your hotspot server profile
/ip hotspot profile set [find] \
    use-radius=yes \
    radius-accounting=yes \
    radius-interim-update=30s \
    radius-mac-format=XX:XX:XX:XX:XX:XX

# --- 4. (Optional) Remove local hotspot users -------------------------------
# If you want all auth to go through RADIUS
# /ip hotspot user remove [find]

# --- 5. Verify configuration ------------------------------------------------
/radius print
/ip hotspot print

# --- 6. Test (from a client device) -----------------------------------------
# Connect to the hotspot WiFi, open a browser, and enter:
#   Username: 0712345678
#   Password: <user's password>
#
# If RADIUS is working, the user authenticates against the HotBando DB.
# If RADIUS is down, fallback: (none — users will fail to authenticate).
