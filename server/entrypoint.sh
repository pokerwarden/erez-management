#!/bin/sh

echo "Pushing database schema..."
until npx prisma db push --accept-data-loss; do
  echo "Retrying in 5s..."
  sleep 5
done

echo "Starting server..."
exec node dist/index.js
