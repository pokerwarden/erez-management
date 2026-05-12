#!/bin/bash

echo "=== Uninstall Law Firm System ==="
echo "WARNING: This will DELETE all data permanently!"
echo ""
read -p "Type 'DELETE' to confirm: " CONFIRM

if [ "$CONFIRM" != "DELETE" ]; then
    echo "Aborted."
    exit 0
fi

docker compose down -v
echo "All containers and data have been removed."
