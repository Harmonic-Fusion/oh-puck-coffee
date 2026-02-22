import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "../src/db/schema";
import { config } from "dotenv";
import { DEV_USER_ID, DEV_USER_NAME, DEV_USER_EMAIL } from "../src/shared/dev-user";
import { eq } from "drizzle-orm";

function loadEnv(): void {
  config({ path: ".env" });
  config({ path: ".env.local", override: false });
}

function getDatabaseUrl(): string {
  loadEnv();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.trim() === "") {
    throw new Error("DATABASE_URL environment variable is required but not set");
  }
  return databaseUrl;
}

const client = postgres(getDatabaseUrl());
const db = drizzle(client);

async function ensureDevUser() {
  console.log("Ensuring dev user exists...\n");

  // Check if dev user already exists
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, DEV_USER_ID))
    .limit(1);

  if (existing) {
    console.log(`  ✓ Dev user already exists with ID: ${DEV_USER_ID}`);
    await client.end();
    return;
  }

  console.log(`  · Dev user not found, checking for email conflict...`);

  // Check if there's a user with the dev email but different ID
  const [conflictingUser] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.email, DEV_USER_EMAIL))
    .limit(1);

  if (conflictingUser) {
    console.log(`  ⚠ Found conflicting user with email ${DEV_USER_EMAIL}:`);
    console.log(`    ID: ${conflictingUser.id}`);
    console.log(`    Name: ${conflictingUser.name || "(no name)"}`);
    console.log(`  · Deleting conflicting user...`);
    
    // Delete the conflicting user (this will cascade delete related records)
    await db.delete(users).where(eq(users.id, conflictingUser.id));
    console.log(`  ✓ Deleted conflicting user`);
  }

  // Create the dev user
  console.log(`  · Creating dev user...`);
  try {
    await db.insert(users).values({
      id: DEV_USER_ID,
      name: DEV_USER_NAME,
      email: DEV_USER_EMAIL,
      role: "admin",
    });
    console.log(`  ✓ Dev user created successfully!`);
    console.log(`    ID: ${DEV_USER_ID}`);
    console.log(`    Name: ${DEV_USER_NAME}`);
    console.log(`    Email: ${DEV_USER_EMAIL}`);
    console.log(`    Role: admin`);
  } catch (error) {
    console.error("  ✗ Failed to create dev user:", error);
    throw error;
  }

  await client.end();
}

ensureDevUser().catch((err) => {
  console.error("Failed to ensure dev user:", err);
  process.exit(1);
});
