#!/bin/sh

# HotBando Automated Database Backup Script
# Runs daily via Docker service

BACKUP_DIR="/backups"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/hotbando_${DATE}.sql.gz"

echo "[$(date)] Starting database backup..."

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Perform backup
mysqldump -h "${MYSQL_HOST}" -u "${MYSQL_USER}" -p"${MYSQL_PASSWORD}" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    "${MYSQL_DATABASE}" | gzip > "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    echo "[$(date)] Backup completed: ${BACKUP_FILE}"
    echo "[$(date)] Backup size: $(du -h ${BACKUP_FILE} | cut -f1)"
else
    echo "[$(date)] Backup failed!"
    exit 1
fi

# Cleanup old backups
echo "[$(date)] Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "hotbando_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

# List remaining backups
echo "[$(date)] Current backups:"
ls -lh "${BACKUP_DIR}"/hotbando_*.sql.gz 2>/dev/null || echo "No backups found"

# Sleep for 24 hours (will restart via Docker restart policy)
echo "[$(date)] Next backup in 24 hours..."
sleep 86400