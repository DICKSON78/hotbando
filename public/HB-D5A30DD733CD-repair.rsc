# ============================================================================
# HotBando Captive Portal Repair Script
# ============================================================================
# Use this on a MikroTik that is already running HotBando but has stopped
# showing the captive portal (clients connect and get internet immediately).
#
# Paste into WinBox Terminal (or SSH) after replacing the 4 placeholders:
#   HB-D5A30DD733CD       router id shown in HotBando admin (e.g. HB-D5A30DD733CD)
#   hotbandowifi.online   portal hostname, e.g. hotbandowifi.online
#   67.205.179.122     portal server IP,  e.g. 67.205.179.122
#   d75158fa554f26306ea6b4c5b732e0a4743f2cda96d56d7782d1352e95c76cd6   the RADIUS_SECRET from the server .env
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
:local hsCidr ""
:local hsProfile ""
:local hsOldIface ""

# Find the existing hotspot server, if any.
:foreach h in=[/ip hotspot find] do={
  :set hsIface [/ip hotspot get $h interface]
  :set hsProfile [/ip hotspot get $h profile]
  :do { /ip hotspot enable $h } on-error={}
}

# A hotspot created on a bridge PORT (e.g. wlan1) is bypassed by the bridge:
# traffic is switched before it reaches the hotspot, so clients get plain
# internet and never see the portal. Move it to the parent bridge.
:if ([:len $hsIface] > 0) do={
  :if ([:len [/interface bridge find name=$hsIface]] = 0) do={
    :foreach p in=[/interface bridge port find interface=$hsIface] do={
      :set hsOldIface $hsIface
      :set hsIface [/interface bridge port get $p bridge]
    }
  }
}

# If there is no hotspot at all, use a bridge that exists on the router.
:if ([:len $hsIface] = 0) do={
  :if ([:len [/interface bridge find name="bridge-hotbando"]] > 0) do={
    :set hsIface "bridge-hotbando"
  } else={
    :foreach b in=[/interface bridge find] do={ :set hsIface [/interface bridge get $b name] }
  }
}

# Read the gateway/subnet from the final hotspot interface.
:if ([:len $hsIface] > 0) do={
  :foreach a in=[/ip address find interface=$hsIface] do={
    :local addr [/ip address get $a address]
    :local slash [:find $addr "/"]
    :set hsIp [:pick $addr 0 $slash]
    :set hsCidr $addr
  }
}

# The address may still live on the old bridge port; move it to the bridge.
:if ([:len $hsIp] = 0) do={
  :if ([:len $hsOldIface] > 0) do={
    :foreach a in=[/ip address find interface=$hsOldIface] do={
      :local addr [/ip address get $a address]
      :local slash [:find $addr "/"]
      :set hsIp [:pick $addr 0 $slash]
      :set hsCidr $addr
      :do { /ip address remove $a } on-error={}
    }
  }
}
:if ([:len $hsIp] = 0) do={ :set hsIp "10.5.50.1" }
:if ([:len $hsCidr] = 0) do={ :set hsCidr "10.5.50.1/24" }

# Make sure the bridge actually carries the gateway address.
:if ([:len $hsIface] > 0) do={
  :if ([:len [/ip address find interface=$hsIface]] = 0) do={
    :do { /ip address add address=$hsCidr interface=$hsIface comment="HotBando hotspot gateway" } on-error={}
  }
}

# Point the hotspot server at the bridge (and create one if it is missing).
:if ([:len [/ip hotspot find]] > 0) do={
  :if ([:len $hsIface] > 0) do={
    :do { /ip hotspot set [find] interface=$hsIface } on-error={}
  }
} else={
  :if ([:len $hsIface] > 0) do={
    :local prof "default"
    :if ([:len [/ip hotspot profile find name="hotbando-profile"]] > 0) do={
      :set prof "hotbando-profile"
    } else={
      :do {
        /ip hotspot profile add name="hotbando-profile" login-by=http-pap,http-chap,mac html-directory=hotspot use-radius=yes radius-accounting=yes radius-interim-update=30s radius-mac-format=XX:XX:XX:XX:XX:XX hotspot-address=$hsIp dns-name="hotspot.hotbando.local" comment="HotBando hotspot profile"
        :set prof "hotbando-profile"
      } on-error={}
    }
    :if ([:len $hsProfile] = 0) do={ :set hsProfile $prof }
    :if ([:len [/ip pool find name="hotbando-pool"]] > 0) do={
      :do { /ip hotspot add name="hotbando-server" interface=$hsIface address-pool=hotbando-pool profile=$prof disabled=no comment="HotBando hotspot server" } on-error={}
    } else={
      :do { /ip hotspot add name="hotbando-server" interface=$hsIface profile=$prof disabled=no comment="HotBando hotspot server" } on-error={}
    }
  }
}

