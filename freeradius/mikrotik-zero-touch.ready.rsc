# ============================================================================
# HotBando Zero-Touch Router Bootstrap — ONE-TIME import (layman friendly)
# ============================================================================
# Run this once on a FRESH MikroTik (WebFig http://192.168.88.1 > Terminal,
# or WinBox Terminal > paste). The router will then configure ITSELF:
#   1. Phone home to the HotBando server (single GET, no JSON quoting)
#   2. Appear as PENDING in the admin panel (Fleet tab)
#   3. After the owner clicks CONNECT, pull + apply its full config
#      (WG tunnel, hotspot, RADIUS, SSID) automatically
#   4. Check in hourly with the server
#
# Once online, the router is managed over the WireGuard tunnel from ANYWHERE
# in Tanzania — no need to be on the same LAN.
#
# Server values (already filled — do NOT change unless the server moves):
#   hotbandowifi.online — HotBando public portal (HTTPS on port 443)
# ============================================================================

:global hotbandoBaseUrl "https://hotbandowifi.online"
:global hotbandoSecret "d5c45011dbdf3936688cc316ce6f5e00e66102d52736378a"
:global hbSerial [/system routerboard get serial-number]
:global hbIdentity [/system identity get name]
:global hbModel [/system resource get board-name]
:global hbFirmware [/system resource get version]

:put "============================================="
:put "HotBando Zero-Touch Setup"
:put ("Serial: " . $hbSerial)
:put "============================================="

# ---------------------------------------------------------------------------
# 1. Phone home (GET with query params — robust, no JSON quoting needed)
# ---------------------------------------------------------------------------
:global hbRegUrl ($hotbandoBaseUrl . "/api/zero-touch/register?secret=" . $hotbandoSecret . "&serial=" . $hbSerial)

/tool fetch url=$hbRegUrl dst-path="hotbando-provision.rsc" mode=https output=none
:delay 2

:if ([:len [/file find name="hotbando-provision.rsc"]] = 0) do={
    :put "ERROR: could not download provisioning script!"
    :put "Check internet on the router, server IP/port, and secret."
    :error "HotBando phone-home failed"
}

# ---------------------------------------------------------------------------
# 2. Apply the downloaded config (PENDING wait-and-poll script)
# ---------------------------------------------------------------------------
:put "Applying HotBando configuration..."
/import file-name="hotbando-provision.rsc"

:put "============================================="
:put "HotBando setup complete. Router is PENDING."
:put "Owner: open the admin panel > Fleet > Connect."
:put "Configurable from anywhere via the server."
:put "============================================="
