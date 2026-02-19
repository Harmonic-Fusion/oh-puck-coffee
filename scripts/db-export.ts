#!/usr/bin/env tsx
/**
 * Export a SQL backup of the PostgreSQL database.
 *
 * Usage:  pnpm db:export
 * Output: ./data/{YYYY-MM-DD}/backup-{HH-MM-SS}.sql
 *
 * Runs pg_dump via Docker (postgres:17-alpine) to avoid local version
 * mismatch issues. Falls back to local pg_dump if Docker is unavailable.
 */

import { execSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { readEnvDatabaseUrl } from "../src/lib/dot-env";

const DATABASE_URL = readEnvDatabaseUrl();

// ---------------------------------------------------------------------------
// Build output path: ./data/{YYYY-MM-DD}/backup-{HH-MM-SS}.sql
// ---------------------------------------------------------------------------
const now = new Date();
const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
const time = now.toTimeString().slice(0, 8).replace(/:/g, "-"); // HH-MM-SS
const dir = resolve("data", date);
const filename = `backup-${time}.sql`;
const outPath = resolve(dir, filename);

mkdirSync(dir, { recursive: true });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Rewrite localhost / 127.0.0.1 URLs so they're reachable from inside Docker. */
function dockerFriendlyUrl(url: string): string {
  return url
    .replace("://localhost", "://host.docker.internal")
    .replace("://127.0.0.1", "://host.docker.internal");
}

function hasDocker(): boolean {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Run pg_dump
// ---------------------------------------------------------------------------
console.log(`📦 Exporting database to ${outPath} …`);

try {
  if (hasDocker()) {
    // Run pg_dump inside a matching-version Docker container, pipe stdout to file.
    const dbUrl = dockerFriendlyUrl(DATABASE_URL);
    const sql = execSync(
      `docker run --rm postgres:17-alpine pg_dump "${dbUrl}" --no-owner --no-acl`,
      { maxBuffer: 256 * 1024 * 1024 }, // 256 MB
    );
    writeFileSync(outPath, sql);
  } else {
    // Fallback: local pg_dump (must be version-compatible with the server).
    console.log("⚠️  Docker not available — falling back to local pg_dump");
    execSync(
      `pg_dump "${DATABASE_URL}" --no-owner --no-acl -f "${outPath}"`,
      { stdio: "inherit" },
    );
  }
  console.log(`✅ Export complete → ${outPath}`);
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`❌ pg_dump failed: ${message}`);
  process.exit(1);
}
