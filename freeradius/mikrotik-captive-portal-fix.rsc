# ============================================================================
# HotBando Captive Portal Repair Script
# ============================================================================
# Use this on a MikroTik that is already running HotBando but has stopped
# showing the captive portal (clients connect and get internet immediately).
#
# Paste into WinBox Terminal (or SSH) after replacing the 4 placeholders:
#   <ROUTER_ID>       router id shown in HotBando admin (e.g. HB-D5A30DD733CD)
#   <HOTBANDO_HOST>   portal hostname, e.g. hotbandowifi.online
#   <HOTBANDO_IP>     portal server IP,  e.g. 67.205.179.122
#   <RADIUS_SECRET>   the RADIUS_SECRET from the server .env
#
# The hotspot interface, gateway IP and subnet are detected automatically,
# so this works whether the router uses 10.5.50.1 or 10.20.30.1.
#
# This is idempotent: it is safe to run more than once.
# ============================================================================

# ----------------------------------------------------------------------------
# 0. Detect the hotspot interface and gateway IP
# ----------------------------------------------------------------------------
:local hsIface ""
:local hsIp ""
:local hsProfile ""

:foreach h in=[/ip hotspot find] do={
  :set hsIface [/ip hotspot get $h interface]
  :set hsProfile [/ip hotspot get $h profile]
  :do { /ip hotspot enable $h } on-error={}
}

:if ([:len $hsIface] > 0) do={
  :foreach a in=[/ip address find interface=$hsIface] do={
    :local addr [/ip address get $a address]
    :set hsIp [:pick $addr 0 [:find $addr "/"]]
  }
}
:if ([:len $hsIp] = 0) do={ :set hsIp "10.5.50.1" }

:put ("HotBando repair: interface = " . $hsIface . ", gateway = " . $hsIp)

# Never hand out a free trial period: that lets clients browse without login.
:if ([:len $hsProfile] > 0) do={
  :do { /ip hotspot profile set [find name=$hsProfile] trial-uptime=0s hotspot-address=$hsIp } on-error={}
}

# ----------------------------------------------------------------------------
# 1. Stop whitelisting the OS captive-portal probes.
#    If the phone's probe succeeds, the OS thinks it is online and never
#    opens the captive portal.
# ----------------------------------------------------------------------------
:foreach r in=[/ip hotspot walled-garden find] do={
  :local dh [/ip hotspot walled-garden get $r dst-host]
  :if ($dh = "connectivitycheck.gstatic.com" || $dh = "connectivitycheck.android.com" || \
       $dh = "captive.apple.com" || $dh = "msftconnecttest.com" || \
       $dh = "www.msftconnecttest.com" || $dh = "msftncsi.com" || \
       $dh = "www.msftncsi.com" || $dh = "www.google.com" || \
       $dh = "generate_204" || $dh = "detectportal.firefox.com" || \
       $dh = "nmcheck.gnome.org") do={
    /ip hotspot walled-garden remove $r
  }
}

# Allow the portal itself before login (hostname, www alias, bare IP).
:if ([:len [/ip hotspot walled-garden find dst-host="<HOTBANDO_HOST>"]] = 0) do={
  /ip hotspot walled-garden add action=allow dst-host="<HOTBANDO_HOST>" comment="HotBando portal"
}
:if ([:len [/ip hotspot walled-garden find dst-host="www.<HOTBANDO_HOST>"]] = 0) do={
  /ip hotspot walled-garden add action=allow dst-host="www.<HOTBANDO_HOST>" comment="HotBando portal"
}
:if ([:len [/ip hotspot walled-garden find dst-address="<HOTBANDO_IP>"]] = 0) do={
  /ip hotspot walled-garden add action=allow dst-address=<HOTBANDO_IP> comment="HotBando portal IP"
}
:if ([:len [/ip hotspot walled-garden find dst-port=53]] = 0) do={
  /ip hotspot walled-garden add action=allow dst-port=53 comment="HotBando DNS"
}

# ----------------------------------------------------------------------------
# 2. Resolve probe names to the hotspot gateway and hand the router out as DNS
# ----------------------------------------------------------------------------
/ip dns set allow-remote-requests=yes
/ip dns static remove [find comment="HotBando captive"]
/ip dns static add name="connectivitycheck.gstatic.com" address=$hsIp ttl=1m comment="HotBando captive"
/ip dns static add name="connectivitycheck.android.com" address=$hsIp ttl=1m comment="HotBando captive"
/ip dns static add name="captive.apple.com" address=$hsIp ttl=1m comment="HotBando captive"
/ip dns static add name="msftconnecttest.com" address=$hsIp ttl=1m comment="HotBando captive"
/ip dns static add name="www.msftconnecttest.com" address=$hsIp ttl=1m comment="HotBando captive"
/ip dns static add name="msftncsi.com" address=$hsIp ttl=1m comment="HotBando captive"
/ip dns static add name="www.msftncsi.com" address=$hsIp ttl=1m comment="HotBando captive"
/ip dns static add name="detectportal.firefox.com" address=$hsIp ttl=1m comment="HotBando captive"
/ip dns static add name="nmcheck.gnome.org" address=$hsIp ttl=1m comment="HotBando captive"

