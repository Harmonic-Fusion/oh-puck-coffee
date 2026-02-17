#!/usr/bin/env tsx
/**
 * Run migrations via Docker container (same connection method as db:psql).
 * This script pipes SQL files directly through docker compose exec, avoiding
 * connection issues with drizzle-kit.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { execSync, spawn } from "child_process";

const MIGRATIONS_FOLDER = "./drizzle/migrations";
const DB_USER = process.env.DB_USER || "coffee";
const DB_NAME = process.env.DB_NAME || "coffee";

function getMigrationFiles(): string[] {
  const files = readdirSync(MIGRATIONS_FOLDER)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  return files;
}

function runSQLFile(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Read SQL file
    const sql = readFileSync(filePath, "utf-8");
    
    // Spawn docker compose exec with stdin
    const proc = spawn("docker", [
      "compose",
      "exec",
      "-T",
      "db",
      "psql",
      "-U",
      DB_USER,
      "-d",
      DB_NAME,
    ], {
      stdio: ["pipe", "inherit", "inherit"],
    });
    
    proc.stdin.write(sql);
    proc.stdin.end();
    
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`psql exited with code ${code}`));
      }
    });
    
    proc.on("error", (error) => {
      reject(error);
    });
  });
}

function checkMigrationTable(): boolean {
  try {
    const result = execSync(
      `docker compose exec -T db psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '__drizzle_migrations');"`,
      { encoding: "utf-8" }
    );
    return result.trim() === "t";
  } catch {
    return false;
  }
}

function createMigrationTable(): void {
  console.log("📋 Creating migration tracking table...");
  const createTableSQL = `CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
    id SERIAL PRIMARY KEY,
    hash text NOT NULL,
    created_at bigint
  );`;
  
  execSync(
    `docker compose exec -T db psql -U ${DB_USER} -d ${DB_NAME} -c "${createTableSQL}"`,
    { encoding: "utf-8" }
  );
}

function getAppliedMigrations(): Set<string> {
  if (!checkMigrationTable()) {
    return new Set();
  }
  
  try {
    const result = execSync(
      `docker compose exec -T db psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT hash FROM __drizzle_migrations;"`,
      { encoding: "utf-8" }
    );
    const hashes = result
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    return new Set(hashes);
  } catch {
    return new Set();
  }
}

function recordMigration(hash: string): void {
  const insertSQL = `INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('${hash}', ${Date.now()});`;
  execSync(
    `docker compose exec -T db psql -U ${DB_USER} -d ${DB_NAME} -c "${insertSQL}"`,
    { encoding: "utf-8" }
  );
}

function getMigrationHash(filename: string): string {
  // Use the migration tag from the filename (e.g., "0000_faithful_otto_octavius")
  return filename.replace(".sql", "");
}

async function runMigrations() {
  console.log("🔄 Running migrations via Docker (same connection as db:psql)...");
  console.log(`📦 Database: ${DB_NAME}, User: ${DB_USER}`);
  
  // Check/create migration table
  if (!checkMigrationTable()) {
    createMigrationTable();
  }
  
  const applied = getAppliedMigrations();
  const files = getMigrationFiles();
  
  console.log(`📊 Found ${files.length} migration file(s)`);
  console.log(`✅ ${applied.size} migration(s) already applied\n`);
  
  for (const file of files) {
    const hash = getMigrationHash(file);
    
    if (applied.has(hash)) {
      console.log(`⏭️  Skipping ${file} (already applied)`);
      continue;
    }
    
    console.log(`🔄 Applying ${file}...`);
    const filePath = join(MIGRATIONS_FOLDER, file);
    
    try {
      await runSQLFile(filePath);
      recordMigration(hash);
      console.log(`✅ Applied ${file}\n`);
    } catch (error) {
      console.error(`❌ Failed to apply ${file}`);
      throw error;
    }
  }
  
  console.log("✅ All migrations completed!");
}

runMigrations().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});
