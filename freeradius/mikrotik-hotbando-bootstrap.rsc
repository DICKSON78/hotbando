# ============================================================================
# HotBando MikroTik Complete Hotspot Bootstrap Script
# ============================================================================
# Run this script on a FRESH MikroTik router to fully configure it for
# the HotBando WiFi hotspot platform.
#
# Before running, replace the placeholders below:
#   <HOTBANDO_SERVER_IP>   — your HotBando server IP/domain
#   <RADIUS_SECRET>        — shared secret (same as RADIUS_SECRET in .env)
#   <WAN_INTERFACE>        — interface connected to your modem (hAP: ether1)
#   <HOTSPOT_INTERFACE>    — interface clients connect to.
#                            On hAP the wifi is bridged, so use bridge1
#                            (the bridge that already contains wlan1).
#   <HOTSPOT_IP>           — the IP for the hotspot gateway (e.g., 10.5.50.1)
#   <HOTSPOT_NET>          — the subnet (e.g., 10.5.50.0/24)
#   <HOTSPOT_DNS>          — DNS server (e.g., 8.8.8.8)
#   <WIFI_SSID>            — WiFi network name (set separately in WinBox:
#                            Wireless → wlan1 → SSID + Security Profile WPA2)
#
# Usage (WinBox/SSH):
#   /import file-name=mikrotik-hotbando-bootstrap.rsc
# ============================================================================

# ============================================================================
# 0. SYSTEM IDENTITY (set router name for easy identification)
# ============================================================================
/system identity set name="hotbando-router"

# ============================================================================
# 1. NETWORK INTERFACE SETUP
# ============================================================================
# Make sure the hotspot interface exists (hAP: bridge1). Create it if missing.
/interface bridge add name=<HOTSPOT_INTERFACE> disabled=no

# Disable/remove old IPs + DHCP servers on the hotspot interface (clean start).
# A leftover default DHCP server (192.168.88.x) is what makes clients stuck
# on "obtaining IP address".
/ip dhcp-server remove [find interface=<HOTSPOT_INTERFACE>]
/ip address remove [find interface=<HOTSPOT_INTERFACE>]

# Set hotspot gateway IP
/ip address add address=<HOTSPOT_IP>/24 interface=<HOTSPOT_INTERFACE> network=<HOTSPOT_NET> comment="HotBando hotspot gateway"

# ============================================================================
# 2. DHCP SERVER (auto-assign IPs to connected clients)
# ============================================================================
/ip pool remove [find name="hotbando-pool"]
/ip pool add name="hotbando-pool" ranges=<HOTSPOT_NET:100>-<HOTSPOT_NET:200> comment="HotBando client pool"
/ip dhcp-server remove [find name="hotbando-dhcp"]
/ip dhcp-server add name="hotbando-dhcp" interface=<HOTSPOT_INTERFACE> address-pool=hotbando-pool lease-time=1h disabled=no comment="HotBando DHCP"
/ip dhcp-server network remove [find address=<HOTSPOT_NET>/24]
/ip dhcp-server network add address=<HOTSPOT_NET>/24 gateway=<HOTSPOT_IP> dns-server=<HOTSPOT_DNS>

# ============================================================================
# 3. DNS CONFIGURATION
# ============================================================================
# Local DNS for hotspot (required for captive portal redirect)
/ip dns set allow-remote-requests=yes servers=<HOTSPOT_DNS>

# DNS static entries for captive portal detection
/ip dns static add name="hotspot captive portal detect" address=<HOTSPOT_IP> ttl=1m comment="Captive portal detection"
/ip dns static add name="connectivitycheck.gstatic.com" address=<HOTSPOT_IP> ttl=1m comment="Android captive portal"
/ip dns static add name="captive.apple.com" address=<HOTSPOT_IP> ttl=1m comment="Apple captive portal"
/ip dns static add name="msftconnecttest.com" address=<HOTSPOT_IP> ttl=1m comment="Windows captive portal"
/ip dns static add name="msftncsi.com" address=<HOTSPOT_IP> ttl=1m comment="Windows NCSI"

