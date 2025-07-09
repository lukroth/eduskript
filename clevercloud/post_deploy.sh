#!/bin/bash

# CleverCloud post-deploy hook for Eduscript
# This script runs after the application is deployed

echo "Starting post-deploy setup..."

# Check if DATABASE_URL is available
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL not found"
    exit 1
fi

# Generate Prisma client (should already be done in build)
echo "Ensuring Prisma client is generated..."
pnpm prisma generate

# Check database state and handle accordingly
echo "Checking database state..."

# Try to run migrate deploy first (safe for existing schemas)
if pnpm prisma migrate deploy 2>/dev/null; then
    echo "Migrations applied successfully!"
elif [ $? -eq 1 ]; then
    # If migrate fails, it might be because database is empty or no migrations exist
    echo "No migrations to apply, checking if database needs initial schema..."
    
    # Use db push only if migrate failed (which indicates empty DB or no migrations)
    if ! pnpm run db:push --accept-data-loss; then
        echo "ERROR: Database sync failed"
        exit 1
    fi
    echo "Initial schema pushed to database."
fi

echo "Post-deploy setup completed successfully!"
