#!/usr/bin/env tsx
/**
 * Apply the feedback table migration if it doesn't exist.
 * This is a workaround for when drizzle-kit migrate tries to re-run old migrations.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

async function checkAndApplyFeedbackTable() {
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client);

  try {
    // Check if feedback table exists
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'feedback'
      );
    `) as { rows: Array<{ exists: boolean }> };

    const tableExists = result.rows[0]?.exists;

    if (tableExists) {
      console.log("✅ Feedback table already exists");
      await client.end();
      process.exit(0);
    }

    console.log("📝 Feedback table does not exist, creating it...");

    // Apply the feedback table migration
    await db.execute(sql`
      CREATE TABLE "feedback" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "type" text NOT NULL,
        "subject" text NOT NULL,
        "message" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await db.execute(sql`
      ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" 
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") 
      ON DELETE cascade ON UPDATE no action;
    `);

    // Record the migration in drizzle's migration table (if it exists)
    try {
      await db.execute(sql`
        INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
        VALUES ('0005_sparkling_dragon_man', NOW())
        ON CONFLICT DO NOTHING;
      `);
    } catch (err) {
      // Migration table might not exist or have different structure, that's okay
      console.log("⚠️  Could not record migration in tracking table (this is okay)");
    }

    console.log("✅ Feedback table created successfully");
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to create feedback table:", error);
    await client.end();
    process.exit(1);
  }
}

checkAndApplyFeedbackTable().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
