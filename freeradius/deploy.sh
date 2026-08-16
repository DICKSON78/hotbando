#!/usr/bin/env bash
# ============================================================================
# HotBando FreeRADIUS Deployment Script
# Run this on the FreeRADIUS server to install and configure everything.
#
# Usage:
#   sudo bash freeradius/deploy.sh
#
# Prerequisites:
#   - Ubuntu/Debian server (tested on 22.04+)
#   - MySQL root credentials (for creating the freeradius DB user)
#   - HotBando database already running on localhost
# ============================================================================
set -euo pipefail

echo "=== HotBando FreeRADIUS Deployment ==="
echo ""

# -- Config -----------------------------------------------------------------
FR_USER="freeradius"
FR_PASS=$(openssl rand -base64 24)
FR_CONF_DIR="/etc/freeradius/3.0"
FR_SQL_CONF_DIR="$FR_CONF_DIR/mods-config/sql/main/mysql"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# -- 1. Install FreeRADIUS ---------------------------------------------------
echo "[1/8] Installing FreeRADIUS + MySQL module..."
apt-get update -qq
apt-get install -y -qq freeradius freeradius-mysql

# -- 2. Create DB user -------------------------------------------------------
echo "[2/8] Creating freeradius MySQL user..."
mysql -e "
    CREATE USER IF EXISTS '$FR_USER'@'localhost' IDENTIFIED BY '$FR_PASS';
    GRANT SELECT, INSERT, UPDATE ON hotbando.* TO '$FR_USER'@'localhost';
    FLUSH PRIVILEGES;
"
echo "  User: $FR_USER / Password: $FR_PASS"
echo "  SAVE THIS PASSWORD — it goes into the sql module config"

# -- 3. Run SQL views --------------------------------------------------------
echo "[3/8] Creating SQL views and indexes..."
mysql hotbando < "$PROJECT_DIR/freeradius/sql-views.sql"

# -- 4. Copy configuration files --------------------------------------------
echo "[4/8] Copying FreeRADIUS config files..."

# SQL module config
cp "$PROJECT_DIR/freeradius/mods-available/sql" "$FR_CONF_DIR/mods-available/sql"
sed -i "s/password = \"changeme\"/password = \"$FR_PASS\"/" "$FR_CONF_DIR/mods-available/sql"

# SQL queries
cp "$PROJECT_DIR/freeradius/sql/mysql/queries.conf" "$FR_SQL_CONF_DIR/queries.conf"

# Site config
cp "$PROJECT_DIR/freeradius/sites-available/hotbando" "$FR_CONF_DIR/sites-available/hotbando"

# Dictionary
cp "$PROJECT_DIR/freeradius/dictionary.hotbando" "$FR_CONF_DIR/dictionary.hotbando"
if ! grep -q "dictionary.hotbando" "$FR_CONF_DIR/dictionary" 2>/dev/null; then
    echo '$INCLUDE dictionary.hotbando' >> "$FR_CONF_DIR/dictionary"
fi

# Clients (append template)
cat "$PROJECT_DIR/freeradius/clients.conf" >> "$FR_CONF_DIR/clients.conf"

# -- 5. Enable modules -------------------------------------------------------
echo "[5/8] Enabling SQL module and hotbando site..."

# Enable SQL module
ln -sf "$FR_CONF_DIR/mods-available/sql" "$FR_CONF_DIR/mods-enabled/sql"

# Disable default site, enable hotbando
rm -f "$FR_CONF_DIR/sites-enabled/default"
ln -sf "$FR_CONF_DIR/sites-available/hotbando" "$FR_CONF_DIR/sites-enabled/hotbando"

# -- 6. Tune FreeRADIUS for 1M users -----------------------------------------
echo "[6/8] Tuning FreeRADIUS for scale..."

# Increase max requests
sed -i 's/max_requests = 4096/max_requests = 65536/' "$FR_CONF_DIR/radiusd.conf" 2>/dev/null || true
sed -i 's/max_requests = 16384/max_requests = 65536/' "$FR_CONF_DIR/radiusd.conf" 2>/dev/null || true

# -- 7. Fix permissions ------------------------------------------------------
echo "[7/8] Setting permissions..."
chown -R freerad:freerad "$FR_CONF_DIR"
chmod 640 "$FR_CONF_DIR/mods-enabled/sql"

# -- 8. Restart and verify ---------------------------------------------------
echo "[8/8] Starting FreeRADIUS..."
systemctl restart freeradius
systemctl enable freeradius

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "  Status: $(systemctl is-active freeradius)"
echo "  SQL Password: $FR_PASS"
echo ""
echo "  Next steps:"
echo "    1. Test locally:   radtest 0712345678 <password> localhost 0 \$RADIUS_SECRET"
echo "    2. Add MikroTik routers to $FR_CONF_DIR/clients.conf"
echo "    3. Configure each MikroTik:"
echo "       /radius add address=<server-ip> secret=<your-radius-secret> service=hotspot"
echo "       /radius incoming set accept=yes"
echo "    4. Check logs:     tail -f /var/log/freeradius/radius.log"
echo ""
