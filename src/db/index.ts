import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { config } from "@/shared/config";

function requireDatabaseUrl(): string {
  if (!config.databaseUrl) {
    throw new Error(
      "[db] DATABASE_URL is required but was not set. " +
        "For local development using the included docker-compose Postgres, " +
        'set DATABASE_URL to "postgresql://coffee:coffee@localhost:8788/coffee".'
    );
  }
  return config.databaseUrl;
}

// Lazy-initialised so that importing this module during `next build`
// (which has no DATABASE_URL) doesn't crash.
let _db: PostgresJsDatabase<typeof schema> | undefined;

function getDb(): PostgresJsDatabase<typeof schema> {
  if (!_db) {
    const client = postgres(requireDatabaseUrl());
    _db = drizzle(client, { schema });
  }
  return _db;
}

/**
 * Drizzle database instance. The underlying Postgres connection is created
 * lazily on first property access so the module can be safely imported at
 * build time without a DATABASE_URL.
 */
export const db: PostgresJsDatabase<typeof schema> = new Proxy(
  {} as PostgresJsDatabase<typeof schema>,
  {
    get(_target, prop, receiver) {
      const real = getDb();
      const value = Reflect.get(real, prop, receiver);
      return typeof value === "function" ? value.bind(real) : value;
    },
    // DrizzleAdapter uses Drizzle's `is()` helper which walks the
    // prototype chain via Object.getPrototypeOf / instanceof.
    // Without this trap those checks see the bare `{}` target and fail
    // with "Unsupported database type (object)".
    getPrototypeOf() {
      return Object.getPrototypeOf(getDb());
    },
  },
);
