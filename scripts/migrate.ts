#!/usr/bin/env tsx
/**
 * Run database migrations.
 * Used in Railway deployment after build.
 */

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "../src/shared/config";

async function runMigrations() {
  if (!config.databaseUrl) {
    console.log("DATABASE_URL environment variable is not set, skipping migrations");
    console.log("Migrations should be run at deployment time, not during build");
    process.exit(0);
  }

  console.log("Running database migrations...");
  const client = postgres(config.databaseUrl, { max: 1 });
  const db = drizzle(client);

  try {
    await migrate(db, { migrationsFolder: "./drizzle/migrations" });
    console.log("Migrations completed successfully");
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    await client.end();
    process.exit(1);
  }
}

runMigrations();
