/**
 * Playwright global setup: create test DB, run migrations, seed equipment.
 * Returns a teardown function that drops the test DB (called after all tests).
 */

import { config } from "dotenv";
import { createTestDb, runMigrations, seedTestDb, dropTestDb } from "./helpers/test-db";

config({ path: ".env.test" });

export default async function globalSetup(): Promise<() => Promise<void>> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("[e2e global-setup] DATABASE_URL not set. Create .env.test with DATABASE_URL=.../coffee_test");
  }

  await createTestDb(databaseUrl);
  await runMigrations(databaseUrl);
  await seedTestDb(databaseUrl);

  return async function globalTeardown(): Promise<void> {
    await dropTestDb(databaseUrl);
  };
}
