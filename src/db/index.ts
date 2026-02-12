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

// Cache a minimal db instance for prototype checks during build
// This is only created when DATABASE_URL is not set (during build)
let _prototypeDb: PostgresJsDatabase<typeof schema> | undefined;

/**
 * Drizzle database instance. The underlying Postgres connection is created
 * lazily on first property access so the module can be safely imported at
 * build time without a DATABASE_URL.
 */

function getPrototypeDb(): PostgresJsDatabase<typeof schema> {
  if (!_prototypeDb) {
    // Create a minimal postgres client that won't actually connect
    // This is only used to get the correct prototype for `is()` checks
    // The dummy connection string is valid enough that postgres() won't throw
    const dummyClient = postgres("postgresql://dummy@localhost/dummy", {
      max: 0, // Don't create any connections
      idle_timeout: 0,
      connect_timeout: 0,
    });
    _prototypeDb = drizzle(dummyClient, { schema });
  }
  return _prototypeDb;
}

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
    // During build (when DATABASE_URL may not be set), use a minimal
    // db instance just for the prototype check.
    getPrototypeOf() {
      if (!config.databaseUrl) {
        // During build, use a minimal instance that won't actually connect
        return Object.getPrototypeOf(getPrototypeDb());
      }
      return Object.getPrototypeOf(getDb());
    },
  },
);

