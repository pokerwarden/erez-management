#!/bin/bash
set -e

echo "=== Law Firm Case Management System - Installation ==="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed."
    echo "Install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "ERROR: Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

echo "Docker is available."

# Load Docker images from tar files
if [ -d "images" ]; then
    echo ""
    echo "Loading Docker images (this may take a few minutes)..."
    for img in images/*.tar.gz; do
        if [ -f "$img" ]; then
            echo "  Loading $img..."
            docker load < "$img"
        fi
    done
else
    echo "Pulling Docker images from registry..."
    docker compose pull
fi

# Generate secrets if .env doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env configuration file..."
    cp .env.example .env

    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | head -c 32 | xxd -p)
    POSTGRES_PASSWORD=$(openssl rand -hex 16 2>/dev/null || cat /dev/urandom | head -c 16 | xxd -p)
    N8N_PASSWORD=$(openssl rand -hex 12 2>/dev/null || cat /dev/urandom | head -c 12 | xxd -p)
    N8N_WEBHOOK_SECRET=$(openssl rand -hex 16 2>/dev/null || cat /dev/urandom | head -c 16 | xxd -p)

    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    sed -i "s/POSTGRES_PASSWORD=CHANGE_ME/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/lawfirm|" .env
    sed -i "s/N8N_PASSWORD=CHANGE_ME/N8N_PASSWORD=$N8N_PASSWORD/" .env
    sed -i "s/N8N_WEBHOOK_SECRET=CHANGE_ME/N8N_WEBHOOK_SECRET=$N8N_WEBHOOK_SECRET/" .env

    echo ""
    read -p "Enter firm name (שם המשרד) [משרד עורכי דין]: " FIRM_NAME
    FIRM_NAME=${FIRM_NAME:-"משרד עורכי דין"}
    sed -i "s/FIRM_NAME=.*/FIRM_NAME=$FIRM_NAME/" .env
fi

# Start services
echo ""
echo "Starting services..."
docker compose up -d

# Wait for app to be ready
echo "Waiting for the application to start..."
MAX_WAIT=60
ELAPSED=0
until curl -s http://localhost:4000/api/health > /dev/null 2>&1; do
    if [ $ELAPSED -ge $MAX_WAIT ]; then
        echo "ERROR: Application did not start within ${MAX_WAIT} seconds."
        echo "Check logs with: docker compose logs app"
        exit 1
    fi
    sleep 2
    ELAPSED=$((ELAPSED + 2))
done

echo "Application is ready!"

# Check if already initialized
INITIALIZED=$(curl -s http://localhost:4000/api/setup/status | grep -c '"initialized":true' || true)

if [ "$INITIALIZED" = "0" ]; then
    echo ""
    echo "=== Create Admin User ==="
    read -p "  Admin name (שם המנהל): " ADMIN_NAME
    read -p "  Admin email: " ADMIN_EMAIL
    read -sp "  Admin password (min 8 chars): " ADMIN_PASSWORD
    echo ""

    RESULT=$(curl -s -X POST http://localhost:4000/api/setup/init \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"$ADMIN_NAME\",\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

    if echo "$RESULT" | grep -q '"success":true'; then
        echo "Admin user created successfully!"
    else
        echo "Warning: Could not create admin user. Result: $RESULT"
    fi
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║         Installation Complete!                       ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  App:  http://localhost:4000                         ║"
echo "║  n8n:  http://localhost:5678                         ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "Run 'docker compose logs -f' to see logs."
