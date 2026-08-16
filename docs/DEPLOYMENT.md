# HotBando Cloud Deployment (Docker on a VPS)

This guide deploys the full HotBando stack to a **public VPS** so the platform is
reachable from the internet (admin portal, hotspot portal, and RADIUS).

## Architecture

Everything runs in Docker on one VPS:

```
             ┌─────────────────────────── VPS ────────────────────────────┐
 internet ──▶│   app (Node.js)         :3000  (admin portal + hotspot)   │
 Router ────▶│   freeradius (RADIUS)   :1812/:1813 UDP                    │
 (UDP 1812)  │   db (MySQL 8)          :3307 internal network             │
             │   redis (cache)         :6380 internal network             │
             │   backup (nightly mysqldump → gzip)                        │
             └────────────────────────────────────────────────────────────┘
```

| Service      | Ports | Purpose                                    |
|--------------|-------|--------------------------------------------|
| app          | 3000  | Express app (admin + hotspot portal)       |
| freeradius   | 1812/1813 UDP | Hotspot authentication & accounting |
| db           | 3307 (host), 3306 (internal) | MySQL database            |
| redis        | 6380 (host), 6379 (internal) | Cache / sessions         |
| backup       | –     | Nightly DB backups to `backup_data` volume |

## Prerequisites

- A VPS (2 vCPU / 4 GB RAM minimum; Ubuntu 22.04 or 24.04 recommended).
- A **public IP** (and optionally a domain name pointed to it).
- Docker Engine + Compose plugin:
  ```bash
  curl -fsSL https://get.docker.com | sh
  sudo systemctl enable --now docker
  docker --version && docker compose version
  ```

## Step 1 — Clone the repository

```bash
cd /opt
sudo git clone https://github.com/DICKSON78/hotbando.git
cd hotbando
sudo chown -R "$USER":"$USER" .
```

## Step 2 — Create the production `.env`

Start from the example and fill in real values:

```bash
cp .env.example .env
nano .env
```

Values you **must** change for production (never commit real secrets):

```ini
# Server
PORT=3000
NODE_ENV=production
APP_URL=https://hotbando.example.com      # your public domain/IP
SESSION_SECRET=<random-64-hex>
JWT_SECRET=<random-64-hex>
CSRF_SECRET=<random-64-hex>
ENCRYPTION_KEY=<random-64-hex>            # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
TRUST_PROXY=true                          # behind reverse proxy
COOKIE_SECURE=true                        # HTTPS only
ALLOWED_ORIGINS=https://hotbando.example.com

# Database (MUST match docker-compose.yml db service!)
DB_USER=hotbando
DB_PASSWORD=hotbando_pass                 # keep in sync with MYSQL_PASSWORD below
DB_HOST=db
DB_PORT=3306

# Docker services (docker-compose.yml also uses these)
DB_ROOT_PASSWORD=<strong-root-pass>
REDIS_PASSWORD=<strong-redis-pass>
BACKUP_RETENTION_DAYS=7

# RADIUS — shared secret used by every MikroTik router
RADIUS_ENABLED=true
RADIUS_SECRET=<32-char-hex>               # node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# Hotspot defaults (used by the bootstrap script defaults)
HOTSPOT_IP=10.5.50.1
HOTSPOT_SUBNET=10.5.50.0

# Pesapal (production keys when ready)
PESAPAL_ENV=sandbox
PESAPAL_CALLBACK_URL=https://hotbando.example.com/api/payments/callback
PESAPAL_IPN_URL=https://hotbando.example.com/api/payments/ipn
```

> **Gotcha — DB password consistency:** the MySQL container is created with
> `MYSQL_USER=hotbando` / `MYSQL_PASSWORD=hotbando_pass` (hard-coded in
> `docker-compose.yml`), and FreeRADIUS' entrypoint substitutes this password
> into its SQL config. If you change `DB_PASSWORD` in `.env`, also update the
> `MYSQL_PASSWORD` value in `docker-compose.yml`.

