#!/usr/bin/env tsx
/**
 * Check migration status and verify schema matches.
 * Helps diagnose why migrations might say they ran but database errors occur.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "../src/shared/config";
import { sql } from "drizzle-orm";

function isRailwayPrivateHostname(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname === "postgres.railway.internal" || hostname.endsWith(".railway.internal");
  } catch {
    return false;
  }
}

async function checkMigrations() {
  if (!config.databaseUrl) {
    console.error("❌ DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  // Check if we're trying to connect to a Railway private hostname from outside Railway
  if (isRailwayPrivateHostname(config.databaseUrl)) {
    console.error("❌ Cannot connect to Railway private hostname from local machine");
    console.error(`   Hostname: ${new URL(config.databaseUrl).hostname}\n`);
    console.error("💡 Solutions:");
    console.error("   1. Use Railway's PUBLIC database connection string (from Railway dashboard)");
    console.error("      Set DATABASE_URL to the public connection string for local checks");
    console.error("   2. Or check migrations from within Railway:");
    console.error("      - Go to Railway dashboard → Your service → Deployments → View Logs");
    console.error("      - Look for migration output in the build logs");
    console.error("   3. Or use Railway shell:");
    console.error("      railway shell");
    console.error("      pnpm db:check");
    process.exit(1);
  }

  console.log("🔍 Checking database migration status...\n");
  const client = postgres(config.databaseUrl, { max: 1 });
  const db = drizzle(client);

  try {
    // Check if __drizzle_migrations table exists
    const migrationsTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '__drizzle_migrations'
      );
    `) as { rows: Array<{ exists: boolean }> };

    const tableExists = migrationsTableExists.rows[0]?.exists;
    if (!tableExists) {
      console.log("⚠️  Migration tracking table doesn't exist yet.");
      console.log("   This means no migrations have been run.\n");
      console.log("💡 Run: pnpm db:migrate (or migrations will run on next deploy)\n");
      await client.end();
      process.exit(1);
    }

    // Get applied migrations
    const appliedMigrations = await db.execute(sql`
      SELECT hash, created_at 
      FROM __drizzle_migrations 
      ORDER BY created_at;
    `) as { rows: Array<{ hash: string; created_at: Date }> };

    console.log(`✅ Found ${appliedMigrations.rows.length} applied migration(s):`);
    appliedMigrations.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.hash} (${row.created_at})`);
    });

    // Check for common schema issues
    console.log("\n🔍 Checking for common schema issues...\n");

    // Check if shots table has flow_control column
    const flowControlExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'shots' 
        AND column_name = 'flow_control'
      );
    `) as { rows: Array<{ exists: boolean }> };

    const flowControlColumnExists = flowControlExists.rows[0]?.exists;
    if (!flowControlColumnExists) {
      console.log("⚠️  Missing column: shots.flow_control");
      console.log("   This should have been added in migration 0001_phase3_schema_changes\n");
    } else {
      console.log("✅ shots.flow_control exists");
    }

    // Check if shots table has flow_rate column
    const flowRateExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'shots' 
        AND column_name = 'flow_rate'
      );
    `) as { rows: Array<{ exists: boolean }> };

    const flowRateColumnExists = flowRateExists.rows[0]?.exists;
    if (!flowRateColumnExists) {
      console.log("⚠️  Missing column: shots.flow_rate");
      console.log("   This should have been added in migration 0000_kind_spacker_dave\n");
    } else {
      console.log("✅ shots.flow_rate exists");
    }

    // Check if users table has is_custom_name column
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
      console.log("⚠️  Missing column: users.is_custom_name");
      console.log("   This should have been added in migration 0003_add_is_custom_name\n");
    } else {
      console.log("✅ users.is_custom_name exists");
    }

    console.log("\n💡 If columns are missing, try:");
    console.log("   1. Check Railway build logs for migration errors");
    console.log("   2. Manually run: railway run pnpm db:migrate");
    console.log("   3. Or in emergency: railway run pnpm db:push (NOT recommended)");

    await client.end();
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCause = error instanceof Error && error.cause ? String(error.cause) : "";
    
    // Check if this is a connection error to Railway private hostname
    if (errorMessage.includes("ENOTFOUND") && errorCause.includes("railway.internal")) {
      console.error("❌ Cannot connect to Railway private hostname from local machine\n");
      console.error("💡 Solutions:");
      console.error("   1. Use Railway's PUBLIC database connection string");
      console.error("      Get it from: Railway Dashboard → Postgres Service → Connect → Public Network");
      console.error("   2. Check migrations from Railway build logs instead");
      console.error("   3. Use Railway shell: railway shell → pnpm db:check");
    } else if (errorMessage.includes("DATABASE_URL points to a Railway private hostname")) {
      // This error comes from config.ts validation
      console.error(`❌ ${errorMessage}\n`);
      console.error("💡 Use Railway's PUBLIC Postgres connection string for local checks");
    } else {
      console.error("❌ Error checking migrations:");
      console.error(error instanceof Error ? error.stack : errorMessage);
    }
    
    await client.end();
    process.exit(1);
  }
}

checkMigrations();
