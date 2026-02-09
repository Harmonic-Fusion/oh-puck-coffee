import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const CONFIG = {
  DATABASE_URL: process.env.DATABASE_URL!,
};

const client = postgres(CONFIG.DATABASE_URL);

export const db = drizzle(client, { schema });