Generate secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 3 — Open the firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 3000/tcp          # web (admin + hotspot portal)
sudo ufw allow 1812/udp          # RADIUS authentication (routers)
sudo ufw allow 1813/udp          # RADIUS accounting (routers)
sudo ufw enable
```

Optionally restrict RADIUS to known router/public IPs instead of `anywhere`.

> RouterOS API (TCP 8728) is **outbound** from the server to routers, so it
> needs no VPS inbound rule.

## Step 4 — Build the images

The app image is built by Compose, but the **FreeRADIUS image must be built
manually** (it has no `build:` section in `docker-compose.yml`):

```bash
docker build -t hotbando-freeradius:latest freeradius/
docker compose build app
```

## Step 5 — Start the stack

```bash
docker compose up -d
docker compose ps
```

Wait for the DB to be healthy (first boot runs `database/schema.sql`), then check
the app:

```bash
curl -s http://localhost:3000/health
```

Expect `{"status":"ok","database":"connected","redis":"connected",...}`.

## Step 6 — Verify FreeRADIUS

```bash
docker compose logs freeradius
# Should start with "Listening on ... auth ... 1812" and "acct ... 1813"
```

Test from a router later with:
```
/radius print
```

## Step 7 — Add an admin account

The `database/schema.sql` seeds the initial admin
(`admin@hotbando.com` / `Admin@123`). **Change this password immediately** after
first login. To create another admin, either use the portal or insert a row with
a bcrypt hash:

```bash
docker compose exec -T db mysql -uroot -p"$DB_ROOT_PASSWORD" hotbando \
  -e "SELECT id,email FROM admins;"
```

## Optional — HTTPS reverse proxy (recommended)

Terminate TLS in front of the app with **Caddy** (auto HTTPS + easy config):

```bash
sudo apt-get install -y caddy
sudo tee /etc/caddy/Caddyfile > /dev/null <<'EOF'
hotbando.example.com {
    reverse_proxy localhost:3000
    encode gzip
}
EOF
sudo systemctl restart caddy
```

Then change `.env` `APP_URL`/`ALLOWED_ORIGINS` to the `https://` domain and
restart the app: `docker compose up -d --force-recreate app`.

## Step 8 — Point MikroTik routers at it

Now that the stack is live, connect routers via the admin portal — follow
**[ROUTER_ONBOARDING.md](./ROUTER_ONBOARDING.md)**.

Key facts for router config:
- Hotspot/RADIUS server IP: your VPS IP **or** domain.
- RADIUS secret: the `RADIUS_SECRET` from `.env` (same for every router).
- UDP 1812/1813 must be reachable from the routers.

## Update & Redeploy

The app code is baked into the image, so after pulling changes:

```bash
git pull
docker compose build app
docker compose up -d --force-recreate app
```

## Backups & restore

Backups run automatically every 24h into the `backup_data` volume
(`scripts/backup.sh`, retention `BACKUP_RETENTION_DAYS`).

```bash
# List backups
docker compose exec backup ls -lh /backups

# Restore latest backup (drops and recreates the hotbando DB)
LATEST=$(docker compose exec -T backup sh -c 'ls -t /backups/hotbando_*.sql.gz | head -1' | tr -d '\r\n')
docker compose exec -T db mysql -uroot -p"$DB_ROOT_PASSWORD" -e "DROP DATABASE hotbando; CREATE DATABASE hotbando;"
docker compose exec -T backup sh -c "cat $LATEST" | \
  docker compose exec -T db sh -c "gunzip | mysql -uroot -p\"$DB_ROOT_PASSWORD\" hotbando"
```

## Troubleshooting

| Problem                          | Fix                                                        |
|----------------------------------|------------------------------------------------------------|
| `app` restarting                 | Check `docker compose logs app`; confirm DB host/password in `.env`. |
| MySQL won't start                | `docker compose logs db`; delete `mysql_data` volume only as last resort (loses data). |
| FreeRADIUS `No such file or directory` | Rebuild the image after editing `freeradius/*`: `docker build -t hotbando-freeradius:latest freeradius/`. |
| RADIUS requests not arriving     | Confirm UDP 1812/1813 open; `docker compose logs freeradius`. |
| Portal shows wrong URL           | `APP_URL`/`ALLOWED_ORIGINS` must match the domain you visit; restart app. |
| DB user "hotbando" auth failed   | `DB_PASSWORD` in `.env` must match `MYSQL_PASSWORD` in `docker-compose.yml`. |
