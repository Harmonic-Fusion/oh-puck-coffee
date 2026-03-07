/**
 * Test database lifecycle: create, migrate, truncate, drop.
 * All operations call validateTestEnvironment() first.
 */

import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { validateTestEnvironment } from "./guardrails";
import { grinders, machines, tools } from "../../src/db/schema";

const TEST_DB_NAME = "coffee_test";

function getBaseUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.pathname = "/coffee";
  return url.toString();
}

function getTestDbUrl(databaseUrl: string): string {
  validateTestEnvironment(databaseUrl);
  const url = new URL(databaseUrl);
  url.pathname = `/${TEST_DB_NAME}`;
  return url.toString();
}

/**
 * Returns the test database URL. Validates environment (host, db name, no production).
 */
export function getTestDbUrlFromEnv(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "[e2e test-db] DATABASE_URL is not set. Load .env.test (e.g. in global-setup).",
    );
  }
  return getTestDbUrl(databaseUrl);
}

/**
 * Creates the test database if it does not exist. Connects to the default (coffee) DB.
 */
export async function createTestDb(databaseUrl: string): Promise<void> {
  validateTestEnvironment(databaseUrl);
  const baseUrl = getBaseUrl(databaseUrl);
  const client = postgres(baseUrl, { max: 1 });

  const exists = await client`
    SELECT 1 FROM pg_database WHERE datname = ${TEST_DB_NAME}
  `;
  if (exists.length > 0) {
    await client.end();
    return;
  }

  await client.unsafe(`CREATE DATABASE "${TEST_DB_NAME}"`);
  await client.end();
}

/**
 * Runs Drizzle migrations against the test database.
 */
export async function runMigrations(databaseUrl: string): Promise<void> {
  validateTestEnvironment(databaseUrl);
  const testUrl = getTestDbUrl(databaseUrl);
  const client = postgres(testUrl, { max: 1 });
  const db = drizzle(client);

  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await migrate(db, { migrationsFolder: "./drizzle/migrations" });
  await client.end();
}

const DEFAULT_GRINDERS = [
  "Pre-ground", "Niche Zero", "Eureka Mignon Specialita", "Baratza Sette 270",
  "Comandante C40", "1Zpresso JX-Pro", "DF64", "Mazzer Mini", "Breville Smart Grinder Pro",
];
const DEFAULT_MACHINES = [
  "Breville Barista Express", "La Marzocco Linea Mini", "Gaggia Classic Pro", "Decent DE1",
  "Rancilio Silvia", "Breville Bambino Plus", "Profitec Pro 600", "Lelit Bianca", "Flair 58", "Cafelat Robot",
];
const DEFAULT_TOOLS = [
  { slug: "wdt", name: "WDT", description: "Weiss Distribution Technique" },
  { slug: "puck-screen", name: "Puck Screen", description: "Metal screen on top of puck" },
  { slug: "rdt", name: "RDT", description: "Ross Droplet Technique" },
  { slug: "dosing-cup", name: "Dosing Cup", description: "Weighing and transferring grounds" },
  { slug: "distribution-tool", name: "Wedge Distribution", description: "Leveling tool" },
  { slug: "paper-filter", name: "Paper Filter", description: "Filter paper" },
  { slug: "leveler", name: "Leveler", description: "Leveling the coffee bed" },
];

/**
 * Seeds default equipment (grinders, machines, tools) into the test database. Idempotent.
 */
export async function seedTestDb(databaseUrl: string): Promise<void> {
  validateTestEnvironment(databaseUrl);
  const testUrl = getTestDbUrl(databaseUrl);
  const client = postgres(testUrl, { max: 1 });
  const db = drizzle(client);

  for (const name of DEFAULT_GRINDERS) {
    await db.insert(grinders).values({ name }).onConflictDoNothing({ target: grinders.name });
  }
  for (const name of DEFAULT_MACHINES) {
    await db.insert(machines).values({ name }).onConflictDoNothing({ target: machines.name });
  }
  for (const t of DEFAULT_TOOLS) {
    await db.insert(tools).values({ slug: t.slug, name: t.name, description: t.description })
      .onConflictDoNothing({ target: tools.slug });
  }
  await client.end();
}

/**
 * Truncates all domain and auth tables in the test database. Preserves schema and migrations table.
 */
export async function truncateTables(databaseUrl: string): Promise<void> {
  validateTestEnvironment(databaseUrl);
  const testUrl = getTestDbUrl(databaseUrl);
  const client = postgres(testUrl, { max: 1 });

  await client.unsafe(`
    TRUNCATE
      users,
      accounts,
      sessions,
      verification_tokens,
      origins,
      roasters,
      beans,
      user_beans,
      beans_share,
      grinders,
      machines,
      tools,
      shots,
      shot_shares,
      integrations,
      feedback,
      subscriptions,
      user_entitlements
    RESTART IDENTITY CASCADE
  `);
  await client.end();
}

/**
 * Drops the test database. Terminates existing connections first.
 */
export async function dropTestDb(databaseUrl: string): Promise<void> {
  validateTestEnvironment(databaseUrl);
  const baseUrl = getBaseUrl(databaseUrl);
  const client = postgres(baseUrl, { max: 1 });

  await client.unsafe(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '${TEST_DB_NAME}'
      AND pid <> pg_backend_pid()
  `);
  await client.unsafe(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}"`);
  await client.end();
}
