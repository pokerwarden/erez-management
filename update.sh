#!/bin/bash
set -e

NEW_IMAGE=$1

if [ -z "$NEW_IMAGE" ]; then
    echo "Usage: ./update.sh <update-vX.X.tar.gz>"
    echo "Or use: ./update.sh --pull  to pull latest from registry"
    exit 1
fi

if [ "$NEW_IMAGE" = "--pull" ]; then
    echo "Pulling latest image from registry..."
    docker compose pull app
else
    if [ ! -f "$NEW_IMAGE" ]; then
        echo "ERROR: File not found: $NEW_IMAGE"
        exit 1
    fi
    echo "Loading new image from: $NEW_IMAGE"
    docker load < "$NEW_IMAGE"
fi

echo "Stopping app..."
docker compose stop app

echo "Starting app with new image (migrations will run automatically)..."
docker compose up -d app

echo "Waiting for app to be ready..."
until curl -s http://localhost:4000/api/health > /dev/null 2>&1; do
    sleep 2
done

echo "Update complete! App is running at http://localhost:4000"
