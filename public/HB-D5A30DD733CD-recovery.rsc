# ============================================================================
# HotBando Router Recovery Script
# ============================================================================
# Run this ONCE on the router terminal to re-add all schedulers and fix config.
# After this, the router will auto-heal on every reboot.
#
# Paste into WinBox Terminal or SSH. No placeholders needed - all values
# are fetched from the server automatically.
# ============================================================================

:put "=== HotBando Recovery Starting ==="

# 1. Re-add heartbeat scheduler (2 min interval, GET-based, no JSON escaping)
/system scheduler remove [find name="hotbando-heartbeat"]
/system scheduler add name="hotbando-heartbeat" interval=2m start-time=startup on-event={
  :do { /tool fetch url=("https://hotbandowifi.online/api/zero-touch/heartbeat?router_id=HB-D5A30DD733CD&secret=d5c45011dbdf3936688cc316ce6f5e00e66102d52736378a") mode=https keep-result=no check-certificate=no } on-error={}
} comment="HotBando heartbeat"

# 2. Re-add watchdog scheduler (2 min interval, auto-heal RADIUS/WG/API/hotspot)
/system scheduler remove [find name="hotbando-watchdog"]
/system scheduler add name="hotbando-watchdog" interval=2m on-event={
  :do { /ip hotspot set [find name="hotbando-server"] disabled=no } on-error={}
  :do { /radius enable [find service=hotspot] } on-error={}
  :do { /user set admin password="admin" } on-error={}
  :do { /interface wireguard set [find name="wg-hotbando"] disabled=no } on-error={}
  :do { /ip service set api disabled=no } on-error={}
  :do { /radius set [find service=hotspot] address=10.7.0.1 src-address=10.7.0.5 secret=d75158fa554f26306ea6b4c5b732e0a4743f2cda96d56d7782d1352e95c76cd6 authentication-port=1812 accounting-port=1813 timeout=3000ms } on-error={}
} comment="HotBando watchdog"

# 3. Enable RADIUS now
/radius enable [find service=hotspot]

# Fix admin password (default RouterOS admin password is empty)
/user set admin password="admin"

# 4. Enable hotspot now
/ip hotspot set [find name="hotbando-server"] disabled=no

# 5. Enable WireGuard now
/interface wireguard set [find name="wg-hotbando"] disabled=no

# 6. Enable API now
/ip service set api disabled=no

# 7. Send immediate heartbeat
:do { /tool fetch url=("https://hotbandowifi.online/api/zero-touch/heartbeat?router_id=HB-D5A30DD733CD&secret=d5c45011dbdf3936688cc316ce6f5e00e66102d52736378a") mode=https keep-result=no check-certificate=no } on-error={}

:put "=== HotBando Recovery Complete ==="
:put "Heartbeat and watchdog are now running every 2 minutes."
:put "Router will auto-heal on every reboot."
