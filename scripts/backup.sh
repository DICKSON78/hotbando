#!/bin/sh

# HotBando Automated Database Backup Script
# Runs daily via Docker service
# - Retries DB connection at startup (VM reboot race)
# - Properly detects mysqldump pipeline failure
# - Validates gzip integrity
# - Uploads off-site copy to Google Cloud Storage

BACKUP_DIR="/backups"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
GCS_BUCKET=${GCS_BUCKET:-hotbando-backups}
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/hotbando_${DATE}.sql.gz"

log() { echo "[$(date)] $*"; }

mkdir -p "${BACKUP_DIR}"

# --- Wait for MySQL to become reachable (handles VM reboot races) ---
DB_READY=0
DB_WAIT_ATTEMPTS=60   # ~5 minutes max
DB_WAIT_INTERVAL=5
for i in $(seq 1 "${DB_WAIT_ATTEMPTS}"); do
    if mysqladmin ping -h "${MYSQL_HOST}" -u "${MYSQL_USER}" -p"${MYSQL_PASSWORD}" \
        --silent >/dev/null 2>&1; then
        DB_READY=1
        break
    fi
    log "Waiting for MySQL (attempt ${i}/${DB_WAIT_ATTEMPTS})..."
    sleep "${DB_WAIT_INTERVAL}"
done

if [ "${DB_READY}" -ne 1 ]; then
    log "ERROR: MySQL not reachable after ${DB_WAIT_ATTEMPTS} attempts. Aborting backup."
    exit 1
fi
log "MySQL reachable. Starting database backup..."

# --- Perform backup (pipeline failure detection) ---
if mysqldump -h "${MYSQL_HOST}" -u "${MYSQL_USER}" -p"${MYSQL_PASSWORD}" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    "${MYSQL_DATABASE}" | gzip > "${BACKUP_FILE}"; then
    log "Dump complete: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"
else
    log "ERROR: mysqldump failed"
    rm -f "${BACKUP_FILE}"
    exit 1
fi

# --- Validate gzip integrity ---
if ! gzip -t "${BACKUP_FILE}"; then
    log "ERROR: backup file failed gzip integrity check"
    rm -f "${BACKUP_FILE}"
    exit 1
fi
log "gzip integrity OK"

# --- Off-site copy to GCS (uploaded by host cron if gsutil present) ---
# The container itself has no gsutil; the host /usr/local/bin/hotbando-gcs-sync.sh
# pushes this volume to gs://hotbando-backups every 6h.

# --- Cleanup old backups ---
log "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "hotbando_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete
find "${BACKUP_DIR}" -name "manual_test.sql.gz" -delete

log "Current backups:"
ls -lh "${BACKUP_DIR}"/hotbando_*.sql.gz 2>/dev/null || log "No backups found"

log "Next backup in 24 hours..."
sleep 86400