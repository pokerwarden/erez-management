#!/bin/bash
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

echo "Creating backup: $TIMESTAMP"

# Backup database
echo "  Backing up database..."
docker compose exec -T db pg_dump -U postgres lawfirm > "${BACKUP_DIR}/db_${TIMESTAMP}.sql"

# Backup uploads volume
echo "  Backing up uploaded files..."
docker run --rm \
    -v "$(basename $(pwd))_uploads:/uploads" \
    -v "$(pwd)/${BACKUP_DIR}:/backup" \
    alpine tar czf "/backup/uploads_${TIMESTAMP}.tar.gz" -C /uploads .

echo "Backup complete:"
echo "  DB:      ${BACKUP_DIR}/db_${TIMESTAMP}.sql"
echo "  Uploads: ${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz"