:put ("HotBando repair: interface = " . $hsIface . ", gateway = " . $hsIp . ", subnet = " . $hsCidr)

# Never hand out a free trial period: that lets clients browse without login.
# Property names differ between RouterOS versions, so try both.
:if ([:len $hsProfile] > 0) do={
  :do { /ip hotspot profile set [find name=$hsProfile] use-radius=yes } on-error={}
  :do { /ip hotspot profile set [find name=$hsProfile] html-directory=hotspot } on-error={}
  :do { /ip hotspot profile set [find name=$hsProfile] login-by=http-pap,http-chap,mac } on-error={}
  :do { /ip hotspot profile set [find name=$hsProfile] mac-auth-mode=mac-as-username-and-password } on-error={}
  :do { /ip hotspot profile set [find name=$hsProfile] trial-uptime-limit=0s } on-error={}
  :do { /ip hotspot profile set [find name=$hsProfile] trial-uptime=0s } on-error={}
  :do { /ip hotspot profile set [find name=$hsProfile] hotspot-address=$hsIp } on-error={}
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

# Same for any IP-level rules that whitelisted the probes.
:foreach r in=[/ip hotspot walled-garden ip find] do={
  :local dh [/ip hotspot walled-garden ip get $r dst-host]
  :local c [/ip hotspot walled-garden ip get $r comment]
  :if ($dh = "connectivitycheck.gstatic.com" || $dh = "connectivitycheck.android.com" || \
       $dh = "captive.apple.com" || $dh = "msftconnecttest.com" || \
       $dh = "www.msftconnecttest.com" || $dh = "msftncsi.com" || \
       $dh = "www.msftncsi.com" || $dh = "www.google.com" || \
       $dh = "generate_204" || $dh = "detectportal.firefox.com" || \
       $dh = "nmcheck.gnome.org" || $c = "captive" || $c = "HotBando captive") do={
    /ip hotspot walled-garden ip remove $r
  }
}

# Allow the portal itself before login (hostname, www alias, bare IP).
:if ([:len [/ip hotspot walled-garden find dst-host="hotbandowifi.online"]] = 0) do={
  /ip hotspot walled-garden add action=allow dst-host="hotbandowifi.online" comment="HotBando portal"
}
:if ([:len [/ip hotspot walled-garden find dst-host="www.hotbandowifi.online"]] = 0) do={
  /ip hotspot walled-garden add action=allow dst-host="www.hotbandowifi.online" comment="HotBando portal"
}
# IP-based rules use the separate "ip" submenu with action=accept.
:if ([:len [/ip hotspot walled-garden ip find dst-address="67.205.179.122"]] > 0) do={
  /ip hotspot walled-garden ip remove [find dst-address="67.205.179.122"]
}
/ip hotspot walled-garden ip add action=accept dst-address=67.205.179.122 comment="HotBando portal IP"
:if ([:len [/ip hotspot walled-garden ip find protocol=udp dst-port=53]] = 0) do={
  /ip hotspot walled-garden ip add action=accept protocol=udp dst-port=53 comment="HotBando DNS"
}
:if ([:len [/ip hotspot walled-garden ip find protocol=tcp dst-port=53]] = 0) do={
  /ip hotspot walled-garden ip add action=accept protocol=tcp dst-port=53 comment="HotBando DNS"
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

# Make sure the DHCP server on the hotspot interface is actually serving.
:if ([:len $hsIface] > 0) do={
  :foreach d in=[/ip dhcp-server find interface=$hsIface] do={
    :do { /ip dhcp-server enable $d } on-error={}
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

# DNS from unauthorized clients must reach the router itself.
/ip firewall filter remove [find comment="HotBando DNS"]
:do {
  /ip firewall filter add chain=input protocol=udp dst-port=53 in-interface=$hsIface action=accept place-before=0 comment="HotBando DNS"
  /ip firewall filter add chain=input protocol=tcp dst-port=53 in-interface=$hsIface action=accept place-before=0 comment="HotBando DNS"
} on-error={}

# Re-create masquerade bound to the hotspot subnet. The old script pinned it to
# out-interface=ether1, which breaks on PPPoE/LTE/uplink-on-another-port setups.
/ip firewall nat remove [find comment="HotBando masquerade"]
:if ([:len [/ip firewall nat find chain=srcnat action=masquerade]] = 0) do={
  /ip firewall nat add chain=srcnat src-address=$hsCidr action=masquerade comment="HotBando masquerade"
}

# ----------------------------------------------------------------------------
# 4. Make sure the radios are inside the hotspot bridge (wlan* and wifi*)
# ----------------------------------------------------------------------------
:if ([:len [/interface bridge find name=$hsIface]] > 0) do={
  :do {
    :foreach w in=[/interface wireless find] do={
      :if ([:len [/interface bridge port find interface=$w bridge=$hsIface]] = 0) do={
        :do { /interface bridge port remove [find interface=$w] } on-error={}
        :do { /interface bridge port add bridge=$hsIface interface=$w } on-error={}
      }
    }
  } on-error={}
  :do {
    :foreach w in=[/interface wifi find] do={
      :if ([:len [/interface bridge port find interface=$w bridge=$hsIface]] = 0) do={
        :do { /interface bridge port remove [find interface=$w] } on-error={}
        :do { /interface bridge port add bridge=$hsIface interface=$w } on-error={}
      }
    }
  } on-error={}
}

# ----------------------------------------------------------------------------
# 5. Re-apply the RADIUS secret (a stale secret silently rejects every login)
# ----------------------------------------------------------------------------
:if ([:len [/radius find service=hotspot]] = 0) do={
  /radius add service=hotspot address=67.205.179.122 secret="d75158fa554f26306ea6b4c5b732e0a4743f2cda96d56d7782d1352e95c76cd6" \
    authentication-port=1812 accounting-port=1813 timeout=3000ms src-address=0.0.0.0 \
    comment="HotBando FreeRADIUS"
} else={
  /radius set [find service=hotspot] address=67.205.179.122 secret="d75158fa554f26306ea6b4c5b732e0a4743f2cda96d56d7782d1352e95c76cd6" \
    authentication-port=1812 accounting-port=1813 timeout=3000ms src-address=0.0.0.0
}

# ----------------------------------------------------------------------------
# 6. Re-enable the hotspot and restore the redirect page
# ----------------------------------------------------------------------------
/system scheduler remove [find name="hotbando-watchdog"]
/system scheduler add name="hotbando-watchdog" interval=5m on-event={:do {/ip hotspot enable [find]} on-error={}} comment="HotBando watchdog"

:do { /file remove hotspot/login.html } on-error={}
:local portalUrl "https://hotbandowifi.online/hotspot?router_id=HB-D5A30DD733CD&mac=\$(mac)&ip=\$(ip)"
:local loginHtml "<!-- HotBando -->\n<html>\n<head>\n<meta charset='utf-8'>\n<meta name='viewport' content='width=device-width,initial-scale=1'>\n<meta http-equiv='refresh' content='0;url=$portalUrl'>\n<title>HotBando WiFi</title>\n</head>\n<body style='margin:0;font-family:system-ui,Arial,sans-serif;background:#0b0b12;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh'>\n<div style='text-align:center;padding:24px;max-width:340px'>\n<h2 style='margin:0 0 8px'>HotBando WiFi</h2>\n<p style='color:#9ca3af;margin:0 0 18px'>Opening the login page...</p>\n<a href='$portalUrl' style='display:inline-block;background:#FF7A30;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700'>Open HotBando</a>\n</div>\n</body>\n</html>\n"
/file add name="hotspot/login.html" contents=$loginHtml

:put "============================================="
:put "HotBando captive portal repair applied."
:put "Disconnect/reconnect a phone and open a browser."
:put "============================================="