# Point every DHCP network on the hotspot gateway at the router as DNS.
:foreach n in=[/ip dhcp-server network find] do={
  :if ([/ip dhcp-server network get $n gateway] = $hsIp) do={
    /ip dhcp-server network set $n dns-server=$hsIp
  }
}

# ----------------------------------------------------------------------------
# 3. Remove the old WAN->hotspot dstnat hijacks, force client DNS to the router
# ----------------------------------------------------------------------------
/ip firewall nat remove [find comment="HotBando http"]
/ip firewall nat remove [find comment="HotBando https"]
/ip firewall nat remove [find comment="HTTP redirect to hotspot"]
/ip firewall nat remove [find comment="HTTPS redirect to hotspot"]
/ip firewall nat remove [find comment="HotBando dns"]
/ip firewall nat add chain=dstnat protocol=udp dst-port=53 in-interface=$hsIface action=redirect to-ports=53 comment="HotBando dns"
/ip firewall nat add chain=dstnat protocol=tcp dst-port=53 in-interface=$hsIface action=redirect to-ports=53 comment="HotBando dns"

:if ([:len [/ip firewall nat find chain=srcnat action=masquerade]] = 0) do={
  /ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade comment="HotBando masquerade"
}

# ----------------------------------------------------------------------------
# 4. Make sure the radios are inside the hotspot bridge (wlan* and wifi*)
# ----------------------------------------------------------------------------
:if ([:len [/interface bridge find name=$hsIface]] > 0) do={
  :do {
    :foreach w in=[/interface wireless find] do={
      :if ([:len [/interface bridge port find interface=$w bridge=$hsIface]] = 0) do={
        :do { /interface bridge port add bridge=$hsIface interface=$w } on-error={}
      }
    }
  } on-error={}
  :do {
    :foreach w in=[/interface wifi find] do={
      :if ([:len [/interface bridge port find interface=$w bridge=$hsIface]] = 0) do={
        :do { /interface bridge port add bridge=$hsIface interface=$w } on-error={}
      }
    }
  } on-error={}
}

# ----------------------------------------------------------------------------
# 5. Re-apply the RADIUS secret (a stale secret silently rejects every login)
# ----------------------------------------------------------------------------
:if ([:len [/radius find service=hotspot]] = 0) do={
  /radius add service=hotspot address=<HOTBANDO_IP> secret="<RADIUS_SECRET>" \
    authentication-port=1812 accounting-port=1813 timeout=3000ms src-address=0.0.0.0 \
    comment="HotBando FreeRADIUS"
} else={
  /radius set [find service=hotspot] address=<HOTBANDO_IP> secret="<RADIUS_SECRET>" \
    authentication-port=1812 accounting-port=1813 timeout=3000ms src-address=0.0.0.0
}

# ----------------------------------------------------------------------------
# 6. Re-enable the hotspot and restore the redirect page
# ----------------------------------------------------------------------------
/system scheduler remove [find name="hotbando-watchdog"]
/system scheduler add name="hotbando-watchdog" interval=5m on-event={/ip hotspot set [find name=hotbando-server] disabled=no} comment="HotBando watchdog"

:do { /file remove hotspot/login.html } on-error={}
:local portalUrl "https://<HOTBANDO_HOST>/hotspot?router_id=<ROUTER_ID>&mac=\$(mac)&ip=\$(ip)"
:local loginHtml "<!-- HotBando -->\n<html>\n<head>\n<meta charset='utf-8'>\n<meta name='viewport' content='width=device-width,initial-scale=1'>\n<meta http-equiv='refresh' content='0;url=$portalUrl'>\n<title>HotBando WiFi</title>\n</head>\n<body style='margin:0;font-family:system-ui,Arial,sans-serif;background:#0b0b12;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh'>\n<div style='text-align:center;padding:24px;max-width:340px'>\n<h2 style='margin:0 0 8px'>HotBando WiFi</h2>\n<p style='color:#9ca3af;margin:0 0 18px'>Opening the login page...</p>\n<a href='$portalUrl' style='display:inline-block;background:#FF7A30;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700'>Open HotBando</a>\n</div>\n</body>\n</html>\n"
/file add name="hotspot/login.html" contents=$loginHtml

:put "============================================="
:put "HotBando captive portal repair applied."
:put "Disconnect/reconnect a phone and open a browser."
:put "============================================="