# ============================================================================
# 4. FIREWALL NAT (redirect ALL HTTP/HTTPS to hotspot)
# ============================================================================
/ip firewall nat remove [find comment="HotBando masquerade"]
/ip firewall nat add chain=srcnat out-interface=<WAN_INTERFACE> action=masquerade comment="HotBando masquerade"

# Redirect HTTP to hotspot login
/ip firewall nat add chain=dstnat protocol=tcp dst-port=80 in-interface=<WAN_INTERFACE> action=dst-nat to-addresses=<HOTSPOT_IP> to-ports=80 comment="HTTP redirect to hotspot"

# Redirect HTTPS to hotspot login (note: this will show certificate error)
/ip firewall nat add chain=dstnat protocol=tcp dst-port=443 in-interface=<WAN_INTERFACE> action=dst-nat to-addresses=<HOTSPOT_IP> to-ports=80 comment="HTTPS redirect to hotspot"

# Allow hotspot DNS
/ip firewall filter add chain=input protocol=udp dst-port=53 in-interface=<HOTSPOT_INTERFACE> action=accept comment="Allow hotspot DNS"
/ip firewall filter add chain=input protocol=tcp dst-port=53 in-interface=<HOTSPOT_INTERFACE> action=accept comment="Allow hotspot DNS TCP"

# ============================================================================
# 5. HOTSPOT SERVER CONFIGURATION
# ============================================================================
# Remove existing hotspot servers (clean start)
/ip hotspot remove [find]

# Create hotspot server profile
/ip hotspot profile remove [find name="hotbando-profile"]
/ip hotspot profile add name="hotbando-profile" \
    login-by=http-pap,http-chap \
    html-directory=hotspot \
    use-radius=yes \
    radius-accounting=yes \
    radius-interim-update=30s \
    radius-mac-format=XX:XX:XX:XX:XX:XX \
    mac-auth-mode=as-username-and-password \
    hotspot-address=<HOTSPOT_IP> \
    dns-name="hotspot.hotbando.local" \
    http-proxy=no \
    comment="HotBando hotspot profile"

# Create hotspot server
/ip hotspot remove [find name="hotbando-server"]
/ip hotspot add name="hotbando-server" \
    interface=<HOTSPOT_INTERFACE> \
    address-pool=hotbando-pool \
    profile=hotbando-profile \
    disabled=no \
    comment="HotBando hotspot server"

# ============================================================================
# 6. WALLED GARDEN (allow access to login page before authentication)
# ============================================================================
/ip hotspot walled-garden remove [find]

# Allow access to HotBando server
/ip hotspot walled-garden add action=allow dst-address=<HOTBANDO_SERVER_IP> comment="Allow HotBando server"
/ip hotspot walled-garden add action=allow dst-address=<HOTBANDO_SERVER_IP> dst-port=80,443 comment="Allow HotBando HTTP/HTTPS"

# Allow access to DNS (needed for captive portal detection)
/ip hotspot walled-garden add action=allow dst-port=53 comment="Allow DNS"

# Allow access to local hotspot gateway
/ip hotspot walled-garden add action=allow dst-address=<HOTSPOT_IP> comment="Allow hotspot gateway"

# Allow captive portal detection domains
/ip hotspot walled-garden add action=allow dst-host="connectivitycheck.gstatic.com" comment="Google captive portal"
/ip hotspot walled-garden add action=allow dst-host="captive.apple.com" comment="Apple captive portal"
/ip hotspot walled-garden add action=allow dst-host="msftconnecttest.com" comment="Windows captive portal"
/ip hotspot walled-garden add action=allow dst-host="www.msftconnecttest.com" comment="Windows captive portal"

# ============================================================================
# 7. RADIUS CONFIGURATION
# ============================================================================
# Remove existing RADIUS servers
/radius remove [find]

# Add FreeRADIUS server
/radius add \
    address=<HOTBANDO_SERVER_IP> \
    secret=<RADIUS_SECRET> \
    service=hotspot \
    authentication-port=1812 \
    accounting-port=1813 \
    timeout=3000ms \
    src-address=0.0.0.0 \
    comment="HotBando FreeRADIUS"

