#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# PostgreSQL backup script — run via cron on the deploy server
# Keeps 7 daily backups, rotates oldest
#
# Crontab (as deploy user):
#   0 3 * * * /home/deploy/crm/scripts/backup.sh
# ============================================================

BACKUP_DIR="$HOME/crm/backups"
COMPOSE_FILE="$HOME/crm/docker-compose.prod.yml"

# Load env vars for DB credentials
set -a
source "$HOME/crm/.env"
set +a
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

docker compose -f "$COMPOSE_FILE" exec -T db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom \
  > "$BACKUP_DIR/crm_${TIMESTAMP}.dump"

FILESIZE=$(du -h "$BACKUP_DIR/crm_${TIMESTAMP}.dump" | cut -f1)
echo "[$(date)] Backup complete: crm_${TIMESTAMP}.dump ($FILESIZE)"

# Rotate old backups
find "$BACKUP_DIR" -name "crm_*.dump" -mtime +$RETENTION_DAYS -delete
echo "[$(date)] Cleaned backups older than $RETENTION_DAYS days"
