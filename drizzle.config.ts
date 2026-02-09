import { defineConfig } from "drizzle-kit";

const CONFIG = {
  DATABASE_URL: process.env.DATABASE_URL!,
};

export default defineConfig({
  out: "./drizzle/migrations",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: CONFIG.DATABASE_URL,
  },
});
