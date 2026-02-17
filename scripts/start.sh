#!/bin/sh
# Start script that runs migrations before starting the Next.js server
# This script is used in Railway deployment

# Note: We don't use 'set -e' because we want to continue even if migrations fail

echo "🚀 Starting application..."
echo "📦 Working directory: $(pwd)"
echo "🔧 Node version: $(node --version)"
echo "🔧 NPM version: $(npm --version || echo 'N/A')"

# Check if tsx is available
if ! command -v tsx >/dev/null 2>&1; then
  echo "⚠️  Warning: tsx command not found in PATH"
  echo "📋 PATH: $PATH"
  echo "🔍 Checking for tsx in common locations..."
  if [ -f "/usr/local/bin/tsx" ]; then
    echo "✅ Found tsx at /usr/local/bin/tsx"
    export PATH="/usr/local/bin:$PATH"
  elif [ -f "/usr/bin/tsx" ]; then
    echo "✅ Found tsx at /usr/bin/tsx"
    export PATH="/usr/bin:$PATH"
  else
    echo "❌ tsx not found. Attempting to install globally..."
    npm install -g tsx || {
      echo "❌ Failed to install tsx. Migrations will be skipped."
      SKIP_MIGRATIONS=true
    }
  fi
fi

# Verify tsx is now available
if ! command -v tsx >/dev/null 2>&1 && [ -z "$SKIP_MIGRATIONS" ]; then
  echo "❌ tsx is still not available after installation attempt"
  SKIP_MIGRATIONS=true
fi

echo "🔄 Checking for database migrations..."

# Check if migration directory exists
if [ ! -d "./drizzle/migrations" ]; then
  echo "⚠️  Warning: Migration directory './drizzle/migrations' not found"
  echo "📁 Current directory contents:"
  ls -la . | head -20
fi

# Run migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ] && [ -z "$SKIP_MIGRATIONS" ]; then
  # Mask sensitive parts of DATABASE_URL for logging
  MASKED_URL=$(echo "$DATABASE_URL" | sed 's/:[^:@]*@/:***@/g' | sed 's/\/\/[^:]*:/\/\/***:/')
  echo "🔄 Running database migrations..."
  echo "🔗 Database URL: ${MASKED_URL}"
  echo "📂 Migration folder: ./drizzle/migrations"
  
  if [ -d "./drizzle/migrations" ]; then
    MIGRATION_COUNT=$(find ./drizzle/migrations -name "*.sql" 2>/dev/null | wc -l | tr -d ' ')
    echo "📊 Found $MIGRATION_COUNT migration file(s)"
  fi
  
  if tsx scripts/migrate.ts; then
    echo "✅ Migrations completed successfully"
  else
    MIGRATION_EXIT_CODE=$?
    echo "⚠️  Migration failed with exit code: $MIGRATION_EXIT_CODE"
    echo "⚠️  Continuing with server start (migrations may have partially succeeded)..."
  fi
elif [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL not set, skipping migrations"
elif [ -n "$SKIP_MIGRATIONS" ]; then
  echo "⚠️  Skipping migrations due to missing tsx"
fi

echo "🚀 Starting Next.js server..."

# Check if server.js exists
if [ ! -f "server.js" ]; then
  echo "❌ Error: server.js not found!"
  echo "📁 Current directory contents:"
  ls -la . | head -20
  echo "❌ Cannot start server. Exiting."
  exit 1
fi

echo "✅ Found server.js, starting server..."
exec node server.js
