# HotBando MikroTik Auto-Registration Script
# ============================================================================
# Paste this on EACH MikroTik router via Terminal/SSH.
# It registers the router with your HotBando server and checks in every hour.
#
# Replace these placeholders:
#   HOTBANDO_SERVER  — your HotBando server IP or domain, e.g. 192.168.1.100
#   SHARED_SECRET    — the RADIUS shared secret from /admin/settings
# ============================================================================

:local hotbandoServer "HOTBANDO_SERVER"
:local sharedSecret "SHARED_SECRET"
:local identity [/system identity get name]
:local publicIp [/ip address get [find interface=ether1] address]
:local model [/system resource get board-name]
:local firmware [/system package get [find name=system] version]

# Step 1: Register with HotBando
:log info "Registering with HotBando server..."
/tool fetch url=("http://$hotbandoServer/api/routers/register") \
    http-method=post \
    http-content-type="application/json" \
    http-data="{\"identity\":\"$identity\",\"public_ip\":\"$publicIp\",\"model\":\"$model\",\"firmware\":\"$firmware\",\"secret\":\"$sharedSecret\"}" \
    mode=http

:log info "HotBando registration complete."

# Step 2: Re-run every hour (add to scheduler)
/system scheduler add name=hotbando-register interval=1h on-event={
    :local identity [/system identity get name]
    :local publicIp [/ip address get [find interface=ether1] address]
    :local firmware [/system package get [find name=system] version]
    /tool fetch url=("http://$hotbandoServer/api/routers/register") \
        http-method=post \
        http-content-type="application/json" \
        http-data="{\"identity\":\"$identity\",\"public_ip\":\"$publicIp\",\"secret\":\"$sharedSecret\"}" \
        mode=http
    :log info "HotBando heartbeat sent."
} start-time=startup

:log info "HotBando auto-registration scheduler installed."
