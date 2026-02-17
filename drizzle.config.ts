import { readFileSync } from "fs";
import { defineConfig } from "drizzle-kit";

// Load .env.local / .env — drizzle-kit doesn't auto-load like Next.js
for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // file not found, skip
  }
}

function isRunningOnRailway(): boolean {
  return !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY_PUBLIC_DOMAIN;
}

function isRailwayPrivateHostname(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname === "postgres.railway.internal" || hostname.endsWith(".railway.internal");
  } catch {
    return false;
  }
}

function sanitizeDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}:${parsed.port || "5432"}${parsed.pathname}`;
  } catch {
    return url.replace(/:[^:@]*@/, ":***@");
  }
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  console.error("💡 Set DATABASE_URL in .env or .env.local");
  process.exit(1);
}

// Check if using Railway private hostname from outside Railway
if (isRailwayPrivateHostname(DATABASE_URL) && !isRunningOnRailway()) {
  const maskedUrl = sanitizeDatabaseUrl(DATABASE_URL);
  console.warn("⚠️  Warning: DATABASE_URL points to a Railway private hostname");
  console.warn(`   ${maskedUrl}`);
  console.warn("   This hostname is only reachable from inside Railway.");
  console.warn("");
  console.warn("💡 Options:");
  console.warn("   1. Use Railway's PUBLIC database connection string for local development");
  console.warn("      Get it from: Railway Dashboard → Postgres Service → Connect → Public Network");
  console.warn("   2. Use the migrate script instead: pnpm db:migrate:docker");
  console.warn("   3. Run migrations via Railway CLI: railway run pnpm db:migrate");
  console.warn("");
  console.warn("⚠️  drizzle-kit migrate may fail. Consider using scripts/migrate.ts instead.");
  console.warn("");
}

const CONFIG = {
  DATABASE_URL,
};

export default defineConfig({
  out: "./drizzle/migrations",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: CONFIG.DATABASE_URL,
  },
  // Add verbose logging to help debug connection issues
  verbose: true,
  strict: true,
});
