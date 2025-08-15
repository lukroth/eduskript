#!/bin/sh
set -e

echo "Fixing data directory permissions..."

# Fix ownership of the data directory to nextjs user
chown -R nextjs:nodejs /app/data

echo "Starting database migration as nextjs user..."

# Debug: Check migrations directory structure
echo "Debug: Checking migration files..."
find /app/prisma/migrations -name "*.sql" || echo "No migration files found"

# Use su with explicit shell and change to nextjs user
su nextjs -s /bin/sh -c "cd /app && npx prisma migrate deploy"

echo "Database migration completed. Starting application..."

# Start the application as nextjs user
exec su nextjs -s /bin/sh -c "cd /app && node server.js"