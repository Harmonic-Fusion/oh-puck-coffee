#!/usr/bin/env tsx
/**
 * One-off script to fix flavor columns after migration 0004 was applied.
 * This script:
 * 1. Ensures new columns exist (flavors, body_texture, adjectives)
 * 2. Migrates data from old columns to new if needed
 * 3. Drops old columns (flavor_wheel_categories, flavor_wheel_body, flavor_wheel_adjectives, flavor_data)
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { config } from "@/shared/config";

if (!config.databaseUrl) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

async function fixFlavorColumns() {
  console.log("🔄 Fixing flavor columns...");
  console.log(`🔗 Database: ${new URL(config.databaseUrl).hostname}`);

  const client = postgres(config.databaseUrl, { max: 1 });
  const db = drizzle(client);

  try {
    // Step 1: Ensure new columns exist
    console.log("\n📝 Step 1: Ensuring new columns exist...");
    
    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'flavors'
        ) THEN
          ALTER TABLE "shots" ADD COLUMN "flavors" jsonb;
          RAISE NOTICE 'Added flavors column';
        END IF;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'body_texture'
        ) THEN
          ALTER TABLE "shots" ADD COLUMN "body_texture" jsonb;
          RAISE NOTICE 'Added body_texture column';
        END IF;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'adjectives'
        ) THEN
          ALTER TABLE "shots" ADD COLUMN "adjectives" jsonb;
          RAISE NOTICE 'Added adjectives column';
        END IF;
      END $$;
    `);

    console.log("✅ New columns verified");

    // Step 2: Migrate data from old columns to new if needed
    console.log("\n📝 Step 2: Migrating data from old columns...");

    // Migrate from flavor_data if it exists
    await db.execute(sql`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'flavor_data'
        ) THEN
          UPDATE "shots"
          SET
            "flavors" = COALESCE("flavors", ("flavor_data"->>'flavors')::jsonb),
            "body_texture" = COALESCE("body_texture", ("flavor_data"->>'body')::jsonb),
            "adjectives" = COALESCE("adjectives", ("flavor_data"->>'adjectives')::jsonb)
          WHERE "flavor_data" IS NOT NULL
            AND ("flavors" IS NULL OR "body_texture" IS NULL OR "adjectives" IS NULL);
          RAISE NOTICE 'Migrated data from flavor_data';
        END IF;
      END $$;
    `);

    // Migrate from flavor_wheel_categories
    await db.execute(sql`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'flavor_wheel_categories'
        ) THEN
          UPDATE "shots"
          SET "flavors" = COALESCE("flavors", (
            SELECT jsonb_agg(elem)
            FROM jsonb_each("flavor_wheel_categories") AS cat,
            LATERAL jsonb_array_elements_text(cat.value) AS elem
          ))
          WHERE "flavor_wheel_categories" IS NOT NULL AND "flavors" IS NULL;
          RAISE NOTICE 'Migrated data from flavor_wheel_categories';
        END IF;
      END $$;
    `);

    // Migrate from flavor_wheel_body
    await db.execute(sql`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'flavor_wheel_body'
        ) THEN
          UPDATE "shots"
          SET "body_texture" = COALESCE("body_texture", 
            CASE 
              WHEN "flavor_wheel_body" IS NOT NULL THEN jsonb_build_array("flavor_wheel_body")
              ELSE NULL
            END
          )
          WHERE "flavor_wheel_body" IS NOT NULL AND "body_texture" IS NULL;
          RAISE NOTICE 'Migrated data from flavor_wheel_body';
        END IF;
      END $$;
    `);

    // Migrate from flavor_wheel_adjectives
    await db.execute(sql`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'flavor_wheel_adjectives'
        ) THEN
          UPDATE "shots"
          SET "adjectives" = COALESCE("adjectives", "flavor_wheel_adjectives")
          WHERE "flavor_wheel_adjectives" IS NOT NULL AND "adjectives" IS NULL;
          RAISE NOTICE 'Migrated data from flavor_wheel_adjectives';
        END IF;
      END $$;
    `);

    console.log("✅ Data migration completed");

    // Step 3: Drop indexes on old columns
    console.log("\n📝 Step 3: Dropping indexes on old columns...");
    
    await db.execute(sql`
      DO $$ 
      DECLARE
        idx_record RECORD;
      BEGIN
        FOR idx_record IN 
          SELECT indexname 
          FROM pg_indexes 
          WHERE schemaname = 'public' 
            AND tablename = 'shots'
            AND (
              indexname LIKE '%flavor_data%' OR
              indexname LIKE '%flavor_wheel_categories%' OR
              indexname LIKE '%flavor_wheel_body%' OR
              indexname LIKE '%flavor_wheel_adjectives%'
            )
        LOOP
          EXECUTE format('DROP INDEX IF EXISTS %I', idx_record.indexname);
          RAISE NOTICE 'Dropped index: %', idx_record.indexname;
        END LOOP;
      END $$;
    `);

    // Step 4: Drop check constraints on old columns
    console.log("\n📝 Step 4: Dropping constraints on old columns...");
    
    await db.execute(sql`
      DO $$ 
      DECLARE
        constraint_record RECORD;
      BEGIN
        FOR constraint_record IN 
          SELECT conname
          FROM pg_constraint
          WHERE conrelid = 'public.shots'::regclass
            AND contype = 'c'
            AND (
              pg_get_constraintdef(oid) LIKE '%flavor_data%' OR
              pg_get_constraintdef(oid) LIKE '%flavor_wheel_categories%' OR
              pg_get_constraintdef(oid) LIKE '%flavor_wheel_body%' OR
              pg_get_constraintdef(oid) LIKE '%flavor_wheel_adjectives%'
            )
        LOOP
          EXECUTE format('ALTER TABLE "shots" DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
          RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
        END LOOP;
      END $$;
    `);

    // Step 5: Drop old columns
    console.log("\n📝 Step 5: Dropping old columns...");

    await db.execute(sql`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'flavor_data'
        ) THEN
          ALTER TABLE "shots" DROP COLUMN "flavor_data";
          RAISE NOTICE 'Dropped column: flavor_data';
        END IF;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'flavor_wheel_categories'
        ) THEN
          ALTER TABLE "shots" DROP COLUMN "flavor_wheel_categories";
          RAISE NOTICE 'Dropped column: flavor_wheel_categories';
        END IF;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'flavor_wheel_body'
        ) THEN
          ALTER TABLE "shots" DROP COLUMN "flavor_wheel_body";
          RAISE NOTICE 'Dropped column: flavor_wheel_body';
        END IF;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'flavor_wheel_adjectives'
        ) THEN
          ALTER TABLE "shots" DROP COLUMN "flavor_wheel_adjectives";
          RAISE NOTICE 'Dropped column: flavor_wheel_adjectives';
        END IF;
      END $$;
    `);

    console.log("✅ Old columns dropped");

    console.log("\n✅ Flavor columns fix completed successfully!");
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing flavor columns:");
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      if (error.stack) {
        console.error(`   ${error.stack}`);
      }
    } else {
      console.error("   Unknown error:", error);
    }
    await client.end();
    process.exit(1);
  }
}

fixFlavorColumns().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
