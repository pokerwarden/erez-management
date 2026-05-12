#!/bin/bash
set -e

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./restore.sh <backup_file.sql>"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: File not found: $BACKUP_FILE"
    exit 1
fi

echo "Restoring database from: $BACKUP_FILE"
echo "WARNING: This will OVERWRITE the current database!"
read -p "Are you sure? (type 'yes' to confirm): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

docker compose exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS lawfirm;"
docker compose exec -T db psql -U postgres -c "CREATE DATABASE lawfirm;"
docker compose exec -T db psql -U postgres lawfirm < "$BACKUP_FILE"
echo "Database restored successfully."

echo "Restarting app to re-run migrations..."
docker compose restart app
