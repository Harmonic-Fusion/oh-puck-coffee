#!/usr/bin/env tsx
/**
 * Run database migrations.
 * Used in Railway deployment at container startup.
 */

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log("DATABASE_URL environment variable is not set, skipping migrations");
    process.exit(0);
  }

  console.log("Running database migrations...");
  const client = postgres(databaseUrl, { max: 1 });
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
