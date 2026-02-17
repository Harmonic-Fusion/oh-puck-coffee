#!/usr/bin/env tsx
/**
 * Start script that runs migrations before starting the Next.js server.
 * Used in Railway deployment to ensure migrations run at startup.
 */

import { execSync, spawn } from "child_process";
import { join } from "path";

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log("⚠️  DATABASE_URL not set, skipping migrations");
    return;
  }

  console.log("🔄 Running database migrations...");

  try {
    execSync("drizzle-kit migrate", {
      stdio: "inherit",
      env: process.env,
    });
    console.log("✅ Migrations completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    // Don't exit - let the server start anyway in case migrations partially succeeded
    // This allows the app to run even if there are minor migration issues
    console.log("⚠️  Continuing with server start despite migration error");
  }
}

async function startServer() {
  // Find server.js in the standalone output
  const serverPath = join(process.cwd(), "server.js");
  
  console.log("🚀 Starting Next.js server...");
  
  // Spawn the server process
  const server = spawn("node", [serverPath], {
    stdio: "inherit",
    env: process.env,
  });

  server.on("error", (error) => {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  });

  server.on("exit", (code) => {
    process.exit(code ?? 1);
  });

  // Handle termination signals
  process.on("SIGTERM", () => {
    server.kill("SIGTERM");
  });
  process.on("SIGINT", () => {
    server.kill("SIGINT");
  });
}

async function main() {
  await runMigrations();
  await startServer();
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