# Enable RADIUS incoming (for CoA/DM - disconnect users remotely)
/radius incoming set accept=yes port=1700

# ============================================================================
# 8. HOTSPOT USER PROFILES (rate limiting tiers)
# ============================================================================
/ip hotspot user profile remove [find]

# Free tier (after watching ads)
/ip hotspot user profile add name="hotbando-free" \
    rate-limit="2M/2M 512K/512K 2000/2000" \
    idle-timeout=30m \
    session-time-limit=2h \
    address-list="hotspot-free" \
    transparent-proxy=yes \
    comment="HotBando free tier"

# Paid tier (purchased vouchers)
/ip hotspot user profile add name="hotbando-paid" \
    rate-limit="10M/10M 1M/1M 5000/5000" \
    idle-timeout=1h \
    session-time-limit=24h \
    address-list="hotspot-paid" \
    transparent-proxy=yes \
    comment="HotBando paid tier"

# VIP tier (premium packages)
/ip hotspot user profile add name="hotbando-vip" \
    rate-limit="50M/50M 5M/5M 10000/10000" \
    idle-timeout=2h \
    session-time-limit=168h \
    address-list="hotspot-vip" \
    transparent-proxy=yes \
    comment="HotBando VIP tier"

# ============================================================================
# 9. HOTSPOT USERS (default admin accounts)
# ============================================================================
/ip hotspot user remove [find]

# Admin bypass account (for testing)
/ip hotspot user add name="admin" password="hotbando2024" \
    profile=hotbando-vip \
    server=hotbando-server \
    comment="HotBando admin (bypass)"

# ============================================================================
# 10. IP BINDINGS (bypass rules for admin devices)
# ============================================================================
/ip hotspot ip-binding remove [find]

# Bypass the router itself
/ip hotspot ip-binding add mac-address="00:00:00:00:00:00" type=bypassed comment="Default bypass"

# ============================================================================
# 11. SYSTEM SCHEDULER (auto-restart hotspot if it crashes)
# ============================================================================
/system scheduler remove [find name="hotbando-watchdog"]
/system scheduler add name="hotbando-watchdog" \
    interval=5m \
    on-event={/ip hotspot set [find name=hotbando-server] disabled=no} \
    comment="HotBando hotspot watchdog"

# ============================================================================
# 12. HOTSPOT HTML DIRECTORY (captive portal login page)
# ============================================================================
# MikroTik hotspot needs login.html in the hotspot directory.
# This minimal page redirects every unauthenticated client to the HotBando
# portal, where they register and redeem/pay for a voucher. Once the client's
# MAC is entitled, mac-auth lets them straight through (no portal shown).
# Replace <HOTBANDO_SERVER_IP> below with your server IP or domain.
/ip hotspot profile set hotbando-profile html-directory=hotspot
:delay 1
/file remove hotspot/login.html
:local loginHtml "<!-- HotBando Hotspot -->\n<html>\n<head>\n<meta http-equiv='refresh' content='0;url=http://<HOTBANDO_SERVER_IP>:3000/hotspot'>\n</head>\n<body>HotBando - connecting...</body>\n</html>\n"
/file add name="hotspot/login.html" contents=$loginHtml

# ============================================================================
# 13. LOGGING
# ============================================================================
/system logging add topics=hotspot,!debug action=memory comment="HotBando hotspot log"
/system logging add topics=radius,!debug action=memory comment="HotBando RADIUS log"

# ============================================================================
# 14. FINAL VERIFICATION
# ============================================================================
:put "============================================="
:put "HotBando Hotspot Bootstrap Complete!"
:put "============================================="
:put ""
:put "Hotspot Server: hotbando-server"
:put "Hotspot Profile: hotbando-profile"
:put "RADIUS Server: <HOTBANDO_SERVER_IP>"
:put ""
:put "Test by connecting to WiFi and opening a browser."
:put "You should be redirected to the HotBando login page."
:put ""
:put "============================================="
