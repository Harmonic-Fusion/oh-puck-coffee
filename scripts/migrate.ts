#!/usr/bin/env tsx
/**
 * Run database migrations.
 * Used in Railway deployment at container startup.
 */

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { existsSync, readFileSync } from "fs";
import { readdir } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";
import { sql } from "drizzle-orm";

// Optional dotenv import - not needed in production where env vars are set directly
let dotenvConfig: ((options?: { path?: string; override?: boolean }) => void) | null = null;
try {
  const dotenv = require("dotenv");
  dotenvConfig = dotenv.config;
} catch {
  // dotenv not available (e.g., in production) - that's fine, we'll use process.env directly
}

function maskDatabaseUrl(url: string): string {
  return url.replace(/:[^:@]*@/, ":***@").replace(/\/\/[^:]*:/, "//***:");
}

async function getMigrationFiles(): Promise<string[]> {
  const migrationsFolder = "./drizzle/migrations";
  
  if (!existsSync(migrationsFolder)) {
    throw new Error(`Migrations folder not found: ${migrationsFolder}`);
  }

  try {
    const files = await readdir(migrationsFolder);
    const sqlFiles = files
      .filter((f) => f.endsWith(".sql"))
      .sort(); // Sort alphabetically to match migration order
    return sqlFiles;
  } catch (error) {
    console.error("❌ Error reading migrations folder:", error);
    throw error;
  }
}

/**
 * Compute the SHA256 hash of a migration file.
 * Drizzle stores the hash of the file content, not the filename.
 */
function getMigrationHash(filename: string): string {
  const migrationsFolder = "./drizzle/migrations";
  const filePath = join(migrationsFolder, filename);
  
  try {
    const fileContent = readFileSync(filePath, "utf-8");
    const hash = createHash("sha256").update(fileContent).digest("hex");
    return hash;
  } catch (error) {
    // If we can't read the file, fall back to filename-based hash
    // This shouldn't happen, but provides a fallback
    console.warn(`⚠️  Could not compute hash for ${filename}, using filename fallback`);
    return filename.replace(".sql", "");
  }
}

