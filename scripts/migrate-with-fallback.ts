#!/usr/bin/env tsx
/**
 * Migration script with fallback: tries drizzle-kit migrate first,
 * falls back to scripts/migrate.ts if that fails.
 * Useful when Railway private hostnames cause connection issues.
 */

import { execSync } from "child_process";

function isRailwayPrivateHostname(): boolean {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return false;
  
  try {
    const hostname = new URL(databaseUrl).hostname;
    return hostname === "postgres.railway.internal" || hostname.endsWith(".railway.internal");
  } catch {
    return false;
  }
}

function isRunningOnRailway(): boolean {
  return !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY_PUBLIC_DOMAIN;
}

async function runMigrations() {
  console.log("🔄 Running database migrations...");
  
  // If using Railway private hostname and not on Railway, skip drizzle-kit
  if (isRailwayPrivateHostname() && !isRunningOnRailway()) {
    console.log("⚠️  Detected Railway private hostname from outside Railway");
    console.log("💡 Using migrate script instead of drizzle-kit");
    console.log("");
    
    try {
      execSync("tsx scripts/migrate.ts", { stdio: "inherit" });
      console.log("✅ Migrations completed successfully");
      process.exit(0);
    } catch (error) {
      console.error("❌ Migration script failed");
      process.exit(1);
    }
  }
  
  // Try drizzle-kit migrate first
  console.log("🔄 Attempting drizzle-kit migrate...");
  try {
    execSync("drizzle-kit migrate", { stdio: "inherit" });
    console.log("✅ Migrations completed successfully");
    process.exit(0);
  } catch (error) {
    console.log("");
    console.log("⚠️  drizzle-kit migrate failed");
    console.log("💡 Trying fallback migration script...");
    console.log("");
    
    try {
      execSync("tsx scripts/migrate.ts", { stdio: "inherit" });
      console.log("✅ Migrations completed successfully (via fallback)");
      process.exit(0);
    } catch (fallbackError) {
      console.error("❌ Both migration methods failed");
      process.exit(1);
    }
  }
}

runMigrations().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
