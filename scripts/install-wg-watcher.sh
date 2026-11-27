#!/bin/bash
# =============================================================================
# HotBando host watcher installer (idempotent, safe to re-run)
#
# Installs the peer-descriptor watcher that turns the app container's
# /host-wireguard-peers descriptors into live wg0 peers:
#
#   host /etc/wireguard/hotbando-peers   <--bind-->  container /host-wireguard-peers
#   host /etc/wireguard/.wg-status-result <--bind-->  container /var/run/hotbando/wg-status-result
#
# Run ONCE on the production host as root, BEFORE `docker compose up`, so the
# status path already exists as a FILE (Docker creates a DIRECTORY when the
# bind source is missing, which permanently breaks the status hand-off).
#
#   sudo bash scripts/install-wg-watcher.sh
#
# It never touches wg0.conf keys, never restarts Docker/DB/Redis, and it will
# refuse to run if an existing watcher unit uses a DIFFERENT script path.
# =============================================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WATCHER_SRC="$REPO_DIR/scripts/hotbando-wg-apply"
WATCHER_DST=/usr/local/bin/hotbando-wg-apply
UNIT_DIR=/etc/systemd/system
PEERS_DIR=/etc/wireguard/hotbando-peers
STATUS_FILE=/etc/wireguard/.wg-status-result
CONF=/etc/wireguard/wg0.conf

if [ "$(id -u)" -ne 0 ]; then
    echo "ERROR: run as root (sudo bash $0)" >&2
    exit 1
fi
if [ ! -f "$WATCHER_SRC" ]; then
    echo "ERROR: watcher source not found: $WATCHER_SRC" >&2
    exit 1
fi
if [ ! -f "$CONF" ]; then
    echo "ERROR: $CONF not found - is the host WireGuard hub installed?" >&2
    exit 1
fi

# -------------- 1. Guard: never clobber a differently-pathed existing watcher --------------
for unit in hotbando-wg-apply.service; do
    existing="$UNIT_DIR/$unit"
    if [ -f "$existing" ] && ! grep -q "ExecStart=$WATCHER_DST" "$existing"; then
        echo "ERROR: $existing exists but does not ExecStart $WATCHER_DST." >&2
        echo "Inspect it first (systemctl cat $unit); re-run after reconciling." >&2
        exit 1
    fi
done

# -------------- 2. Status path must be a FILE, never a directory --------------
if [ -d "$STATUS_FILE" ]; then
    echo "ERROR: $STATUS_FILE is a directory (Docker created it because the" >&2
    echo "bind source was missing). Remove it first, then re-run:" >&2
    echo "  rmdir $STATUS_FILE && bash $0" >&2
    exit 1
fi
if [ ! -e "$STATUS_FILE" ]; then
    install -m 644 /dev/null "$STATUS_FILE"
fi

# -------------- 3. Shared peer directory --------------
install -d -m 700 "$PEERS_DIR"

# -------------- 4. Watcher binary + units --------------
install -m 755 "$WATCHER_SRC" "$WATCHER_DST"
for unit in hotbando-wg-apply.service hotbando-wg-apply.path hotbando-wg-apply.timer; do
    install -m 644 "$REPO_DIR/scripts/systemd/$unit" "$UNIT_DIR/$unit"
done
systemctl daemon-reload

# -------------- 5. PEER-PRESERVATION PREFLIGHT (before ANY activation) --------------
# The units are deliberately NOT enabled yet: a timer with OnBootSec=30s can
# fire immediately on an already-booted host. Gate both automatic triggers on
# the read-only preflight first. It computes the exact config the watcher
# would write and refuses if any live peer / AllowedIP would be lost.
echo "running peer-preservation preflight (read-only, no wg0 changes)..."
if ! "$WATCHER_DST" --preflight; then
    echo "ERROR: peer-preservation preflight FAILED. wg0.conf and wg0 were not" >&2
    echo "       modified, and the watcher units were NOT enabled." >&2
    echo "Restore the missing descriptor (or explicitly remove the live peer" >&2
    echo "named above), then re-run this installer." >&2
    exit 1
fi

systemctl enable --now hotbando-wg-apply.path hotbando-wg-apply.timer

# -------------- 6. One apply + verification (public state only, no keys) --------------
"$WATCHER_DST"
echo "watcher installed: $WATCHER_DST (path + timer enabled)"
if [ -f "$STATUS_FILE" ]; then
    echo "status file: $STATUS_FILE (file, $(wc -c < "$STATUS_FILE") bytes)"
else
    echo "status file: MISSING"
fi
echo "wg0: $(wg show wg0 latest-handshakes 2>/dev/null | wc -l) peer(s), listen port $(wg show wg0 listen-port 2>/dev/null || echo '?')"
echo "peers dir: $PEERS_DIR -> $(ls "$PEERS_DIR"/*.peer 2>/dev/null | wc -l) descriptor(s)"
