#!/bin/bash

# Prestart script for Eduskript

set -e

echo "🚀 Starting pre-run setup..."

if ! command -v pnpm &> /dev/null; then
    echo "🔧 Installing pnpm..."
    if corepack enable pnpm; then
        echo "✅ pnpm installed successfully"
    else
        echo "❌ ERROR: pnpm installation failed"
        exit 1
    fi
else
    echo "✅ pnpm is already installed"
fi

# First, try to run migrate deploy (safe for existing schemas)
echo "🔄 Attempting to apply migrations..."
if pnpm prisma migrate deploy 2>/dev/null; then
    echo "✅ Migrations applied successfully!"
else
    echo "⚠️  No migrations found or migration failed, checking database state..."
    
    # Check if database has tables (is initialized)
    TABLES_COUNT=$(pnpm prisma db execute --stdin <<< "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tail -n 1 || echo "0")
    
    echo "Found database with $TABLES_COUNT tables"
fi

# Generate Prisma client after migrations
echo "🔧 Generating Prisma client after migrations..."
if pnpm db:generate; then
    echo "✅ Prisma client generated"
else
    echo "❌ ERROR: Prisma client generation failed"
    exit 1
fi

echo "🎉 Pre-run setup completed successfully!"
echo "🌐 Application ready to start at: $NEXTAUTH_URL"
