import { drizzle } from "drizzle-orm/postgres-js";
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

const client = postgres(requireDatabaseUrl());

export const db = drizzle(client, { schema });
