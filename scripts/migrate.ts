#!/usr/bin/env tsx
/**
 * Run database migrations.
 * Used in Railway deployment at container startup.
 */

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { existsSync } from "fs";
import { readdir } from "fs/promises";
import { config } from "dotenv";

function maskDatabaseUrl(url: string): string {
  return url.replace(/:[^:@]*@/, ":***@").replace(/\/\/[^:]*:/, "//***:");
}

async function checkMigrationsFolder(): Promise<void> {
  const migrationsFolder = "./drizzle/migrations";
  console.log(`📂 Checking migrations folder: ${migrationsFolder}`);
  
  if (!existsSync(migrationsFolder)) {
    throw new Error(`Migrations folder not found: ${migrationsFolder}`);
  }

  try {
    const files = await readdir(migrationsFolder);
    const sqlFiles = files.filter((f) => f.endsWith(".sql"));
    console.log(`📊 Found ${sqlFiles.length} migration file(s) in ${migrationsFolder}`);
    
    if (sqlFiles.length === 0) {
      console.log("⚠️  Warning: No SQL migration files found");
    } else {
      console.log("📋 Migration files:", sqlFiles.slice(0, 5).join(", "));
      if (sqlFiles.length > 5) {
        console.log(`   ... and ${sqlFiles.length - 5} more`);
      }
    }
  } catch (error) {
    console.error("❌ Error reading migrations folder:", error);
    throw error;
  }
}


/**
 * Load environment variables using dotenv with standard resolution order:
 * 1. .env (lowest priority)
 * 2. .env.local (overrides .env)
 * 3. process.env (highest priority, overrides all)
 * 
 * dotenv.config() will not override existing process.env values.
 */
function loadEnv(): void {
  // Load .env first (lower priority)
  config({ path: ".env" });
  // Load .env.local (higher priority, but won't override process.env)
  config({ path: ".env.local", override: false });
}

/**
 * Get DATABASE_URL from environment variables.
 * Uses standard resolution order: .env → .env.local → process.env
 * 
 * @throws Error if DATABASE_URL is missing or empty
 */
function getDatabaseUrl(): string {
  // Load environment variables from .env files
  loadEnv();

  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl || databaseUrl.trim() === "") {
    throw new Error("DATABASE_URL environment variable is required but not set");
  }

  return databaseUrl;
}

async function runMigrations() {
  console.log("🔄 Starting migration process...");
  console.log(`📦 Working directory: ${process.cwd()}`);
  console.log(`🔧 Node version: ${process.version}`);

  const databaseUrl = getDatabaseUrl();

  // Log masked database URL
  const maskedUrl = maskDatabaseUrl(databaseUrl);
  console.log(`🔗 Database URL: ${maskedUrl}`);
  console.log(`🔗 Database host: ${new URL(databaseUrl).hostname}`);

  // Check migrations folder exists
  try {
    await checkMigrationsFolder();
  } catch (error) {
    console.error("❌ Migration check failed:", error);
    process.exit(1);
  }

  console.log("🔄 Connecting to database...");
  let client: postgres.Sql | null = null;

  try {
    client = postgres(databaseUrl, { max: 1 });
    const db = drizzle(client);

    console.log("✅ Database connection established");
    console.log("🔄 Running migrations...");

    const startTime = Date.now();
    await migrate(db, { migrationsFolder: "./drizzle/migrations" });
    const duration = Date.now() - startTime;

    console.log(`✅ Migrations completed successfully in ${duration}ms`);

    await client.end();
    console.log("✅ Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:");
    
    if (error instanceof Error) {
      console.error(`   Error name: ${error.name}`);
      console.error(`   Error message: ${error.message}`);
      if (error.stack) {
        console.error(`   Stack trace: ${error.stack}`);
      }
    } else {
      console.error("   Unknown error:", error);
    }

    if (client) {
      try {
        await client.end();
        console.log("✅ Database connection closed after error");
      } catch (closeError) {
        console.error("⚠️  Error closing database connection:", closeError);
      }
    }

    process.exit(1);
  }
}

runMigrations().catch((error) => {
  console.error("❌ Fatal error in migration script:", error);
  process.exit(1);
});
