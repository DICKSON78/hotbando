# ============================================================================
# HotBando — RADIUS / MAC-login fix for router HB-D5A30DD733CD
# ============================================================================
# WHY: The router sends RADIUS accounting packets with a stale shared secret.
# FreeRADIUS drops every packet ("Shared secret is incorrect"), so customers
# who paid still cannot get internet. This script re-applies the secret the
# server uses and enables MAC login so a paid device is authorised without
# needing the (currently unreachable) router API.
#
# HOW: Open WinBox -> Terminal on the router, paste this whole file, Enter.
# It is idempotent and safe to run more than once.
# ============================================================================

:local hbServer "67.205.179.122"
:local hbSecret "d75158fa554f26306ea6b4c5b732e0a4743f2cda96d56d7782d1352e95c76cd6"

# 1. Re-apply the shared secret on every RADIUS entry used by the hotspot.
:local radiusIds [/radius find]
:if ([:len $radiusIds] = 0) do={ /radius add service=hotspot address=$hbServer secret=$hbSecret authentication-port=1812 accounting-port=1813 timeout=3000ms comment="HotBando FreeRADIUS" }
:if ([:len $radiusIds] > 0) do={ :foreach r in=$radiusIds do={ :local svc [/radius get $r service]; :if ([:typeof [:find $svc "hotspot"]] != "nil") do={ /radius set $r address=$hbServer secret=$hbSecret authentication-port=1812 accounting-port=1813 timeout=3000ms } } }

# 2. Make every hotspot profile use RADIUS and accept MAC login.
#    MAC login is what lets a paid phone reconnect by itself, even when the
#    HotBando server cannot reach the router API.
:foreach p in=[/ip hotspot profile find] do={ :do { /ip hotspot profile set $p use-radius=yes radius-accounting=yes radius-interim-update=30s } on-error={} }
:foreach p in=[/ip hotspot profile find] do={ :do { /ip hotspot profile set $p login-by=http-pap,http-chap,mac } on-error={} }
:foreach p in=[/ip hotspot profile find] do={ :do { /ip hotspot profile set $p mac-auth-mode=mac-as-username-and-password } on-error={} }

# 3. Optional but recommended: let the HotBando server manage this router over
#    WireGuard (the router's public management ports are closed, which is why
#    the app cannot provision users right now).
:do { /ip service enable api } on-error={}
:do { /ip service set api port=8728 } on-error={}
:do { /ip service set api address="10.7.0.0/24" } on-error={}
:local wgIds [/interface wireguard find]
:if ([:len $wgIds] > 0) do={ :local wgName [/interface wireguard get [:pick $wgIds 0] name]; :if ([:len [/ip firewall filter find comment="HotBando WG management"]] = 0) do={ :do { /ip firewall filter add chain=input in-interface=$wgName protocol=tcp dst-port=8728 action=accept place-before=0 comment="HotBando WG management" } on-error={} } }

# 4. Verification output
:put "============================================="
:put "HotBando RADIUS fix applied."
:put "--- /radius ---"
/radius print
:put "--- /ip hotspot profile ---"
/ip hotspot profile print
:put "--- /ip service ---"
/ip service print
:put "============================================="
:put "Next: on a phone, forget/rejoin the WiFi and open https://hotbandowifi.online"
