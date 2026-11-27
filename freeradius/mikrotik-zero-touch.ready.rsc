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
# Replace <REGISTRATION_SECRET> with the current ROUTER_REGISTRATION_SECRET.
# Safer: use Admin Portal -> Routers -> Site Setup, which generates this script
# with the server's current secret and never stores it in the repository.
:global hotbandoSecret "<REGISTRATION_SECRET>"
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
# Registration always stays PENDING: auto_connect is never sent. Only an
# authenticated owner action in the panel can approve/connect the router.
:global hbRegUrl ($hotbandoBaseUrl . "/api/zero-touch/register?secret=" . $hotbandoSecret . "&serial=" . $hbSerial)

# Remove any stale copy before fetching so an old/failed download is never imported.
:do { /file remove [find name="hotbando-provision.rsc"] } on-error={}

/tool fetch url=$hbRegUrl dst-path="hotbando-provision.rsc" mode=https output=none check-certificate=yes
:delay 2

:if ([:len [/file find name="hotbando-provision.rsc"]] = 0) do={
    :put "ERROR: could not download provisioning script!"
    :put "Check internet on the router, server IP/port, and secret."
    :error "HotBando phone-home failed"
}

:local hbFileSize 0
:do { :set hbFileSize [/file get [/file find name="hotbando-provision.rsc"] size] } on-error={}
:if ($hbFileSize < 100) do={
    :do { /file remove [find name="hotbando-provision.rsc"] } on-error={}
    :put "ERROR: downloaded provisioning script is invalid (too small)."
    :error "HotBando phone-home failed"
}

# ---------------------------------------------------------------------------
# 2. Apply the downloaded config (PENDING wait-and-poll script)
# ---------------------------------------------------------------------------
:put "Applying HotBando configuration..."
/import file-name="hotbando-provision.rsc"

:put "============================================="
:put "HotBando setup complete! Router is ONLINE."
:put "WireGuard tunnel is active and Hotspot is ready to serve clients."
:put "============================================="
