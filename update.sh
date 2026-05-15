#!/bin/bash
set -e

VERSION_JSON_URL="${VERSION_JSON_URL:-https://raw.githubusercontent.com/pokerwarden/erez-management-releases/main/version.json}"
CURRENT_VERSION=$(cat version.txt 2>/dev/null || echo "0.0.0")

echo "=== Law Firm System — Updater ==="
echo "Current version: v$CURRENT_VERSION"

# ── Mode: manual file path ────────────────────────────────────────────────────
if [ -n "$1" ] && [ "$1" != "--check" ] && [ "$1" != "--auto" ]; then
    if [ ! -f "$1" ]; then
        echo "ERROR: File not found: $1"
        exit 1
    fi
    echo "Loading image from: $1"
    docker load < "$1"
    echo "Restarting app..."
    docker compose stop app
    docker compose up -d app
    echo "Waiting for app to be ready..."
    until curl -s http://localhost:4000/api/health > /dev/null 2>&1; do sleep 2; done
    echo "Done."
    exit 0
fi

# ── Fetch version.json ────────────────────────────────────────────────────────
echo "Checking for updates from version.json..."
if ! command -v curl &> /dev/null; then
    echo "ERROR: curl is required. Install it and try again."
    exit 1
fi

VERSION_JSON=$(curl -fsSL "$VERSION_JSON_URL" 2>/dev/null || echo "")
if [ -z "$VERSION_JSON" ]; then
    echo "ERROR: Could not fetch version.json from $VERSION_JSON_URL"
    exit 1
fi

LATEST=$(echo "$VERSION_JSON" | grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '[0-9][^"]*')
DOWNLOAD_URL=$(echo "$VERSION_JSON" | grep -o '"downloadUrl"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"downloadUrl"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
CHANGELOG=$(echo "$VERSION_JSON" | grep -o '"changelog"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"changelog"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

echo "Latest version: v$LATEST"

if [ "$CURRENT_VERSION" = "$LATEST" ]; then
    echo "Already up to date (v$CURRENT_VERSION)."
    exit 0
fi

echo ""
echo "Update available: v$CURRENT_VERSION → v$LATEST"
[ -n "$CHANGELOG" ] && echo "Changes: $CHANGELOG"
echo ""

# ── --check only ──────────────────────────────────────────────────────────────
if [ "$1" = "--check" ]; then
    exit 0
fi

# ── Confirm unless --auto ─────────────────────────────────────────────────────
if [ "$1" != "--auto" ]; then
    read -p "Download and install update? [y/N] " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
fi

# ── Download ──────────────────────────────────────────────────────────────────
TMPFILE="/tmp/lawfirm-update-v${LATEST}.tar.gz"
echo "Downloading v$LATEST..."
curl -fL --progress-bar "$DOWNLOAD_URL" -o "$TMPFILE"

echo "Loading Docker image..."
docker load < "$TMPFILE"
rm -f "$TMPFILE"

# ── Apply ─────────────────────────────────────────────────────────────────────
echo "Stopping app..."
docker compose stop app

echo "Starting updated app..."
docker compose up -d app

echo "Waiting for app to be ready..."
MAX_WAIT=60
ELAPSED=0
until curl -s http://localhost:4000/api/health > /dev/null 2>&1; do
    if [ $ELAPSED -ge $MAX_WAIT ]; then
        echo "ERROR: App did not start within ${MAX_WAIT}s. Check: docker compose logs app"
        exit 1
    fi
    sleep 2
    ELAPSED=$((ELAPSED + 2))
done

# ── Save new version ──────────────────────────────────────────────────────────
echo "$LATEST" > version.txt
echo ""
echo "Update complete! Now running v$LATEST"
echo "App: http://localhost:4000"
