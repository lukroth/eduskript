#!/bin/sh
set -e

echo "Starting database migration..."

# Run database migrations using npx to ensure proper resolution
npx prisma migrate deploy

echo "Database migration completed. Starting application..."

# Start the application
exec node server.js