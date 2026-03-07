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
  const dotenv = await import("dotenv");
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
  } catch {
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
        } catch {
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
      const more = appliedMigrations.length > 3 ? ` (+${appliedMigrations.length - 3} more)` : "";
      console.log(`   🔍 Found ${appliedMigrations.length} migration(s) in ${schemaUsed} schema${more}`);
      // Show all hashes for debugging
      if (appliedMigrations.length <= 10) {
        console.log(`   📋 Applied hashes: ${appliedMigrations.map(r => r.hash).join(", ")}`);
      }
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
      client = postgres(databaseUrl, { max: 1, connect_timeout: 5 });
      const db = drizzle(client);

      // Health check: verify DB is reachable before running migrations
      try {
        await client`SELECT 1`;
        console.log("✅ Database connection established");
      } catch {
        const { hostname, port } = new URL(databaseUrl);
        console.error(`❌ Cannot connect to database at ${hostname}:${port}`);
        console.error("💡 Make sure the database is running:");
        console.error("   docker-compose up db -d");
        await client.end();
        process.exit(1);
      }

      // Ensure drizzle schema exists (Drizzle migrator requires it)
      try {
        await db.execute(sql`CREATE SCHEMA IF NOT EXISTS drizzle`);
        console.log("✅ Drizzle schema ready");
      } catch (schemaError) {
        // If schema creation fails, check if it already exists
        const schemaExists = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.schemata 
            WHERE schema_name = 'drizzle'
          );
        `);
        const exists = Array.isArray(schemaExists) 
          ? (schemaExists[0] as { exists: boolean })?.exists ?? false
          : false;
        
        if (!exists) {
          console.error("❌ Failed to create drizzle schema and it doesn't exist");
          console.error("💡 The database user needs CREATE SCHEMA permission");
          console.error("   You can grant it with: GRANT CREATE ON DATABASE coffee TO your_user;");
          console.error("   Or create the schema manually: CREATE SCHEMA drizzle;");
          throw schemaError;
        } else {
          console.log("✅ Drizzle schema already exists");
        }
      }
    
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
    try {
      await migrate(db, { migrationsFolder: "./drizzle/migrations" });
    } catch (error) {
      console.error("❌ Drizzle migrate() threw an error:");
      if (error instanceof Error) {
        console.error(`   Error name: ${error.name}`);
        console.error(`   Error message: ${error.message}`);
        if (error.stack) {
          console.error(`   Stack trace: ${error.stack}`);
        }
      } else {
        console.error("   Unknown error:", error);
      }
      throw error;
    }
    const duration = Date.now() - startTime;

    // Get migration status after running
    const appliedMigrationsAfter = await getAppliedMigrations(db);
    const newlyApplied = pendingMigrations.filter((file) => {
      const hash = getMigrationHash(file);
      return appliedMigrationsAfter.has(hash);
    });
    
    // Debug: Show hash comparison for pending migrations
    if (pendingMigrations.length > 0 && newlyApplied.length === 0) {
      console.log(`\n⚠️  Warning: ${pendingMigrations.length} migration(s) were not applied:`);
      pendingMigrations.forEach((file) => {
        const hash = getMigrationHash(file);
        console.log(`   - ${file}`);
        console.log(`     Expected hash: ${hash}`);
        console.log(`     In applied set: ${appliedMigrationsAfter.has(hash)}`);
        // Show all applied hashes for comparison
        if (appliedMigrationsAfter.size > 0 && appliedMigrationsAfter.size <= 10) {
          const appliedHashes = Array.from(appliedMigrationsAfter);
          console.log(`     Applied hashes in DB: ${appliedHashes.join(", ")}`);
        }
      });
      
      // Try to manually apply pending migrations that Drizzle skipped
      console.log(`\n🔄 Attempting to manually apply skipped migrations...`);
      for (const file of pendingMigrations) {
        const hash = getMigrationHash(file);
        const filePath = join("./drizzle/migrations", file);
        
        try {
          // Read and execute the migration SQL
          const migrationSQL = readFileSync(filePath, "utf-8");
          console.log(`   📝 Executing ${file}...`);
          await db.execute(sql.raw(migrationSQL));
          
          // Record the migration in the migrations table
          // created_at is a bigint (Unix timestamp in milliseconds)
          const timestamp = BigInt(Date.now());
          let recorded = false;
          
          // Check if already recorded
          const checkResult = await db.execute(sql`
            SELECT hash FROM drizzle.__drizzle_migrations WHERE hash = ${hash}
          `);
          const alreadyRecorded = Array.isArray(checkResult) && checkResult.length > 0;
          
          if (alreadyRecorded) {
            console.log(`   ✅ Migration already recorded in drizzle schema`);
            recorded = true;
          } else {
            try {
              await db.execute(sql`
                INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
                VALUES (${hash}, ${timestamp})
              `);
              console.log(`   ✅ Successfully applied and recorded ${file} (in drizzle schema)`);
              recorded = true;
            } catch {
              // Try public schema
              try {
                const checkPublic = await db.execute(sql`
                  SELECT hash FROM public.__drizzle_migrations WHERE hash = ${hash}
                `);
                const alreadyInPublic = Array.isArray(checkPublic) && checkPublic.length > 0;
                
                if (alreadyInPublic) {
                  console.log(`   ✅ Migration already recorded in public schema`);
                  recorded = true;
                } else {
                  await db.execute(sql`
                    INSERT INTO public.__drizzle_migrations (hash, created_at)
                    VALUES (${hash}, ${timestamp})
                  `);
                  console.log(`   ✅ Successfully applied and recorded ${file} (in public schema)`);
                  recorded = true;
                }
              } catch (publicError) {
                console.error(`   ❌ Failed to record ${file} in migrations table`);
                if (publicError instanceof Error) {
                  console.error(`      Error name: ${publicError.name}`);
                  console.error(`      Error message: ${publicError.message}`);
                  if ('cause' in publicError && publicError.cause instanceof Error) {
                    console.error(`      Cause: ${publicError.cause.message}`);
                  }
                } else {
                  console.error(`      Error: ${String(publicError)}`);
                }
              }
            }
          }
          
          if (!recorded) {
            console.log(`   ⚠️  Migration SQL executed but not recorded. You may need to manually insert the hash.`);
          }
        } catch (error) {
          console.error(`   ❌ Failed to apply ${file}:`);
          console.error(`      Error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      // Re-check applied migrations after manual application
      const appliedMigrationsFinal = await getAppliedMigrations(db);
      const finalNewlyApplied = pendingMigrations.filter((file) => {
        const hash = getMigrationHash(file);
        return appliedMigrationsFinal.has(hash);
      });
      
      if (finalNewlyApplied.length > 0) {
        console.log(`\n   ✨ Successfully manually applied ${finalNewlyApplied.length} migration(s):`);
        finalNewlyApplied.forEach((file, idx) => {
          console.log(`      ${idx + 1}. ${file}`);
        });
      }
    }
    
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
    } catch {
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
