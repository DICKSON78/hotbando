# ============================================================================
# HotBando Zero-Touch Router Bootstrap — ONE-TIME import (layman friendly)
# ============================================================================
# Run this once on a FRESH MikroTik (WinBox Terminal > paste, or /import).
# The router will then configure ITSELF:
#   1. Detect WAN + hotspot interfaces automatically
#   2. Phone home to the HotBando server
#   3. Download and apply its complete config (WG tunnel, hotspot, RADIUS, SSID)
#   4. Check in hourly with the server
#
# Once online, the router is managed over the WireGuard tunnel from ANYWHERE
# in Tanzania — no need to be on the same LAN.
#
# Set these three values before importing:
#   <SERVER_IP>     — HotBando server public IP (e.g. 34.35.81.196)
#   <SERVER_PORT>   — HotBando app port (3000)
#   <REGISTRATION_SECRET> — router registration secret (from server .env
#                           ROUTER_REGISTRATION_SECRET)
# ============================================================================

:global hotbandoServer "<SERVER_IP>"
:global hotbandoPort "<SERVER_PORT>"
:global hotbandoSecret "<REGISTRATION_SECRET>"
:global hbSerial [/system routerboard get serial-number]
:global hbIdentity [/system identity get name]
:global hbModel [/system resource get board-name]
:global hbFirmware [/system resource get version]

:put "============================================="
:put "HotBando Zero-Touch Setup"
:put "Serial: $hbSerial"
:put "Phone home: http://$hotbandoServer:$hotbandoPort/api/zero-touch/register"
:put "============================================="

# ---------------------------------------------------------------------------
# 1. Phone home & save the generated config script
# ---------------------------------------------------------------------------
/tool fetch url=("http://" . $hotbandoServer . ":" . $hotbandoPort . "/api/zero-touch/register") \
    http-method=post \
    http-content-type="application/json" \
    http-data="{\"serial\":\"$hbSerial\",\"identity\":\"$hbIdentity\",\"model\":\"$hbModel\",\"firmware\":\"$hbFirmware\",\"secret\":\"$hotbandoSecret\"}" \
    dst-path="hotbando-provision.rsc" \
    mode=http \
    output=none

:if ([:len [/file find name="hotbando-provision.rsc"]] = 0) do={
    :put "ERROR: could not download provisioning script!"
    :put "Check server IP/port, firewall (TCP 3000), and secret."
    :error "HotBando phone-home failed"
}

# ---------------------------------------------------------------------------
# 2. Apply the downloaded config
# ---------------------------------------------------------------------------
:put "Applying HotBando configuration..."
/import file-name="hotbando-provision.rsc"

:put "============================================="
:put "HotBando setup complete. Router is online."
:put "Configurable from anywhere via the server."
:put "============================================="