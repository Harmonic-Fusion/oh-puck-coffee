#!/usr/bin/env tsx
/**
 * Run database migrations.
 * Used in Railway deployment at container startup.
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { readdir } from "fs/promises";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

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

async function verifyCriticalColumns(db: ReturnType<typeof drizzle>): Promise<void> {
  console.log("🔍 Verifying critical database columns...");
  
  // Check if users table has is_custom_name column (matches pattern from check-migrations.ts)
  try {
    const isCustomNameExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'is_custom_name'
      );
    `) as { rows: Array<{ exists: boolean }> };

    const isCustomNameColumnExists = isCustomNameExists.rows[0]?.exists;
    if (!isCustomNameColumnExists) {
      console.error("❌ Missing critical column: users.is_custom_name");
      console.error("   Expected from migration: 0003_add_is_custom_name");
      throw new Error("Critical column users.is_custom_name is missing. Migration 0003_add_is_custom_name may not have been applied.");
    } else {
      console.log("✅ Verified: users.is_custom_name exists");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Critical column")) {
      throw error;
    }
    console.error("⚠️  Error checking users.is_custom_name:", error);
    throw error; // Re-throw to fail the migration
  }
  
  console.log("✅ Critical column verification complete");
}

async function runMigrations() {
  console.log("🔄 Starting migration process...");
  console.log(`📦 Working directory: ${process.cwd()}`);
  console.log(`🔧 Node version: ${process.version}`);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log("⚠️  DATABASE_URL environment variable is not set, skipping migrations");
    process.exit(0);
  }

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

  console.log("🔄 Running migrations with drizzle-kit...");

  try {
    const startTime = Date.now();
    execSync("drizzle-kit migrate", {
      stdio: "inherit",
      env: process.env,
    });
    const duration = Date.now() - startTime;

    console.log(`✅ Migrations completed successfully in ${duration}ms`);
    
    // Verify critical columns exist after migrations
    console.log("🔍 Verifying critical database columns...");
    const client = postgres(databaseUrl, { max: 1 });
    const db = drizzle(client);
    
    try {
      await verifyCriticalColumns(db);
      await client.end();
      console.log("✅ Database connection closed");
      process.exit(0);
    } catch (error) {
      console.error("❌ Critical column verification failed:", error);
      await client.end();
      process.exit(1);
    }
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

    process.exit(1);
  }
}

runMigrations().catch((error) => {
  console.error("❌ Fatal error in migration script:", error);
  process.exit(1);
});
