#!/bin/bash
# HotBando local machine -> GCS off-site DB sync
# Dumps the running MySQL container and pushes to gs://hotbando-backups/local/
# Runs every 6h via dickson crontab.
# Why direct docker dump (not reading the named volume):
#   - docker data-root is /tmp/docker-data (volatile, root-owned); volume not readable by dickson.

set -e

LOGFILE=/home/dickson/Documents/Work/hotbando/gcs-sync-local.log
PROJECT_DIR=/home/dickson/Documents/Work/hotbando
ENV_FILE=$PROJECT_DIR/.env
DATE=$(date +%Y%m%d_%H%M%S)
TMPDIR=/tmp/hotbando-sync
OUT=$TMPDIR/hotbando_${DATE}.sql.gz
RETENTION_DAYS=14

log() { echo "[$(date)] $*" >> "$LOGFILE"; }

mkdir -p "$TMPDIR"

if [ ! -f "$ENV_FILE" ]; then
    log "ERROR: $ENV_FILE not found"
    exit 1
fi

DBPASS=$(grep '^DB_PASSWORD=' "$ENV_FILE" | head -1 | cut -d= -f2)
if [ -z "$DBPASS" ]; then
    log "ERROR: DB_PASSWORD missing from $ENV_FILE"
    exit 1
fi

log "Dumping database..."
DUMP_ERR=$(mktemp)
if ! docker exec -i hotbando-db-1 mysqldump -hlocalhost -uhotbando -p"$DBPASS" --single-transaction --routines --triggers hotbando 2>"$DUMP_ERR" | gzip > "$OUT"; then
    log "ERROR: mysqldump failed: $(head -3 "$DUMP_ERR")"
    rm -f "$OUT" "$DUMP_ERR"
    exit 1
fi
rm -f "$DUMP_ERR"

# Reject empty/truncated dumps instead of silently uploading garbage.
if [ ! -s "$OUT" ] || ! gzip -t "$OUT" 2>/dev/null; then
    log "ERROR: dump is empty or invalid gzip — not uploading"
    rm -f "$OUT"
    exit 1
fi
GZ_SIZE=$(wc -c < "$OUT")
if [ "$GZ_SIZE" -lt 1024 ]; then
    log "ERROR: dump suspiciously small (${GZ_SIZE}B) — not uploading"
    rm -f "$OUT"
    exit 1
fi

log "Uploading $(basename "$OUT") to GCS..."
if ! gsutil -m cp "$OUT" "gs://hotbando-backups/local/hotbando_${DATE}.sql.gz"; then
    log "ERROR: gsutil upload failed"
    rm -f "$OUT"
    exit 1
fi

rm -f "$OUT"
log "OK: pushed hotbando_${DATE}.sql.gz"

# Prune old objects in the local/ prefix
log "Pruning local/ backups older than ${RETENTION_DAYS} days..."
gsutil ls "gs://hotbando-backups/local/hotbando_*.sql.gz" 2>/dev/null |
while read -r obj; do
    ts=$(basename "$obj" | sed -E 's/hotbando_([0-9]{8})_.*/\1/')
    if [[ "$ts" =~ ^[0-9]{8}$ ]] && [[ "$ts" -lt $(date -d "${RETENTION_DAYS} days ago" +%Y%m%d) ]]; then
        gsutil rm "$obj" >/dev/null 2>&1 && log "Removed $obj"
    fi
done

exit 0