#!/bin/sh
# Start script that runs migrations before starting the Next.js server
# This script is used in Railway deployment

echo "🔄 Checking for database migrations..."

# Run migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "🔄 Running database migrations..."
  if tsx scripts/migrate.ts; then
    echo "✅ Migrations completed successfully"
  else
    echo "⚠️  Migration failed, but continuing with server start..."
  fi
else
  echo "⚠️  DATABASE_URL not set, skipping migrations"
fi

echo "🚀 Starting Next.js server..."
exec node server.js
