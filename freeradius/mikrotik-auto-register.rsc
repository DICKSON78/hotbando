# HotBando MikroTik Heartbeat Script (embedded in zero-touch config)
# ============================================================================
# Keep on EACH MikroTik router. Checks in hourly with the HotBando server.
# The server marks the router ONLINE and returns whether a config refresh is
# needed. The full auto-provisioning flow lives in mikrotik-zero-touch.rsc.
# ============================================================================

# Replace placeholders:
#   HOTBANDO_SERVER  — server IP or domain, e.g. 34.35.81.196
#   HOTBANDO_PORT    — app port (3000)
#   REGISTRATION_SECRET — ROUTER_REGISTRATION_SECRET from server .env
#   ROUTER_ID        — the router_id assigned at registration (e.g. HB-XXXX)
# ============================================================================

:local hotbandoServer "HOTBANDO_SERVER"
:local hotbandoPort "HOTBANDO_PORT"
:local hotbandoSecret "REGISTRATION_SECRET"
:local routerId "ROUTER_ID"

:log info "HotBando heartbeat..."
/tool fetch url=("http://$hotbandoServer:$hotbandoPort/api/zero-touch/heartbeat") \
    http-method=post \
    http-content-type="application/json" \
    http-data="{\"router_id\":\"$routerId\",\"secret\":\"$hotbandoSecret\"}" \
    mode=http \
    output=none

:log info "HotBando heartbeat sent."