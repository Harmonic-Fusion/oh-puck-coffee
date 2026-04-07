-- Unify beans sharing: beans_share as single participation table, shots.share_slug, drop user_beans & shot_shares.
-- Idempotent: safe to run multiple times. Order: add columns → migrate data → drop old.

-- ========== Step 1: Add new columns ==========

-- beans: updated_at, updated_by
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beans' AND column_name = 'updated_at') THEN
    ALTER TABLE "beans" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beans' AND column_name = 'updated_by') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id' AND udt_name = 'uuid'
    ) THEN
      ALTER TABLE "beans" ADD COLUMN "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
    ELSE
      ALTER TABLE "beans" ADD COLUMN "updated_by" text REFERENCES "users"("id") ON DELETE SET NULL;
    END IF;
  END IF;
END $$;
--> statement-breakpoint
-- beans_share: shot_history_access, reshare_allowed, beans_open_date, updated_at
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beans_share' AND column_name = 'shot_history_access') THEN
    ALTER TABLE "beans_share" ADD COLUMN "shot_history_access" text DEFAULT 'restricted' NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beans_share' AND column_name = 'reshare_allowed') THEN
    ALTER TABLE "beans_share" ADD COLUMN "reshare_allowed" boolean DEFAULT false NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beans_share' AND column_name = 'beans_open_date') THEN
    ALTER TABLE "beans_share" ADD COLUMN "beans_open_date" timestamp;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beans_share' AND column_name = 'updated_at') THEN
    ALTER TABLE "beans_share" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
-- shots: share_slug
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'share_slug') THEN
    ALTER TABLE "shots" ADD COLUMN "share_slug" text UNIQUE;
  END IF;
END $$;
--> statement-breakpoint
-- user_entitlements: deleted_at
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_entitlements' AND column_name = 'deleted_at') THEN
    ALTER TABLE "user_entitlements" ADD COLUMN "deleted_at" timestamp;
  END IF;
END $$;

--> statement-breakpoint

-- ========== Step 2: Backfill beans_share new columns from old (where old columns exist) ==========
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beans_share' AND column_name = 'share_shot_history')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beans_share' AND column_name = 'reshare_enabled') THEN
    UPDATE "beans_share" SET
      "shot_history_access" = CASE WHEN "share_shot_history" = true THEN 'anyone_with_link' ELSE 'restricted' END,
      "reshare_allowed" = "reshare_enabled",
      "updated_at" = "created_at";
  END IF;
END $$;

--> statement-breakpoint

-- ========== Step 3: Migrate beans.created_by → owner rows in beans_share ==========
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beans' AND column_name = 'created_by') THEN
    INSERT INTO "beans_share" (
      "bean_id", "user_id", "invited_by", "status",
      "shot_history_access", "reshare_allowed", "created_at", "updated_at"
    )
    SELECT b."id", b."created_by", NULL, 'owner', 'restricted', false, b."created_at", b."created_at"
    FROM "beans" b
    WHERE b."created_by" IS NOT NULL
    ON CONFLICT (bean_id, user_id) DO UPDATE SET
      "status" = 'owner',
      "invited_by" = NULL;
  END IF;
END $$;

--> statement-breakpoint

-- ========== Step 4: Migrate user_beans → beans_share (self rows, beans_open_date, shot_history_access) ==========
-- Only runs if user_beans table still exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_beans') THEN
    INSERT INTO "beans_share" (
      "bean_id", "user_id", "invited_by", "status",
      "shot_history_access", "reshare_allowed", "beans_open_date", "created_at", "updated_at"
    )
    SELECT ub."bean_id", ub."user_id", NULL, 'self',
      CASE WHEN ub."share_my_shots_publicly" = true THEN 'anyone_with_link' ELSE 'restricted' END,
      false, ub."open_bag_date", ub."created_at", ub."created_at"
    FROM "user_beans" ub
    ON CONFLICT (bean_id, user_id) DO UPDATE SET
      "status" = CASE WHEN "beans_share".status = 'owner' THEN 'owner' ELSE 'self' END,
      "beans_open_date" = COALESCE(EXCLUDED."beans_open_date", "beans_share"."beans_open_date"),
      "shot_history_access" = CASE WHEN "beans_share".status = 'owner' THEN "beans_share"."shot_history_access" ELSE EXCLUDED."shot_history_access" END,
      "updated_at" = EXCLUDED."updated_at";
  END IF;
END $$;

--> statement-breakpoint

-- ========== Step 5: Migrate shot_shares.id → shots.share_slug ==========
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shot_shares') THEN
    UPDATE "shots" s SET "share_slug" = (
      SELECT ss."id" FROM "shot_shares" ss WHERE ss."shot_id" = s."id" LIMIT 1
    )
    WHERE s."id" IN (SELECT "shot_id" FROM "shot_shares")
      AND (s."share_slug" IS NULL OR s."share_slug" = '');
  END IF;
END $$;

--> statement-breakpoint

-- ========== Step 6: Backfill beans.updated_at (when column was just added) ==========
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beans' AND column_name = 'updated_at') THEN
    UPDATE "beans" SET "updated_at" = "created_at";
  END IF;
END $$;

--> statement-breakpoint

-- ========== Step 7: Drop old columns from beans_share ==========
ALTER TABLE "beans_share" DROP COLUMN IF EXISTS "share_shot_history";
--> statement-breakpoint
ALTER TABLE "beans_share" DROP COLUMN IF EXISTS "reshare_enabled";

--> statement-breakpoint

-- ========== Step 8: Drop old columns from beans ==========
ALTER TABLE "beans" DROP COLUMN IF EXISTS "origin";
--> statement-breakpoint
ALTER TABLE "beans" DROP COLUMN IF EXISTS "roaster";
--> statement-breakpoint
ALTER TABLE "beans" DROP COLUMN IF EXISTS "created_by";
--> statement-breakpoint
ALTER TABLE "beans" DROP COLUMN IF EXISTS "general_access_share_shots";

--> statement-breakpoint

-- ========== Step 9: Drop old tables ==========
DROP TABLE IF EXISTS "user_beans";
--> statement-breakpoint
DROP TABLE IF EXISTS "shot_shares";