async function getAppliedMigrations(db: ReturnType<typeof drizzle>): Promise<Set<string>> {
  try {
    // Check if migration table exists in either 'public' or 'drizzle' schema
    // Drizzle can use either schema depending on configuration
    const tableExistsResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE (table_schema = 'public' OR table_schema = 'drizzle')
        AND table_name = '__drizzle_migrations'
      );
    `);
    
    const tableExists = Array.isArray(tableExistsResult) 
      ? (tableExistsResult[0] as { exists: boolean })?.exists ?? false
      : false;

    if (!tableExists) {
      return new Set();
    }

    // Get applied migrations - try both schemas
    // First try drizzle schema (most common)
    let appliedMigrationsResult;
    let schemaUsed = "unknown";
    try {
      appliedMigrationsResult = await db.execute(sql`
        SELECT hash 
        FROM drizzle.__drizzle_migrations 
        ORDER BY created_at;
      `);
      schemaUsed = "drizzle";
    } catch {
      // If drizzle schema doesn't have it, try public schema
      try {
        appliedMigrationsResult = await db.execute(sql`
          SELECT hash 
          FROM public.__drizzle_migrations 
          ORDER BY created_at;
        `);
        schemaUsed = "public";
      } catch {
        // If neither works, try without schema prefix (defaults to search_path)
        try {
          appliedMigrationsResult = await db.execute(sql`
            SELECT hash 
            FROM __drizzle_migrations 
            ORDER BY created_at;
          `);
          schemaUsed = "search_path";
        } catch (err) {
          // No migrations table found
          return new Set();
        }
      }
    }

    const appliedMigrations = Array.isArray(appliedMigrationsResult)
      ? (appliedMigrationsResult as unknown as Array<{ hash: string }>)
      : [];

    // Debug: log what we found (show first few hashes for debugging)
    if (appliedMigrations.length > 0) {
      const hashList = appliedMigrations.map(r => r.hash).slice(0, 3);
      const more = appliedMigrations.length > 3 ? ` (+${appliedMigrations.length - 3} more)` : "";
      console.log(`   🔍 Found ${appliedMigrations.length} migration(s) in ${schemaUsed} schema${more}`);
    }

    return new Set(appliedMigrations.map((row) => row.hash));
  } catch (error) {
    // If we can't query, assume no migrations applied
    console.warn("⚠️  Could not query applied migrations:", error instanceof Error ? error.message : String(error));
    return new Set();
  }
}

async function checkMigrationsFolder(): Promise<void> {
  const migrationsFolder = "./drizzle/migrations";
  console.log(`📂 Checking migrations folder: ${migrationsFolder}`);
  
  const sqlFiles = await getMigrationFiles();
  console.log(`📊 Found ${sqlFiles.length} migration file(s) in ${migrationsFolder}`);
  
  if (sqlFiles.length === 0) {
    console.log("⚠️  Warning: No SQL migration files found");
  } else {
    console.log("📋 Migration files:");
    sqlFiles.forEach((file, idx) => {
      console.log(`   ${idx + 1}. ${file}`);
    });
  }
}


/**
 * Load environment variables using dotenv with standard resolution order:
 * 1. .env (lowest priority)
 * 2. .env.local (overrides .env)
 * 3. process.env (highest priority, overrides all)
 * 
 * dotenv.config() will not override existing process.env values.
 * If dotenv is not available (e.g., in production), this is a no-op.
 */
function loadEnv(): void {
  if (!dotenvConfig) {
    // dotenv not available - that's fine, we'll use process.env directly
    return;
  }
  // Load .env first (lower priority)
  dotenvConfig({ path: ".env" });
  // Load .env.local (higher priority, but won't override process.env)
  dotenvConfig({ path: ".env.local", override: false });
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
    
    // Get migration status before running
    console.log("\n📊 Migration Status:");
    const migrationFiles = await getMigrationFiles();
    const appliedMigrations = await getAppliedMigrations(db);
    
    const pendingMigrations: string[] = [];
    const alreadyApplied: string[] = [];
    
    migrationFiles.forEach((file) => {
      const hash = getMigrationHash(file);
      if (appliedMigrations.has(hash)) {
        alreadyApplied.push(file);
      } else {
        pendingMigrations.push(file);
      }
    });
    
    console.log(`   📁 Total migration files: ${migrationFiles.length}`);
    console.log(`   ✅ Already applied: ${alreadyApplied.length}`);
    console.log(`   🔄 Pending: ${pendingMigrations.length}`);
    
    if (alreadyApplied.length > 0) {
      console.log("\n   ✅ Applied migrations:");
      alreadyApplied.forEach((file, idx) => {
        console.log(`      ${idx + 1}. ${file}`);
      });
    }
    
    if (pendingMigrations.length > 0) {
      console.log("\n   🔄 Migrations to apply:");
      pendingMigrations.forEach((file, idx) => {
        console.log(`      ${idx + 1}. ${file}`);
      });
    } else {
      console.log("\n   ✨ All migrations are up to date!");
    }
    
    console.log("\n🔄 Running migrations...");

    const startTime = Date.now();
    await migrate(db, { migrationsFolder: "./drizzle/migrations" });
    const duration = Date.now() - startTime;

    // Get migration status after running
    const appliedMigrationsAfter = await getAppliedMigrations(db);
    const newlyApplied = pendingMigrations.filter((file) => {
      const hash = getMigrationHash(file);
      return appliedMigrationsAfter.has(hash);
    });
    
    console.log(`\n✅ Migrations completed successfully in ${duration}ms`);
    
    if (newlyApplied.length > 0) {
      console.log(`\n   ✨ Newly applied migrations:`);
      newlyApplied.forEach((file, idx) => {
        console.log(`      ${idx + 1}. ${file}`);
      });
    }
    
    // Final status
    console.log(`\n📊 Final Status:`);
    console.log(`   ✅ Total applied: ${appliedMigrationsAfter.size} / ${migrationFiles.length}`);
    
    // Diagnostic: Check if migrations table exists and show its contents
    try {
      const diagnosticResult = await db.execute(sql`
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_name = '__drizzle_migrations';
      `);
      const tables = Array.isArray(diagnosticResult)
        ? (diagnosticResult as unknown as Array<{ table_schema: string; table_name: string }>)
        : [];
      if (tables.length > 0) {
        console.log(`\n   🔍 Migration table found in schema(s): ${tables.map(t => t.table_schema).join(", ")}`);
      }
    } catch (err) {
      // Ignore diagnostic errors
    }

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
