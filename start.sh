#!/bin/sh
set -e

echo "Fixing volume permissions..."
# Fix ownership of mounted volumes
sudo chown -R nextjs:nodejs /app/data /app/uploads
sudo chmod -R 755 /app/data /app/uploads

echo "Starting database migration..."
# Run Prisma migrations (client exists, schema exists)
npx prisma db push

echo "Starting Next.js application..."
exec node server.js
